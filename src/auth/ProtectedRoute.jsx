import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Protección del lado del cliente: sin sesión válida, redirige a /login.
// La protección real vive en el backend (RequireAdminAccess/
// RequireSuperAdmin en cada request) — esto es solo para que la UI no
// muestre una pantalla que de todos modos va a rechazar cada petición.
// `roles`: si se indica, solo esos roles pueden entrar a la ruta.
export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <p>Cargando…</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
