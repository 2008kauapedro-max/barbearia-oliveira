import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import InternalLogin from './pages/InternalLogin';
import InternalLayout from './pages/InternalLayout';
import ClientArea from './pages/ClientArea';
import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';
import UpdateBanner from './components/UpdateBanner';

import OwnerDashboard from './pages/owner/Dashboard';
import OwnerTeam from './pages/owner/Team';
import OwnerClients from './pages/owner/Clients';
import OwnerServices from './pages/owner/Services';
import OwnerFinancial from './pages/owner/Financial';
import OwnerCustomization from './pages/owner/Customization';
import OwnerSettings from './pages/owner/Settings';
import OwnerSubscriptions from './pages/owner/Subscriptions';
import OwnerCommunication from './pages/owner/Communication';
import OwnerReports from './pages/owner/Reports';
import OwnerAssistant from './pages/owner/Assistant';

import BarberNextClients from './pages/barber/NextClients';
import BarberSchedule from './pages/barber/Schedule';
import BarberServices from './pages/barber/Services';
import BarberHistory from './pages/barber/History';
import BarberProfile from './pages/barber/Profile';
import BarberAssistant from './pages/barber/Assistant';

import SharedAgenda from './pages/shared/Agenda';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <UpdateBanner />
        <InstallPrompt />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/cliente/*" element={
            <ProtectedRoute allowedRoles={['CLIENT']}>
              <ClientArea />
            </ProtectedRoute>
          } />

          <Route path="/app" element={
            <ProtectedRoute allowedRoles={['OWNER', 'BARBER']}>
              <InternalLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="assinaturas" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerSubscriptions />
              </ProtectedRoute>
            } />
            <Route path="comunicacao" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerCommunication />
              </ProtectedRoute>
            } />
            <Route path="relatorios" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerReports />
              </ProtectedRoute>
            } />
            <Route path="assistente" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerAssistant />
              </ProtectedRoute>
            } />
            <Route path="equipe" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerTeam />
              </ProtectedRoute>
            } />
            <Route path="clientes" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerClients />
              </ProtectedRoute>
            } />
            <Route path="financeiro" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerFinancial />
              </ProtectedRoute>
            } />
            <Route path="personalizacao" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerCustomization />
              </ProtectedRoute>
            } />
            <Route path="configuracoes" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerSettings />
              </ProtectedRoute>
            } />

            <Route path="agenda" element={
              <ProtectedRoute allowedRoles={['OWNER', 'BARBER']}>
                <SharedAgenda />
              </ProtectedRoute>
            } />
            <Route path="servicos" element={
              <ProtectedRoute allowedRoles={['OWNER', 'BARBER']}>
                <ServicosPorCargo />
              </ProtectedRoute>
            } />

            <Route path="proximos-clientes" element={
              <ProtectedRoute allowedRoles={['BARBER']}>
                <BarberNextClients />
              </ProtectedRoute>
            } />
            <Route path="horarios" element={
              <ProtectedRoute allowedRoles={['BARBER']}>
                <BarberSchedule />
              </ProtectedRoute>
            } />
            <Route path="historico" element={
              <ProtectedRoute allowedRoles={['BARBER']}>
                <BarberHistory />
              </ProtectedRoute>
            } />
            <Route path="perfil" element={
              <ProtectedRoute allowedRoles={['BARBER']}>
                <BarberProfile />
              </ProtectedRoute>
            } />
            <Route path="assistente" element={
              <ProtectedRoute allowedRoles={['BARBER']}>
                <BarberAssistant />
              </ProtectedRoute>
            } />

            <Route index element={<AppDefaultRedirect />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

function ServicosPorCargo() {
  const { profile } = useAuth();
  return profile?.role === 'OWNER' ? <OwnerServices /> : <BarberServices />;
}

function RootRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse text-cream-300/40">Carregando...</div>
      </div>
    );
  }
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (profile.role === 'OWNER') return <Navigate to="/app/dashboard" replace />;
  if (profile.role === 'BARBER') return <Navigate to="/app/agenda" replace />;
  if (profile.role === 'CLIENT') return <Navigate to="/cliente" replace />;
  return <Navigate to="/login" replace />;
}

function LoginPage() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse text-cream-300/40">Carregando...</div>
      </div>
    );
  }
  if (user && profile) {
    if (profile.role === 'OWNER') return <Navigate to="/app/dashboard" replace />;
    if (profile.role === 'BARBER') return <Navigate to="/app/agenda" replace />;
    if (profile.role === 'CLIENT') return <Navigate to="/cliente" replace />;
  }
  return <InternalLogin />;
}

function AppDefaultRedirect() {
  const { profile } = useAuth();
  if (profile?.role === 'OWNER') return <Navigate to="/app/dashboard" replace />;
  if (profile?.role === 'BARBER') return <Navigate to="/app/agenda" replace />;
  return <Navigate to="/login" replace />;
}

export default App;