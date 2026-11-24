import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token);
    setUser(d.user);
  };

  const value = {
    user,
    loading,
    login: (email, password) => signIn('/auth/login', { email, password }),
    register: (name, email, password) => signIn('/auth/register', { name, email, password }),
    logout: () => {
      setToken(null);
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
