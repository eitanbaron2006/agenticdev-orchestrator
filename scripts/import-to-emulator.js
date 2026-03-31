/**
 * Import data from remote Firestore to local emulator.
 * Usage: node scripts/import-to-emulator.js
 * 
 * Make sure the emulator is running first:
 * firebase emulators:start
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, collection, getDocs, doc, setDoc } = require('firebase/firestore');

// Remote Firestore config (uses the app's real project)
const remoteApp = initializeApp({
  apiKey: 'AIzaSyBqFHhQ7n3zYgQWlLJ6oGkWnLkEwR1vK4s',
  projectId: 'albomit',
}, 'remote');

const remoteDb = getFirestore(remoteApp);

// Local emulator connection
const localApp = initializeApp({
  projectId: 'albomit',
}, 'local');

const localDb = getFirestore(localApp);
connectFirestoreEmulator(localDb, 'localhost', 8080);

const COLLECTIONS = ['projects', 'conversations', 'users', 'deployments', 'generatedFiles'];

async function copyCollection(name) {
  console.log(`Copying collection: ${name}...`);
  try {
    const snapshot = await getDocs(collection(remoteDb, name));
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await setDoc(doc(localDb, name, docSnap.id), docSnap.data());
      count++;
      if (count % 10 === 0) console.log(`  ${name}: ${count} docs copied`);
    }
    console.log(`  ${name}: DONE (${count} total)`);
    return count;
  } catch (err) {
    console.error(`  ${name}: ERROR - ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log('=== Firestore Remote -> Emulator Import ===\n');
  let total = 0;
  for (const col of COLLECTIONS) {
    total += await copyCollection(col);
  }
  console.log(`\n=== Done! Total: ${total} documents copied ===`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
