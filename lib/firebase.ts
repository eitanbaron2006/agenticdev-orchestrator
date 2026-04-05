import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, Timestamp, setLogLevel, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
};

const browserUsesEmulators =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true';

function getOrInitFirebaseApp(name?: string) {
  if (!name) {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  const existing = getApps().find((appInstance) => appInstance.name === name);
  return existing || initializeApp(firebaseConfig, name);
}

const activeFirestoreDatabaseId = browserUsesEmulators
  ? undefined
  : firebaseConfig.firestoreDatabaseId;

// Initialize Firebase
const app = getOrInitFirebaseApp();

// Suppress benign internal Firestore warnings like "Disconnecting idle stream"
setLogLevel('silent');

// Use initializeFirestore with force long polling for better stability in proxy/cloud environments and to prevent gRPC idle stream disconnects
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, activeFirestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

function parseHostPort(hostValue: string, defaultPort: number) {
  const normalized = hostValue.replace(/^https?:\/\//, '');
  const [host = 'localhost', portValue] = normalized.split(':');
  const port = Number(portValue || defaultPort);
  const resolvedHost = host === 'localhost' ? '127.0.0.1' : host;

  return {
    host: resolvedHost,
    port: Number.isFinite(port) ? port : defaultPort,
  };
}

// Firestore emulator is useful for local data iteration.
const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
const useFirestoreEmulator =
  typeof window !== 'undefined' &&
  (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true' || !!firestoreEmulatorHost);

// Auth emulator is enabled in local emulator mode, but Google sign-in will still
// use a real Google chooser by fetching a real credential first and then
// exchanging it with the emulator via signInWithCredential.
const authEmulatorHost =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
  (
    process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true' ||
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true'
      ? 'localhost:9099'
      : ''
  );
const useAuthEmulator = typeof window !== 'undefined' && !!authEmulatorHost;

if (useFirestoreEmulator) {
  const { host, port } = parseHostPort(firestoreEmulatorHost || 'localhost:8080', 8080);
  console.log(`[Firebase] Connecting Firestore to emulator at ${host}:${port}...`);
  try {
    connectFirestoreEmulator(db, host, port);
    console.log(`[Firebase] Firestore emulator connected on ${host}:${port}`);
  } catch (e) {
    console.warn('[Firebase] Firestore emulator already connected or failed:', e);
  }
}

if (useAuthEmulator) {
  const emulatorUrl = authEmulatorHost.startsWith('http')
    ? authEmulatorHost
    : `http://${authEmulatorHost}`;

  console.log(`[Firebase] Connecting Auth to emulator at ${emulatorUrl}...`);
  try {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    console.log(`[Firebase] Auth emulator connected on ${emulatorUrl}`);
  } catch (e) {
    console.warn('[Firebase] Auth emulator already connected or failed:', e);
  }
} else if (typeof window !== 'undefined') {
  console.log('[Firebase] Auth is using the remote Firebase project');
}

// Auth Helpers
googleProvider.setCustomParameters({ prompt: 'select_account' });

let remotePopupAuth = null as ReturnType<typeof getAuth> | null;

function getRemotePopupAuth() {
  if (!remotePopupAuth) {
    const popupApp = getOrInitFirebaseApp('remote-popup-auth');
    remotePopupAuth = getAuth(popupApp);
  }

  return remotePopupAuth;
}

export async function loginWithGoogle() {
  if (!useAuthEmulator) {
    return signInWithPopup(auth, googleProvider);
  }

  const popupAuth = getRemotePopupAuth();
  const popupResult = await signInWithPopup(popupAuth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(popupResult);

  await signOut(popupAuth).catch(() => {});

  if (!credential?.idToken) {
    throw new Error('Google sign-in did not return an ID token for the Auth emulator.');
  }

  return signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken));
}

export const logout = () => signOut(auth);

export type { FirebaseUser };
