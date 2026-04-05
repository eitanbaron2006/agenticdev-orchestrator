/**
 * List users currently stored in the local Auth emulator.
 * Usage: node scripts/copy-auth.mjs
 */

import {
  createLocalAuth,
  listAllAuthUsers,
  runWithLocalAuthEmulator,
} from './auth-copy-utils.mjs';

const PROJECT_ID = 'gen-lang-client-0066141798';

const {
  auth: localAuth,
  emulatorHost: authEmulatorHost,
} = createLocalAuth(PROJECT_ID, { appName: 'local-auth-list' });

async function listEmulatorUsers() {
  console.log(`\n  Listing local Auth emulator users from ${authEmulatorHost}...`);

  try {
    const users = await runWithLocalAuthEmulator(authEmulatorHost, () =>
      listAllAuthUsers(localAuth),
    );
    console.log(`\n  Found ${users.length} users in emulator`);

    for (const user of users) {
      const identifier = user.email || user.phoneNumber || '(no identifier)';
      console.log(`\n  - ${identifier} (${user.uid})`);
      if (user.displayName) console.log(`    Display name: ${user.displayName}`);
      if (user.photoURL) console.log(`    Photo: ${user.photoURL}`);
      if (user.providerData?.length) {
        console.log(
          `    Providers: ${user.providerData.map((provider) => provider.providerId).join(', ')}`,
        );
      }
    }

    return users.length;
  } catch (err) {
    console.log(`\n  ERROR: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log(`\nAuth Emulator | ${PROJECT_ID} | auth@${authEmulatorHost}\n`);
  await listEmulatorUsers();
  console.log('\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
