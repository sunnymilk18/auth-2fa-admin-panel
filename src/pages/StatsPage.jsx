import { useEffect, useMemo, useRef, useState } from 'react';
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
import { RANGES, fmt } from '../utils/stats';

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

// Estadísticas de uso: lo que el backend ya sabe contar (usuarios, tenants y, para
// superadmin, la actividad de los operadores). Cada bloque se dibuja solo si el backend
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
  const isSuper = role === 'superadmin';

  const strip = data
    ? [
        { key: 'users', label: 'Usuarios', value: data.users_total, hint: 'en todos los tenants', to: '/users' },
        { key: 'banned', label: 'Usuarios baneados', value: data.users_banned, hint: 'ahora' },
        ...(usersPerDay
          ? [{ key: 'new', label: `Nuevos en ${days} días`, value: sum(usersPerDay), hint: 'usuarios registrados' }]
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
        description="Cómo se usa la API: usuarios nuevos, usuarios por tenant y, para superadmin, la actividad de los operadores."
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
