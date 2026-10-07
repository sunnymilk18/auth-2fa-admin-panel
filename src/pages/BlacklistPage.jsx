import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';
import { isValidIP } from '../utils/ip';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// "en 12 min" a partir de un instante en segundos Unix.
function untilLabel(unixSeconds) {
  const seconds = Math.round(unixSeconds - Date.now() / 1000);
  if (seconds <= 0) return 'vencido';
  if (seconds < 60) return `en ${seconds} s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return hours < 48 ? `en ${hours} h` : `en ${Math.ceil(hours / 24)} días`;
}

const UNBAN_WARNING =
  'Se levanta el baneo y la IP vuelve a empezar de cero: se borran sus infracciones y su nivel de castigo.';

export function BlacklistPage() {
  const { notify } = useToast();
  const [bans, setBans] = useState(null);
  const [error, setError] = useState('');
  const [unbanInput, setUnbanInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Acción pendiente de confirmar: { title, message, danger, confirmLabel, run }.
  const [confirming, setConfirming] = useState(null);

  async function loadBans() {
    try {
      const res = await api.listBans();
      setBans(res.bans);
      setError('');
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    loadBans();
  }, []);

  // Corre una acción que cambia datos y refresca el listado.
  async function run({ call, success, failure }) {
    setConfirming(null);
    setBusy(true);
    setError('');
    try {
      await call();
      await loadBans();
      notify(success);
      return true;
    } catch (err) {
      setError(sentence(err.data?.error || failure));
      notify(failure, { type: 'error' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function askUnban(ip, onDone) {
    setConfirming({
      title: `Levantar el baneo de "${ip}"`,
      message: UNBAN_WARNING,
      confirmLabel: 'Levantar baneo',
      danger: false,
      run: async () => {
        const ok = await run({
          call: () => api.unbanIP(ip),
          success: `"${ip}" ya no tiene baneo.`,
          failure: `No se pudo levantar el baneo de "${ip}".`,
        });
        if (ok) onDone?.();
      },
    });
  }

  function onUnbanSubmit(e) {
    e.preventDefault();
    const ip = unbanInput.trim();
    if (!ip) return;
    if (!isValidIP(ip)) {
      setError('La IP no tiene un formato válido.');
      return;
    }
    setError('');
    askUnban(ip, () => setUnbanInput(''));
  }

  return (
    <AppShell>
      <PageHeader
        title="Lista negra"
        description="IPs bloqueadas por intentos abusivos, de todos los tenants. Si una IP bloquea a usuarios legítimos, levanta su baneo."
        stat={bans ? { value: bans.length, label: bans.length === 1 ? 'IP baneada' : 'IPs baneadas' } : null}
      />

      <form onSubmit={onUnbanSubmit} className="form form--search">
        <input
          aria-label="IP a la que levantar el baneo"
          placeholder="Levantar el baneo de una IP, p. ej. 203.0.113.7"
          value={unbanInput}
          onChange={(e) => setUnbanInput(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy}>
          Levantar baneo
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {bans === null && !error && <p>Cargando…</p>}
      {bans && bans.length === 0 && (
        <EmptyState icon="shield-check" title="Ninguna IP baneada">
          Cuando una IP supere el límite de intentos fallidos aparecerá aquí, con su nivel y cuándo vence el baneo.
        </EmptyState>
      )}

      {bans && bans.length > 0 && (
        <div className="table-wrap table-wrap--card">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>IP</th>
                <th>Vence</th>
                <th>Nivel</th>
                <th>Infracciones</th>
                <th className="col-secondary">Tenant</th>
                <th className="col-secondary">Referencia</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {bans.map((b) => (
                <tr key={b.ip}>
                  <td className="mono cell-title">{b.ip}</td>
                  <td className="nowrap" data-label="Vence" title={new Date(b.banned_until * 1000).toLocaleString()}>
                    {untilLabel(b.banned_until)}
                  </td>
                  <td data-label="Nivel">{b.level}</td>
                  <td data-label="Infracciones">{b.strikes}</td>
                  <td
                    className="mono cell-dim col-secondary"
                    data-label="Tenant"
                    title={b.api_client_name ? `${b.api_client_name} (${b.api_client_id})` : b.api_client_id || 'Sin tenant asociado'}
                  >
                    {b.api_client_id ? b.api_client_name || `${b.api_client_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="mono cell-dim col-secondary" data-label="Referencia">{b.reference || '—'}</td>
                  <td className="row-actions">
                    <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => askUnban(b.ip)}>
                      Levantar baneo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.title}
        message={confirming?.message}
        confirmLabel={confirming?.confirmLabel}
        danger={confirming?.danger}
        onConfirm={confirming?.run}
        onCancel={() => setConfirming(null)}
      />
    </AppShell>
  );
}
