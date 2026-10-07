import { useState } from 'react';
import { Modal } from './Modal';
import { PasswordField } from './PasswordField';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Cambia la contraseña de la propia cuenta. Pide la actual (una equivocación
// responde 403, no 401: no termina la sesión) y valida aquí que la nueva se
// haya escrito igual dos veces. El backend cierra las demás sesiones.
export function ChangePasswordDialog({ onClose, onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (next !== repeat) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.changePassword(current, next);
      await onDone();
    } catch (err) {
      if (err.status === 429 && err.retryAfterSeconds) {
        const minutes = Math.ceil(err.retryAfterSeconds / 60);
        setError(`Demasiados intentos fallidos. Vuelve a intentar en ${minutes} minuto${minutes === 1 ? '' : 's'}.`);
      } else {
        setError(sentence(err.data?.error || err.message));
      }
      setBusy(false);
    }
  }

  return (
    <Modal as="form" className="form" labelledBy="change-password-title" busy={busy} onClose={onClose} onSubmit={onSubmit}>
      <h3 id="change-password-title">Cambiar contraseña</h3>
      <p>Tu sesión actual sigue abierta; las demás se cierran.</p>

      <PasswordField
        label="Contraseña actual"
        autoFocus
        required
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordField
        label="Contraseña nueva"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <PasswordField
        label="Repite la contraseña nueva"
        required
        minLength={8}
        autoComplete="new-password"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'change-password-error' : undefined}
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
      />

      {error && (
        <p id="change-password-error" className="error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Cambiar contraseña
        </button>
      </div>
    </Modal>
  );
}
