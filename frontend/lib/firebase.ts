import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASLskhLk5-3HxzrOeYwupUd2FyNGkmfbo",
  authDomain: "einstein-ai-ae343.firebaseapp.com",
  projectId: "einstein-ai-ae343",
  storageBucket: "einstein-ai-ae343.firebasestorage.app",
  messagingSenderId: "939323046777",
  appId: "1:939323046777:web:d38fc1ccaac7ee645d8da8",
  measurementId: "G-0NX6072LZV"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
