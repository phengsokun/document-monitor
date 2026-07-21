import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCaDg9lwQorGht1zKkdbZSc5yAFbTOeaRc",
  authDomain: "document-monitor-893e3.firebaseapp.com",
  projectId: "document-monitor-893e3",
  storageBucket: "document-monitor-893e3.firebasestorage.app",
  messagingSenderId: "661923702347",
  appId: "1:661923702347:web:069dc810f6ac5038b44fce",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
