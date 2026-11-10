import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { isTokenValid, clearAuthStorage } from '../utils/auth';
import { UserResponse } from '../api/authApi';
import { getUserProfile } from '../api/userApi';
import { AuthPendingScreen } from '../components/LoadingState';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  authError: string | null;
  saveToken: (token: string) => Promise<void>;
  setUser: (user: UserResponse | null) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useRef(localStorage.getItem('access_token'));
  const [token, setToken] = useState<string | null>(isTokenValid(initial.current) ? initial.current : null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isInitializing, setInitializing] = useState(Boolean(token));
  const [authError, setAuthError] = useState<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const inFlight = useRef<{ token: string; promise: Promise<void> }>();
  const logout = useCallback(() => {
    generation.current++;
    inFlight.current = undefined;
    clearAuthStorage(); setToken(null); setUser(null); setInitializing(false); setAuthError(null);
  }, []);
  const saveToken = useCallback((newToken: string): Promise<void> => {
    if (!isTokenValid(newToken)) { logout(); return Promise.reject(new Error('Phiên đăng nhập không hợp lệ.')); }
    if (inFlight.current?.token === newToken) return inFlight.current.promise;
    const version = ++generation.current;
    localStorage.setItem('access_token', newToken);
    setToken(newToken); setUser(null); setInitializing(true); setAuthError(null);
    const promise = (async () => {
      try {
        const response = await Promise.resolve().then(() => getUserProfile());
        if (version !== generation.current || !mounted.current) return;
        if (!response.data) throw new Error('Missing profile');
        setUser(response.data);
        localStorage.setItem('user_email', response.data.email);
      } catch {
        if (version === generation.current && mounted.current) setAuthError('Đăng nhập đã được xác thực nhưng chưa tải được hồ sơ. Bạn có thể thử lại mà không cần đăng nhập lại.');
      } finally {
        if (version === generation.current) { setInitializing(false); inFlight.current = undefined; }
      }
    })();
    inFlight.current = { token: newToken, promise };
    return promise;
  }, [logout]);
  useEffect(() => {
    mounted.current = true;
    if (isTokenValid(initial.current)) void saveToken(initial.current!).catch(logout);
    else clearAuthStorage();
    return () => { mounted.current = false; };
  }, [saveToken, logout]);
  useEffect(() => { window.addEventListener('auth:logout', logout); return () => window.removeEventListener('auth:logout', logout); }, [logout]);
  const isLoggedIn = Boolean(token && isTokenValid(token) && !isInitializing && !authError);
  return <AuthContext.Provider value={{ token, user, isLoggedIn, isInitializing, authError, saveToken, setUser, logout }}>
    <div hidden={isInitializing || Boolean(authError)}>{children}</div>
    {(isInitializing || authError) && <AuthPendingScreen message="Đang chuẩn bị tài khoản của bạn..." error={authError} onRetry={() => { if(token) void saveToken(token).catch(logout); }} onExit={() => { logout(); window.location.assign('/login'); }} />}
  </AuthContext.Provider>;
};
export const useAuth = (): AuthState => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>'); return ctx; };
