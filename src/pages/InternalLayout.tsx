import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '../components/NotificationBell';

export default function InternalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, barbershop, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ownerMenuItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/app/agenda', label: 'Agenda', icon: '📅' },
    { path: '/app/assinaturas', label: 'Assinaturas', icon: '👑' },
        { path: '/app/comunicacao', label: 'Comunicação', icon: '📣' },
    { path: '/app/equipe', label: 'Equipe', icon: '👥' },
    { path: '/app/clientes', label: 'Clientes', icon: '👤' },
    { path: '/app/servicos', label: 'Serviços', icon: '✂️' },
    { path: '/app/financeiro', label: 'Financeiro', icon: '💰' },
        { path: '/app/relatorios', label: 'Relatórios', icon: '📑' },
            { path: '/app/assistente', label: 'Assistente', icon: '🤖' },
    { path: '/app/personalizacao', label: 'Personalização', icon: '🎨' },
    { path: '/app/configuracoes', label: 'Configurações', icon: '⚙️' },
  ];

  const barberMenuItems = [
    { path: '/app/agenda', label: 'Agenda', icon: '📅' },
    { path: '/app/proximos-clientes', label: 'Próximos Clientes', icon: '👥' },
    { path: '/app/horarios', label: 'Horários', icon: '🕐' },
    { path: '/app/servicos', label: 'Serviços', icon: '✂️' },
    { path: '/app/historico', label: 'Histórico', icon: '📋' },
        { path: '/app/assistente', label: 'Assistente', icon: '🤖' },
    { path: '/app/perfil', label: 'Perfil', icon: '👤' },
  ];

  const menuItems = profile?.role === 'OWNER' ? ownerMenuItems : barberMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-cream-50 textura-app"
      style={
        barbershop?.settings?.background_image_url
          ? {
             backgroundImage: `linear-gradient(rgba(10,10,10,0.94), rgba(10,10,10,0.94)), url("${barbershop.settings.background_image_url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      {/* Header Mobile */}
      <header className="relative lg:hidden sticky top-0 z-50 border-b border-cream-100/5 overflow-hidden bg-zinc-900">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'url("/textura.png")', backgroundSize: '420px', backgroundPosition: 'center', backgroundRepeat: 'repeat' }}
        />
        <div className="relative px-3 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm truncate max-w-[130px]">{barbershop?.name || 'Barbearia'}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-cream-300/50 active:bg-zinc-800 rounded-lg transition">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="relative border-t border-cream-100/5 bg-zinc-900 backdrop-blur-md">
            <nav className="p-2 space-y-1">
              {menuItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                      active ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-cream-300/50 hover:text-cream-50 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all mt-2">
                <LogOut size={18} /> Sair
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="relative hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 border-r border-cream-100/5 overflow-hidden bg-zinc-900">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ backgroundImage: 'url("/textura.png")', backgroundSize: '420px', backgroundPosition: 'center', backgroundRepeat: 'repeat' }}
          />

          <div className="relative p-4 border-b border-cream-100/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-sm text-cream-50">{barbershop?.name || 'Barbearia'}</span>
                <p className="text-[10px] text-cream-300/50 font-medium">
                  {profile?.role === 'OWNER' ? 'Administrador' : 'Funcionário'}
                </p>
              </div>
            </div>
          </div>

          <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active ? 'bg-zinc-800/80 text-cream-50' : 'text-cream-300/50 hover:text-cream-50 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="relative p-3 border-t border-cream-100/5">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar" />
                ) : (
                  <span className="text-xs font-bold text-cream-300/60">{profile?.full_name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-cream-50">{profile?.full_name}</p>
                <p className="text-[10px] text-cream-300/30 truncate">{profile?.role}</p>
              </div>
              <NotificationBell />
              <button onClick={handleSignOut} className="text-cream-300/30 hover:text-red-400 transition shrink-0" title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

                <main className="flex-1 lg:ml-64 p-3 md:p-6 pb-24 lg:pb-6 min-w-0 overflow-x-hidden">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  );
}