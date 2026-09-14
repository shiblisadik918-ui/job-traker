import { createContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  loginWithGoogle as serviceLoginWithGoogle,
  loginWithEmail as serviceLoginWithEmail,
  registerWithEmail as serviceRegisterWithEmail,
  logout as serviceLogout,
  connectGoogleDriveAccount,
  getCachedGoogleAccessToken,
  setManualGoogleAccessToken,
  getGoogleDriveConnectionInfo,
  disconnectGoogleDriveAccount,
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
  connectGoogleDrive: async () => {},
  manualConnectGoogleDrive: async () => {},
  disconnectGoogleDrive: () => {},
  getGoogleAccessToken: () => null,
  hasGoogleDriveAccess: false,
  driveConnectionInfo: null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasDriveToken, setHasDriveToken] = useState(() => Boolean(getCachedGoogleAccessToken()));
  const [driveConnectionInfo, setDriveConnectionInfo] = useState(() => getGoogleDriveConnectionInfo());

  useEffect(() => {
    // Listen for manual drive connection / disconnection changes
    const handleDriveAuthChange = (e) => {
      const isConn = Boolean(e?.detail?.isConnected);
      setHasDriveToken(isConn);
      setDriveConnectionInfo(getGoogleDriveConnectionInfo());
    };

    window.addEventListener('jobtrack:drive-auth-changed', handleDriveAuthChange);
    return () => window.removeEventListener('jobtrack:drive-auth-changed', handleDriveAuthChange);
  }, []);

  useEffect(() => {
    let profileUnsub = null;

    // Listen for authentication changes
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHasDriveToken(false);
      }

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
    const res = await serviceLoginWithGoogle();
    if (res.accessToken) {
      setHasDriveToken(true);
    }
    return res;
  };

  const connectGoogleDrive = async () => {
    const res = await connectGoogleDriveAccount();
    if (res.accessToken) {
      setHasDriveToken(true);
      setDriveConnectionInfo(getGoogleDriveConnectionInfo());
    }
    return res;
  };

  const manualConnectGoogleDrive = async (token, customEmail) => {
    const res = await setManualGoogleAccessToken(token, customEmail);
    if (res.success) {
      setHasDriveToken(true);
      setDriveConnectionInfo(getGoogleDriveConnectionInfo());
    }
    return res;
  };

  const disconnectGoogleDrive = () => {
    disconnectGoogleDriveAccount();
    setHasDriveToken(false);
    setDriveConnectionInfo(getGoogleDriveConnectionInfo());
  };

  const getGoogleAccessToken = () => {
    return getCachedGoogleAccessToken();
  };

  const loginWithEmail = async (email, password) => {
    return await serviceLoginWithEmail(email, password);
  };

  const registerWithEmail = async (email, password, displayName) => {
    return await serviceRegisterWithEmail(email, password, displayName);
  };

  const logout = async () => {
    disconnectGoogleDriveAccount();
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
      hasGoogleDriveAccess: hasDriveToken || Boolean(getCachedGoogleAccessToken()),
      driveConnectionInfo,
      connectGoogleDrive,
      manualConnectGoogleDrive,
      disconnectGoogleDrive,
      getGoogleAccessToken,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
    }),
    [user, userProfile, verificationMetrics, loading, hasDriveToken, driveConnectionInfo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
