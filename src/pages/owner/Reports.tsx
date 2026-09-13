import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, dateKey, daysUntil } from '../../lib/business';
import { Download, FileText, Users, Scissors, Crown } from 'lucide-react';

type PeriodKey = 'today' | '7d' | '30d' | 'month' | 'prevmonth';

export default function OwnerReports() {
  const { barbershop } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);

  const valueOf = (a: any) => Number(a.price_charged ?? a.services?.price ?? 0);

  const getPeriod = () => {
    const today = new Date();
    let start = new Date(today);
    if (period === '7d') start.setDate(start.getDate() - 6);
    if (period === '30d') start.setDate(start.getDate() - 29);
    if (period === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (period === 'prevmonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { start: dateKey(start), end: dateKey(new Date(today.getFullYear(), today.getMonth(), 0)) };
    }
    return { start: dateKey(start), end: dateKey(today) };
  };

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    const { start, end } = getPeriod();
    const shop = barbershop.id;
    const [a, c, s, b] = await Promise.all([
      supabase.from('appointments').select('id, date, status, price_charged, subscription_id, service_id, services(name, price), barber:barber_id(id, full_name), client:client_id(id, full_name)').eq('barbershop_id', shop).gte('date', start).lte('date', end),
      supabase.from('profiles').select('id, created_at').eq('barbershop_id', shop).eq('role', 'CLIENT'),
      supabase.from('subscriptions').select('id, status, due_date, created_at, last_renewed_at, referred_by, client:client_id(full_name)').eq('barbershop_id', shop),
      supabase.from('profiles').select('id, full_name').eq('barbershop_id', shop).eq('role', 'BARBER'),
    ]);
    setAppts(a.data || []);
    setClients(c.data || []);
    setSubs(s.data || []);
    setBarbers(b.data || []);
    setLoading(false);
  };

  const { start, end } = getPeriod();
  const completed = appts.filter(a => a.status === 'completed');
  const revenue = completed.reduce((acc, a) => acc + valueOf(a), 0);
  const ticket = completed.length > 0 ? revenue / completed.length : 0;
  const newClients = clients.filter(c => (c.created_at || '').slice(0, 10) >= start);
  const perClient = new Map<string, number>();
  completed.forEach(a => perClient.set(a.client?.id, (perClient.get(a.client?.id) || 0) + 1));
  const recurring = Array.from(perClient.values()).filter(n => n >= 2).length;
  const cancelled = appts.filter(a => a.status === 'cancelled').length;
  const noShows = appts.filter(a => a.status === 'no_show').length;
  const newSubs = subs.filter(s => (s.created_at || '').slice(0, 10) >= start);
  const renewed = subs.filter(s => s.last_renewed_at && s.last_renewed_at.slice(0, 10) >= start);
  const expiredSubs = subs.filter(s => s.status === 'expired' || (s.status === 'active' && daysUntil(s.due_date) < 0));

  const byBarber = barbers.map(b => {
    const mine = completed.filter(a => a.barber?.id === b.id);
    const rev = mine.reduce((acc, a) => acc + valueOf(a), 0);
    const refs = subs.filter(s => s.referred_by === b.id);
    return {
      name: b.full_name,
      count: mine.length,
      revenue: rev,
      refs: refs.length,
      refsActive: refs.filter(s => s.status === 'active' && daysUntil(s.due_date) >= 0).length,
      refsExpired: refs.filter(s => s.status === 'expired' || daysUntil(s.due_date) < 0).length,
      renewals: refs.filter(s => s.last_renewed_at && s.last_renewed_at.slice(0, 10) >= start).length,
    };
  }).sort((x, y) => y.revenue - x.revenue);

  const byServiceMap = new Map<string, { count: number; revenue: number }>();
  completed.forEach(a => {
    const name = a.services?.name || 'Sem serviço';
    const cur = byServiceMap.get(name) || { count: 0, revenue: 0 };
    cur.count += 1; cur.revenue += valueOf(a);
    byServiceMap.set(name, cur);
  });
  const byService = Array.from(byServiceMap.entries()).sort((x, y) => y[1].revenue - x[1].revenue);

  const download = () => {
    const lines: string[] = [];
    lines.push('RELATÓRIO GERENCIAL — ' + (barbershop?.name || 'Barbearia'));
    lines.push(`Período: ${start.split('-').reverse().join('/')} a ${end.split('-').reverse().join('/')}`);
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('');
    lines.push('== GERAL ==');
    lines.push(`Faturamento: ${formatCurrency(revenue)}`);
    lines.push(`Atendimentos concluídos: ${completed.length}`);
    lines.push(`Ticket médio: ${formatCurrency(ticket)}`);
    lines.push(`Novos clientes: ${newClients.length}`);
    lines.push(`Clientes recorrentes (2+ atendimentos): ${recurring}`);
    lines.push(`Cancelamentos: ${cancelled} | Faltas: ${noShows}`);
    lines.push(`Assinaturas: ${subs.length} ativas/vigentes | novas: ${newSubs.length} | renovadas: ${renewed.length} | vencidas: ${expiredSubs.length}`);
    lines.push('');
    lines.push('== POR FUNCIONÁRIO ==');
    byBarber.forEach(b => {
      lines.push(`${b.name}: ${b.count} atendimentos | ${formatCurrency(b.revenue)} | indicações: ${b.refs} (${b.refsActive} ativas, ${b.refsExpired} vencidas) | renovações: ${b.renewals}`);
    });
    lines.push('');
    lines.push('== POR SERVIÇO ==');
    byService.forEach(([name, info]) => {
      const share = revenue > 0 ? ((info.revenue / revenue) * 100).toFixed(1) : '0.0';
      lines.push(`${name}: ${info.count}x | ${formatCurrency(info.revenue)} | ${share}% do faturamento`);
    });
    lines.push('');
    lines.push('== ATENDIMENTOS DO PERÍODO ==');
    completed.forEach(a => {
      lines.push(`${a.date.split('-').reverse().join('/')} ${a.time} | ${a.client?.full_name} | ${a.services?.name} | ${a.barber?.full_name} | ${a.subscription_id ? 'ASSINATURA' : formatCurrency(valueOf(a))}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${start}_a_${end}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-cream-50">Relatórios</h1>
          <p className="text-sm text-cream-300/50 mt-1">Dados reais do período selecionado</p>
        </div>
        <button onClick={download} className="flex items-center gap-2 bg-yellow-500 text-[#0a0a0a] px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-600 transition">
          <Download size={16} /> Baixar relatório
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['today', '7d', '30d', 'month', 'prevmonth'] as PeriodKey[]).map(k => (
          <button key={k} onClick={() => setPeriod(k)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${period === k ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/50'}`}>
            {k === 'today' ? 'Hoje' : k === '7d' ? '7 dias' : k === '30d' ? '30 dias' : k === 'month' ? 'Este mês' : 'Mês anterior'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-cream-300/40 text-sm">Carregando...</p> : (
        <>
          {/* Geral */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Faturamento</p>
              <p className="text-xl font-bold text-cream-50">{formatCurrency(revenue)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Atendimentos</p>
              <p className="text-xl font-bold text-cream-50">{completed.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Ticket médio</p>
              <p className="text-xl font-bold text-cream-50">{formatCurrency(ticket)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Novos clientes</p>
              <p className="text-xl font-bold text-cream-50">{newClients.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Recorrentes</p>
              <p className="text-xl font-bold text-cream-50">{recurring}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Cancelamentos</p>
              <p className="text-xl font-bold text-cream-50">{cancelled}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Novas assinaturas</p>
              <p className="text-xl font-bold text-cream-50">{newSubs.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Renovações</p>
              <p className="text-xl font-bold text-cream-50">{renewed.length}</p>
            </div>
          </div>

          {/* Por funcionário */}
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
            <p className="font-bold text-cream-50 mb-3 flex items-center gap-2"><Users size={16} className="text-yellow-400" /> Por funcionário</p>
            {byBarber.length === 0 ? <p className="text-xs text-cream-300/40">Nenhum funcionário cadastrado.</p> : (
              <div className="space-y-2">
                {byBarber.map(b => (
                  <div key={b.name} className="bg-zinc-800/50 rounded-xl p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-cream-50">{b.name}</span>
                      <span className="text-yellow-500 font-bold">{formatCurrency(b.revenue)}</span>
                    </div>
                    <p className="text-xs text-cream-300/50 mt-1">
                      {b.count} atendimentos • {b.refs} indicação(ões) ({b.refsActive} ativas / {b.refsExpired} vencidas) • {b.renewals} renovação(ões)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por serviço */}
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
            <p className="font-bold text-cream-50 mb-3 flex items-center gap-2"><Scissors size={16} className="text-yellow-400" /> Por serviço</p>
            {byService.length === 0 ? <p className="text-xs text-cream-300/40">Nenhum atendimento concluído no período.</p> : (
              <div className="space-y-2.5">
                {byService.map(([name, info]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cream-50 font-medium">{name} ({info.count}x)</span>
                      <span className="text-cream-300/60">{formatCurrency(info.revenue)} • {revenue > 0 ? ((info.revenue / revenue) * 100).toFixed(1) : '0'}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${revenue > 0 ? (info.revenue / revenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-cream-300/30 text-center flex items-center justify-center gap-1">
            <FileText size={10} /> Relatório baseado exclusivamente em registros reais do banco.
          </p>
        </>
      )}
    </div>
  );
}