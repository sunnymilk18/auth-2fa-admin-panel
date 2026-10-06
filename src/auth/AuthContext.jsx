import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, configureAuth } from '../api';

const AuthContext = createContext(null);

// No hay access_token ni refresh_token que manejar acá: la sesión entera
// vive en la cookie httpOnly que pone el backend, invisible para este
// código. Lo único que este contexto guarda en memoria es quién está
// logueado y con qué rol (identity), que se recupera llamando a
// GET /admin/auth/me — al cargar la página, y después de login/logout.
export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(null); // { actor, role } | null
  const [loading, setLoading] = useState(true);

  const refreshIdentity = useCallback(async () => {
    try {
      const me = await api.me();
      setIdentity(me);
      return me;
    } catch {
      setIdentity(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshIdentity().finally(() => setLoading(false));
  }, [refreshIdentity]);

  // Un 401 a mitad de uso (sesión expirada, o revocada por otro
  // superadmin) limpia la identidad local — ProtectedRoute hace el resto.
  useEffect(() => {
    configureAuth({ onUnauthorized: () => setIdentity(null) });
  }, []);

  async function login(email, password, totpCode) {
    await api.login({ email, password, totp_code: totpCode });
    await refreshIdentity();
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // best-effort: igual limpiamos la sesión local
    }
    setIdentity(null);
  }

  const value = {
    actor: identity?.actor || null,
    role: identity?.role || null,
    isAuthenticated: Boolean(identity),
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
