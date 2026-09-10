import { createContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  loginWithGoogle as serviceLoginWithGoogle,
  loginWithEmail as serviceLoginWithEmail,
  registerWithEmail as serviceRegisterWithEmail,
  logout as serviceLogout,
} from '../services/authService';
import { calculateProfileCompleteness } from '../utils/profileVerification';

export const AuthContext = createContext({
  user: null,
  userProfile: null,
  isVerified: false,
  profileCompleteness: 0,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    // Listen for authentication changes
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (currentUser?.uid) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        profileUnsub = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserProfile(data);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.warn('Profile listener error:', err);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const loginWithGoogle = async () => {
    return await serviceLoginWithGoogle();
  };

  const loginWithEmail = async (email, password) => {
    return await serviceLoginWithEmail(email, password);
  };

  const registerWithEmail = async (email, password, displayName) => {
    return await serviceRegisterWithEmail(email, password, displayName);
  };

  const logout = async () => {
    return await serviceLogout();
  };

  // Derive verification metrics from userProfile or fallback calculation
  const verificationMetrics = useMemo(() => {
    if (!userProfile) {
      return { isVerified: false, percentage: 0 };
    }
    const res = calculateProfileCompleteness(userProfile);
    return {
      isVerified: Boolean(userProfile.isVerified ?? res.isVerified),
      percentage: userProfile.profileCompleteness ?? res.percentage,
    };
  }, [userProfile]);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      isVerified: verificationMetrics.isVerified,
      profileCompleteness: verificationMetrics.percentage,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
    }),
    [user, userProfile, verificationMetrics, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
