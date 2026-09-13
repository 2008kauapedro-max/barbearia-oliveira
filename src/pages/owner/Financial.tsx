import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function OwnerFinancial() {
  const { barbershop } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => { loadFinancial(); }, [period]);

  const loadFinancial = async () => {
    if (!barbershop?.id) return;
    setLoading(true);

    const today = new Date();
    let startDate = today.toISOString().split('T')[0];
    
    if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    }

    const { data, error } = await supabase.from('appointments').select(`
      *,
      services (name, price),
      barber:barber_id (full_name)
    `).eq('barbershop_id', barbershop.id).eq('status', 'completed').gte('date', startDate).order('date', { ascending: false });

    if (!error && data) setAppointments(data);
    setLoading(false);
  };

    const totalRevenue = appointments.reduce((acc, apt) => acc + Number(apt.price_charged ?? apt.services?.price ?? 0), 0);
  const totalAppointments = appointments.length;
  const avgTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cream-50">Financeiro</h1>
        <p className="text-sm text-cream-300/50 mt-1">Relatório de faturamento</p>
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 bg-zinc-900/50 rounded-xl p-1">
        {(['today', 'week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${period === p ? 'bg-yellow-500 text-[#0a0a0a]' : 'text-cream-300/50'}`}>
            {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
          </button>
        ))}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <span className="text-sm text-cream-300/50">Faturamento</span>
          </div>
          <p className="text-3xl font-bold text-cream-50">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar size={20} className="text-blue-400" />
            </div>
            <span className="text-sm text-cream-300/50">Atendimentos</span>
          </div>
          <p className="text-3xl font-bold text-cream-50">{totalAppointments}</p>
        </div>

        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-yellow-400" />
            </div>
            <span className="text-sm text-cream-300/50">Ticket Médio</span>
          </div>
          <p className="text-3xl font-bold text-cream-50">{formatCurrency(avgTicket)}</p>
        </div>
      </div>

      {/* Lista de Atendimentos */}
      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6">
        <h3 className="font-bold text-cream-50 mb-4">Atendimentos Realizados</h3>
        {loading ? <p className="text-cream-300/40">Carregando...</p> : (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-center text-cream-300/40 py-8">Nenhum atendimento no período</p>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-cream-50">{apt.services?.name}</p>
                    <p className="text-xs text-cream-300/50">{new Date(apt.date).toLocaleDateString('pt-BR')} • {apt.barber?.full_name}</p>
                  </div>
                  <p className="font-bold text-yellow-500">{formatCurrency(apt.services?.price || 0)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}