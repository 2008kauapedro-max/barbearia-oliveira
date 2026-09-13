import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }: { children: any; allowedRoles: string[] }) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse text-cream-300/40">Carregando...</div>
      </div>
    );
  }

  if (!user || !profile) return <Navigate to="/login" replace />;

  if (profile.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h1 className="text-lg font-bold text-cream-50 mb-2">Conta desativada</h1>
          <p className="text-sm text-cream-300/60 mb-3">O dono da barbearia desativou seu acesso ao sistema.</p>
          {profile.disable_reason && (
            <p className="text-sm bg-red-500/10 text-red-400 rounded-xl px-3 py-2 mb-4">Motivo: {profile.disable_reason}</p>
          )}
          <button onClick={() => signOut()} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3 rounded-xl">Sair</button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) return <Navigate to="/" replace />;

  return children;
}