import { useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';
import { api } from '../api';
import { SOURCE_HINTS, alertSubject, featureRows, scoreLabel, sourceTitle, stateInfo, windowLabel } from '../utils/alerts';

const MAX_NOTE = 1000;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

const whenLabel = (iso) =>
  new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// Detalle de una alerta: por qué se generó, cómo se veía la ventana y, si sigue abierta,
// las dos formas de cerrarla. Ninguna pide PIN: cerrar una alerta no le quita acceso a nadie.
// `onClose({ reload })`: reload es true cuando conviene volver a pedir la lista (la alerta
// cambió o ya estaba cerrada).
export function AlertDetailDialog({ alert, onClose }) {
  const { notify } = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  const state = stateInfo(alert.state);
  const subject = alertSubject(alert);
  const isOpen = alert.state === 'abierta' && !stale;
  const features = featureRows(alert.features);

  async function close(action, doneMessage) {
    setBusy(true);
    setError('');
    try {
      await action(alert.id, note.trim());
      notify(doneMessage);
      onClose({ reload: true });
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
      // 409: otra persona ya la cerró. El detalle sigue a la vista, pero la lista está desactualizada.
      if (err.status === 409) setStale(true);
      setBusy(false);
    }
  }

  return (
    <Modal labelledBy="alert-title" busy={busy} className="alert-dialog" onClose={() => onClose({ reload: stale })}>
      <h3 id="alert-title">{sourceTitle(alert.source)}</h3>
      <p className={`dialog-subject${subject.mono ? ' mono' : ''}`}>
        {subject.main}
        <span className="alert-subject-sub">{subject.sub}</span>
      </p>

      <p className="alert-meta">
        <span className="alert-meta-item">
          <span className={`status-dot status-dot--${stale && alert.state === 'abierta' ? 'off' : state.tone}`} />
          {alert.state === 'abierta' && stale ? 'Ya no está abierta' : state.label}
        </span>
        <span className="alert-meta-item mono" title={`${alert.window_start} a ${alert.window_end}`}>
          {windowLabel(alert.window_start, alert.window_end)}
        </span>
      </p>

      <h4 className="alert-section">Por qué se generó</h4>
      <p className="alert-hint">{SOURCE_HINTS[alert.source] || ''}</p>
      <ul className="alert-motives">
        {(alert.motives || []).map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      {alert.score !== null && alert.score !== undefined && (
        <p className="alert-score-line">
          Puntaje de aislamiento <span className="mono">{scoreLabel(alert.score)}</span>
          <span className="alert-hint-inline"> (cerca de 1 es muy anómalo)</span>
        </p>
      )}

      <h4 className="alert-section">La ventana en cifras</h4>
      <dl className="alert-features">
        {features.map((f) => (
          <div key={f.key} className={f.value > 0 && f.key !== 'correctos' ? 'is-hit' : undefined}>
            <dt>{f.label}</dt>
            <dd className="mono">{f.value}</dd>
          </div>
        ))}
      </dl>

      {alert.state !== 'abierta' && (
        <div className="alert-closure">
          <h4 className="alert-section">Cierre</h4>
          <p>
            {state.label} el {alert.resolved_at ? whenLabel(alert.resolved_at) : '—'}{' '}
            {alert.resolved_by ? (
              <>
                por <span className="mono">{alert.resolved_by}</span>.
              </>
            ) : (
              'por la credencial compartida, que no es una cuenta de operador.'
            )}
          </p>
          {alert.note && <p className="alert-note">{alert.note}</p>}
        </div>
      )}

      {isOpen && (
        <label className="alert-note-field">
          Nota (opcional)
          <textarea
            data-autofocus
            rows={3}
            maxLength={MAX_NOTE}
            value={note}
            placeholder="Qué revisaste o por qué la cierras"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onClose({ reload: stale })}>
          Cerrar
        </button>
        {isOpen && (
          <>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => close(api.dismissAlert, 'Alerta descartada.')}>
              Descartar
            </button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => close(api.resolveAlert, 'Alerta marcada como resuelta.')}>
              Marcar resuelta
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
