import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Inicia la corrección del correo de un usuario. El backend NO cambia nada
// todavía: envía un código al correo nuevo y el cambio se aplica cuando la
// persona lo confirma. El administrador nunca ve ese código.
export function ChangeEmailDialog({ user, onClose, onDone }) {
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const email = newEmail.trim();
    setBusy(true);
    setError('');
    try {
      await api.changeUserEmail(user.id, email);
      await onDone(email);
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
      setBusy(false);
    }
  }

  return (
    <Modal as="form" className="form" labelledBy="change-email-title" busy={busy} onClose={onClose} onSubmit={onSubmit}>
      <h3 id="change-email-title">Corregir correo</h3>
      <p className="mono dialog-subject">{user.email}</p>
      <p>
        Se envía un código al correo nuevo. El cambio se aplica cuando la persona lo confirme; tú no ves el código.
      </p>

      <label>
        Correo nuevo
        <input
          autoFocus
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'change-email-error' : undefined}
          required
          type="email"
          autoComplete="off"
          placeholder="persona@empresa.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </label>

      {error && <p id="change-email-error" className="error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Enviar código
        </button>
      </div>
    </Modal>
  );
}
