import { AppShell } from '../components/AppShell';
import { PageTitle } from '../components/PageTitle';

// Página de aterrizaje tras el login.
export function DashboardPage() {
  return (
    <AppShell>
      <PageTitle>Inicio</PageTitle>
      <p>Elige una sección del menú para empezar.</p>
    </AppShell>
  );
}
