import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { UsersPage } from './pages/UsersPage';
import { BlacklistPage } from './pages/BlacklistPage';
import { AllowlistPage } from './pages/AllowlistPage';
import { AccountsPage } from './pages/AccountsPage';
import { ActivityPage } from './pages/ActivityPage';
import { StatsPage } from './pages/StatsPage';
import { AccessPage } from './pages/AccessPage';
import { MyAccountPage } from './pages/MyAccountPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blacklist"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <BlacklistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/allowlist"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <AllowlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <StatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/access"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <AccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <MyAccountPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
