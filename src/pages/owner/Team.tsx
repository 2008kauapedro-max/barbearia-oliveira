import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, dateKey, daysUntil } from '../../lib/business';
import { UserPlus, AlertCircle, KeyRound, UserX, UserCheck, Users, ChevronDown, ChevronUp, Star, Scissors, Crown, Image as ImageIcon } from 'lucide-react';

const makeTempAuth = () =>
  createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export default function OwnerTeam() {
  const { barbershop } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBarber, setNewBarber] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState<{ name: string; password: string } | null>(null);
  const [disableTarget, setDisableTarget] = useState<any>(null);
  const [disableReason, setDisableReason] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    if (!barbershop?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('barbershop_id', barbershop.id).eq('role', 'BARBER').order('created_at', { ascending: false });
    if (data) setBarbers(data);
    setLoading(false);
  };

  const loadStats = async (b: any) => {
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const [appts, reviews, refs, posts] = await Promise.all([
      supabase.from('appointments').select('status, price_charged, services(price)').eq('barber_id', b.id).gte('date', dateKey(d30)),
      supabase.from('reviews').select('rating').eq('barber_id', b.id),
      supabase.from('subscriptions').select('status, due_date').eq('referred_by', b.id),
      supabase.from('posts').select('id').eq('author_id', b.id),
    ]);
    const list: any[] = (appts.data as any) || [];
    const completed = list.filter(a => a.status === 'completed');
    const revenue = completed.reduce((acc, a) => acc + Number(a.price_charged ?? a.services?.price ?? 0), 0);
    const rv: any[] = (reviews.data as any) || [];
    const avg = rv.length ? rv.reduce((acc, r) => acc + r.rating, 0) / rv.length : 0;
    const subs: any[] = (refs.data as any) || [];
    setStats(prev => ({
      ...prev,
      [b.id]: {
        atendimentos: completed.length,
        faturamento: revenue,
        cancelados: list.filter(a => a.status === 'cancelled').length,
        avaliacoes: rv.length,
        media: avg,
        indicacoes: subs.length,
        indicacoesAtivas: subs.filter(s => s.status === 'active' && daysUntil(s.due_date) >= 0).length,
        posts: (posts.data || []).length,
      },
    }));
  };

  const handleAddBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!barbershop) { setError('Erro: Barbearia não identificada.'); return; }
    const tempPassword = 'Bb@' + Math.random().toString(36).slice(2, 10) + 'A1';
    const tempAuth = makeTempAuth();
    const { data: authData, error: authError } = await tempAuth.auth.signUp({ email: newBarber.email, password: tempPassword, options: { data: { full_name: newBarber.name } } });
    if (authError) { setError('Erro ao criar usuário: ' + authError.message); return; }
    const userId = authData.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').insert({ id: userId, barbershop_id: barbershop.id, role: 'BARBER', full_name: newBarber.name, phone: newBarber.phone, is_active: true });
      if (profileError) { setError('Erro ao vincular perfil: ' + profileError.message); return; }
    }
    setCreatedInfo({ name: newBarber.name, password: tempPassword });
    setShowAdd(false);
    setNewBarber({ name: '', email: '', phone: '' });
    loadTeam();
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    await supabase.from('profiles').update({ is_active: false, disable_reason: disableReason || 'Sem motivo informado' }).eq('id', disableTarget.id);
    setDisableTarget(null); setDisableReason('');
    loadTeam();
  };

  const handleEnable = async (id: string) => {
    await supabase.from('profiles').update({ is_active: true, disable_reason: null }).eq('id', id);
    loadTeam();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cream-50">Equipe</h1>
          <p className="text-sm text-cream-300/50 mt-1">Toque em um funcionário para ver tudo sobre ele</p>
        </div>
        <button onClick={() => { setCreatedInfo(null); setShowAdd(true); }} className="flex items-center gap-2 bg-yellow-500 text-[#0a0a0a] px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-600 transition text-sm">
          <UserPlus size={18} /> Adicionar
        </button>
      </div>

      {createdInfo && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl">
          <p className="font-bold flex items-center gap-2 text-sm"><KeyRound size={16} /> {createdInfo.name} criado com sucesso!</p>
          <p className="text-xs mt-1">Senha inicial: <b className="select-all">{createdInfo.password}</b> — entregue ao funcionário.</p>
        </div>
      )}

      {loading ? <p className="text-cream-300/40 text-sm">Carregando...</p> : (
        <div className="grid gap-3">
          {barbers.length === 0 ? (
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-10 text-center">
              <Users size={40} className="mx-auto text-cream-300/20 mb-3" />
              <p className="text-cream-300/40 text-sm">Nenhum barbeiro cadastrado</p>
            </div>
          ) : barbers.map(barber => {
            const s = stats[barber.id];
            const open = expanded === barber.id;
            return (
              <div key={barber.id} className={`bg-zinc-900/50 border rounded-2xl ${barber.is_active ? 'border-cream-100/5' : 'border-red-500/20'}`}>
                <button onClick={() => { setExpanded(open ? null : barber.id); if (!open && !s) loadStats(barber); }} className="w-full p-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-yellow-500 shrink-0 overflow-hidden">
                        {barber.avatar_url ? <img src={barber.avatar_url} className="w-full h-full object-cover" alt="" /> : barber.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-cream-50 text-sm truncate">{barber.full_name}</p>
                        <p className="text-xs text-cream-300/50 truncate">{barber.phone || 'Sem telefone'}</p>
                        {!barber.is_active && <p className="text-[10px] text-red-400 mt-0.5">🚫 {barber.disable_reason || 'Desativado'}</p>}
                      </div>
                    </div>
                    {open ? <ChevronUp size={16} className="text-cream-300/30 shrink-0" /> : <ChevronDown size={16} className="text-cream-300/30 shrink-0" />}
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-3 border-t border-cream-100/5">
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <div className="bg-zinc-800/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-cream-300/40 uppercase flex items-center gap-1"><Scissors size={9} /> Atendimentos (30d)</p>
                        <p className="text-sm font-bold text-cream-50">{s?.atendimentos ?? '...'}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-cream-300/40 uppercase">Faturamento (30d)</p>
                        <p className="text-sm font-bold text-yellow-500">{s ? formatCurrency(s.faturamento) : '...'}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-cream-300/40 uppercase flex items-center gap-1"><Star size={9} /> Avaliação</p>
                        <p className="text-sm font-bold text-cream-50">{s ? (s.avaliacoes ? `${s.media.toFixed(1)} (${s.avaliacoes})` : 'sem avaliações') : '...'}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-cream-300/40 uppercase flex items-center gap-1"><Crown size={9} /> Indicações</p>
                        <p className="text-sm font-bold text-cream-50">{s ? `${s.indicacoes} (${s.indicacoesAtivas} ativas)` : '...'}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2.5 col-span-2">
                        <p className="text-[9px] text-cream-300/40 uppercase flex items-center gap-1"><ImageIcon size={9} /> Posts no feed • Cancelamentos (30d)</p>
                        <p className="text-sm font-bold text-cream-50">{s ? `${s.posts} posts • ${s.cancelados} canc.` : '...'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {barber.is_active ? (
                        <button onClick={() => { setDisableTarget(barber); setDisableReason(''); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 py-2.5 rounded-xl text-xs font-medium">
                          <UserX size={14} /> Desativar com motivo
                        </button>
                      ) : (
                        <button onClick={() => handleEnable(barber.id)} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 text-green-400 py-2.5 rounded-xl text-xs font-medium">
                          <UserCheck size={14} /> Reativar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {disableTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-sm p-5">
            <h2 className="text-lg font-bold text-cream-50 mb-2">Desativar {disableTarget.full_name}?</h2>
            <p className="text-xs text-cream-300/50 mb-3">Ele não entra no sistema e o motivo fica visível pra ele.</p>
            <input type="text" value={disableReason} onChange={e => setDisableReason(e.target.value)} placeholder="Motivo (ex: afastado por lesão até 10/10)" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDisableTarget(null)} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold text-sm">Cancelar</button>
              <button onClick={handleDisable} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm">Desativar</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold text-cream-50 mb-4">Novo Barbeiro</h2>
            {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
            <form onSubmit={handleAddBarber} className="space-y-3">
              <input type="text" placeholder="Nome completo" value={newBarber.name} onChange={e => setNewBarber({ ...newBarber, name: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              <input type="email" placeholder="E-mail (será o login)" value={newBarber.email} onChange={e => setNewBarber({ ...newBarber, email: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              <input type="tel" placeholder="Telefone" value={newBarber.phone} onChange={e => setNewBarber({ ...newBarber, phone: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold text-sm">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}