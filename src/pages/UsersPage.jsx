import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';

const PAGE_SIZE = 25;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export function UsersPage() {
  const { notify } = useToast();
  const [data, setData] = useState(null); // { users, page, total }
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const [busyID, setBusyID] = useState(null);
  const [highlightID, setHighlightID] = useState(null);
  // Acción pendiente de confirmar: { title, message, danger, confirmLabel, run }.
  const [confirming, setConfirming] = useState(null);

  // Si el usuario cambia de página o busca mientras una petición sigue en
  // vuelo, solo vale la respuesta de la última.
  const latestRequest = useRef(0);

  async function load(targetPage = page, targetQuery = query) {
    const requestID = ++latestRequest.current;
    setError('');
    try {
      const res = await api.listUsers({ page: targetPage, pageSize: PAGE_SIZE, q: targetQuery });
      if (requestID !== latestRequest.current) return;
      setData(res);
    } catch (err) {
      if (requestID !== latestRequest.current) return;
      setError(sentence(err.data?.error || err.message));
    }
  }

  useEffect(() => {
    load(page, query);
  }, [page, query]);

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function flash(id) {
    setHighlightID(id);
    setTimeout(() => setHighlightID(null), 2200);
  }

  // Corre una acción sobre un usuario y refresca la página actual.
  async function runAction(user, { call, success, failure }) {
    setConfirming(null);
    setBusyID(user.id);
    setError('');
    try {
      await call(user.id);
      await load();
      flash(user.id);
      notify(success);
    } catch (err) {
      setError(sentence(err.data?.error || failure));
      notify(failure, { type: 'error' });
    } finally {
      setBusyID(null);
    }
  }

  function onToggleBan(user) {
    if (!user.is_active) {
      runAction(user, {
        call: api.unbanUser,
        success: `"${user.email}" desbaneado.`,
        failure: `No se pudo desbanear a "${user.email}".`,
      });
      return;
    }
    setConfirming({
      title: `Banear a "${user.email}"`,
      message: 'Sus sesiones y dispositivos se cierran al instante y no podrá iniciar sesión hasta que lo desbanees.',
      confirmLabel: 'Banear',
      danger: true,
      run: () =>
        runAction(user, {
          call: api.banUser,
          success: `"${user.email}" baneado.`,
          failure: `No se pudo banear a "${user.email}".`,
        }),
    });
  }

  function onRevokeSessions(user) {
    setConfirming({
      title: `Revocar las sesiones de "${user.email}"`,
      message: 'Se cierran todas sus sesiones abiertas. Podrá volver a iniciar sesión con normalidad.',
      confirmLabel: 'Revocar sesiones',
      danger: true,
      run: () =>
        runAction(user, {
          call: api.revokeUserSessions,
          success: `Sesiones de "${user.email}" revocadas.`,
          failure: `No se pudo revocar las sesiones de "${user.email}".`,
        }),
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AppShell>
      <div className="page-header">
        <h2>Users</h2>
      </div>

      <form onSubmit={onSearch} className="form form--search" role="search">
        <input
          type="search"
          aria-label="Buscar usuarios"
          placeholder="Buscar por correo, usuario o RUT"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn">
          Buscar
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {data === null && !error && <p>Cargando…</p>}

      {data && data.users.length === 0 && (
        <p>{query ? `Ningún usuario coincide con "${query}".` : 'No hay usuarios todavía.'}</p>
      )}

      {data && data.users.length > 0 && (
        <>
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Creado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className={highlightID === u.id ? 'is-new' : undefined}>
                  <td className="mono">{u.email}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className={`status-dot status-dot--${u.is_active ? 'ok' : 'off'}`} />
                    {u.is_active ? 'Activo' : 'Baneado'}
                  </td>
                  <td className="mono">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busyID === u.id}
                      onClick={() => onToggleBan(u)}
                    >
                      {u.is_active ? 'Banear' : 'Desbanear'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busyID === u.id}
                      onClick={() => onRevokeSessions(u)}
                    >
                      Revocar sesiones
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <nav className="pagination" aria-label="Paginación">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="pagination-info">
              Página {data.page} de {totalPages} ({data.total} {data.total === 1 ? 'usuario' : 'usuarios'})
            </span>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </nav>
        </>
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
