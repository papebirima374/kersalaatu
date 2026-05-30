import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if config has been set (not undefined, empty or default placeholders)
const isConfigured =
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  !!firebaseConfig.projectId;

let app = null;
let db = null;
let auth = null;
let storage = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    console.log("🔥 Connected successfully to Firebase Cloud Services!");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase application:", error);
  }
} else {
  console.log("💡 Running in Local Simulation mode (saving to LocalStorage). Create a .env.local file with your Firebase credentials to enable real-time cloud database.");
}

export { app, db, auth, storage, isConfigured };
