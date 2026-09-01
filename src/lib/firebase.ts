// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD6OfYmYM8BI6vDKePs47Dvvu2CjbExx2U",
  authDomain: "hopeful-amplifier-xf6jr.firebaseapp.com",
  projectId: "hopeful-amplifier-xf6jr",
  storageBucket: "hopeful-amplifier-xf6jr.firebasestorage.app",
  messagingSenderId: "265337256245",
  appId: "1:265337256245:web:87d2c5ca5e95ace0fdf47c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
