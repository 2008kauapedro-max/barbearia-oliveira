import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Search } from 'lucide-react';

export default function OwnerClients() {
  const { barbershop } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    if (!barbershop?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('barbershop_id', barbershop.id).eq('role', 'CLIENT').order('created_at', { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  };

  const filtered = clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cream-50">Clientes</h1>
        <p className="text-sm text-cream-300/50 mt-1">Base de clientes da barbearia</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-300/30" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-zinc-900/50 border border-cream-100/5 rounded-xl pl-11 pr-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50 transition" 
        />
      </div>

      {loading ? <p className="text-cream-300/40">Carregando...</p> : (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-12 text-center">
              <Users size={48} className="mx-auto text-cream-300/20 mb-4" />
              <h3 className="text-lg font-bold text-cream-50">Nenhum cliente encontrado</h3>
            </div>
          ) : (
            filtered.map((client) => (
              <div key={client.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-yellow-500">
                  {client.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-cream-50 text-sm">{client.full_name}</h3>
                  <p className="text-xs text-cream-300/50">{client.phone || 'Sem telefone'}</p>
                </div>
                <div className="text-xs text-cream-300/30">
                  {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}