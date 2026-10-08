import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { RotateTotpDialog } from '../components/RotateTotpDialog';
import { SetPinDialog } from '../components/SetPinDialog';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';

// Lo que cada persona puede hacer sobre su propia cuenta, sea admin o superadmin.
export function MyAccountPage() {
  const { actor, role, hasPin, refreshIdentity } = useAuth();
  const { notify } = useToast();
  const [dialog, setDialog] = useState(null); // 'password' | 'totp' | 'pin' | null

  return (
    <AppShell>
      <PageHeader
        title="Mi cuenta"
        description="Tu contraseña, tu código TOTP y tu PIN. Los cambios valen solo para tu cuenta."
      />

      <div className="account-id">
        <span className="mono">{actor}</span>
        <span className={`role-badge role-badge--${role}`}>{role}</span>
      </div>

      {!hasPin && (
        <p className="notice" role="status">
          Aún no tienes un PIN. Sin él no puedes banear, revocar ni rotar claves: crea el tuyo en la última fila.
        </p>
      )}

      <ul className="setting-list">
        <li className="setting-row">
          <div>
            <h2>Contraseña</h2>
            <p>
              Cámbiala si sospechas que otra persona la conoce. Tu sesión actual sigue abierta y las demás se cierran.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setDialog('password')}>
            Cambiar contraseña
          </button>
        </li>
        <li className="setting-row">
          <div>
            <h2>Código TOTP</h2>
            <p>
              Registra un código nuevo en tu app autenticadora, por ejemplo si cambiaste de teléfono. El anterior deja de
              funcionar y se cierran tus otras sesiones.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setDialog('totp')}>
            Rotar TOTP
          </button>
        </li>
        <li className="setting-row">
          <div>
            <h2>PIN</h2>
            <p>
              Seis dígitos que confirman las acciones delicadas: banear, revocar cuentas, rotar claves, cambiar tu
              contraseña. Si alguien usa tu sesión abierta, sin el PIN no puede hacerlas.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setDialog('pin')}>
            {hasPin ? 'Cambiar PIN' : 'Crear PIN'}
          </button>
        </li>
      </ul>

      {dialog === 'pin' && (
        <SetPinDialog
          hasPin={hasPin}
          onClose={() => setDialog(null)}
          onDone={async () => {
            await refreshIdentity();
            setDialog(null);
            notify(hasPin ? 'PIN cambiado.' : 'PIN creado. Ya puedes confirmar acciones con él.');
          }}
        />
      )}

      {dialog === 'password' && (
        <ChangePasswordDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            notify('Contraseña cambiada. Se cerraron tus otras sesiones.');
          }}
        />
      )}
      {dialog === 'totp' && (
        <RotateTotpDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            notify('Código TOTP rotado. Usa el nuevo la próxima vez que inicies sesión.');
          }}
        />
      )}
    </AppShell>
  );
}
