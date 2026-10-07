import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { RotateTotpDialog } from '../components/RotateTotpDialog';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';

// Lo que cada persona puede hacer sobre su propia cuenta, sea admin o superadmin.
export function MyAccountPage() {
  const { actor, role } = useAuth();
  const { notify } = useToast();
  const [dialog, setDialog] = useState(null); // 'password' | 'totp' | null

  return (
    <AppShell>
      <PageHeader
        title="Mi cuenta"
        description="Tu contraseña y tu código TOTP. Los cambios valen solo para tu cuenta."
      />

      <div className="account-id">
        <span className="mono">{actor}</span>
        <span className={`role-badge role-badge--${role}`}>{role}</span>
      </div>

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
      </ul>

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
