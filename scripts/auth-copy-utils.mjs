/**
 * Shared helpers for copying Firebase Auth users from a cloud project
 * into the local Auth emulator.
 */

import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const DEFAULT_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
export const DEFAULT_AUTH_EXPORT_FILE = 'auth-export.json';

const execFileAsync = promisify(execFile);

function withAuthEmulatorHost(host, callback) {
  const previousHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (host) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = host;
  } else {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }

  try {
    return callback();
  } finally {
    if (typeof previousHost === 'undefined') {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    } else {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = previousHost;
    }
  }
}

async function withAuthEmulatorHostAsync(host, callback) {
  const previousHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (host) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = host;
  } else {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }

  try {
    return await callback();
  } finally {
    if (typeof previousHost === 'undefined') {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    } else {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = previousHost;
    }
  }
}

export function runWithRemoteAuth(callback) {
  return withAuthEmulatorHostAsync(undefined, callback);
}

export function runWithLocalAuthEmulator(emulatorHost, callback) {
  return withAuthEmulatorHostAsync(emulatorHost, callback);
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );
}

export function createRemoteAuth(projectId, appName = 'remote-auth') {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;

  const app = withAuthEmulatorHost(undefined, () =>
    initializeApp(
      {
        credential: applicationDefault(),
        projectId,
      },
      appName,
    ),
  );

  const auth = withAuthEmulatorHost(undefined, () => getAuth(app));

  return { app, auth };
}

export function createLocalAuth(
  projectId,
  { appName = 'local-auth', emulatorHost = DEFAULT_AUTH_EMULATOR_HOST } = {},
) {
  const app = withAuthEmulatorHost(emulatorHost, () =>
    initializeApp({ projectId }, appName),
  );

  const auth = withAuthEmulatorHost(emulatorHost, () => getAuth(app));

  return { app, auth, emulatorHost };
}

