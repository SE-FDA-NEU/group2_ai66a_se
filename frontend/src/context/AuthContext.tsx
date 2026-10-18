import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isTokenValid, clearAuthStorage } from '../utils/auth';
import { UserResponse } from '../api/authApi';
import { getUserProfile } from '../api/userApi';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isLoggedIn: boolean;
  saveToken: (token: string) => void;
  setUser: (user: UserResponse | null) => void;
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

  const [user, setUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    if (token && isTokenValid(token)) {
      localStorage.setItem('access_token', token);
      // Tự động tải thông tin hồ sơ người dùng nếu chưa có
      if (!user) {
        getUserProfile()
          .then((res) => {
            if (res.data) setUser(res.data);
          })
          .catch((err) => {
            console.error('Không thể tải hồ sơ người dùng:', err);
          });
      }
    } else {
      clearAuthStorage();
      setUser(null);
    }
  }, [token, user]);

  const saveToken = useCallback((newToken: string) => {
    if (isTokenValid(newToken)) {
      setToken(newToken);
    } else {
      clearAuthStorage();
      setToken(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
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
        user,
        isLoggedIn,
        saveToken,
        setUser,
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
