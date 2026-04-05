/**
 * Copy all Firestore collections and Auth users from cloud to local emulators.
 * Usage: node scripts/copy-all.mjs
 */

import {
  DEFAULT_AUTH_EMULATOR_HOST,
  DEFAULT_AUTH_EXPORT_FILE,
  clearAuthEmulator,
  exportRemoteAuth,
  importAuthExportToEmulator,
  verifyAuthExportInEmulator,
} from './auth-copy-utils.mjs';
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
const authEmulatorHost = DEFAULT_AUTH_EMULATOR_HOST;
const AUTH_EXPORT_FILE = DEFAULT_AUTH_EXPORT_FILE;
const firestoreEmulatorHost = DEFAULT_FIRESTORE_EMULATOR_HOST;

const { db: remoteDb } = createRemoteFirestore(PROJECT_ID, REMOTE_DB_ID, {
  appName: 'remote-firestore-copy-all',
});
const { db: localDb } = createLocalFirestore(PROJECT_ID, LOCAL_DB_ID, {
  appName: 'local-firestore-copy-all',
  emulatorHost: firestoreEmulatorHost,
});

async function copyFirestoreData() {
  try {
    await clearFirestoreEmulator(PROJECT_ID, LOCAL_DB_ID, firestoreEmulatorHost).catch(
      (error) => {
        console.log(`  Warning: continuing without clearing emulator first (${error.message})`);
      },
    );

    const result = await copyFirestoreDatabase(remoteDb, localDb);

    for (const collection of result.rootCollections) {
      const descendantsLabel =
        collection.descendantDocuments > 0
          ? ` (+${collection.descendantDocuments} subcollection docs)`
          : '';
      console.log(`  ${collection.name}... ${collection.rootDocuments} docs${descendantsLabel}`);
    }

    console.log(
      `  Firestore summary... ${result.docsCopied} docs across ${result.collectionPathsVisited} collection paths`,
    );

    if (result.failures.length > 0) {
      console.log(`  Firestore warnings... ${result.failures.length} documents failed to copy`);
      for (const failure of result.failures.slice(0, 10)) {
        console.log(`    ${failure.path}: ${failure.message}`);
      }
    }

    return result.docsCopied;
  } catch (err) {
    console.log(`  Firestore copy ERROR: ${err.message}`);
    return 0;
  }
}

async function copyAuthUsers() {
  process.stdout.write(`  Auth users... `);

  try {
    const exportedAuth = await exportRemoteAuth(PROJECT_ID, AUTH_EXPORT_FILE);
    const remoteUsers = exportedAuth.users || [];

    await clearAuthEmulator(PROJECT_ID, authEmulatorHost);
    const result = await importAuthExportToEmulator(PROJECT_ID, exportedAuth, {
      emulatorHost: authEmulatorHost,
    });
    const verification = await verifyAuthExportInEmulator(PROJECT_ID, exportedAuth, {
      emulatorHost: authEmulatorHost,
    });

    console.log(`${result.successCount}/${remoteUsers.length} users`);
    console.log(
      `    Verification: ${verification.matches.length} matched, ` +
        `${verification.mismatches.length} mismatched, ` +
        `${verification.missing.length} missing`,
    );

    for (const match of verification.matches.slice(0, 5)) {
      console.log(
        `    Verified ${match.identifier}: uid=${match.uid}, providers=${match.providerIds.join(', ') || 'none'}`,
      );
    }

    if (result.failures.length > 0) {
      for (const failure of result.failures.slice(0, 5)) {
        console.log(`    Warning [${failure.uid || failure.index}]: ${failure.message}`);
      }

      if (result.failures.length > 5) {
        console.log(`    ... and ${result.failures.length - 5} more import errors`);
      }
    }

    if (verification.mismatches.length > 0) {
      for (const mismatch of verification.mismatches.slice(0, 5)) {
        console.log(`    Mismatch for ${mismatch.identifier} (${mismatch.uid})`);
        for (const difference of mismatch.differences) {
          console.log(
            `      ${difference.field}: expected=${JSON.stringify(difference.expected)} actual=${JSON.stringify(difference.actual)}`,
          );
        }
      }
    }

    if (verification.missing.length > 0) {
      for (const missing of verification.missing.slice(0, 5)) {
        console.log(`    Missing from emulator: ${missing.identifier} (${missing.uid})`);
      }
    }

    return result.successCount;
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log(
    `\nCloud -> Emulators | ${PROJECT_ID}/${REMOTE_DB_ID} -> ${LOCAL_DB_ID} | firestore@${firestoreEmulatorHost} | auth@${authEmulatorHost}\n`,
  );

  console.log('\n--- Firestore ---');
  let total = await copyFirestoreData();

  console.log('\n--- Auth ---');
  total += await copyAuthUsers();

  console.log(`\n=== Done: ${total} items ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
