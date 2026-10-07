import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';
import { isValidIP } from '../utils/ip';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// IPs que nunca se sancionan ni se banean. La exención es global (vale para todos
// los tenants), por eso es solo de superadmin.
export function AllowlistPage() {
  const { notify } = useToast();
  const [ips, setIps] = useState(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);

  async function load() {
    try {
      const res = await api.listAllowlist();
      setIps(res.ips);
      setError('');
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Corre una acción que cambia datos y refresca la lista.
  async function run({ call, success, failure }) {
    setConfirming(null);
    setBusy(true);
    setError('');
    try {
      await call();
      await load();
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

  function onSubmit(e) {
    e.preventDefault();
    const ip = input.trim();
    if (!ip) return;
    if (!isValidIP(ip)) {
      setError('La IP no tiene un formato válido.');
      return;
    }
    setError('');
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
        });
        if (ok) setInput('');
      },
    });
  }

  function onRemove(ip) {
    run({
      call: () => api.removeAllowlist(ip),
      success: `"${ip}" quitada de la lista blanca.`,
      failure: `No se pudo quitar "${ip}" de la lista blanca.`,
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Lista blanca"
        badge={<span className="role-badge role-badge--superadmin">superadmin</span>}
        description="IPs que nunca se sancionan ni se banean. La exención vale para toda la plataforma, no solo para un tenant."
        stat={ips ? { value: ips.length, label: ips.length === 1 ? 'IP exenta' : 'IPs exentas' } : null}
      />

      <form onSubmit={onSubmit} className="form form--search">
        <input
          aria-label="IP a agregar a la lista blanca"
          placeholder="IP a eximir, p. ej. 203.0.113.7"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy}>
          Agregar
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {ips === null && !error && <ListSkeleton />}
      {ips && ips.length === 0 && (
        <EmptyState icon="shield" title="La lista blanca está vacía">
          Agrega una IP para que nunca se sancione ni se banee. Úsalo con cuidado: la exención vale para toda la
          plataforma.
        </EmptyState>
      )}

      {ips && ips.length > 0 && (
        <div className="table-wrap table-wrap--card">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>IP</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {ips.map((ip) => (
                <tr key={ip}>
                  <td className="mono cell-title">{ip}</td>
                  <td className="row-actions">
                    <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onRemove(ip)}>
                      Quitar
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
