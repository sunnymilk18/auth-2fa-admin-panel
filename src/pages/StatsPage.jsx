import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { StatStrip } from '../components/StatStrip';
import { BarChart } from '../components/BarChart';
import { RankedBars } from '../components/RankedBars';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { actionLabel } from '../utils/audit';
import { RANGES, fmt, localDay, timeLabel } from '../utils/stats';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

const sum = (list, field = 'count') => list.reduce((total, item) => total + (item[field] || 0), 0);

// Un bloque con título y, a la derecha, el total del rango.
function Block({ id, title, total, children }) {
  return (
    <section className="stat-block" aria-labelledby={id}>
      <header className="stat-block-head">
        <h2 id={id}>{title}</h2>
        {total && <span className="stat-block-total">{total}</span>}
      </header>
      {children}
    </section>
  );
}

// Nombre de un tenant en las listas de accesos: los intentos que no se pudieron atribuir a
// ninguno llegan sin id ni nombre.
function tenantName(t) {
  if (t.name) return t.name;
  return t.api_client_id ? `${t.api_client_id.slice(0, 8)}…` : 'Sin tenant identificado';
}

// Estadísticas de uso: lo que el backend ya sabe contar (usuarios, tenants, accesos de los
// usuarios y, para superadmin, la actividad de los operadores). Cada bloque se dibuja solo si el backend
// lo manda: los que el rol no puede ver, o los que todavía no existen, simplemente faltan.
export function StatsPage() {
  const { role } = useAuth();
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null); // { status, message }
  const [loading, setLoading] = useState(true);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Solo vale la respuesta de la última petición si el rango cambia en vuelo.
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestID = ++latestRequest.current;
    setLoading(true);
    api
      .stats({ range, tz })
      .then((res) => {
        if (requestID !== latestRequest.current) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (requestID !== latestRequest.current) return;
        setError({ status: err.status, message: sentence(err.data?.error || err.message) });
      })
      .finally(() => requestID === latestRequest.current && setLoading(false));
  }, [range, tz]);

  const days = RANGES.find((r) => r.value === range).days;
  const usersPerDay = data?.users_per_day;
  const operatorDays = data?.operator_actions_per_day;
  const loginDays = data?.logins_by_day;
  const isSuper = role === 'superadmin';
  // Los enlaces a Accesos abren la lista con el mismo tramo de días que se está viendo aquí.
  const accessLink = (extra) => `/access?${new URLSearchParams({ ...extra, from: localDay(days - 1) })}`;

  // El gráfico de accesos suma correctos y fallidos en cada barra; los fallidos se pintan aparte.
  const loginBars = loginDays?.map((d) => ({ day: d.day, count: d.success + d.failed, failed: d.failed }));
  const loginsOk = loginDays ? sum(loginDays, 'success') : 0;
  const loginsFailed = loginDays ? sum(loginDays, 'failed') : 0;

  const strip = data
    ? [
        { key: 'users', label: 'Usuarios', value: data.users_total, hint: 'en todos los tenants', to: '/users' },
        { key: 'banned', label: 'Usuarios baneados', value: data.users_banned, hint: 'ahora' },
        ...(usersPerDay
          ? [{ key: 'new', label: `Nuevos en ${days} días`, value: sum(usersPerDay), hint: 'usuarios registrados' }]
          : []),
        ...(loginDays
          ? [
              { key: 'logins-ok', label: `Accesos en ${days} días`, value: loginsOk, hint: 'inicios de sesión correctos' },
              { key: 'logins-failed', label: 'Accesos fallidos', value: loginsFailed, hint: `en ${days} días` },
            ]
          : []),
        ...(operatorDays
          ? [
              {
                key: 'actions',
                label: `Acciones en ${days} días`,
                value: sum(operatorDays),
                hint: `${sum(operatorDays, 'failed')} fallidas`,
                to: '/activity',
              },
            ]
          : []),
      ]
    : [];

  return (
    <AppShell>
      <PageHeader
        title="Estadísticas"
        description="Cómo se usa la API: usuarios, accesos de los usuarios y, para superadmin, la actividad de los operadores."
      >
        <div className="seg" role="group" aria-label="Rango de días">
          {RANGES.map((r) => (
            <button key={r.value} type="button" className="seg-btn" aria-pressed={range === r.value} onClick={() => setRange(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && error.status === 404 && (
        <EmptyState icon="box" title="Las estadísticas aún no están disponibles">
          El servidor todavía no ofrece este resumen. Cuando se actualice, aparecerá aquí.
        </EmptyState>
      )}
      {error && error.status !== 404 && <p className="error" role="alert">{error.message}</p>}
      {data === null && !error && <ListSkeleton />}

      {data && (
        <div className={`stats-body${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          <StatStrip stats={strip.map((s, i) => ({ ...s, delay: `${i * 0.05}s` }))} />

          <div className="stats-grid">
            {usersPerDay && (
              <Block id="stats-users-day" title="Usuarios nuevos por día" total={`${fmt(sum(usersPerDay))} en total`}>
                <BarChart data={usersPerDay} unit={['usuario nuevo', 'usuarios nuevos']} title="Usuarios nuevos por día" />
              </Block>
            )}

            {data.users_per_tenant && (
              <Block id="stats-tenants" title="Usuarios por tenant">
                {data.users_per_tenant.length === 0 ? (
                  <p className="stat-empty">Aún no hay usuarios en ningún tenant.</p>
                ) : (
                  <RankedBars
                    items={data.users_per_tenant.map((t) => ({
                      key: t.api_client_id,
                      label: t.api_client_name || `${t.api_client_id.slice(0, 8)}…`,
                      value: t.total,
                      extra: t.new_in_range > 0 ? `+${fmt(t.new_in_range)} nuevos` : undefined,
                    }))}
                  />
                )}
              </Block>
            )}

            {loginBars && (
              <Block
                id="stats-logins-day"
                title="Inicios de sesión por día"
                total={`${fmt(loginsOk)} correctos, ${fmt(loginsFailed)} fallidos`}
              >
                <BarChart
                  data={loginBars}
                  unit={['inicio de sesión', 'inicios de sesión']}
                  okLabel="correctos"
                  failedUnit="fallidos"
                  title="Inicios de sesión de usuarios por día"
                />
                <p className="chart-legend">
                  <span className="chart-swatch" aria-hidden="true" /> Correctos
                  <span className="chart-swatch chart-swatch--failed" aria-hidden="true" /> Fallidos
                </p>
              </Block>
            )}

            {data.failures_by_tenant && (
              <Block id="stats-fail-tenants" title="Fallos de acceso por tenant">
                {data.failures_by_tenant.length === 0 ? (
                  <p className="stat-empty">No hubo inicios de sesión en este rango.</p>
                ) : (
                  <RankedBars
                    tone="danger"
                    items={data.failures_by_tenant.map((t) => ({
                      key: t.api_client_id || 'none',
                      label: tenantName(t),
                      value: t.failed,
                      extra: `${fmt(t.success)} ${t.success === 1 ? 'correcto' : 'correctos'}`,
                      to: t.api_client_id ? accessLink({ tenant: t.api_client_id }) : undefined,
                      linkTitle: 'Ver los accesos de este tenant',
                    }))}
                  />
                )}
              </Block>
            )}

            {data.top_failing_ips && (
              <Block id="stats-fail-ips" title="IPs con más fallos">
                {data.top_failing_ips.length === 0 ? (
                  <p className="stat-empty">Ninguna IP acumuló fallos en este rango.</p>
                ) : (
                  <>
                    <RankedBars
                      tone="danger"
                      items={data.top_failing_ips.map((ip) => ({
                        key: ip.ip,
                        label: ip.ip,
                        mono: true,
                        value: ip.failed,
                        extra: `último ${timeLabel(ip.last_at)}`,
                        to: accessLink({ ip: ip.ip }),
                        linkTitle: 'Ver los intentos de esta IP',
                      }))}
                    />
                    <p className="stat-note stat-note--foot">
                      Las IPs que superan el límite se banean solas. <Link to="/blacklist">Ver lista negra</Link>
                    </p>
                  </>
                )}
              </Block>
            )}

            {data.bans_by_day && (
              <Block id="stats-bans-day" title="Baneos automáticos por día" total={`${fmt(sum(data.bans_by_day, 'bans'))} en total`}>
                <BarChart
                  data={data.bans_by_day.map((d) => ({ day: d.day, count: d.bans }))}
                  unit={['baneo', 'baneos']}
                  tone="danger"
                  title="Baneos automáticos de IP por día"
                />
              </Block>
            )}

            {operatorDays && (
              <Block id="stats-actions-day" title="Acciones de operadores por día" total={`${fmt(sum(operatorDays))} en total`}>
                <BarChart
                  data={operatorDays}
                  unit={['acción', 'acciones']}
                  failedUnit="fallidas"
                  title="Acciones de operadores por día"
                />
                <p className="chart-legend">
                  <span className="chart-swatch" aria-hidden="true" /> Acciones
                  <span className="chart-swatch chart-swatch--failed" aria-hidden="true" /> Fallidas (inicio de sesión o PIN)
                </p>
              </Block>
            )}

            {data.operator_actions_by_type && (
              <Block id="stats-actions-type" title="Acciones más frecuentes">
                {data.operator_actions_by_type.length === 0 ? (
                  <p className="stat-empty">No hubo acciones de operadores en este rango.</p>
                ) : (
                  <RankedBars
                    items={data.operator_actions_by_type.map((a) => ({ key: a.action, label: actionLabel(a.action), value: a.count }))}
                  />
                )}
              </Block>
            )}
          </div>

          {!isSuper && <p className="stat-note">La actividad de los operadores es solo de superadmin.</p>}
        </div>
      )}
    </AppShell>
  );
}
