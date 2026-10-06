import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { OneTimeSecret } from '../components/OneTimeSecret';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export function ClientsPage() {
  const { notify } = useToast();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyID, setBusyID] = useState(null); // id en medio de activar/desactivar/rotar
  // { name, apiKey } del último create/rotate — se muestra una sola vez.
  const [revealedKey, setRevealedKey] = useState(null);
  // id de la fila a resaltar brevemente tras crearla o rotarle la key.
  const [highlightID, setHighlightID] = useState(null);
  // Acción pendiente de confirmar: { title, message, danger, confirmLabel, run }.
  const [confirming, setConfirming] = useState(null);

  async function load() {
    setError('');
    try {
      const list = await api.listClients();
      // El backend devuelve más antiguo primero; acá importa ver lo más
      // reciente arriba, cerca de donde aparece la key recién creada.
      setClients([...list].reverse());
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function flash(id) {
    setHighlightID(id);
    setTimeout(() => setHighlightID(null), 2200);
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    try {
      const client = await api.createClient(newName.trim());
      setRevealedKey({ name: client.name, apiKey: client.api_key });
      setNewName('');
      setCreating(false);
      await load();
      flash(client.id);
      notify(`"${client.name}" creado.`);
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  function onToggleActive(client) {
    if (!client.active) {
      runToggleActive(client);
      return;
    }
    setConfirming({
      title: `Desactivar "${client.name}"`,
      message: 'Su API key deja de funcionar al instante. Puedes reactivarlo cuando quieras.',
      confirmLabel: 'Desactivar',
      danger: true,
      run: () => runToggleActive(client),
    });
  }

  async function runToggleActive(client) {
    setConfirming(null);
    setBusyID(client.id);
    setError('');
    try {
      if (client.active) await api.deactivateClient(client.id);
      else await api.activateClient(client.id);
      await load();
      flash(client.id);
      notify(`"${client.name}" ${client.active ? 'desactivado' : 'activado'}.`);
    } catch (err) {
      setError(sentence(err.data?.error || `no se pudo ${client.active ? 'desactivar' : 'activar'} el cliente`));
      notify(`No se pudo ${client.active ? 'desactivar' : 'activar'} "${client.name}".`, { type: 'error' });
    } finally {
      setBusyID(null);
    }
  }

  function onRotate(client) {
    setConfirming({
      title: `Rotar la API key de "${client.name}"`,
      message: 'La key anterior deja de funcionar al instante.',
      confirmLabel: 'Rotar key',
      danger: true,
      run: async () => {
        setConfirming(null);
        setBusyID(client.id);
        setError('');
        try {
          const res = await api.rotateClient(client.id);
          setRevealedKey({ name: client.name, apiKey: res.api_key });
          flash(client.id);
          notify(`Key de "${client.name}" rotada.`);
        } catch (err) {
          setError(sentence(err.data?.error || err.message));
          notify(`No se pudo rotar la key de "${client.name}".`, { type: 'error' });
        } finally {
          setBusyID(null);
        }
      },
    });
  }

  return (
    <AppShell>
      <div className="page-header">
        <h2>Clients</h2>
        <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancelar' : 'Nuevo client'}
        </button>
      </div>

      {creating && (
        <form onSubmit={onCreate} className="form form--inline">
          <label>
            Nombre
            <input
              autoFocus
              required
              placeholder="p. ej. empresa-backend"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--primary">
            Crear
          </button>
        </form>
      )}

      {revealedKey && (
        <OneTimeSecret label={`API key de "${revealedKey.name}"`} value={revealedKey.apiKey} />
      )}

      {error && <p className="error">{error}</p>}

      {clients === null && !error && <p>Cargando…</p>}

      {clients && clients.length === 0 && <p>No hay clients todavía.</p>}

      {clients && clients.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className={highlightID === c.id ? 'is-new' : undefined}>
                <td>{c.name}</td>
                <td>
                  <span className={`status-dot status-dot--${c.active ? 'ok' : 'off'}`} />
                  {c.active ? 'Activo' : 'Inactivo'}
                </td>
                <td className="mono">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={busyID === c.id}
                    onClick={() => onToggleActive(c)}
                  >
                    {c.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={busyID === c.id}
                    onClick={() => onRotate(c)}
                  >
                    Rotar key
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
