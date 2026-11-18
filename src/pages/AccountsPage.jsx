import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { PasswordField } from '../components/PasswordField';
import { PinField } from '../components/PinField';
import { SetPinDialog } from '../components/SetPinDialog';
import { secretFrom } from '../utils/totp';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OneTimeSecret } from '../components/OneTimeSecret';
import { QrCode } from '../components/QrCode';
import { ReactivateDialog } from '../components/ReactivateDialog';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { api } from '../api';
import { IMPACTS } from '../utils/impact';
import { pinError } from '../utils/pin';

function sentence(text) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export function AccountsPage() {
  const { actor, hasPin, refreshIdentity } = useAuth();
  const { notify } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [pin, setPin] = useState('');
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
      const res = await api.createAccount({ email: email.trim(), password, role }, pin);
      setCreated({ email: res.email, role: res.role, otpauthURL: res.otpauth_url });
      setEmail('');
      setPassword('');
      setRole('');
      setPin('');
      setCreating(false);
      await load();
      flash(res.id);
      notify(`Cuenta de "${res.email}" creada.`);
    } catch (err) {
      const pinMessage = pinError(err);
      if (pinMessage) setPin('');
      setError(pinMessage || sentence(err.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  // Borra el PIN de otra cuenta: su dueña o dueño tiene que crear uno nuevo. No pide PIN.
  function onResetPin(account) {
    setConfirming({
      title: `Restablecer el PIN de "${account.email}"`,
      message:
        'Se borra su PIN. Mientras no cree uno nuevo, no podrá hacer acciones que pidan confirmación. Su cuenta y sus sesiones siguen como están.',
      confirmLabel: 'Restablecer PIN',
      danger: false,
      run: async () => {
        setConfirming(null);
        setBusyID(account.id);
        setError('');
        try {
          await api.resetAccountPin(account.id);
          flash(account.id);
          notify(`PIN de "${account.email}" restablecido.`);
        } catch (err) {
          setError(sentence(err.data?.error || `no se pudo restablecer el PIN de "${account.email}"`));
          notify(`No se pudo restablecer el PIN de "${account.email}".`, { type: 'error' });
        } finally {
          setBusyID(null);
        }
      },
    });
  }

  function onRevoke(account) {
    setConfirming({
      title: `Revocar la cuenta de "${account.email}"`,
      message: 'Úsalo cuando una cuenta de operador ya no debe tener acceso.',
      impact: IMPACTS.revokeAccount,
      confirmLabel: 'Revocar cuenta',
      danger: true,
      needsPin: true,
      run: async (pin) => {
        setBusyID(account.id);
        setError('');
        try {
          await api.revokeAccount(account.id, pin);
          setConfirming(null);
          await load();
          flash(account.id);
          notify(`Cuenta de "${account.email}" revocada.`);
        } catch (err) {
          if (pinError(err)) throw err;
          setConfirming(null);
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
      <PageHeader
        title="Cuentas"
        description="Los operadores que pueden entrar a este panel. Cada cuenta usa correo, contraseña y código TOTP."
        stat={accounts ? { value: accounts.length, label: accounts.length === 1 ? 'cuenta' : 'cuentas' } : null}
      >
        <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancelar' : 'Nueva cuenta'}
        </button>
      </PageHeader>

      {creating && !hasPin && (
        <SetPinDialog
          intro="Crear una cuenta pide confirmar con tu PIN, y aún no tienes uno. Créalo y sigues con la cuenta."
          onClose={() => setCreating(false)}
          onDone={refreshIdentity}
        />
      )}

      {creating && hasPin && (
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
          <PasswordField
            label="Contraseña"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
          <PinField value={pin} onChange={setPin} />
          <button type="submit" className="btn btn--primary" disabled={submitting || pin.length !== 6}>
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

      {error && <p className="error" role="alert">{error}</p>}
      {accounts === null && !error && <ListSkeleton />}
      {accounts && accounts.length === 0 && (
        <EmptyState icon="lock" title="No hay cuentas">
          Crea la primera con «Nueva cuenta».
        </EmptyState>
      )}

      {accounts && accounts.length > 0 && (
        <div className="table-wrap table-wrap--card">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="col-secondary">Creada</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const isSelf = a.email === actor;
                return (
                  <tr key={a.id} className={highlightID === a.id ? 'is-new' : undefined}>
                    <td className="mono cell-wrap cell-title">
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
                    <td className="mono col-secondary" data-label="Creada">{new Date(a.created_at * 1000).toLocaleDateString()}</td>
                    <td className="row-actions">
                      {!a.active && (
                        <button type="button" className="btn btn--ghost" onClick={() => setReactivating(a)}>
                          Reactivar
                        </button>
                      )}
                      {a.active && !isSelf && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={busyID === a.id}
                          onClick={() => onResetPin(a)}
                        >
                          Restablecer PIN
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
        needsPin={confirming?.needsPin}
        impact={confirming?.impact}
        onConfirm={confirming?.run}
        onCancel={() => setConfirming(null)}
      />
    </AppShell>
  );
}
