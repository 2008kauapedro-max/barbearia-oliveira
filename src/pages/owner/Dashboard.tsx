import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, dateKey, daysUntil } from '../../lib/business';
import { Users, Scissors, Calendar, DollarSign, TrendingUp, TrendingDown, Crown, AlertCircle, UserPlus, Clock, Sparkles, PhoneOff } from 'lucide-react';

type PeriodKey = 'today' | '7d' | '30d' | 'month' | 'prevmonth' | 'custom';

export default function OwnerDashboard() {
  const { barbershop } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);

  const [appts, setAppts] = useState<any[]>([]);
  const [prevCompleted, setPrevCompleted] = useState<any[]>([]);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<any[]>([]);

  const valueOf = (a: any) => Number(a.price_charged ?? a.services?.price ?? 0);

  const getPeriod = (): { start: string; end: string; prevStart: string; prevEnd: string } => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    if (period === '7d') start.setDate(start.getDate() - 6);
    if (period === '30d') start.setDate(start.getDate() - 29);
    if (period === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (period === 'prevmonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    if (period === 'custom') {
      if (customStart) start = new Date(customStart + 'T00:00:00');
      if (customEnd) end = new Date(customEnd + 'T00:00:00');
    }
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));
    return { start: dateKey(start), end: dateKey(end), prevStart: dateKey(prevStart), prevEnd: dateKey(prevEnd) };
  };

  useEffect(() => { load(); }, [period, customStart, customEnd]);

  const load = async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    const { start, end, prevStart, prevEnd } = getPeriod();
    const shop = barbershop.id;
    const today = dateKey(new Date());

    const [a, p, t, c, s, pc] = await Promise.all([
      supabase.from('appointments').select('id, date, time, status, price_charged, subscription_id, service_id, services(name, price), barber:barber_id(full_name)').eq('barbershop_id', shop).gte('date', start).lte('date', end),
      supabase.from('appointments').select('id, price_charged, services(name, price)').eq('barbershop_id', shop).eq('status', 'completed').gte('date', prevStart).lte('date', prevEnd),
      supabase.from('appointments').select('id, time, status, price_charged, services(name, price)').eq('barbershop_id', shop).eq('date', today),
      supabase.from('profiles').select('id, phone, created_at').eq('barbershop_id', shop).eq('role', 'CLIENT'),
      supabase.from('subscriptions').select('id, status, due_date, client:client_id(full_name)').eq('barbershop_id', shop),
      supabase.from('appointments').select('id, date, time, client:client_id(full_name), barber:barber_id(full_name)').eq('barbershop_id', shop).eq('status', 'scheduled').gte('date', today),
    ]);

    setAppts(a.data || []);
    setPrevCompleted(p.data || []);
    setTodayAppts(t.data || []);
    setClients(c.data || []);
    setSubs(s.data || []);
    setPendingConfirm(pc.data || []);
    setLoading(false);
  };

  // ===== CÁLCULOS REAIS =====
  const completed = appts.filter(a => a.status === 'completed');
  const cancelled = appts.filter(a => a.status === 'cancelled');
  const noShows = appts.filter(a => a.status === 'no_show');
  const revenue = completed.reduce((acc, a) => acc + valueOf(a), 0);
  const prevRevenue = prevCompleted.reduce((acc, a) => acc + valueOf(a), 0);
  const ticket = completed.length > 0 ? revenue / completed.length : 0;
  const todayCompleted = todayAppts.filter(a => a.status === 'completed');
  const todayRevenue = todayCompleted.reduce((acc, a) => acc + valueOf(a), 0);
  const todayCount = todayAppts.filter(a => a.status !== 'cancelled').length;
  const newClients = clients.filter(c => (c.created_at || '').slice(0, 10) >= getPeriod().start);
  const activeSubs = subs.filter(s => s.status === 'active' && daysUntil(s.due_date) >= 0);
  const expiringSubs = activeSubs.filter(s => daysUntil(s.due_date) <= 7);
  const expiredSubs = subs.filter(s => s.status === 'expired' || (s.status === 'active' && daysUntil(s.due_date) < 0));
  const clientsNoPhone = clients.filter(c => !c.phone);
  const hasHours = !!barbershop?.settings?.opening_hours;

  const delta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

  // Gráfico: faturamento por dia
  const dailyPoints = (() => {
    const map = new Map<string, number>();
    const { start, end } = getPeriod();
    const d = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    while (d <= e) { map.set(dateKey(d), 0); d.setDate(d.getDate() + 1); }
    completed.forEach(a => map.set(a.date, (map.get(a.date) || 0) + valueOf(a)));
    return Array.from(map.entries()).map(([date, value]) => ({ label: date.slice(8, 10) + '/' + date.slice(5, 7), value }));
  })();

  // Top serviços
  const topServices = (() => {
    const map = new Map<string, { count: number; revenue: number }>();
    completed.forEach(a => {
      const name = a.services?.name || 'Sem serviço';
      const cur = map.get(name) || { count: 0, revenue: 0 };
      cur.count += 1; cur.revenue += valueOf(a);
      map.set(name, cur);
    });
    return Array.from(map.entries()).sort((x, y) => y[1].revenue - x[1].revenue).slice(0, 5);
  })();

  // Melhor barbeiro do período
  const topBarber = (() => {
    const map = new Map<string, number>();
    completed.forEach(a => {
      const name = a.barber?.full_name || 'Sem barbeiro';
      map.set(name, (map.get(name) || 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort((x, y) => y[1] - x[1]);
    return sorted[0] || null;
  })();

  const maxService = topServices.length > 0 ? topServices[0][1].revenue : 1;

  const periodLabels: Record<PeriodKey, string> = {
    today: 'Hoje', '7d': '7 dias', '30d': '30 dias', month: 'Este mês', prevmonth: 'Mês anterior', custom: 'Personalizado',
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Dashboard</h1>
        <p className="text-sm text-cream-300/50 mt-1">Visão geral da {barbershop?.name}</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(periodLabels) as PeriodKey[]).map(k => (
          <button key={k} onClick={() => setPeriod(k)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${period === k ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/50'}`}>
            {periodLabels[k]}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 bg-zinc-900/50 border border-cream-100/5 rounded-xl px-3 py-2 text-xs text-cream-50" />
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 bg-zinc-900/50 border border-cream-100/5 rounded-xl px-3 py-2 text-xs text-cream-50" />
        </div>
      )}

      {loading ? <p className="text-cream-300/40 text-sm">Carregando métricas...</p> : (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-cream-300/50">Faturamento ({periodLabels[period]})</p>
                <DollarSign size={14} className="text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-cream-50">{formatCurrency(revenue)}</p>
              {delta !== null && (
                <p className={`text-[10px] mt-1 flex items-center gap-1 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {delta >= 0 ? '+' : ''}{delta.toFixed(0)}% vs período anterior
                </p>
              )}
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-cream-300/50">Atendimentos</p>
                <Scissors size={14} className="text-yellow-400" />
              </div>
              <p className="text-xl font-bold text-cream-50">{completed.length}</p>
              <p className="text-[10px] text-cream-300/40 mt-1">{cancelled.length} cancelados • {noShows.length} faltas</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-cream-300/50">Ticket médio</p>
                <TrendingUp size={14} className="text-blue-400" />
              </div>
              <p className="text-xl font-bold text-cream-50">{formatCurrency(ticket)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-cream-300/50">Hoje</p>
                <Calendar size={14} className="text-teal-400" />
              </div>
              <p className="text-xl font-bold text-cream-50">{formatCurrency(todayRevenue)}</p>
              <p className="text-[10px] text-cream-300/40 mt-1">{todayCount} agendamentos hoje</p>
            </div>
          </div>

          {/* Cards secundários */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Clientes ativos</p>
              <p className="text-xl font-bold text-cream-50">{clients.length}</p>
              <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1"><UserPlus size={10} /> +{newClients.length} novos no período</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Assinaturas ativas</p>
              <p className="text-xl font-bold text-cream-50">{activeSubs.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Vencendo (7 dias)</p>
              <p className={`text-xl font-bold ${expiringSubs.length > 0 ? 'text-yellow-400' : 'text-cream-50'}`}>{expiringSubs.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="text-xs text-cream-300/50 mb-1">Vencidas</p>
              <p className={`text-xl font-bold ${expiredSubs.length > 0 ? 'text-red-400' : 'text-cream-50'}`}>{expiredSubs.length}</p>
            </div>
          </div>

          {/* Resumo inteligente */}
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
            <p className="font-bold text-cream-50 mb-3 flex items-center gap-2"><Sparkles size={16} className="text-yellow-400" /> Resumo inteligente</p>
            <div className="space-y-2 text-sm text-cream-300/70">
              {completed.length === 0 && prevCompleted.length === 0 ? (
                <p className="text-cream-300/40 text-xs">Sem dados suficientes para este período. Registre atendimentos para ver as análises aqui.</p>
              ) : (
                <>
                  {delta !== null && (
                    <p>• Seu faturamento {delta >= 0 ? <b className="text-green-400">aumentou {delta.toFixed(0)}%</b> : <b className="text-red-400">caiu {Math.abs(delta).toFixed(0)}%</b>} em relação ao período anterior.</p>
                  )}
                  {topBarber && <p>• <b className="text-cream-50">{topBarber[0]}</b> realizou <b className="text-cream-50">{topBarber[1]}</b> atendimento(s) no período.</p>}
                  <p>• <b className="text-cream-50">{newClients.length}</b> cliente(s) novo(s) cadastrado(s) no período.</p>
                  {expiringSubs.length > 0 && <p>• <b className="text-yellow-400">{expiringSubs.length}</b> assinatura(s) vencem nos próximos 7 dias.</p>}
                  {topServices[0] && <p>• Serviço mais vendido: <b className="text-cream-50">{topServices[0][0]}</b> ({topServices[0][1].count}x).</p>}
                </>
              )}
            </div>
          </div>

          {/* Gráfico + top serviços */}
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="font-bold text-cream-50 mb-3 text-sm">Faturamento por dia</p>
              {completed.length === 0 ? (
                <p className="text-center text-cream-300/40 text-xs py-8">Nenhum atendimento concluído no período.</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {dailyPoints.map((p, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                      <div className="w-full bg-yellow-500/80 rounded-t" style={{ height: `${Math.max((p.value / Math.max(...dailyPoints.map(x => x.value), 1)) * 100, 2)}%` }} title={`${p.label}: ${formatCurrency(p.value)}`} />
                      <span className="text-[8px] text-cream-300/40">{dailyPoints.length <= 10 || i % Math.ceil(dailyPoints.length / 8) === 0 ? p.label : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <p className="font-bold text-cream-50 mb-3 text-sm">Serviços mais vendidos</p>
              {topServices.length === 0 ? (
                <p className="text-center text-cream-300/40 text-xs py-8">Nenhum atendimento concluído no período.</p>
              ) : (
                <div className="space-y-2.5">
                  {topServices.map(([name, info]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-cream-50 font-medium">{name} <span className="text-cream-300/40">({info.count}x)</span></span>
                        <span className="text-yellow-500 font-bold">{formatCurrency(info.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(info.revenue / maxService) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CENTRAL DE PENDÊNCIAS */}
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
            <p className="font-bold text-cream-50 mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-orange-400" /> Pendências que precisam de você</p>
            {expiringSubs.length === 0 && expiredSubs.length === 0 && pendingConfirm.length === 0 && clientsNoPhone.length === 0 && hasHours ? (
              <p className="text-center text-cream-300/40 text-xs py-4">✅ Tudo em dia! Nenhuma pendência no momento.</p>
            ) : (
              <div className="space-y-2">
                {expiringSubs.map(s => (
                  <button key={s.id} onClick={() => navigate('/app/assinaturas')} className="w-full flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-left text-xs text-yellow-400 hover:bg-yellow-500/15 transition">
                    <Crown size={14} /> Assinatura de <b>{s.client?.full_name}</b> vence em {daysUntil(s.due_date)} dia(s) — renovar?
                  </button>
                ))}
                {expiredSubs.map(s => (
                  <button key={s.id} onClick={() => navigate('/app/assinaturas')} className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/15 transition">
                    <Crown size={14} /> Assinatura de <b>{s.client?.full_name}</b> está VENCIDA.
                  </button>
                ))}
                {pendingConfirm.map(a => (
                  <button key={a.id} onClick={() => navigate('/app/agenda')} className="w-full flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 text-left text-xs text-blue-400 hover:bg-blue-500/15 transition">
                    <Clock size={14} /> <b>{a.client?.full_name}</b> aguardando confirmação ({a.date.split('-').reverse().join('/')} {a.time}).
                  </button>
                ))}
                {clientsNoPhone.length > 0 && (
                  <button onClick={() => navigate('/app/clientes')} className="w-full flex items-center gap-2 bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-left text-xs text-cream-300/60 hover:bg-zinc-800 transition">
                    <PhoneOff size={14} /> {clientsNoPhone.length} cliente(s) sem telefone cadastrado.
                  </button>
                )}
                {!hasHours && (
                  <button onClick={() => navigate('/app/configuracoes')} className="w-full flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 text-left text-xs text-orange-400 hover:bg-orange-500/15 transition">
                    <Clock size={14} /> Horários de funcionamento ainda não configurados.
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}