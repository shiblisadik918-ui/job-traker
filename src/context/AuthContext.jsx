import { createContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  loginWithGoogle as serviceLoginWithGoogle,
  loginWithEmail as serviceLoginWithEmail,
  registerWithEmail as serviceRegisterWithEmail,
  logout as serviceLogout,
} from '../services/authService';

export const AuthContext = createContext({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
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

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
