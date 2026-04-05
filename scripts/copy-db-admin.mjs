/**
 * Copy Auth users from cloud to the local Auth emulator using Firebase Auth export.
 * Usage: node scripts/copy-db-admin.mjs
 * Make sure: firebase emulators:start is running
 */

import {
  DEFAULT_AUTH_EMULATOR_HOST,
  DEFAULT_AUTH_EXPORT_FILE,
  clearAuthEmulator,
  exportRemoteAuth,
  importAuthExportToEmulator,
  verifyAuthExportInEmulator,
} from './auth-copy-utils.mjs';

const PROJECT_ID = 'gen-lang-client-0066141798';
const authEmulatorHost = DEFAULT_AUTH_EMULATOR_HOST;
const AUTH_EXPORT_FILE = DEFAULT_AUTH_EXPORT_FILE;

async function copyAuthUsers() {
  process.stdout.write(`  Auth users... `);

  try {
    const exportedAuth = await exportRemoteAuth(PROJECT_ID, AUTH_EXPORT_FILE);
    const remoteUsers = exportedAuth.users || [];

    console.log(`\n    Exported users from project: ${PROJECT_ID}`);
    console.log(`\n    Found ${remoteUsers.length} users in remote export`);

    for (const user of remoteUsers) {
      const label = user.email || user.phoneNumber || '(no identifier)';
      console.log(`    - ${label} (${user.localId})`);
    }

    await clearAuthEmulator(PROJECT_ID, authEmulatorHost);
    const result = await importAuthExportToEmulator(PROJECT_ID, exportedAuth, {
      emulatorHost: authEmulatorHost,
    });
    const verification = await verifyAuthExportInEmulator(PROJECT_ID, exportedAuth, {
      emulatorHost: authEmulatorHost,
    });

    console.log(`\n    ${result.successCount}/${remoteUsers.length} users copied`);
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
    console.log(`\n    ERROR: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log(`\nCloud -> Auth Emulator | ${PROJECT_ID} | auth@${authEmulatorHost}\n`);

  const total = await copyAuthUsers();

  console.log(`\nDone: ${total} items\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
