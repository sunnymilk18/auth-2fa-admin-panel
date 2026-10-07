import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

function remaining(seconds) {
  if (seconds < 60) return `${Math.max(1, seconds)} s`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.ceil(minutes / 60)} h`;
}

function Row({ label, status }) {
  return (
    <li>
      <span>{label}</span>
      <span className="lockout-state">
        <span className={`status-dot status-dot--${status.locked ? 'bad' : 'ok'}`} />
        {status.locked ? `Bloqueado, faltan ${remaining(status.retry_after_seconds)}` : 'Sin bloqueo'}
      </span>
    </li>
  );
}

// Muestra si el login y el PIN de un usuario están bloqueados por intentos
// fallidos, y permite limpiar ambos contadores.
export function LockoutsDialog({ user, onClose }) {
  const { notify } = useToast();
  const [lockouts, setLockouts] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setError('');
    try {
      setLockouts(await api.getUserLockouts(user.id));
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function onClear() {
    setBusy(true);
    try {
      await api.clearUserLockouts(user.id);
      notify(`Bloqueos de "${user.email}" limpiados.`);
      await load();
    } catch (err) {
      notify(`No se pudieron limpiar los bloqueos de "${user.email}".`, { type: 'error' });
      setError(sentence(err.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  }

  const anyLocked = lockouts && (lockouts.login.locked || lockouts.pin.locked);

  return (
    <Modal labelledBy="lockouts-title" onClose={onClose} busy={busy}>
      <h3 id="lockouts-title">Bloqueos</h3>
      <p className="mono dialog-subject">{user.email}</p>

      {error && <p className="error">{error}</p>}
      {!lockouts && !error && <p>Cargando…</p>}

      {lockouts && (
        <ul className="lockout-list">
          <Row label="Inicio de sesión" status={lockouts.login} />
          <Row label="PIN" status={lockouts.pin} />
        </ul>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
        {anyLocked && (
          <button type="button" className="btn btn--primary" disabled={busy} onClick={onClear}>
            Limpiar bloqueos
          </button>
        )}
      </div>
    </Modal>
  );
}
