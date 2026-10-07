import { useState } from 'react';
import { Modal } from './Modal';
import { PasswordField } from './PasswordField';
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
    <Modal as="form" className="form" labelledBy="reactivate-title" busy={busy} onClose={onClose} onSubmit={onSubmit}>
      <h3 id="reactivate-title">Reactivar la cuenta de "{account.email}"</h3>
      <p>
        La cuenta vuelve con una contraseña nueva y un código TOTP nuevo: la persona tendrá que registrar de nuevo su
        app autenticadora. Las credenciales anteriores dejan de funcionar.
      </p>

      <PasswordField
        label="Contraseña nueva"
        autoFocus
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'reactivate-error' : undefined}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p id="reactivate-error" className="error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Reactivar cuenta
        </button>
      </div>
    </Modal>
  );
}
