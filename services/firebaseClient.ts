// =====================================================
// FIREBASE CLIENT — Singleton Initialisation
// =====================================================
// Reads VITE_FIREBASE_* environment variables, validates
// all six required keys, and exports shared Firebase
// instances for use across the application.
// =====================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// --- Environment Variable Validation ---

const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

const env = (import.meta as any).env as Record<string, string | undefined>;

const missingVars = requiredEnvVars.filter((key) => !env[key]);

if (missingVars.length > 0) {
    const message =
        `[firebaseClient] Missing required Firebase environment variable(s): ${missingVars.join(', ')}. ` +
        `Ensure these are defined in your .env file (VITE_FIREBASE_* prefix required for Vite).`;
    console.error(message);
    throw new Error(message);
}

// --- Firebase Configuration ---

const firebaseConfig = {
    apiKey: env['VITE_FIREBASE_API_KEY']!,
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN']!,
    projectId: env['VITE_FIREBASE_PROJECT_ID']!,
    storageBucket: env['VITE_FIREBASE_STORAGE_BUCKET']!,
    messagingSenderId: env['VITE_FIREBASE_MESSAGING_SENDER_ID']!,
    appId: env['VITE_FIREBASE_APP_ID']!,
};

// --- Diagnostic log — visible in browser console ---
console.log('[firebaseClient] Initialising with projectId:', firebaseConfig.projectId);
console.log('[firebaseClient] authDomain:', firebaseConfig.authDomain);
console.log('[firebaseClient] appId:', firebaseConfig.appId);

// --- Singleton Initialisation (guard against double-init) ---

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firestoreDb: Firestore = getFirestore(firebaseApp, '(default)');

export const firebaseAuth: Auth = getAuth(firebaseApp);

console.log('[firebaseClient] Firestore connected to project:', (firestoreDb as any)._databaseId?.projectId ?? 'unknown');
