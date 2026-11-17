import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { refreshAccessToken } from '../api/axios';

const AuthContext = createContext(null);
const TOKEN_KEY = 'astravox_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // The access token may be missing or expired after a reload; the refresh
    // cookie gets a new one, so a returning user stays signed in for 7 days.
    const restore = async () => {
      try {
        if (!localStorage.getItem(TOKEN_KEY)) await refreshAccessToken();
        const res = await api.get('/auth/profile');
        if (!cancelled) setUser(res.data);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();

    // Fired by the axios layer when a refresh fails mid-session.
    const handleExpired = () => setUser(null);
    window.addEventListener('astravox:session-expired', handleExpired);

    return () => {
      cancelled = true;
      window.removeEventListener('astravox:session-expired', handleExpired);
    };
  }, []);

  const login = useCallback((userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    api.post('/auth/logout').catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
