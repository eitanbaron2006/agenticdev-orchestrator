/**
 * Copy Firestore data from remote to local emulator.
 * Usage: node scripts/copy-db.mjs
 * Make sure: firebase emulators:start is running
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

const DB_ID = 'ai-studio-fe880063-bf66-4a3e-ad58-9ebb4b01f31f';
const PROJECT_ID = 'gen-lang-client-0066141798';
const API_KEY = 'AIzaSyAjdYMe83dUDmRaBbqKng5Bx_fbyC1kTh0';

const COLLECTIONS = ['projects', 'conversations', 'users', 'deployments', 'generatedFiles', 'projectTemplates'];

// Remote connection (real cloud)
const remoteApp = initializeApp({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
}, 'remote');
const remoteDb = getFirestore(remoteApp, DB_ID);

// Local emulator connection
const localApp = initializeApp({
  projectId: PROJECT_ID,
}, 'local');
const localDb = getFirestore(localApp);
connectFirestoreEmulator(localDb, 'localhost', 8080);

async function copyCollection(name) {
  console.log(`  📂 ${name}...`);
  try {
    const snap = await getDocs(collection(remoteDb, name));
    let count = 0;
    const docs = snap.docs;
    
    // Copy in batches of 10
    for (let i = 0; i < docs.length; i += 10) {
      const batch = writeBatch(localDb);
      const chunk = docs.slice(i, i + 10);
      for (const d of chunk) {
        batch.set(doc(localDb, name, d.id), d.data());
      }
      await batch.commit();
      count += chunk.length;
    }
    
    console.log(`     ✅ ${count} documents`);
    return count;
  } catch (err) {
    console.error(`     ❌ Error: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log(`\n=== Copying Firestore: ${PROJECT_ID}/${DB_ID} → Emulator ===\n`);
  let total = 0;
  for (const col of COLLECTIONS) {
    total += await copyCollection(col);
  }
  console.log(`\n=== Done! ${total} documents copied ===\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
