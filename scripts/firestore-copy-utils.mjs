/**
 * Shared helpers for copying Cloud Firestore data from a cloud database
 * into the local Firestore emulator.
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const DEFAULT_FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
export const DEFAULT_FIRESTORE_DATABASE_ID = '(default)';

function getFirestoreForDatabase(app, databaseId) {
  return !databaseId || databaseId === DEFAULT_FIRESTORE_DATABASE_ID
    ? getFirestore(app)
    : getFirestore(app, databaseId);
}

function withFirestoreEmulatorHost(host, callback) {
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;

  if (host) {
    process.env.FIRESTORE_EMULATOR_HOST = host;
  } else {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  }

  try {
    return callback();
  } finally {
    if (typeof previousHost === 'undefined') {
      delete process.env.FIRESTORE_EMULATOR_HOST;
    } else {
      process.env.FIRESTORE_EMULATOR_HOST = previousHost;
    }
  }
}

async function withFirestoreEmulatorHostAsync(host, callback) {
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;

  if (host) {
    process.env.FIRESTORE_EMULATOR_HOST = host;
  } else {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  }

  try {
    return await callback();
  } finally {
    if (typeof previousHost === 'undefined') {
      delete process.env.FIRESTORE_EMULATOR_HOST;
    } else {
      process.env.FIRESTORE_EMULATOR_HOST = previousHost;
    }
  }
}

export function runWithRemoteFirestore(callback) {
  return withFirestoreEmulatorHostAsync(undefined, callback);
}

export function runWithLocalFirestoreEmulator(emulatorHost, callback) {
  return withFirestoreEmulatorHostAsync(emulatorHost, callback);
}

export function createRemoteFirestore(
  projectId,
  databaseId,
  { appName = `remote-firestore-${databaseId}` } = {},
) {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;

  const app = withFirestoreEmulatorHost(undefined, () =>
    initializeApp(
      {
        credential: applicationDefault(),
        projectId,
      },
      appName,
    ),
  );

  const db = withFirestoreEmulatorHost(undefined, () => getFirestoreForDatabase(app, databaseId));

  return { app, db };
}

export function createLocalFirestore(
  projectId,
  databaseId,
  {
    appName = `local-firestore-${databaseId}`,
    emulatorHost = DEFAULT_FIRESTORE_EMULATOR_HOST,
  } = {},
) {
  const app = withFirestoreEmulatorHost(emulatorHost, () =>
    initializeApp({ projectId }, appName),
  );

  const db = withFirestoreEmulatorHost(emulatorHost, () =>
    getFirestoreForDatabase(app, databaseId),
  );

  return { app, db, emulatorHost };
}

export async function clearFirestoreEmulator(
  projectId,
  databaseId,
  emulatorHost = DEFAULT_FIRESTORE_EMULATOR_HOST,
  { retries = 5, retryDelayMs = 1000 } = {},
) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const response = await fetch(
      `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/${databaseId}/documents`,
      {
        method: 'DELETE',
      },
    );

    if (response.ok) {
      return;
    }

    const responseText = await response.text();
    const isRetryableLockError =
      response.status === 409 && responseText.toLowerCase().includes('transaction lock timeout');

    if (!isRetryableLockError || attempt === retries) {
      throw new Error(
        `Failed clearing Firestore emulator database ${databaseId}: ${response.status} ${response.statusText} ${responseText}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
  }
}

function rootCollectionName(collectionPath) {
  return collectionPath.split('/')[0];
}

function createStats() {
  return {
    docsCopied: 0,
    collectionsVisited: new Set(),
    rootCollections: new Map(),
    pendingWrites: [],
    failures: [],
  };
}

function ensureRootStats(stats, rootCollection) {
  if (!stats.rootCollections.has(rootCollection)) {
    stats.rootCollections.set(rootCollection, {
      rootDocuments: 0,
      descendantDocuments: 0,
      collectionPaths: new Set(),
    });
  }

  return stats.rootCollections.get(rootCollection);
}

const DEFAULT_WRITE_BATCH_SIZE = 10;

async function flushPendingWrites(localDb, stats, batchSize = DEFAULT_WRITE_BATCH_SIZE) {
  while (stats.pendingWrites.length >= batchSize) {
    const chunk = stats.pendingWrites.splice(0, batchSize);
    await commitWriteChunk(localDb, stats, chunk);
  }
}

async function flushRemainingWrites(localDb, stats) {
  if (stats.pendingWrites.length === 0) {
    return;
  }

  const chunk = stats.pendingWrites.splice(0, stats.pendingWrites.length);
  await commitWriteChunk(localDb, stats, chunk);
}

async function commitSingleWrite(localDb, write) {
  const batch = localDb.batch();
  batch.set(localDb.doc(write.path), write.data);
  await batch.commit();
}

async function commitWriteChunk(localDb, stats, chunk) {
  const batch = localDb.batch();

  for (const write of chunk) {
    batch.set(localDb.doc(write.path), write.data);
  }

  try {
    await batch.commit();
  } catch (error) {
    for (const write of chunk) {
      try {
        await commitSingleWrite(localDb, write);
      } catch (singleError) {
        stats.failures.push({
          path: write.path,
          message: singleError.message || String(singleError),
        });
      }
    }
  }
}

async function copyCollectionRecursive(remoteCollectionRef, localDb, stats) {
  stats.collectionsVisited.add(remoteCollectionRef.path);

  const snapshot = await remoteCollectionRef.get();
  const rootCollection = rootCollectionName(remoteCollectionRef.path);
  const rootStats = ensureRootStats(stats, rootCollection);
  rootStats.collectionPaths.add(remoteCollectionRef.path);

  for (const documentSnapshot of snapshot.docs) {
    stats.pendingWrites.push({
      path: documentSnapshot.ref.path,
      data: documentSnapshot.data(),
    });
    stats.docsCopied += 1;
    await flushPendingWrites(localDb, stats);

    if (remoteCollectionRef.path === rootCollection) {
      rootStats.rootDocuments += 1;
    } else {
      rootStats.descendantDocuments += 1;
    }

    const subcollections = await documentSnapshot.ref.listCollections();
    for (const subcollection of subcollections) {
      await copyCollectionRecursive(subcollection, localDb, stats);
    }
  }
}

export async function copyFirestoreDatabase(remoteDb, localDb) {
  const stats = createStats();
  const rootCollections = await remoteDb.listCollections();

  for (const rootCollection of rootCollections) {
    await copyCollectionRecursive(rootCollection, localDb, stats);
  }

  await flushRemainingWrites(localDb, stats);

  return {
    docsCopied: stats.docsCopied,
    rootCollections: Array.from(stats.rootCollections.entries()).map(([name, value]) => ({
      name,
      rootDocuments: value.rootDocuments,
      descendantDocuments: value.descendantDocuments,
      collectionPaths: Array.from(value.collectionPaths).sort(),
    })),
    collectionPathsVisited: stats.collectionsVisited.size,
    failures: stats.failures,
  };
}
