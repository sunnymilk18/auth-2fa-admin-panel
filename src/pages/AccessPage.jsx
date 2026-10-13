import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { Pagination } from '../components/Pagination';
import { api } from '../api';
import { KIND_LABELS, RESULT_GROUPS, eventLabel, resultInfo } from '../utils/authEvents';

const PAGE_SIZE = 50;
const MAX_DAYS = 90;

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// Un día elegido en el selector de fecha ("2026-10-07") se interpreta en la hora local del
// operador: el rango va de las 00:00 del primer día a las 23:59:59 del último.
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

// IPv4 con cuatro números de 0 a 255, o IPv6 (hex y dos puntos). El backend valida de nuevo.
function looksLikeIP(v) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.split('.').every((n) => Number(n) <= 255);
  return /^[0-9a-fA-F:.]+$/.test(v) && v.includes(':');
}

// Días entre dos fechas AAAA-MM-DD (o hasta hoy si falta `to`), para avisar antes de pedir
// un rango que el backend rechazaría.
function spanDays(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = to ? new Date(`${to}T23:59:59.999`) : new Date();
  return (end - start) / 86400000;
}

const NO_FILTERS = { tenant: '', kind: '', result: '', ip: '', from: '', to: '' };

// Detalle de los intentos de acceso de los usuarios finales: quién, cuándo, desde qué IP y
// cómo terminó. Estadísticas muestra los totales; aquí se investiga cada intento.
export function AccessPage() {
  const [data, setData] = useState(null); // { events, page, total }
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  // Un enlace de otra pantalla puede abrir la lista ya filtrada (?ip=…&tenant=…&from=AAAA-MM-DD).
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...NO_FILTERS,
    tenant: params.get('tenant') || '',
    kind: params.get('kind') || '',
    result: params.get('result') || '',
    ip: params.get('ip') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
  }));
  // Lo que se escribe en el campo de IP; solo pasa al filtro cuando es una IP completa.
  const [ipDraft, setIpDraft] = useState(filters.ip);
  const [tenants, setTenants] = useState([]);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Solo vale la respuesta de la última petición si el filtro cambia en vuelo.
  const latestRequest = useRef(0);

  const rangeTooLong = filters.from ? spanDays(filters.from, filters.to) > MAX_DAYS : false;

  useEffect(() => {
    const requestID = ++latestRequest.current;
    if (rangeTooLong) {
      setError(`El rango no puede superar los ${MAX_DAYS} días. Acórtalo para ver los accesos.`);
      return;
    }
    setError('');
    api
      .listSecurityEvents({
        page,
        pageSize: PAGE_SIZE,
        tenant: filters.tenant,
        kind: filters.kind,
        result: filters.result,
        ip: filters.ip,
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
      })
      .then((res) => requestID === latestRequest.current && setData(res))
      .catch((err) => requestID === latestRequest.current && setError(sentence(err.data?.error || err.message)));
  }, [page, filters, rangeTooLong]);

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

  function onIPChange(value) {
    const v = value.trim();
    setIpDraft(value);
    if (v === '') setFilter('ip', '');
    else if (looksLikeIP(v)) setFilter('ip', v);
  }

  function clearFilters() {
    setPage(1);
    setFilters(NO_FILTERS);
    setIpDraft('');
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const ipInvalid = ipDraft.trim() !== '' && !looksLikeIP(ipDraft.trim());
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const noDates = !filters.from && !filters.to;
  // Si el enlace trae un tenant que no está en la lista, igual se ofrece para poder quitarlo.
  const tenantKnown = !filters.tenant || tenants.some((t) => t.api_client_id === filters.tenant);

  return (
    <AppShell>
      <PageHeader
        title="Accesos"
        description="Cada intento de los usuarios de tus tenants: iniciar sesión, registrarse o recuperar la contraseña. Lo más reciente primero."
        stat={data ? { value: data.total, label: data.total === 1 ? 'evento' : 'eventos' } : null}
      />

      <form className="form form--filters form--filters-six" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Tenant
          <select value={filters.tenant} onChange={(e) => setFilter('tenant', e.target.value)}>
            <option value="">Todos</option>
            {!tenantKnown && <option value={filters.tenant}>{`${filters.tenant.slice(0, 8)}…`}</option>}
            {tenants.map((t) => (
              <option key={t.api_client_id} value={t.api_client_id}>
                {t.api_client_name || `${t.api_client_id.slice(0, 8)}…`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evento
          <select value={filters.kind} onChange={(e) => setFilter('kind', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(KIND_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resultado
          <select value={filters.result} onChange={(e) => setFilter('result', e.target.value)}>
            <option value="">Todos</option>
            {RESULT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.results.map((code) => (
                  <option key={code} value={code}>
                    {resultInfo('', code).label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          IP
          <input
            type="text"
            inputMode="text"
            value={ipDraft}
            placeholder="203.0.113.50"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={ipInvalid || undefined}
            aria-describedby={ipInvalid ? 'access-ip-hint' : undefined}
            onChange={(e) => onIPChange(e.target.value)}
          />
          {ipInvalid && (
            <span id="access-ip-hint" className="field-hint field-hint--error">
              Escribe la IP completa.
            </span>
          )}
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
          <button type="button" className="btn btn--ghost" onClick={clearFilters}>
            Quitar filtros
          </button>
        )}
      </form>

      {noDates && <p className="stat-note stat-note--list">Mostrando los últimos 7 días. Elige fechas para ver otro tramo (hasta {MAX_DAYS} días).</p>}

      {error && <p className="error" role="alert">{error}</p>}
      {data === null && !error && <ListSkeleton />}

      {data && !rangeTooLong && data.events.length === 0 &&
        (hasFilters ? (
          <EmptyState icon="search" title="Sin resultados">
            Ningún intento coincide con esos filtros. Prueba quitando alguno o ampliando las fechas.
          </EmptyState>
        ) : (
          <EmptyState icon="shield-check" title="Aún no hay accesos registrados">
            Aquí aparecerá cada intento de los usuarios: quién lo hizo, desde qué IP y cómo terminó.
          </EmptyState>
        ))}

      {data && !rangeTooLong && data.events.length > 0 && (
        <>
          <div className="table-wrap table-wrap--card">
            <table className="data-table data-table--stack">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Resultado</th>
                  <th>Evento</th>
                  <th>Usuario</th>
                  <th>Tenant</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((ev) => {
                  const result = resultInfo(ev.kind, ev.result);
                  // Un baneo o su levantamiento es de una IP: no tiene usuario ni, a veces, tenant.
                  const isBan = ev.kind === 'ip_ban' || ev.kind === 'ip_unban';
                  return (
                    <tr key={ev.id}>
                      <td className="mono nowrap cell-when" title={ev.created_at}>
                        {whenLabel(ev.created_at)}
                      </td>
                      <td className="cell-title cell-wrap">
                        <span className={`status-dot status-dot--${result.tone}`} />
                        {result.label}
                      </td>
                      <td className="cell-wrap" data-label="Evento">
                        {eventLabel(ev)}
                        {ev.user_agent && (
                          <span className="cell-sub" title={ev.user_agent}>
                            {ev.user_agent}
                          </span>
                        )}
                      </td>
                      <td className="mono cell-wrap" data-label="Usuario">
                        {ev.user ? ev.user.email : <span className="cell-dim">{isBan ? '—' : 'Sin cuenta identificada'}</span>}
                      </td>
                      <td className="cell-wrap" data-label="Tenant">
                        {ev.tenant?.name || (ev.tenant?.id ? `${ev.tenant.id.slice(0, 8)}…` : <span className="cell-dim">{isBan ? '—' : 'Sin tenant identificado'}</span>)}
                      </td>
                      <td className="mono" data-label="IP">
                        {ev.ip ? (
                          <button type="button" className="ip-link" title="Ver solo los intentos de esta IP" onClick={() => (setIpDraft(ev.ip), setFilter('ip', ev.ip))}>
                            {ev.ip}
                          </button>
                        ) : (
                          <span className="cell-dim">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page || page}
            totalPages={totalPages}
            total={data.total}
            noun={['evento', 'eventos']}
            onPage={setPage}
          />
        </>
      )}
    </AppShell>
  );
}
