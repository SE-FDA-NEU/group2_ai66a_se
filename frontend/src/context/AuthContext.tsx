import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isTokenValid, clearAuthStorage } from '../utils/auth';

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  saveToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('access_token');
    if (isTokenValid(savedToken)) {
      return savedToken;
    }
    clearAuthStorage();
    return null;
  });

  useEffect(() => {
    if (token && isTokenValid(token)) {
      localStorage.setItem('access_token', token);
    } else {
      clearAuthStorage();
    }
  }, [token]);

  const saveToken = useCallback((newToken: string) => {
    if (isTokenValid(newToken)) {
      setToken(newToken);
    } else {
      clearAuthStorage();
      setToken(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, [logout]);

  const isLoggedIn = Boolean(token && isTokenValid(token));

  return (
    <AuthContext.Provider
      value={{
        token,
        isLoggedIn,
        saveToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
