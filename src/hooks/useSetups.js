import { useState, useEffect } from 'react';
import { subscribeToSetups } from '../firebase/firestore';

export function useSetups() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const unsub = subscribeToSetups(
        (data) => {
          setSetups(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.warn('Firestore setups error:', err.message);
          setError(err.message);
          setLoading(false);
        }
      );
      return unsub;
    } catch (err) {
      console.warn('Firestore subscription error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { setups, loading, error };
}
