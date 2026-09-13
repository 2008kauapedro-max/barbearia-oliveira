import { useAuth } from '../../contexts/AuthContext';

export default function SharedServices() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">Serviços</h1>
      
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
        <p className="text-cream-300/40 text-sm">
          Serviços em desenvolvimento.
        </p>
        <p className="text-cream-300/30 text-xs mt-2">
          {profile?.role === 'OWNER' 
            ? 'Como administrador, você pode gerenciar todos os serviços.' 
            : 'Você pode visualizar os serviços disponíveis.'}
        </p>
      </div>
    </div>
  );
}
