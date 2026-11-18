import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { Pagination } from '../components/Pagination';
import { AlertDetailDialog } from '../components/AlertDetailDialog';
import { api } from '../api';
import { STATE_INFO, alertSubject, countLabel, primaryMotive, scoreLabel, sourceLabel, stateInfo, windowLabel } from '../utils/alerts';

const PAGE_SIZE = 50;
const MAX_DAYS = 90;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Días entre dos fechas AAAA-MM-DD (o hasta hoy si falta `to`), para avisar antes de pedir un
// rango que el backend rechazaría.
function spanDays(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  return (end - start) / 86400000;
}

// Por defecto solo se ven las abiertas: son las que esperan a alguien.
const DEFAULT_FILTERS = { state: 'abierta', tenant: '', from: '', to: '' };

// Alertas del detector de accesos anómalos: ventanas de 10 minutos que las reglas, los
// señuelos o el modelo marcaron como raras, con los motivos en español. Accesos muestra
// cada intento; aquí se decide qué hacer con lo que el detector encontró.
export function AlertsPage() {
  const [data, setData] = useState(null); // { items, page, total }
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tenants, setTenants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Solo vale la respuesta de la última petición si el filtro cambia en vuelo.
  const latestRequest = useRef(0);

  const rangeTooLong = filters.from ? spanDays(filters.from, filters.to) > MAX_DAYS : false;

  useEffect(() => {
    const requestID = ++latestRequest.current;
    if (rangeTooLong) {
      setError(`El rango no puede superar los ${MAX_DAYS} días. Acórtalo para ver las alertas.`);
      return;
    }
    setError('');
    api
      .listAlerts({ page, pageSize: PAGE_SIZE, state: filters.state, tenant: filters.tenant, from: filters.from, to: filters.to })
      .then((res) => requestID === latestRequest.current && setData(res))
      .catch((err) => requestID === latestRequest.current && setError(sentence(err.data?.error || err.message)));
  }, [page, filters, rangeTooLong, reload]);

  // Un admin no puede listar clientes; los tenants que ya conoce Estadísticas alimentan el filtro.
  useEffect(() => {
    api
      .stats({ range: '30d', tz })
      .then((res) => setTenants(res.users_per_tenant || []))
      .catch(() => {});
  }, [tz]);

  function setFilter(name, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [name]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
  }

  function onDialogClose({ reload: shouldReload } = {}) {
    setSelected(null);
    if (shouldReload) {
      setReload((n) => n + 1);
      // La alerta cerrada sale de la lista y con ella el botón que abrió el diálogo: el foco
      // vuelve al título de la sección en vez de perderse en la página.
      setTimeout(() => document.querySelector('main h1')?.focus(), 0);
    }
  }

  const changed = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const noDates = !filters.from && !filters.to;

  return (
    <AppShell>
      <PageHeader
        title="Alertas"
        description="Lo que el detector marcó como un acceso anómalo, con el motivo en cada caso. Revisa cada alerta y descártala si fue una falsa alarma o márcala como resuelta cuando la hayas atendido."
        stat={data ? { value: data.total, label: countLabel(filters.state, data.total) } : null}
      />

      <form className="form form--filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Estado
          <select value={filters.state} onChange={(e) => setFilter('state', e.target.value)}>
            {Object.entries(STATE_INFO).map(([code, info]) => (
              <option key={code} value={code}>
                {info.plural.charAt(0).toUpperCase() + info.plural.slice(1)}
              </option>
            ))}
            <option value="">Todas</option>
          </select>
        </label>
        <label>
          Tenant
          <select value={filters.tenant} onChange={(e) => setFilter('tenant', e.target.value)}>
            <option value="">Todos</option>
            {tenants.map((t) => (
              <option key={t.api_client_id} value={t.api_client_id}>
                {t.api_client_name || `${t.api_client_id.slice(0, 8)}…`}
              </option>
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
        {changed && (
          <button type="button" className="btn btn--ghost" onClick={clearFilters}>
            Quitar filtros
          </button>
        )}
      </form>

      <p className="stat-note stat-note--list">
        {noDates
          ? `Mostrando los últimos 7 días. Elige fechas para ver otro tramo (hasta ${MAX_DAYS} días). `
          : 'Las fechas se cuentan en UTC y filtran por el inicio de la ventana de cada alerta. '}
        Las horas de la tabla están en tu zona horaria.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {data === null && !error && <ListSkeleton />}

      {data && !rangeTooLong && data.items.length === 0 &&
        (changed ? (
          <EmptyState icon="search" title="Sin resultados">
            Ninguna alerta coincide con esos filtros. Prueba con otro estado o amplía las fechas.
          </EmptyState>
        ) : (
          <EmptyState icon="shield-check" title="No hay alertas abiertas">
            El detector no ha marcado nada en los últimos 7 días, o ya revisaste todo. Elige fechas o el estado "Todas" para ver las anteriores.
          </EmptyState>
        ))}

      {data && !rangeTooLong && data.items.length > 0 && (
        <>
          <div className="table-wrap table-wrap--card">
            <table className="data-table data-table--stack">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Ventana</th>
                  <th>Tenant o IP</th>
                  <th>Fuente</th>
                  <th>Puntaje</th>
                  <th>Motivo principal</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const state = stateInfo(a.state);
                  const subject = alertSubject(a);
                  return (
                    <tr key={a.id}>
                      <td className="cell-title nowrap">
                        <span className={`status-dot status-dot--${state.tone}`} />
                        {state.label}
                      </td>
                      <td className="mono nowrap cell-when" title={`${a.window_start} a ${a.window_end}`}>
                        {windowLabel(a.window_start, a.window_end)}
                      </td>
                      <td className="cell-wrap" data-label="Tenant o IP">
                        <span className={subject.mono ? 'mono alert-ip' : undefined}>{subject.main}</span>
                        <span className="cell-sub">{subject.sub}</span>
                      </td>
                      <td className="alert-cell-source" data-label="Fuente">
                        {sourceLabel(a.source)}
                      </td>
                      <td className="mono" data-label="Puntaje">
                        {scoreLabel(a.score)}
                      </td>
                      <td className="cell-wrap alert-cell-motive" data-label="Motivo">
                        {primaryMotive(a)}
                      </td>
                      <td className="row-actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setSelected(a)}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={data.page || page} totalPages={totalPages} total={data.total} noun={['alerta', 'alertas']} onPage={setPage} />
        </>
      )}

      {selected && <AlertDetailDialog alert={selected} onClose={onDialogClose} />}
    </AppShell>
  );
}
