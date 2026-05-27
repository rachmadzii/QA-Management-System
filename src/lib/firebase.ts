import { initializeApp, getApps, getApp as fbGetApp, type FirebaseApp } from "firebase/app";
import { getAuth as fbGetAuth, type Auth } from "firebase/auth";
import { getFirestore as fbGetFirestore, type Firestore } from "firebase/firestore";
import { getStorage as fbGetStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Lazy initialization function
function initializeFirebase() {
  try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
      console.warn("Firebase: Missing API key. Please configure NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
      return false;
    }

    if (getApps().length === 0) {
      _app = initializeApp(firebaseConfig);
    } else {
      _app = fbGetApp();
    }

    _auth = fbGetAuth(_app);
    _db = fbGetFirestore(_app);
    _storage = fbGetStorage(_app);

    return true;
  } catch (error: any) {
    console.warn("Firebase: Initialization failed. Please verify your Firebase configuration.", error?.message);
    return false;
  }
}

// Initialize on first import (but wrapped in try-catch)
try {
  initializeFirebase();
} catch (error) {
  // Silent fail - will log warning above
}

// Create a dummy Firestore object for type safety when Firebase is not configured
const getDummyDb = (): Firestore => {
  if (_db) return _db;
  // Return a proxy that throws errors when actually used
  return new Proxy({} as Firestore, {
    get: () => {
      throw new Error("Firebase is not configured. Please set up your environment variables.");
    },
  });
};

// Use non-null assertions since callers should handle null cases
export const app = _app as FirebaseApp | null;
export const auth = _auth as Auth | null;
export const db = _db || getDummyDb(); // Default to dummy if not configured
export const storage = _storage as FirebaseStorage | null;
