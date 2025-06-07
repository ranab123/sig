import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: "siig-85a12.firebaseapp.com",
    databaseURL: "https://siig-85a12-default-rtdb.firebaseio.com",
    projectId: "siig-85a12",
    storageBucket: "siig-85a12.firebasestorage.app",
    messagingSenderId: "99388997225",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: "G-X6WSH6PPYP"
};  

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth without persistence - users sign in every time
const auth = getAuth(app);

const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') { // Only run in browser environment
  enableIndexedDbPersistence(db).catch((err) => {
    console.error('Firestore persistence error:', err.code, err.message);
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Multiple tabs open. Persistence enabled only in one tab.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.log('This browser does not support Firestore persistence.');
    }
  });
}

export { app, auth, db }; 