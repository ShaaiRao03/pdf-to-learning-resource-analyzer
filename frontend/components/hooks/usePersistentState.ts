import { useState, useEffect } from "react";

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return initialValue;
        }
      }
    }
    return initialValue;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState] as const;
}
