/**
 * Copy Firestore data + Auth users from cloud to emulator using Admin SDK.
 * Usage: node scripts/copy-db-admin.mjs
 * Make sure: firebase emulators:start is running
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'gen-lang-client-0066141798';
const DB_ID = 'ai-studio-fe880063-bf66-4a3e-ad58-9ebb4b01f31f';

const COLLECTIONS = ['projects', 'conversations', 'users', 'deployments', 'generatedFiles', 'projectTemplates', 'availableSkills'];

// Remote (cloud) - uses application default credentials (gcloud auth)
const remoteApp = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
}, 'remote');
const remoteDb = getFirestore(remoteApp, DB_ID);
const remoteAuth = getAuth(remoteApp);

// Local emulator - no auth needed
const localApp = initializeApp({ projectId: PROJECT_ID }, 'local');
const localDb = getFirestore(localApp);
const localAuth = getAuth(localApp);
localDb.settings({ host: 'localhost:8080', ssl: false });

async function copyCollection(name) {
  process.stdout.write(`  ${name}... `);
  try {
    const snap = await remoteDb.collection(name).get();
    if (snap.empty) { console.log('empty'); return 0; }
    let count = 0;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 10) {
      const batch = localDb.batch();
      const chunk = docs.slice(i, Math.min(i + 10, docs.length));
      for (const d of chunk) {
        batch.set(localDb.collection(name).doc(d.id), d.data());
      }
      await batch.commit();
      count += chunk.length;
    }
    console.log(`${count} docs`);
    return count;
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return 0;
  }
}

async function copyAuthUsers() {
  process.stdout.write(`  Auth users... `);
  try {
    let count = 0;
    let pageToken;
    do {
      const listResult = await remoteAuth.listUsers(100, pageToken);
      for (const user of listResult.users) {
        try {
          await localAuth.createUser({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            disabled: user.disabled,
          });
          count++;
        } catch (err) {
          if (err.code !== 'auth/uid-already-exists') {
            console.log(`\n    Warning: ${user.email}: ${err.message}`);
          }
        }
      }
      pageToken = listResult.pageToken;
    } while (pageToken);
    console.log(`${count} users`);
    return count;
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log(`\nCloud → Emulator | ${PROJECT_ID}/${DB_ID}\n`);
  let total = 0;
  for (const col of COLLECTIONS) {
    total += await copyCollection(col);
  }
  total += await copyAuthUsers();
  console.log(`\nDone: ${total} items\n`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
