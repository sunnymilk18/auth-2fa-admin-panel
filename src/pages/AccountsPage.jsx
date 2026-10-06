import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OneTimeSecret } from '../components/OneTimeSecret';
import { QrCode } from '../components/QrCode';
import { ReactivateDialog } from '../components/ReactivateDialog';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

// El secreto TOTP viene dentro de la URL otpauth, para quien prefiera
// escribirlo a mano en vez de escanear el QR.
function secretFrom(otpauthURL) {
  try {
    return new URL(otpauthURL).searchParams.get('secret') || '';
  } catch {
    return '';
  }
}

export function AccountsPage() {
  const { actor } = useAuth();
  const { notify } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [busyID, setBusyID] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // { email, role, otpauthURL } de la última cuenta creada — se muestra una sola vez.
  const [created, setCreated] = useState(null);
  const [highlightID, setHighlightID] = useState(null);
  const [confirming, setConfirming] = useState(null);
  // Cuenta revocada para la que se abrió el diálogo de reactivar.
  const [reactivating, setReactivating] = useState(null);

  async function load() {
    try {
      const res = await api.listAccounts();
      setAccounts(res.accounts);
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
    setError('');
    setSubmitting(true);
    try {
      const res = await api.createAccount({ email: email.trim(), password, role });
      setCreated({ email: res.email, role: res.role, otpauthURL: res.otpauth_url });
      setEmail('');
      setPassword('');
      setRole('');
      setCreating(false);
      await load();
      flash(res.id);
      notify(`Cuenta de "${res.email}" creada.`);
    } catch (err) {
      setError(sentence(err.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  function onRevoke(account) {
    setConfirming({
      title: `Revocar la cuenta de "${account.email}"`,
      message:
        'La cuenta deja de funcionar y se cierran todas sus sesiones al instante. No se puede reactivar desde el panel.',
      confirmLabel: 'Revocar cuenta',
      danger: true,
      run: async () => {
        setConfirming(null);
        setBusyID(account.id);
        setError('');
        try {
          await api.revokeAccount(account.id);
          await load();
          flash(account.id);
          notify(`Cuenta de "${account.email}" revocada.`);
        } catch (err) {
          setError(sentence(err.data?.error || `no se pudo revocar la cuenta de "${account.email}"`));
          notify(`No se pudo revocar la cuenta de "${account.email}".`, { type: 'error' });
        } finally {
          setBusyID(null);
        }
      },
    });
  }

  return (
    <AppShell>
      <div className="page-header">
        <h2>Accounts</h2>
        <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancelar' : 'Nueva cuenta'}
        </button>
      </div>

      {creating && (
        <form onSubmit={onCreate} className="form form--inline">
          <label>
            Correo
            <input
              autoFocus
              required
              type="email"
              autoComplete="off"
              placeholder="persona@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Rol
            <select required value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="" disabled>
                Elige un rol
              </option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            Crear cuenta
          </button>
        </form>
      )}

      {created && (
        <div className="new-account">
          <QrCode
            value={created.otpauthURL}
            alt={`Código QR para configurar la app autenticadora de ${created.email}`}
          />
          <div className="new-account-body">
            <h3>
              {created.reactivated ? 'Cuenta reactivada: ' : 'Cuenta de '}
              {created.email}{' '}
              <span className={`role-badge role-badge--${created.role}`}>{created.role}</span>
            </h3>
            <p>
              {created.reactivated
                ? 'La persona debe registrar este código nuevo en su app autenticadora; el anterior ya no funciona. '
                : 'La persona nueva debe escanear este código con su app autenticadora para poder iniciar sesión. '}
              No se puede volver a mostrar.
            </p>
            {secretFrom(created.otpauthURL) && (
              <OneTimeSecret
                wrap
                label="O ingresa esta clave a mano en la app"
                value={secretFrom(created.otpauthURL)}
              />
            )}
            <button type="button" className="btn" onClick={() => setCreated(null)}>
              Ya lo escaneó
            </button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {accounts === null && !error && <p>Cargando…</p>}
      {accounts && accounts.length === 0 && <p>No hay cuentas todavía.</p>}

      {accounts && accounts.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="col-secondary">Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const isSelf = a.email === actor;
                return (
                  <tr key={a.id} className={highlightID === a.id ? 'is-new' : undefined}>
                    <td className="mono cell-wrap">
                      {a.email}
                      {isSelf && <span className="cell-dim"> (tú)</span>}
                    </td>
                    <td>
                      <span className={`role-badge role-badge--${a.role}`}>{a.role}</span>
                    </td>
                    <td>
                      <span className={`status-dot status-dot--${a.active ? 'ok' : 'off'}`} />
                      {a.active ? 'Activa' : 'Revocada'}
                    </td>
                    <td className="mono col-secondary">{new Date(a.created_at * 1000).toLocaleDateString()}</td>
                    <td className="row-actions">
                      {!a.active && (
                        <button type="button" className="btn btn--ghost" onClick={() => setReactivating(a)}>
                          Reactivar
                        </button>
                      )}
                      {a.active && !isSelf && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--quiet-danger"
                          disabled={busyID === a.id}
                          onClick={() => onRevoke(a)}
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reactivating && (
        <ReactivateDialog
          account={reactivating}
          onClose={() => setReactivating(null)}
          onDone={async (res) => {
            setReactivating(null);
            setCreated({ email: res.email, role: res.role, otpauthURL: res.otpauth_url, reactivated: true });
            await load();
            flash(res.id);
            notify(`Cuenta de "${res.email}" reactivada.`);
          }}
        />
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
