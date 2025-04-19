"use client";
import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext<{ user: User | null; loading: boolean; userName?: string | null }>({ user: null, loading: true, userName: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        // Fetch user's name from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || null);
        } else {
          setUserName(null);
        }
      } else {
        setUserName(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading, userName }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
