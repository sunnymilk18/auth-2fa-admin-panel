import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Los mensajes de la API vienen en minúscula y sin punto final.
function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export function LoginPage() {
  const { isAuthenticated, loading: sessionLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ya hay sesión (recargaste la página estando logueado): directo adentro.
  if (!sessionLoading && isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, totpCode);
    } catch (err) {
      if (err.status === 429 && err.retryAfterSeconds) {
        const minutes = Math.ceil(err.retryAfterSeconds / 60);
        setError(`Demasiados intentos fallidos. Vuelve a intentar en ${minutes} minuto${minutes === 1 ? '' : 's'}.`);
      } else {
        setError(sentence(err.data?.error || err.message));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Panel de administración</h1>
        <p className="subtitle">Inicia sesión con tu cuenta de operador.</p>

        <form onSubmit={onSubmit} className="form">
          <label>
            Correo
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Código de la app autenticadora
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              className="mono"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
