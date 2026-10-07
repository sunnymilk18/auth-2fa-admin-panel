import { useState } from 'react';
import { Modal } from './Modal';
import { PasswordField } from './PasswordField';
import { QrCode } from './QrCode';
import { OneTimeSecret } from './OneTimeSecret';
import { api } from '../api';
import { secretFrom } from '../utils/totp';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

function messageFor(err) {
  if (err.status === 429 && err.retryAfterSeconds) {
    const minutes = Math.ceil(err.retryAfterSeconds / 60);
    return `Demasiados intentos fallidos. Vuelve a intentar en ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
  }
  return sentence(err.data?.error || err.message);
}

// Reemplaza el código TOTP de la propia cuenta, en dos pasos. Primero la
// contraseña: el backend genera un secreto nuevo pero no lo activa. Después se
// registra en la app autenticadora y se confirma con un código suyo; recién
// ahí reemplaza al anterior. Si se cierra a mitad de camino, el secreto
// pendiente caduca solo y el código actual sigue funcionando.
export function RotateTotpDialog({ onClose, onDone }) {
  const [step, setStep] = useState('password'); // 'password' | 'scan'
  const [password, setPassword] = useState('');
  const [otpauthURL, setOtpauthURL] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onStart(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.startTotpRotation(password);
      setOtpauthURL(res.otpauth_url);
      setPassword('');
      setStep('scan');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.confirmTotpRotation(code.trim());
      await onDone();
    } catch (err) {
      setError(
        err.status === 404
          ? 'La rotación venció. Cierra este cuadro y vuelve a empezar.'
          : messageFor(err)
      );
      setBusy(false);
    }
  }

  if (step === 'password') {
    return (
      <Modal as="form" className="form" labelledBy="rotate-totp-title" busy={busy} onClose={onClose} onSubmit={onStart}>
        <h3 id="rotate-totp-title">Rotar tu código TOTP</h3>
        <p>
          Registrarás un código nuevo en tu app autenticadora. Hasta que lo confirmes, el actual sigue funcionando.
          Al terminar, el anterior deja de servir y se cierran tus otras sesiones.
        </p>

        <PasswordField
          label="Tu contraseña"
          autoFocus
          required
          autoComplete="current-password"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'rotate-totp-error' : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p id="rotate-totp-error" className="error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Continuar
          </button>
        </div>
      </Modal>
    );
  }

  const secret = secretFrom(otpauthURL);
  return (
    <Modal as="form" className="form dialog--wide" labelledBy="rotate-totp-title" busy={busy} onClose={onClose} onSubmit={onConfirm}>
      <h3 id="rotate-totp-title">Registra el código nuevo</h3>
      <p>
        Escanea el QR con tu app autenticadora y escribe el código de 6 dígitos que muestra para confirmar el cambio.
        No se puede volver a mostrar.
      </p>

      <div className="totp-scan">
        <QrCode value={otpauthURL} alt="Código QR para registrar el TOTP nuevo en tu app autenticadora" />
        {secret && <OneTimeSecret wrap label="O ingresa esta clave a mano en la app" value={secret} />}
      </div>

      <label>
        Código de 6 dígitos
        <input
          autoFocus
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'rotate-totp-error' : undefined}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </label>

      {error && (
        <p id="rotate-totp-error" className="error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy || code.length !== 6}>
          Confirmar cambio
        </button>
      </div>
    </Modal>
  );
}
