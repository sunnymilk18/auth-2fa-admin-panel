import { AppShell } from '../components/AppShell';

// Página de aterrizaje tras el login — las secciones reales (Clients,
// Users, Blacklist, Accounts) llegan en los próximos pasos.
export function DashboardPage() {
  return (
    <AppShell>
      <p>Elige una sección del menú para empezar.</p>
    </AppShell>
  );
}
