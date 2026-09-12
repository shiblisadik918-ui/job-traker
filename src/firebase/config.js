/**
 * JobTrack Firebase Configuration Module
 * Manages Firebase app initialization, Auth instance, and Firestore database.
 * Supports Vercel deployment via VITE_ environment variables, with graceful fallback.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const defaultFirebaseConfig = {
  apiKey: "AIzaSyA7d9xs9PTGONeY873hfj3LBvWJjAEdEqI",
  authDomain: "gen-lang-client-0446185588.firebaseapp.com",
  projectId: "gen-lang-client-0446185588",
  storageBucket: "gen-lang-client-0446185588.firebasestorage.app",
  messagingSenderId: "589419397205",
  appId: "1:589419397205:web:1e3c60b8f2351551c394dc",
};

const DEFAULT_DATABASE_ID = "ai-studio-jobtrack-55dd601a-3451-4797-96ea-e7f385138245";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || defaultFirebaseConfig.appId,
};

// Initialize or retrieve existing Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication Instance
export const auth = getAuth(app);

// Google Auth Provider with Google Drive File scope
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore Database Instance
// Supports custom database IDs (e.g. provisioned in Google Cloud/Firebase)
const databaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  appletConfig.firestoreDatabaseId ||
  DEFAULT_DATABASE_ID ||
  '(default)';

export const db = databaseId && databaseId !== '(default)'
  ? getFirestore(app, databaseId)
  : getFirestore(app);

export { firebaseConfig };
export default app;

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or configuration requires verification.');
    }
  }
}

// Run connection check asynchronously in background
testConnection().catch(() => {});
