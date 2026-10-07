import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { useToast } from '../components/ToastProvider';

// Protección del lado del cliente: sin sesión válida, redirige a /login.
// La protección real vive en el backend (RequireAdminAccess/
// RequireSuperAdmin en cada request) — esto es solo para que la UI no
// muestre una pantalla que de todos modos va a rechazar cada petición.
// `roles`: si se indica, solo esos roles pueden entrar a la ruta; quien no
// tenga el rol vuelve al inicio con un aviso, en vez de un salto mudo.
export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const { notify } = useToast();
  const forbidden = !loading && isAuthenticated && Boolean(roles) && !roles.includes(role);

  // Un solo aviso por visita, aunque el efecto se ejecute dos veces (StrictMode).
  const warned = useRef(false);
  useEffect(() => {
    if (forbidden && !warned.current) {
      warned.current = true;
      notify('No tienes acceso a esa sección.', { type: 'error' });
    }
  }, [forbidden, notify]);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (forbidden) return <Navigate to="/" replace />;
  return children;
}
