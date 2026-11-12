import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from '../lib/api.js';

const AuthContext = createContext(null);

// status: 'loading' (restaurando sesión) | 'authenticated' | 'guest'
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ status: 'loading', user: null });

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear(); // nada de la sesión anterior debe quedar en memoria
    setState({ status: 'guest', user: null });
  }, [queryClient]);

  // Al abrir la app: intenta recuperar la sesión con la cookie de refresh
  useEffect(() => {
    let active = true;
    setSessionExpiredHandler(clearSession);
    refreshSession()
      .then(({ user }) => active && setState({ status: 'authenticated', user }))
      .catch(() => active && setState({ status: 'guest', user: null }));
    return () => {
      active = false;
    };
  }, [clearSession]);

  const startSession = useCallback(({ accessToken, user }) => {
    setAccessToken(accessToken);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password }, { auth: false });
      return startSession(data);
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { auth: false });
    } catch {
      // aunque falle la red, la sesión local se cierra igual
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ ...state, login, logout, startSession, clearSession }),
    [state, login, logout, startSession, clearSession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
