import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userDoc?.role === 'admin';

  const fetchUserDoc = useCallback(async (uid) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserDoc(snap.data());
      } else {
        setUserDoc(null);
      }
    } catch (err) {
      console.warn('Could not fetch user doc (check Firestore rules):', err.message);
      setUserDoc(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserDoc(firebaseUser.uid);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchUserDoc]);

  const signIn = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserDoc(result.user.uid);
    return result;
  };

  const signUp = async ({ email, password, name, phone, photoURL }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name, photoURL: photoURL || null });

    const newUserDoc = {
      uid: result.user.uid,
      name,
      email,
      phone: phone || '',
      photoURL: photoURL || '',
      role: 'user',
      membershipId: null,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', result.user.uid), newUserDoc);
    } catch (err) {
      console.warn('Could not create user doc:', err.message);
    }
    setUserDoc(newUserDoc);
    return result;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserDoc(null);
  };

  const refreshUserDoc = () => {
    if (user) fetchUserDoc(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, isAdmin, loading, signIn, signUp, signOut, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
