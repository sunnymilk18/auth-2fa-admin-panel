import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Misma regla que el backend (net.ParseIP): IPv4 con octetos 0-255, o IPv6.
function isValidIP(value) {
  if (/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value)) {
    return value.split('.').every((octet) => Number(octet) <= 255);
  }
  if (!value.includes(':')) return false;
  try {
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
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
  const { role } = useAuth();
  const { notify } = useToast();
  const isSuperadmin = role === 'superadmin';

  const [bans, setBans] = useState(null);
  const [allowlist, setAllowlist] = useState(null);
  const [error, setError] = useState('');
  const [allowError, setAllowError] = useState('');

  const [unbanInput, setUnbanInput] = useState('');
  const [allowInput, setAllowInput] = useState('');
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

  async function loadAllowlist() {
    try {
      const res = await api.listAllowlist();
      setAllowlist(res.ips);
      setAllowError('');
    } catch (err) {
      setAllowError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    loadBans();
    if (isSuperadmin) loadAllowlist();
  }, [isSuperadmin]);

  // Corre una acción que cambia datos y refresca lo que se ve en pantalla.
  async function run({ call, success, failure, setErr, refresh }) {
    setConfirming(null);
    setBusy(true);
    setErr('');
    try {
      await call();
      await refresh();
      notify(success);
      return true;
    } catch (err) {
      setErr(sentence(err.data?.error || failure));
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
          setErr: setError,
          refresh: loadBans,
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

  function onAllowSubmit(e) {
    e.preventDefault();
    const ip = allowInput.trim();
    if (!ip) return;
    if (!isValidIP(ip)) {
      setAllowError('La IP no tiene un formato válido.');
      return;
    }
    setAllowError('');
    setConfirming({
      title: `Agregar "${ip}" a la lista blanca`,
      message:
        'Esta IP nunca más se sancionará ni se baneará, en ningún tenant de la plataforma. Si hoy tiene un baneo activo, también se levanta.',
      confirmLabel: 'Agregar a la lista blanca',
      danger: true,
      run: async () => {
        const ok = await run({
          call: () => api.addAllowlist(ip),
          success: `"${ip}" agregada a la lista blanca.`,
          failure: `No se pudo agregar "${ip}" a la lista blanca.`,
          setErr: setAllowError,
          refresh: async () => {
            await Promise.all([loadAllowlist(), loadBans()]);
          },
        });
        if (ok) setAllowInput('');
      },
    });
  }

  function onRemoveAllowed(ip) {
    run({
      call: () => api.removeAllowlist(ip),
      success: `"${ip}" quitada de la lista blanca.`,
      failure: `No se pudo quitar "${ip}" de la lista blanca.`,
      setErr: setAllowError,
      refresh: loadAllowlist,
    });
  }

  return (
    <AppShell>
      <div className="page-header">
        <h2>Blacklist</h2>
      </div>

      <section>
        <div className="section-heading">
          <h3>Baneos activos</h3>
        </div>
        <p className="section-note">
          IPs bloqueadas por intentos abusivos, de todos los tenants. Si una IP bloquea a usuarios legítimos, levanta
          su baneo.
        </p>

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

        {error && <p className="error">{error}</p>}
        {bans === null && !error && <p>Cargando…</p>}
        {bans && bans.length === 0 && <p>No hay baneos activos.</p>}

        {bans && bans.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Vence</th>
                  <th>Nivel</th>
                  <th>Infracciones</th>
                  <th className="col-secondary">Tenant</th>
                  <th className="col-secondary">Referencia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.ip}>
                    <td className="mono">{b.ip}</td>
                    <td className="nowrap" title={new Date(b.banned_until * 1000).toLocaleString()}>{untilLabel(b.banned_until)}</td>
                    <td>{b.level}</td>
                    <td>{b.strikes}</td>
                    <td className="mono cell-dim col-secondary" title={b.api_client_id || 'Sin tenant asociado'}>
                      {b.api_client_id ? `${b.api_client_id.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="mono cell-dim col-secondary">{b.reference || '—'}</td>
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
      </section>

      {isSuperadmin && (
        <section className="page-section">
          <div className="section-heading">
            <h3>Lista blanca</h3>
            <span className="role-badge role-badge--superadmin">superadmin</span>
          </div>
          <p className="section-note">
            IPs que nunca se sancionan ni se banean. La exención vale para toda la plataforma, no solo para un tenant.
          </p>

          <form onSubmit={onAllowSubmit} className="form form--search">
            <input
              aria-label="IP a agregar a la lista blanca"
              placeholder="IP a eximir, p. ej. 203.0.113.7"
              value={allowInput}
              onChange={(e) => setAllowInput(e.target.value)}
            />
            <button type="submit" className="btn" disabled={busy}>
              Agregar
            </button>
          </form>

          {allowError && <p className="error">{allowError}</p>}
          {allowlist === null && !allowError && <p>Cargando…</p>}
          {allowlist && allowlist.length === 0 && <p>La lista blanca está vacía.</p>}

          {allowlist && allowlist.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allowlist.map((ip) => (
                    <tr key={ip}>
                      <td className="mono">{ip}</td>
                      <td className="row-actions">
                        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onRemoveAllowed(ip)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
