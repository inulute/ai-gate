// src/hooks/useLocalStorage.ts
import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });


  const setValue = (value: T | ((val: T) => T)) => {
    try {
      if (value instanceof Function) {
        // Use React's functional updater to get the LATEST state value.
        // This prevents stale closure bugs when multiple setValue calls
        // happen in the same render cycle (e.g., updating activePanelTabs
        // for multiple panels in one event handler).
        setStoredValue(prev => {
          const newValue = value(prev);
          window.localStorage.setItem(key, JSON.stringify(newValue));
          return newValue;
        });
      } else {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}