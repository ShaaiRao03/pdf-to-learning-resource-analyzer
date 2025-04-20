import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDy_T3OkHAdPElIqNBR1fZIo8ii_yUaAqo",
  authDomain: "einstein-ai-prod-13811.firebaseapp.com",
  projectId: "einstein-ai-prod-13811",
  storageBucket: "einstein-ai-prod-13811.firebasestorage.app",
  messagingSenderId: "623603689151",
  appId: "1:623603689151:web:28f4a336b123d36151080a",
  measurementId: "G-JKB54EN11G"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