export async function listAllAuthUsers(auth, pageSize = 1000) {
  const users = [];
  let pageToken;

  do {
    const result = await auth.listUsers(pageSize, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

export function countUsersWithPasswordHash(users) {
  return users.filter(
    (user) => typeof user.passwordHash === 'string' && user.passwordHash.length > 0,
  ).length;
}

function getFirebaseCliPath() {
  return process.platform === 'win32'
    ? '.\\node_modules\\.bin\\firebase.cmd'
    : './node_modules/.bin/firebase';
}

export async function exportRemoteAuth(
  projectId,
  outputFile = DEFAULT_AUTH_EXPORT_FILE,
  { cleanup = true } = {},
) {
  const env = {
    ...process.env,
    GCLOUD_PROJECT: projectId,
    GOOGLE_CLOUD_PROJECT: projectId,
    GOOGLE_CLOUD_QUOTA_PROJECT: projectId,
  };

  delete env.FIREBASE_AUTH_EMULATOR_HOST;

  const firebaseArgs = ['auth:export', outputFile, '--format=json', '--project', projectId];

  if (process.platform === 'win32') {
    await execFileAsync(process.env.ComSpec || 'cmd.exe', ['/c', getFirebaseCliPath(), ...firebaseArgs], {
      cwd: process.cwd(),
      env,
      windowsHide: true,
    });
  } else {
    await execFileAsync(getFirebaseCliPath(), firebaseArgs, {
      cwd: process.cwd(),
      env,
      windowsHide: true,
    });
  }

  const fileContents = await readFile(outputFile, 'utf8');

  if (cleanup) {
    await unlink(outputFile).catch(() => {});
  }

  return JSON.parse(fileContents);
}

function toEmulatorImportUser(user) {
  const record = compactObject({
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoUrl,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    tenantId: user.tenantId,
  });

  if (user.customAttributes) {
    record.customClaims = JSON.parse(user.customAttributes);
  }

  const metadata = compactObject({
    creationTime: user.createdAt ? new Date(Number(user.createdAt)).toUTCString() : undefined,
    lastSignInTime:
      user.lastLoginAt || user.lastSignedInAt
        ? new Date(Number(user.lastLoginAt || user.lastSignedInAt)).toUTCString()
        : undefined,
  });
  if (Object.keys(metadata).length > 0) {
    record.metadata = metadata;
  }

  const providerData = (user.providerUserInfo || []).map((provider) =>
    compactObject({
      uid: provider.rawId,
      displayName: provider.displayName,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      photoURL: provider.photoUrl,
      providerId: provider.providerId,
    }),
  );
  if (providerData.length > 0) {
    record.providerData = providerData;
  }

  if (user.passwordHash) {
    record.passwordHash = Buffer.from(user.passwordHash, 'base64');
  }

  if (user.salt) {
    record.passwordSalt = Buffer.from(user.salt, 'base64');
  }

  return record;
}

export async function clearAuthEmulator(
  projectId,
  emulatorHost = DEFAULT_AUTH_EMULATOR_HOST,
) {
  const response = await fetch(
    `http://${emulatorHost}/emulator/v1/projects/${projectId}/accounts`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed clearing Auth emulator: ${response.status} ${response.statusText}`);
  }
}

export async function importAuthExportToEmulator(
  projectId,
  exportedAuth,
  {
    emulatorHost = DEFAULT_AUTH_EMULATOR_HOST,
    clearFirst = false,
    chunkSize = 1000,
    hashOptions,
  } = {},
) {
  const users = (exportedAuth.users || []).map(toEmulatorImportUser);

  if (clearFirst) {
    await clearAuthEmulator(projectId, emulatorHost);
  }

  const passwordUsers = users.filter((user) => user.passwordHash);
  if (passwordUsers.length > 0 && !hashOptions) {
    throw new Error(
      'Password users were found in the export. Importing them correctly requires Firebase password hash parameters.',
    );
  }

  const {
    auth: localAuth,
  } = createLocalAuth(projectId, {
    appName: `local-auth-import-${Date.now()}`,
    emulatorHost,
  });

  let successCount = 0;
  const failures = [];

  for (let index = 0; index < users.length; index += chunkSize) {
    const chunk = users.slice(index, index + chunkSize);
    const result = await runWithLocalAuthEmulator(emulatorHost, () =>
      localAuth.importUsers(chunk, hashOptions),
    );

    successCount += result.successCount;

    for (const failure of result.errors) {
      failures.push({
        index: index + failure.index,
        uid: chunk[failure.index]?.uid,
        message: failure.error?.message || String(failure.error),
      });
    }
  }

  return {
    attemptedCount: users.length,
    successCount,
    failures,
  };
}

function getPrimaryIdentifier(user) {
  return user.email || user.phoneNumber || user.uid || user.localId || '(no identifier)';
}

function normalizeExportedUser(user) {
  return {
    uid: user.localId,
    email: user.email || null,
    displayName: user.displayName || null,
    createdAt: user.createdAt ? String(Math.floor(Number(user.createdAt) / 1000)) : null,
    lastSignedInAt: user.lastLoginAt || user.lastSignedInAt
      ? String(Math.floor(Number(user.lastLoginAt || user.lastSignedInAt) / 1000))
      : null,
    providers: (user.providerUserInfo || [])
      .map((provider) => ({
        providerId: provider.providerId || null,
        rawId: provider.rawId || null,
        email: provider.email || null,
        displayName: provider.displayName || null,
      }))
      .sort((left, right) =>
        `${left.providerId}:${left.rawId}`.localeCompare(`${right.providerId}:${right.rawId}`),
      ),
  };
}

function normalizeAuthUser(user) {
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    createdAt: user.metadata?.creationTime
      ? String(Math.floor(Date.parse(user.metadata.creationTime) / 1000))
      : null,
    lastSignedInAt: user.metadata?.lastSignInTime
      ? String(Math.floor(Date.parse(user.metadata.lastSignInTime) / 1000))
      : null,
    providers: (user.providerData || [])
      .map((provider) => ({
        providerId: provider.providerId || null,
        rawId: provider.uid || null,
        email: provider.email || null,
        displayName: provider.displayName || null,
      }))
      .sort((left, right) =>
        `${left.providerId}:${left.rawId}`.localeCompare(`${right.providerId}:${right.rawId}`),
      ),
  };
}

function diffNormalizedUsers(expected, actual) {
  const mismatches = [];

  for (const field of ['uid', 'email', 'displayName', 'createdAt']) {
    if (expected[field] !== actual[field]) {
      mismatches.push({
        field,
        expected: expected[field],
        actual: actual[field],
      });
    }
  }

  const expectedProviders = JSON.stringify(expected.providers);
  const actualProviders = JSON.stringify(actual.providers);
  if (expectedProviders !== actualProviders) {
    mismatches.push({
      field: 'providers',
      expected: expected.providers,
      actual: actual.providers,
    });
  }

  return mismatches;
}

export async function verifyAuthExportInEmulator(
  projectId,
  exportedAuth,
  { emulatorHost = DEFAULT_AUTH_EMULATOR_HOST } = {},
) {
  const exportedUsers = exportedAuth.users || [];
  const {
    auth: localAuth,
  } = createLocalAuth(projectId, {
    appName: `local-auth-verify-${Date.now()}`,
    emulatorHost,
  });

  const emulatorUsers = await runWithLocalAuthEmulator(emulatorHost, () =>
    listAllAuthUsers(localAuth),
  );
  const emulatorByUid = new Map(emulatorUsers.map((user) => [user.uid, user]));

  const matches = [];
  const mismatches = [];
  const missing = [];

  for (const exportedUser of exportedUsers) {
    const emulatorUser = emulatorByUid.get(exportedUser.localId);
    if (!emulatorUser) {
      missing.push({
        uid: exportedUser.localId,
        identifier: getPrimaryIdentifier(exportedUser),
      });
      continue;
    }

    const expected = normalizeExportedUser(exportedUser);
    const actual = normalizeAuthUser(emulatorUser);
    const differences = diffNormalizedUsers(expected, actual);

    if (differences.length > 0) {
      mismatches.push({
        uid: expected.uid,
        identifier: getPrimaryIdentifier(exportedUser),
        differences,
      });
      continue;
    }

    matches.push({
      uid: expected.uid,
      identifier: getPrimaryIdentifier(exportedUser),
      providerIds: expected.providers.map((provider) => provider.providerId),
    });
  }

  return {
    exportedCount: exportedUsers.length,
    emulatorCount: emulatorUsers.length,
    matches,
    mismatches,
    missing,
  };
}

function toImportRecord(user) {
  const record = compactObject({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    tenantId: user.tenantId || undefined,
    customClaims:
      user.customClaims && Object.keys(user.customClaims).length > 0
        ? user.customClaims
        : undefined,
  });

  const metadata = compactObject({
    creationTime: user.metadata?.creationTime,
    lastSignInTime: user.metadata?.lastSignInTime,
  });
  if (Object.keys(metadata).length > 0) {
    record.metadata = metadata;
  }

  const providerData = (user.providerData || [])
    .filter((provider) => provider?.providerId && provider?.uid)
    .map((provider) =>
      compactObject({
        uid: provider.uid,
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoURL,
        providerId: provider.providerId,
      }),
    );

  if (providerData.length > 0) {
    record.providerData = providerData;
  }

  return record;
}

export async function importUsersIntoEmulator(
  localAuth,
  remoteUsers,
  { chunkSize = 1000 } = {},
) {
  const importRecords = remoteUsers.map(toImportRecord);
  let successCount = 0;
  const failures = [];

  for (let index = 0; index < importRecords.length; index += chunkSize) {
    const chunk = importRecords.slice(index, index + chunkSize);
    const result = await localAuth.importUsers(chunk);

    successCount += result.successCount;

    for (const failure of result.errors) {
      failures.push({
        index: index + failure.index,
        uid: chunk[failure.index]?.uid,
        message: failure.error?.message || String(failure.error),
      });
    }
  }

  return {
    attemptedCount: importRecords.length,
    successCount,
    failures,
  };
}
