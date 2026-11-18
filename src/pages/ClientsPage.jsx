import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { OneTimeSecret } from '../components/OneTimeSecret';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';
import { pinError } from '../utils/pin';
import { impactFor, IMPACTS, usersAffectedLine } from '../utils/impact';

const PAGE_SIZE = 25;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export function ClientsPage() {
  const { notify } = useToast();
  const [clients, setClients] = useState(null);
  // Usuarios por tenant (de Estadísticas), para mostrar cuántos usuarios afecta desactivar un sistema.
  // null mientras no llega o si no se pudo pedir: la vista previa entonces no menciona el número.
  const [userCounts, setUserCounts] = useState(null);
  const [error, setError] = useState('');

  // El backend devuelve todos los clientes de una vez (no pagina ni filtra), así
  // que la búsqueda y las páginas se resuelven aquí, sobre la lista ya cargada.
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyID, setBusyID] = useState(null); // id en medio de activar/desactivar/rotar
  // { name, apiKey } del último create/rotate — se muestra una sola vez.
  const [revealedKey, setRevealedKey] = useState(null);
  // id de la fila a resaltar brevemente tras crearla o rotarle la clave.
  const [highlightID, setHighlightID] = useState(null);
  // Acción pendiente de confirmar: { title, message, danger, confirmLabel, run }.
  const [confirming, setConfirming] = useState(null);

  async function load() {
    setError('');
    try {
      const list = await api.listClients();
      // El backend devuelve más antiguo primero; aquí importa ver lo más
      // reciente arriba, cerca de donde aparece la clave recién creada.
      setClients([...list].reverse());
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    load();
    api
      .stats({ range: '30d' })
      .then((res) => setUserCounts(Object.fromEntries((res.users_per_tenant || []).map((t) => [t.api_client_id, t.total]))))
      .catch(() => {});
  }, []);

  function flash(id) {
    setHighlightID(id);
    setTimeout(() => setHighlightID(null), 2200);
  }

  const term = search.trim().toLowerCase();
  const filtered = clients ? clients.filter((c) => c.name.toLowerCase().includes(term)) : [];
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function onSearchChange(value) {
    setSearch(value);
    setPage(1);
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
      // El cliente nuevo queda arriba: se limpia la búsqueda y se vuelve a la
      // primera página para que se vea (y se resalte) en vez de quedar oculto.
      setSearch('');
      setPage(1);
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
      message: 'El sistema deja de poder usar la API hasta que lo reactives.',
      impact: impactFor('deactivateClient', {
        extraChanges: [usersAffectedLine(userCounts ? userCounts[client.id] ?? 0 : undefined)].filter(Boolean),
      }),
      confirmLabel: 'Desactivar',
      danger: true,
      needsPin: true,
      run: (pin) => runToggleActive(client, pin),
    });
  }

  // Desactivar pide el PIN y el diálogo sigue abierto hasta que sale bien (un PIN
  // incorrecto vuelve al diálogo); activar no lo pide y cierra de inmediato.
  async function runToggleActive(client, pin) {
    if (pin === undefined) setConfirming(null);
    setBusyID(client.id);
    setError('');
    const wasActive = client.active;
    try {
      if (wasActive) await api.deactivateClient(client.id, pin);
      else await api.activateClient(client.id);
      setConfirming(null);
      await load();
      flash(client.id);
      notify(
        `"${client.name}" ${wasActive ? 'desactivado' : 'activado'}.`,
        wasActive ? { action: { label: 'Deshacer', onClick: () => undoDeactivate(client) } } : undefined
      );
    } catch (err) {
      if (pin !== undefined && pinError(err)) throw err;
      setConfirming(null);
      setError(sentence(err.data?.error || `no se pudo ${client.active ? 'desactivar' : 'activar'} el cliente`));
      notify(`No se pudo ${client.active ? 'desactivar' : 'activar'} "${client.name}".`, { type: 'error' });
    } finally {
      setBusyID(null);
    }
  }

  // "Deshacer" tras desactivar: vuelve a activar el sistema (no pide PIN).
  async function undoDeactivate(client) {
    setBusyID(client.id);
    setError('');
    try {
      await api.activateClient(client.id);
      await load();
      flash(client.id);
      notify(`"${client.name}" activado.`);
    } catch (err) {
      setError(sentence(err.data?.error || 'no se pudo activar el cliente'));
      notify(`No se pudo activar "${client.name}".`, { type: 'error' });
    } finally {
      setBusyID(null);
    }
  }

  function onRotate(client) {
    setConfirming({
      title: `Rotar la clave de API de "${client.name}"`,
      message: 'Se emite una clave nueva y la anterior deja de servir.',
      impact: IMPACTS.rotateClientKey,
      confirmLabel: 'Rotar clave',
      danger: true,
      needsPin: true,
      run: async (pin) => {
        setBusyID(client.id);
        setError('');
        try {
          const res = await api.rotateClient(client.id, pin);
          setConfirming(null);
          setRevealedKey({ name: client.name, apiKey: res.api_key });
          flash(client.id);
          notify(`Clave de "${client.name}" rotada.`);
        } catch (err) {
          if (pinError(err)) throw err;
          setConfirming(null);
          setError(sentence(err.data?.error || err.message));
          notify(`No se pudo rotar la clave de "${client.name}".`, { type: 'error' });
        } finally {
          setBusyID(null);
        }
      },
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        description="Los sistemas que usan la API. Cada cliente tiene su propia clave."
        stat={clients ? { value: clients.length, label: clients.length === 1 ? 'cliente' : 'clientes' } : null}
      >
        <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancelar' : 'Nuevo cliente'}
        </button>
      </PageHeader>

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
        <OneTimeSecret label={`Clave de API de "${revealedKey.name}"`} value={revealedKey.apiKey} />
      )}

      {clients && clients.length > 0 && (
        <form className="form form--search" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {clients === null && !error && <ListSkeleton />}

      {clients && clients.length === 0 && (
        <EmptyState icon="box" title="Aún no hay clientes">
          Crea el primero con «Nuevo cliente»: se genera su clave de API y se muestra una sola vez.
        </EmptyState>
      )}

      {clients && clients.length > 0 && filtered.length === 0 && (
        <EmptyState icon="search" title="Sin resultados">
          Ningún cliente coincide con "{search.trim()}". Prueba con otro nombre.
        </EmptyState>
      )}

      {filtered.length > 0 && (
        <>
          <div className="table-wrap table-wrap--card">
            <table className="data-table data-table--stack">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className={highlightID === c.id ? 'is-new' : undefined}>
                    <td className="cell-title">{c.name}</td>
                    <td>
                      <span className={`status-dot status-dot--${c.active ? 'ok' : 'off'}`} />
                      {c.active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td className="mono" data-label="Creado">{new Date(c.created_at).toLocaleDateString()}</td>
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
                        Rotar clave
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            noun={['cliente', 'clientes']}
            onPage={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.title}
        message={confirming?.message}
        confirmLabel={confirming?.confirmLabel}
        danger={confirming?.danger}
        needsPin={confirming?.needsPin}
        impact={confirming?.impact}
        onConfirm={confirming?.run}
        onCancel={() => setConfirming(null)}
      />
    </AppShell>
  );
}
