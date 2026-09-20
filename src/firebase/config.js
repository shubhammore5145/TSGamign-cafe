// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Replace the placeholder values below with your actual Firebase
// project configuration from:
// Firebase Console → Project Settings → Your apps → Web app → SDK setup
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDWvtWi8LoHWhexhzslUKenWRYIbQuFsx4",
  authDomain: "smartprint-1fd4a.firebaseapp.com",
  databaseURL: "https://smartprint-1fd4a-default-rtdb.firebaseio.com",
  projectId: "smartprint-1fd4a",
  storageBucket: "smartprint-1fd4a.firebasestorage.app",
  messagingSenderId: "1063227990927",
  appId: "1:1063227990927:web:8e92a336c3180d608be1fa",
  measurementId: "G-MW51T1LXQT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
