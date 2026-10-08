import { useState } from 'react';
import { Modal } from './Modal';
import { PasswordField } from './PasswordField';
import { PinField } from './PinField';
import { api } from '../api';
import { PIN_LENGTH, pinError } from '../utils/pin';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Crea o cambia el PIN de la propia cuenta. Sin PIN todavía se confirma con la
// contraseña; con uno, con el PIN actual. Un dato incorrecto responde 403 (no
// 401: el panel cerraría la sesión). `intro` explica por qué aparece cuando el
// diálogo sale en medio de otra acción.
export function SetPinDialog({ hasPin, intro, onClose, onDone }) {
  const [proof, setProof] = useState(''); // contraseña, o PIN actual
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (pin !== repeat) {
      setError('Los PIN nuevos no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.setPin(hasPin ? { current_pin: proof, pin } : { password: proof, pin });
      await onDone();
    } catch (err) {
      setError(pinError(err) || sentence(err.data?.error || err.message));
      setBusy(false);
    }
  }

  return (
    <Modal as="form" className="form" labelledBy="set-pin-title" busy={busy} onClose={onClose} onSubmit={onSubmit}>
      <h3 id="set-pin-title">{hasPin ? 'Cambiar tu PIN' : 'Crea tu PIN'}</h3>
      <p>
        {intro ||
          'El PIN confirma las acciones delicadas del panel, como banear, revocar o rotar claves. Si alguien usa tu sesión abierta, sin tu PIN no puede hacerlas.'}{' '}
        Son {PIN_LENGTH} dígitos.
      </p>

      {hasPin ? (
        <PinField label="PIN actual" autoFocus value={proof} onChange={setProof} />
      ) : (
        <PasswordField
          label="Tu contraseña"
          autoFocus
          required
          autoComplete="current-password"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
        />
      )}
      <PinField label="PIN nuevo" value={pin} onChange={setPin} />
      <PinField
        label="Repite el PIN nuevo"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'set-pin-error' : undefined}
        value={repeat}
        onChange={setRepeat}
      />

      {error && (
        <p id="set-pin-error" className="error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {hasPin ? 'Cambiar PIN' : 'Crear PIN'}
        </button>
      </div>
    </Modal>
  );
}
