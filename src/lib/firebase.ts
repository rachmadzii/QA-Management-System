import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Lazy initialization function
function initializeFirebase() {
  try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
      console.warn("Firebase: Missing API key. Please configure NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
      return { app: null, auth: null, db: null, storage: null };
    }

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    return { app, auth, db, storage };
  } catch (error: any) {
    console.warn("Firebase: Initialization failed. Please verify your Firebase configuration.", error?.message);
    return { app: null, auth: null, db: null, storage: null };
  }
}

// Initialize on first import (but wrapped in try-catch)
try {
  const initialized = initializeFirebase();
  app = initialized.app;
  auth = initialized.auth;
  db = initialized.db;
  storage = initialized.storage;
} catch (error) {
  // Silent fail - will log warning above
}

export { app, auth, db, storage };
