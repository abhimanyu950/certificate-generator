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
    // 1. Check for individual keys saved by SettingsPage
    const projectId = localStorage.getItem('cf_firebaseSettings_projectId');
    const apiKey = localStorage.getItem('cf_firebaseSettings_apiKey');
    
    if (projectId && apiKey && !projectId.includes('prod-ax7') && !apiKey.includes('4X9mZ9')) {
      return {
        ...defaultFirebaseConfig,
        apiKey,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        storageBucket: `${projectId}.firebasestorage.app`
      };
    }

    // 2. Check for JSON string fallback
    const customConfig = localStorage.getItem('cf_firebaseSettings');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return {
          ...defaultFirebaseConfig,
          ...parsed,
          authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
          storageBucket: parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`
        };
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
