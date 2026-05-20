import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'mediamtxAdminToken';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  authError: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Listen for 401 unauthorized events from the API client
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setAuthError(detail || 'Token inválido o caducado');
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback((newToken: string) => {
    sessionStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: token !== null, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
