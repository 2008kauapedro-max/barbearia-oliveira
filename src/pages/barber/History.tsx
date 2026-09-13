import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Download, DollarSign, TrendingUp, Scissors, Crown } from 'lucide-react';
import { formatCurrency } from '../../lib/business';

export default function BarberHistory() {
  const { barbershop, profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');

  useEffect(() => { loadHistory(); }, [period]);

  const loadHistory = async () => {
    if (!barbershop?.id || !profile?.id) return;
    setLoading(true);

    const today = new Date();
    const startDate = new Date();
    if (period === 'week') startDate.setDate(today.getDate() - 7);
    else startDate.setMonth(today.getMonth() - 1);

    const { data } = await supabase.from('appointments').select(`
      *,
      price_charged,
      services (name, price),
      client:client_id (full_name)
    `).eq('barber_id', profile.id).eq('status', 'completed').gte('date', startDate.toISOString().split('T')[0]).order('date', { ascending: false });

    if (data) setAppointments(data);
    setLoading(false);
  };

  // REGRA ÚNICA: valor efetivamente cobrado (assinatura = R$ 0)
  const valueOf = (apt: any) => Number(apt.price_charged ?? apt.services?.price ?? 0);

  const totalRevenue = appointments.reduce((acc, apt) => acc + valueOf(apt), 0);
  const totalAppointments = appointments.length;
  const subscriptionCuts = appointments.filter(a => a.subscription_id).length;
  const avgTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  const generateReport = () => {
    const periodLabel = period === 'week' ? 'Últimos 7 dias' : 'Últimos 30 dias';
    const content = `RELATÓRIO DE ATENDIMENTOS
${profile?.full_name}
${periodLabel}

RESUMO:
- Atendimentos concluídos: ${totalAppointments}
- Cortes via assinatura: ${subscriptionCuts}
- Faturamento total: ${formatCurrency(totalRevenue)}
- Ticket médio: ${formatCurrency(avgTicket)}

ATENDIMENTOS:
${appointments.map((apt, i) => `${i + 1}. ${new Date(apt.date).toLocaleDateString('pt-BR')} ${apt.time} - ${apt.client?.full_name} - ${apt.services?.name} - ${apt.subscription_id ? 'ASSINATURA (R$ 0,00)' : formatCurrency(valueOf(apt))}`).join('\n')}

Gerado em ${new Date().toLocaleString('pt-BR')}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${period === 'week' ? '7-dias' : '30-dias'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-cream-300/40">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Meu Histórico</h1>
        <p className="text-sm text-cream-300/50 mt-1">Seus atendimentos concluídos</p>
      </div>

      <div className="flex gap-2 bg-zinc-900/50 rounded-xl p-1">
        {(['week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${period === p ? 'bg-yellow-500 text-[#0a0a0a]' : 'text-cream-300/50'}`}>
            {p === 'week' ? '7 dias' : '30 dias'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3">
          <DollarSign size={16} className="text-green-400 mb-1" />
          <p className="text-xs text-cream-300/50">Faturamento</p>
          <p className="text-lg font-bold text-cream-50">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3">
          <Scissors size={16} className="text-yellow-400 mb-1" />
          <p className="text-xs text-cream-300/50">Atendimentos</p>
          <p className="text-lg font-bold text-cream-50">{totalAppointments}</p>
        </div>
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3">
          <TrendingUp size={16} className="text-blue-400 mb-1" />
          <p className="text-xs text-cream-300/50">Ticket Médio</p>
          <p className="text-lg font-bold text-cream-50">{formatCurrency(avgTicket)}</p>
        </div>
      </div>

      {subscriptionCuts > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2">
          <Crown size={16} className="text-yellow-400" />
          <p className="text-xs text-cream-300/70">{subscriptionCuts} corte(s) via assinatura neste período (não entram no faturamento).</p>
        </div>
      )}

      <button onClick={generateReport} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-600 transition">
        <Download size={18} />
        Baixar Relatório
      </button>

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <h3 className="font-bold text-cream-50 mb-3">Atendimentos</h3>
        {appointments.length === 0 ? (
          <p className="text-center text-cream-300/40 py-6 text-sm">Nenhum atendimento no período.</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream-50 truncate">{apt.client?.full_name}</p>
                  <p className="text-xs text-cream-300/50">{apt.services?.name} • {new Date(apt.date).toLocaleDateString('pt-BR')} {apt.time}</p>
                </div>
                {apt.subscription_id ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold shrink-0">
                    <Crown size={10} /> ASSINATURA
                  </span>
                ) : (
                  <p className="font-bold text-yellow-500 text-sm shrink-0">{formatCurrency(valueOf(apt))}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}