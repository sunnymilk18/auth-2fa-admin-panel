import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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
  // true cuando la sesión terminó a mitad de uso (un 401 con la sesión abierta):
  // la pantalla de login lo explica en vez de aparecer sin motivo.
  const [sessionExpired, setSessionExpired] = useState(false);
  const identityRef = useRef(null);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

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
    configureAuth({
      onUnauthorized: () => {
        // Solo si había sesión: un 401 al cargar la página sin sesión no es una caducidad.
        if (identityRef.current) setSessionExpired(true);
        setIdentity(null);
      },
    });
  }, []);

  async function login(email, password, totpCode) {
    await api.login({ email, password, totp_code: totpCode });
    setSessionExpired(false);
    // La pantalla de inicio da la bienvenida con una animación solo tras un inicio de sesión.
    try {
      sessionStorage.setItem('welcome-intro', '1');
    } catch {
      // sin almacenamiento: simplemente no hay animación
    }
    await refreshIdentity();
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // best-effort: igual limpiamos la sesión local
    }
    setSessionExpired(false);
    setIdentity(null);
  }

  const value = {
    actor: identity?.actor || null,
    role: identity?.role || null,
    isAuthenticated: Boolean(identity),
    loading,
    sessionExpired,
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
