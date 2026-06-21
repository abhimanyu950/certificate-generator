import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Default Firebase Configuration (from original system)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyB9aaVSRYfPqGLdRI5_UFiYx0j4MfZZRD8",
  authDomain: "certforge-web.firebaseapp.com",
  projectId: "certforge-web",
  storageBucket: "certforge-web.firebasestorage.app",
  messagingSenderId: "757918276255",
  appId: "1:757918276255:web:dd2acef5ea61372d48e0aa",
  measurementId: "G-883VEXH7Q7"
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
