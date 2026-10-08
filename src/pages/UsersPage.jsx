import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { ActionMenu } from '../components/ActionMenu';
import { ChangeEmailDialog } from '../components/ChangeEmailDialog';
import { LockoutsDialog } from '../components/LockoutsDialog';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';
import { pinError } from '../utils/pin';

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
  // Usuario cuyo diálogo de bloqueos está abierto.
  const [lockoutsFor, setLockoutsFor] = useState(null);
  // Usuario cuyo diálogo de corrección de correo está abierto.
  const [emailFor, setEmailFor] = useState(null);

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

  // El backend manda el nombre del tenant junto a cada usuario; si no se pudo
  // resolver viene vacío y se muestra el identificador abreviado.
  function tenantLabel(user) {
    if (!user.api_client_id) return '—';
    return user.api_client_name || `${user.api_client_id.slice(0, 8)}…`;
  }

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function flash(id) {
    setHighlightID(id);
    setTimeout(() => setHighlightID(null), 2200);
  }

  // Corre una acción sobre un usuario y refresca la página actual. Con `pin` (las
  // acciones que lo piden) el diálogo sigue abierto hasta que sale bien: si el PIN
  // es incorrecto el error vuelve al diálogo, que lo explica y deja reintentar.
  async function runAction(user, { call, success, failure }, pin) {
    if (pin === undefined) setConfirming(null);
    setBusyID(user.id);
    setError('');
    try {
      await call(user.id, pin);
      setConfirming(null);
      await load();
      flash(user.id);
      notify(success);
    } catch (err) {
      if (pin !== undefined && pinError(err)) throw err;
      setConfirming(null);
      setError(sentence(err.data?.error || failure));
      notify(failure, { type: 'error' });
    } finally {
      setBusyID(null);
    }
  }

  // Pide confirmación (acciones que cortan acceso o borran algo) y luego
  // corre la acción. `needsPin`: además pide el PIN de operador en el mismo cuadro.
  function confirmAction(user, { title, message, confirmLabel, danger = true, needsPin = false, call, success, failure }) {
    setConfirming({
      title,
      message,
      confirmLabel,
      danger,
      needsPin,
      run: (pin) => runAction(user, { call, success, failure }, needsPin ? pin : undefined),
    });
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
    confirmAction(user, {
      title: `Banear a "${user.email}"`,
      message: 'Sus sesiones y dispositivos se cierran al instante y no podrá iniciar sesión hasta que lo desbanees.',
      confirmLabel: 'Banear',
      needsPin: true,
      call: api.banUser,
      success: `"${user.email}" baneado.`,
      failure: `No se pudo banear a "${user.email}".`,
    });
  }

  function menuItems(user) {
    const pinRequired = user.pin_required_at_login;
    return [
      { label: 'Ver bloqueos', icon: 'lock', onSelect: () => setLockoutsFor(user) },
      { label: 'Corregir correo', icon: 'mail', onSelect: () => setEmailFor(user) },
      {
        label: pinRequired ? 'Dejar de exigir PIN' : 'Exigir PIN al iniciar sesión',
        icon: pinRequired ? 'shield-off' : 'shield-check',
        onSelect: () =>
          runAction(user, {
            call: (id) => api.setUserLoginPinRequired(id, !pinRequired),
            success: pinRequired
              ? `"${user.email}" ya no necesita PIN para iniciar sesión.`
              : `"${user.email}" ahora necesita PIN para iniciar sesión.`,
            failure: `No se pudo cambiar el PIN de inicio de sesión de "${user.email}".`,
          }),
      },
      {
        // Reversible (el usuario vuelve a iniciar sesión): no es "peligro".
        label: 'Revocar sesiones',
        icon: 'log-out',
        onSelect: () =>
          confirmAction(user, {
            danger: false,
            title: `Revocar las sesiones de "${user.email}"`,
            message: 'Se cierran todas sus sesiones abiertas. Podrá volver a iniciar sesión con normalidad.',
            confirmLabel: 'Revocar sesiones',
            call: api.revokeUserSessions,
            success: `Sesiones de "${user.email}" revocadas.`,
            failure: `No se pudo revocar las sesiones de "${user.email}".`,
          }),
      },
      {
        label: 'Desactivar TOTP',
        icon: 'phone-off',
        danger: true,
        onSelect: () =>
          confirmAction(user, {
            title: `Desactivar el TOTP de "${user.email}"`,
            message:
              'Deja de usar la app autenticadora y recibe el código por correo al iniciar sesión. Úsalo si perdió el teléfono.',
            confirmLabel: 'Desactivar TOTP',
            needsPin: true,
            call: api.disableUserTotp,
            success: `TOTP de "${user.email}" desactivado.`,
            failure: `No se pudo desactivar el TOTP de "${user.email}".`,
          }),
      },
      {
        label: 'Resetear PIN',
        icon: 'rotate-ccw',
        danger: true,
        onSelect: () =>
          confirmAction(user, {
            title: `Resetear el PIN de "${user.email}"`,
            message:
              'Se borra su PIN actual y se cierran todas sus sesiones y dispositivos de confianza. Tendrá que definir un PIN nuevo.',
            confirmLabel: 'Resetear PIN',
            needsPin: true,
            call: api.resetUserPin,
            success: `PIN de "${user.email}" reseteado.`,
            failure: `No se pudo resetear el PIN de "${user.email}".`,
          }),
      },
    ];
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AppShell>
      <PageHeader
        title="Usuarios"
        description="Las personas que usan los sistemas conectados a la API. Desde aquí puedes banearlas, corregir su correo y gestionar su PIN y su TOTP."
        stat={
          data
            ? { value: data.total, label: query ? (data.total === 1 ? 'resultado' : 'resultados') : data.total === 1 ? 'usuario' : 'usuarios' }
            : null
        }
      />

      <form onSubmit={onSearch} className="form form--search" role="search">
        <input
          type="search"
          aria-label="Buscar usuarios"
          placeholder="Buscar por correo, usuario o RUT"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            // Al vaciar el campo se vuelve a la lista completa, sin pulsar "Buscar".
            if (e.target.value === '' && query !== '') {
              setPage(1);
              setQuery('');
            }
          }}
        />
        <button type="submit" className="btn">
          Buscar
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {data === null && !error && <ListSkeleton />}

      {data && data.users.length === 0 &&
        (query ? (
          <EmptyState icon="search" title="Sin resultados">
            Ningún usuario coincide con "{query}". Prueba con otro correo, usuario o RUT.
          </EmptyState>
        ) : (
          <EmptyState icon="mail" title="Aún no hay usuarios">
            Aparecerán aquí cuando las personas se registren en alguno de los sistemas conectados.
          </EmptyState>
        ))}

      {data && data.users.length > 0 && (
        <>
          <div className="table-wrap table-wrap--card">
          <table className="data-table data-table--cards">
            <thead>
              <tr>
                <th>Correo</th>
                <th className="col-secondary">Usuario</th>
                <th className="col-secondary">Tenant</th>
                <th>Estado</th>
                <th className="col-secondary">Creado</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className={highlightID === u.id ? 'is-new' : undefined}>
                  <td className="mono cell-wrap cell-email">{u.email}</td>
                  <td className="cell-dim col-secondary">{u.username}</td>
                  <td
                    className="mono cell-dim col-secondary cell-clip cell-tenant"
                    title={
                      u.api_client_name ? `${u.api_client_name} (${u.api_client_id})` : u.api_client_id || 'Sin tenant asociado'
                    }
                  >
                    {tenantLabel(u)}
                  </td>
                  <td className="cell-status">
                    <span className={`status-dot status-dot--${u.is_active ? 'ok' : 'off'}`} />
                    {u.is_active ? 'Activo' : 'Baneado'}
                  </td>
                  <td className="mono col-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className={`btn btn--ghost${u.is_active ? ' btn--quiet-danger' : ''}`}
                      disabled={busyID === u.id}
                      onClick={() => onToggleBan(u)}
                    >
                      {u.is_active ? 'Banear' : 'Desbanear'}
                    </button>
                    <ActionMenu title={u.email} items={menuItems(u)} disabled={busyID === u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            noun={['usuario', 'usuarios']}
            onPage={setPage}
          />
        </>
      )}

      {emailFor && (
        <ChangeEmailDialog
          user={emailFor}
          onClose={() => setEmailFor(null)}
          onDone={(newEmail) => {
            notify(`Código enviado a "${newEmail}". El correo cambia cuando la persona lo confirme.`);
            setEmailFor(null);
          }}
        />
      )}

      {lockoutsFor && <LockoutsDialog user={lockoutsFor} onClose={() => setLockoutsFor(null)} />}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.title}
        message={confirming?.message}
        confirmLabel={confirming?.confirmLabel}
        danger={confirming?.danger}
        needsPin={confirming?.needsPin}
        onConfirm={confirming?.run}
        onCancel={() => setConfirming(null)}
      />
    </AppShell>
  );
}
