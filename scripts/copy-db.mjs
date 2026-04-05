/**
 * Copy the entire remote Firestore database into the local Firestore emulator.
 * Usage: node scripts/copy-db.mjs
 */

import {
  DEFAULT_FIRESTORE_DATABASE_ID,
  DEFAULT_FIRESTORE_EMULATOR_HOST,
  clearFirestoreEmulator,
  copyFirestoreDatabase,
  createLocalFirestore,
  createRemoteFirestore,
} from './firestore-copy-utils.mjs';

const PROJECT_ID = 'gen-lang-client-0066141798';
const REMOTE_DB_ID = 'ai-studio-fe880063-bf66-4a3e-ad58-9ebb4b01f31f';
const LOCAL_DB_ID = DEFAULT_FIRESTORE_DATABASE_ID;
const firestoreEmulatorHost = DEFAULT_FIRESTORE_EMULATOR_HOST;

const { db: remoteDb } = createRemoteFirestore(PROJECT_ID, REMOTE_DB_ID, {
  appName: 'remote-firestore-copy-db',
});
const { db: localDb } = createLocalFirestore(PROJECT_ID, LOCAL_DB_ID, {
  appName: 'local-firestore-copy-db',
  emulatorHost: firestoreEmulatorHost,
});

async function main() {
  console.log(
    `\nCloud -> Firestore Emulator | ${PROJECT_ID}/${REMOTE_DB_ID} -> ${LOCAL_DB_ID} | firestore@${firestoreEmulatorHost}\n`,
  );

  await clearFirestoreEmulator(PROJECT_ID, LOCAL_DB_ID, firestoreEmulatorHost).catch((error) => {
    console.log(`  Warning: continuing without clearing emulator first (${error.message})`);
  });

  const result = await copyFirestoreDatabase(remoteDb, localDb);

  for (const collection of result.rootCollections) {
    const descendantsLabel =
      collection.descendantDocuments > 0
        ? ` (+${collection.descendantDocuments} subcollection docs)`
        : '';
    console.log(`  ${collection.name}... ${collection.rootDocuments} docs${descendantsLabel}`);
  }

  if (result.failures.length > 0) {
    console.log(`  Firestore warnings... ${result.failures.length} documents failed to copy`);
    for (const failure of result.failures.slice(0, 10)) {
      console.log(`    ${failure.path}: ${failure.message}`);
    }
  }

  console.log(
    `\nDone: ${result.docsCopied} docs across ${result.collectionPathsVisited} collection paths\n`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
