import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { api } from '../api';
import { ACTION_GROUPS, SHARED_TOKEN_ACTOR, actionLabel, targetTypeLabel } from '../utils/audit';

const PAGE_SIZE = 25;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Un día elegido en el selector de fecha ("2026-10-07") se interpreta en la
// hora local del operador: el rango va de las 00:00 del primer día a las 23:59:59
// del último.
const dayStart = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : '');
const dayEnd = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : '');

const whenLabel = (iso) =>
  new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const NO_FILTERS = { actor: '', action: '', from: '', to: '' };

export function ActivityPage() {
  const [data, setData] = useState(null); // { entries, page, total }
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [operators, setOperators] = useState([]);

  // Solo vale la respuesta de la última petición si el filtro cambia en vuelo.
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestID = ++latestRequest.current;
    setError('');
    api
      .listAudit({
        page,
        pageSize: PAGE_SIZE,
        actor: filters.actor,
        action: filters.action,
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
      })
      .then((res) => requestID === latestRequest.current && setData(res))
      .catch((err) => requestID === latestRequest.current && setError(sentence(err.data?.error || err.message)));
  }, [page, filters]);

  // Los operadores conocidos alimentan el filtro; si falla, el filtro queda solo con "token".
  useEffect(() => {
    api
      .listAccounts()
      .then((res) => setOperators(res.accounts.map((a) => a.email)))
      .catch(() => {});
  }, []);

  function setFilter(name, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [name]: value }));
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AppShell>
      <PageHeader
        title="Actividad"
        description="Quién hizo qué, cuándo y desde qué IP. Lo más reciente primero."
        stat={data ? { value: data.total, label: data.total === 1 ? 'registro' : 'registros' } : null}
      />

      <form className="form form--filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Operador
          <select value={filters.actor} onChange={(e) => setFilter('actor', e.target.value)}>
            <option value="">Todos</option>
            {operators.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
            <option value={SHARED_TOKEN_ACTOR}>Token compartido (scripts)</option>
          </select>
        </label>
        <label>
          Acción
          <select value={filters.action} onChange={(e) => setFilter('action', e.target.value)}>
            <option value="">Todas</option>
            {ACTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {Object.entries(group.actions).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
        </label>
        {hasFilters && (
          <button type="button" className="btn btn--ghost" onClick={() => (setPage(1), setFilters(NO_FILTERS))}>
            Quitar filtros
          </button>
        )}
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {data === null && !error && <p>Cargando…</p>}

      {data && data.entries.length === 0 &&
        (hasFilters ? (
          <EmptyState icon="search" title="Sin resultados">
            Ningún registro coincide con esos filtros. Prueba quitando alguno.
          </EmptyState>
        ) : (
          <EmptyState icon="shield-check" title="Aún no hay actividad registrada">
            Aquí aparecerá cada acción de los operadores: quién la hizo, sobre qué y desde qué IP.
          </EmptyState>
        ))}

      {data && data.entries.length > 0 && (
        <>
          <div className="table-wrap table-wrap--card">
            <table className="data-table data-table--stack">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Operador</th>
                  <th>Acción</th>
                  <th>Objetivo</th>
                  <th className="col-secondary">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="mono nowrap cell-when" title={e.created_at}>
                      {whenLabel(e.created_at)}
                    </td>
                    <td className="mono cell-wrap" data-label="Operador">
                      {e.actor_email === SHARED_TOKEN_ACTOR ? 'token compartido' : e.actor_email}
                    </td>
                    <td className="cell-title cell-wrap">
                      <span className={`status-dot status-dot--${e.action === 'admin.login_failed' ? 'bad' : 'ok'}`} />
                      {actionLabel(e.action)}
                    </td>
                    <td className="cell-wrap" data-label="Objetivo">
                      {e.target_label || e.target_id ? (
                        <>
                          <span className="mono">{e.target_label || e.target_id}</span>
                          {e.target_type && <span className="cell-dim"> · {targetTypeLabel(e.target_type)}</span>}
                        </>
                      ) : (
                        <span className="cell-dim">—</span>
                      )}
                    </td>
                    <td className="mono cell-dim col-secondary" data-label="IP">
                      {e.actor_ip || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page || page}
            totalPages={totalPages}
            total={data.total}
            noun={['registro', 'registros']}
            onPage={setPage}
          />
        </>
      )}
    </AppShell>
  );
}
