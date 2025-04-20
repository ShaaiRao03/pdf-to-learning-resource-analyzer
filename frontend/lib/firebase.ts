import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSyfmi-vjFBPjVkbNZ9cd1arn_mf-NH5Q",
  authDomain: "einstein-ai-prod.firebaseapp.com",
  projectId: "einstein-ai-prod",
  storageBucket: "einstein-ai-prod.firebasestorage.app",
  messagingSenderId: "218136169622",
  appId: "1:218136169622:web:f15c6e2ecbff0a1c95c6b7",
  measurementId: "G-1MYQGC8EL3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
