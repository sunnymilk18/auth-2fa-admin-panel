import { useEffect, useState } from 'react';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Pide la contraseña nueva para reactivar una cuenta revocada. La cuenta no
// vuelve con sus credenciales anteriores: el backend rota también el secreto
// TOTP y lo devuelve una sola vez (onDone recibe esa respuesta).
export function ReactivateDialog({ account, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, busy]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.reactivateAccount(account.id, password);
      await onDone(res);
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
      setBusy(false);
    }
  }

  return (
    <div className="dialog-overlay" role="presentation" onClick={() => !busy && onClose()}>
      <form
        className="dialog form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reactivate-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h3 id="reactivate-title">Reactivar la cuenta de "{account.email}"</h3>
        <p>
          La cuenta vuelve con una contraseña nueva y un código TOTP nuevo: la persona tendrá que registrar de nuevo su
          app autenticadora. Las credenciales anteriores dejan de funcionar.
        </p>

        <label>
          Contraseña nueva
          <input
            autoFocus
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Reactivar cuenta
          </button>
        </div>
      </form>
    </div>
  );
}
