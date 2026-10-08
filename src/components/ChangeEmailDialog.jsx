import { useState } from 'react';
import { Modal } from './Modal';
import { PinField } from './PinField';
import { PinRequired } from './PinRequired';
import { api } from '../api';
import { pinError } from '../utils/pin';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Inicia la corrección del correo de un usuario. El backend NO cambia nada
// todavía: envía un código al correo nuevo y el cambio se aplica cuando la
// persona lo confirma. El administrador nunca ve ese código.
export function ChangeEmailDialog(props) {
  return (
    <PinRequired onClose={props.onClose}>
      <ChangeEmailForm {...props} />
    </PinRequired>
  );
}

function ChangeEmailForm({ user, onClose, onDone }) {
  const [newEmail, setNewEmail] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const email = newEmail.trim();
    setBusy(true);
    setError('');
    try {
      await api.changeUserEmail(user.id, email, pin);
      await onDone(email);
    } catch (err) {
      const pinMessage = pinError(err);
      if (pinMessage) setPin('');
      setError(pinMessage || sentence(err.data?.error || err.message));
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

      <PinField
        value={pin}
        onChange={setPin}
      />

      {error && <p id="change-email-error" className="error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy || pin.length !== 6}>
          Enviar código
        </button>
      </div>
    </Modal>
  );
}
