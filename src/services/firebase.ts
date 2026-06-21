import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Default Firebase Configuration (loaded from environment variables)
const defaultFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || ""
};


// Check for custom configuration in localStorage, fallback to default
const getFirebaseConfig = () => {
  try {
    const customConfig = localStorage.getItem('cf_firebaseSettings');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom Firebase settings:', e);
  }
  return defaultFirebaseConfig;
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
