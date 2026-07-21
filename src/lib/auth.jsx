import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'phengsokun097@gmail.com';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await loadOrCreateProfile(firebaseUser);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function loadOrCreateProfile(firebaseUser) {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.status === 'suspended') return { ...data, uid: firebaseUser.uid };
      return { ...data, uid: firebaseUser.uid };
    }

    const isAdmin = firebaseUser.email === ADMIN_EMAIL;
    const profile = {
      email: firebaseUser.email,
      role: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'active' : 'pending',
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, profile);
    return { ...profile, uid: firebaseUser.uid };
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const isAdmin = userProfile?.role === 'admin' && userProfile?.status === 'active';
  const isActive = userProfile?.status === 'active';
  const isPending = userProfile?.status === 'pending';
  const isSuspended = userProfile?.status === 'suspended';

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, login, register, logout,
      isAdmin, isActive, isPending, isSuspended, ADMIN_EMAIL,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
