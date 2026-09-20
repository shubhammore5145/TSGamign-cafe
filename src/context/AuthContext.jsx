import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

// ═══════════════════════════════════════════════════════
// ADMIN EMAILS — Add your admin email(s) here
// Anyone who registers or logs in with these emails
// will automatically become an admin.
// ═══════════════════════════════════════════════════════
const ADMIN_EMAILS = [
  'shubhamvmore12@gmail.com',
  // Add more admin emails here if needed
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userDoc?.role === 'admin';

  const fetchUserDoc = useCallback(async (uid, email) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();

        // Auto-promote admin emails
        if (ADMIN_EMAILS.includes(email?.toLowerCase()) && data.role !== 'admin') {
          await updateDoc(ref, { role: 'admin' });
          data.role = 'admin';
          console.log('✅ Auto-promoted to admin:', email);
        }

        setUserDoc(data);
      }
    } catch (err) {
      console.warn('Could not fetch user doc (check Firestore rules):', err.message);
      // If we can't read Firestore but it's an admin email, set a local admin doc
      if (ADMIN_EMAILS.includes(email?.toLowerCase())) {
        setUserDoc({ role: 'admin', name: email.split('@')[0], email });
      } else {
        setUserDoc(null);
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserDoc(firebaseUser.uid, firebaseUser.email);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchUserDoc]);

  const signIn = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserDoc(result.user.uid, result.user.email);
    return result;
  };

  const signUp = async ({ email, password, name, phone, photoURL }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name, photoURL: photoURL || null });

    // Auto-assign admin role if email is in ADMIN_EMAILS
    const role = ADMIN_EMAILS.includes(email?.toLowerCase()) ? 'admin' : 'user';

    const newUserDoc = {
      uid: result.user.uid,
      name,
      email,
      phone: phone || '',
      photoURL: photoURL || '',
      role,
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
    if (user) fetchUserDoc(user.uid, user.email);
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
