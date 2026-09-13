import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, dateKey, daysUntil, isFuture, getDayHours } from '../lib/business';
import { Send, Bot, Sparkles, AlertTriangle } from 'lucide-react';

type Msg = { role: 'user' | 'ai'; text: string };

function renderRich(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const content = bullet ? bullet[1] : numbered ? numbered[2] : line;
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j} className="font-bold text-yellow-400">{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>
    );
    if (bullet) return <div key={i} className="flex items-start gap-2 my-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" /><span>{parts}</span></div>;
    if (numbered) return <div key={i} className="flex items-start gap-2 my-0.5"><span className="text-yellow-400 font-bold shrink-0">{numbered[1]}.</span><span>{parts}</span></div>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <div key={i}>{parts}</div>;
  });
}

export default function AssistantChat() {
  const { profile, barbershop } = useAuth();
  const role = profile?.role || 'CLIENT';
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'ai',
    text: role === 'OWNER'
      ? 'Olá, chefe! 👋 Sou sua IA de gestão: ensino o passo a passo de qualquer tela, respondo com dados reais e executo ações com sua confirmação.'
      : role === 'BARBER'
        ? 'Fala, parceiro! ✂️ Sou sua IA de trabalho: respondo sobre SUA agenda, SEUS atendimentos e SEU faturamento. Coisas da área do dono eu não acesso.'
        : 'Olá! 💈 Sou a IA da barbearia: te ajudo a agendar, cancelar, ver seus cortes e tirar dúvidas do app.',
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | { label: string; run: () => Promise<string> }>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  const push = (m: Msg) => setMessages(prev => [...prev, m]);
  const shopId = () => barbershop?.id as string;
  const val = (a: any) => Number(a.price_charged ?? a.services?.price ?? 0);

  // ===== FACTS DO DONO =====
  const buildOwnerFacts = async () => {
    const today = dateKey(new Date());
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const [a30, a7, aToday, clientsRes, subsRes] = await Promise.all([
      supabase.from('appointments').select('date, status, price_charged, services(name, price), barber:barber_id(full_name)').eq('barbershop_id', shopId()).gte('date', dateKey(d30)).lte('date', today),
      supabase.from('appointments').select('status, price_charged, services(price)').eq('barbershop_id', shopId()).eq('status', 'completed').gte('date', dateKey(d7)).lte('date', today),
      supabase.from('appointments').select('status, price_charged, services(price)').eq('barbershop_id', shopId()).eq('status', 'completed').eq('date', today),
      supabase.from('profiles').select('id, created_at').eq('barbershop_id', shopId()).eq('role', 'CLIENT'),
      supabase.from('subscriptions').select('status, due_date, cuts_remaining, client:client_id(full_name)').eq('barbershop_id', shopId()),
    ]);
    const list30: any[] = (a30.data as any) || [];
    const completed30 = list30.filter(a => a.status === 'completed');
    const rev30 = completed30.reduce((acc, a) => acc + val(a), 0);
    const barberMap = new Map<string, { atendimentos: number; faturamento: number }>();
    completed30.forEach(a => {
      const name = a.barber?.full_name || 'Sem barbeiro';
      const cur = barberMap.get(name) || { atendimentos: 0, faturamento: 0 };
      cur.atendimentos += 1; cur.faturamento += val(a);
      barberMap.set(name, cur);
    });
    const serviceMap = new Map<string, number>();
    completed30.forEach(a => serviceMap.set(a.services?.name || 'Sem serviço', (serviceMap.get(a.services?.name || 'Sem serviço') || 0) + 1));
    const clients: any[] = (clientsRes.data as any) || [];
    const subs: any[] = (subsRes.data as any) || [];
    const activeSubs = subs.filter(s => s.status === 'active' && daysUntil(s.due_date) >= 0);
    return {
      data_de_hoje: today,
      faturamento_hoje: ((aToday.data as any) || []).reduce((acc: number, a: any) => acc + val(a), 0),
      faturamento_7_dias: ((a7.data as any) || []).reduce((acc: number, a: any) => acc + val(a), 0),
      faturamento_30_dias: rev30,
      ticket_medio_30_dias: completed30.length ? rev30 / completed30.length : 0,
      atendimentos_30_dias: completed30.length,
      cancelamentos_30_dias: list30.filter(a => a.status === 'cancelled').length,
      faltas_30_dias: list30.filter(a => a.status === 'no_show').length,
      ranking_barbeiros_30_dias: Array.from(barberMap.entries()).map(([nome, v]) => ({ nome, ...v })),
      servicos_mais_vendidos_30_dias: Array.from(serviceMap.entries()).map(([nome, vezes]) => ({ nome, vezes })),
      clientes: { total: clients.length, novos_30_dias: clients.filter(c => (c.created_at || '').slice(0, 10) >= dateKey(d30)).length },
      assinaturas: {
        ativas: activeSubs.length,
        vencendo_7_dias: activeSubs.filter(s => daysUntil(s.due_date) <= 7).map(s => ({ cliente: s.client?.full_name, dias: daysUntil(s.due_date) })),
        vencidas: subs.filter(s => s.status === 'expired' || (s.status === 'active' && daysUntil(s.due_date) < 0)).map(s => ({ cliente: s.client?.full_name })),
      },
    };
  };

  // ===== FACTS DO BARBEIRO (só os próprios) =====
  const buildBarberFacts = async () => {
    const today = dateKey(new Date());
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const [a30, a7, prox, refs] = await Promise.all([
      supabase.from('appointments').select('date, time, status, price_charged, services(name, price), client:client_id(full_name)').eq('barber_id', profile!.id).gte('date', dateKey(d30)).lte('date', today),
      supabase.from('appointments').select('status, price_charged, services(price)').eq('barber_id', profile!.id).eq('status', 'completed').gte('date', dateKey(d7)).lte('date', today),
      supabase.from('appointments').select('date, time, status, services(name), client:client_id(full_name, phone)').eq('barber_id', profile!.id).in('status', ['scheduled', 'confirmed', 'in_service']).gte('date', today).order('date').order('time').limit(5),
      supabase.from('subscriptions').select('status, due_date, client:client_id(full_name)').eq('referred_by', profile!.id),
    ]);
    const list30: any[] = (a30.data as any) || [];
    const completed30 = list30.filter(a => a.status === 'completed');
    const rev30 = completed30.reduce((acc, a) => acc + val(a), 0);
    const subs: any[] = (refs.data as any) || [];
    return {
      data_de_hoje: today,
      meu_faturamento_hoje: list30.filter(a => a.date === today && a.status === 'completed').reduce((acc, a) => acc + val(a), 0),
      meu_faturamento_7_dias: ((a7.data as any) || []).reduce((acc: number, a: any) => acc + val(a), 0),
      meu_faturamento_30_dias: rev30,
      meus_atendimentos_30_dias: completed30.length,
      meu_ticket_medio_30_dias: completed30.length ? rev30 / completed30.length : 0,
      meus_proximos_clientes: ((prox.data as any) || []).filter((a: any) => isFuture(a.date, a.time)).map((a: any) => ({ data: a.date, hora: a.time, cliente: a.client?.full_name, servico: a.services?.name, status: a.status })),
      minhas_indicacoes: {
        total: subs.length,
        ativas: subs.filter(s => s.status === 'active' && daysUntil(s.due_date) >= 0).length,
        vencidas: subs.filter(s => s.status === 'expired' || daysUntil(s.due_date) < 0).length,
      },
    };
  };

  // ===== FACTS DO CLIENTE (só os próprios) =====
  const buildClientFacts = async () => {
    const [apts, subRes] = await Promise.all([
      supabase.from('appointments').select('date, time, status, services(name, price), profiles:barber_id(full_name)').eq('client_id', profile!.id).order('date').order('time'),
      supabase.from('subscriptions').select('status, due_date, cuts_included, cuts_remaining, plan:plan_id(name)').eq('client_id', profile!.id).order('created_at', { ascending: false }).limit(1),
    ]);
    const all: any[] = (apts.data as any) || [];
    const next = all.find(a => isFuture(a.date, a.time) && a.status !== 'cancelled');
    const sub = ((subRes.data as any) || [])[0] || null;
    const hours = getDayHours(barbershop, new Date());
    return {
      meu_proximo_agendamento: next ? { data: next.date, hora: next.time, servico: next.services?.name, barbeiro: next.profiles?.full_name } : null,
      meus_atendimentos_concluidos: all.filter(a => a.status === 'completed').length,
      meus_cancelamentos: all.filter(a => a.status === 'cancelled').length,
      minha_assinatura: sub ? { plano: sub.plan?.name, status: sub.status, cortes_restantes: sub.cuts_remaining, cortes_do_plano: sub.cuts_included, vencimento: sub.due_date } : null,
      barbearia: {
        nome: barbershop?.name,
        endereco: barbershop?.address,
        telefone: barbershop?.phone,
        funcionamento_hoje: hours.closed ? 'fechada hoje' : `${hours.open} às ${hours.close}`,
      },
    };
  };

  const buildFacts = role === 'OWNER' ? buildOwnerFacts : role === 'BARBER' ? buildBarberFacts : buildClientFacts;

  const callAI = async (history: Msg[], userText: string, facts: any): Promise<string> => {
       let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    const resp = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({
        messages: [
          ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: 'user', content: userText },
        ],
        facts,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || 'Erro ao consultar a IA.');
    return data.reply as string;
  };

  const handleText = async (raw: string) => {
    const t = raw.trim();
    if (!t || thinking) return;
    const history = [...messages];
    push({ role: 'user', text: t });
    setInput('');
    setThinking(true);
    try {
      const facts = await buildFacts();
      push({ role: 'ai', text: await callAI(history, t, facts) });
    } catch (e: any) {
      push({ role: 'ai', text: '⚠️ ' + (e?.message || 'Falha ao consultar a IA.') });
    } finally {
      setThinking(false);
    }
  };

  // ===== AÇÕES POR CARGO =====
  const ownerActions = [
    {
      label: '⚠️ Avisar assinaturas vencendo (campanha)',
      btn: '⚠️ Avisar vencendo',
      run: async () => {
        const { data, error } = await supabase.from('campaigns').insert({
          barbershop_id: shopId(), title: 'Sua assinatura está vencendo!',
          message: 'Olá! Sua assinatura da Barbearia Oliveira está perto do vencimento. Bora renovar? 💈',
          audience: 'expiring', channel: 'internal', status: 'draft',
        }).select('id').single();
        if (error || !data) return 'Erro ao criar a campanha.';
        const { data: r } = await supabase.rpc('send_campaign', { p_campaign_id: data.id });
        if (r?.error) return r.error;
        return 'Lembretes enviados às notificações dos clientes com assinatura vencendo! 🔔';
      },
    },
    {
      label: '📣 Criar rascunho "Promoção da semana" para todos os clientes',
      btn: '📣 Criar promoção',
      run: async () => {
        const { error } = await supabase.from('campaigns').insert({
          barbershop_id: shopId(), title: 'Promoção da semana',
          message: 'Confira nossas promoções desta semana! Agende pelo app. 💈',
          audience: 'all', channel: 'internal', status: 'draft',
        });
        if (error) return 'Erro ao criar o rascunho.';
        return 'Rascunho criado! Revise em Comunicação → Histórico. 📣';
      },
    },
  ];

  const clientActions = [
    {
      label: '❌ Cancelar meu próximo agendamento confirmado',
      btn: '❌ Cancelar próximo',
      run: async () => {
        const { data } = await supabase.from('appointments').select('*').eq('client_id', profile!.id).eq('status', 'confirmed').gte('date', dateKey(new Date())).order('date').order('time').limit(1);
        const apt: any = (data || [])[0];
        if (!apt) return 'Você não tem nenhum agendamento futuro confirmado para cancelar.';
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apt.id);
        if (error) return 'Erro ao cancelar.';
        return `Cancelado: ${apt.date.split('-').reverse().join('/')} às ${apt.time}.`;
      },
    },
  ];

  const actions = role === 'OWNER' ? ownerActions : role === 'CLIENT' ? clientActions : [];

  const quicks = role === 'OWNER'
    ? ['Quanto faturei este mês?', 'Quem realizou mais atendimentos?', 'Qual serviço é mais vendido?', 'Quais assinaturas estão vencendo?', 'Como adiciono um barbeiro?']
    : role === 'BARBER'
      ? ['Quanto faturei este mês?', 'Quem é meu próximo cliente?', 'Quantos cortes fiz essa semana?', 'Quantas assinaturas indiquei?', 'Como registro um atendimento avulso?']
      : ['Quando é meu próximo horário?', 'Quantos cortes restam no meu plano?', 'Como agendo um horário?', 'Como cancelo um agendamento?', 'Qual o horário de funcionamento?'];

  const confirmAction = async () => {
    if (!pendingAction) return;
    setThinking(true);
    push({ role: 'ai', text: await pendingAction.run() });
    setPendingAction(null);
    setThinking(false);
  };

  return (
           <div className={role === 'CLIENT' ? 'fixed inset-x-0 top-14 bottom-16 z-30 bg-[#0a0a0a] flex flex-col px-3 pt-3' : 'flex flex-col h-[calc(100dvh-190px)] lg:h-[calc(100dvh-140px)]'}>
      <div className="mb-3">
        <h1 className="text-xl font-bold text-cream-50 flex items-center gap-2">
          <Bot size={20} className="text-yellow-400" />
          {role === 'OWNER' ? 'Assistente do Dono' : role === 'BARBER' ? 'Assistente do Barbeiro' : 'Assistente do Cliente'}
        </h1>
        <p className="text-sm text-cream-300/50 mt-1">IA real respondendo só com dados do seu escopo</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-yellow-500 text-[#0a0a0a] font-medium whitespace-pre-wrap' : 'bg-zinc-900 border border-cream-100/5 text-cream-50'}`}>
              {m.role === 'user' ? m.text : renderRich(m.text)}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-cream-100/5 rounded-2xl px-4 py-3 text-sm text-cream-300/50 flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Consultando...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto py-3">
        {quicks.map(q => (
          <button key={q} onClick={() => handleText(q)} disabled={thinking} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/70 border border-cream-100/5 text-cream-300/60 hover:text-cream-50 transition disabled:opacity-40">
            {q}
          </button>
        ))}
        {actions.map(a => (
          <button key={a.btn} onClick={() => setPendingAction({ label: a.label, run: a.run })} disabled={thinking} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 transition disabled:opacity-40">
            {a.btn}
          </button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); handleText(input); }} className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte algo..." className="flex-1 bg-zinc-900 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
        <button type="submit" disabled={thinking || !input} className="bg-yellow-500 text-[#0a0a0a] px-4 rounded-xl font-bold disabled:opacity-50">
          <Send size={18} />
        </button>
      </form>

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl w-full max-w-sm p-5">
            <p className="font-bold text-cream-50 flex items-center gap-2 mb-3"><AlertTriangle size={18} className="text-yellow-400" /> Confirmar ação</p>
            <p className="text-sm text-cream-300/70 mb-4">{pendingAction.label}</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingAction(null)} className="flex-1 bg-zinc-800 text-cream-50 py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
              <button onClick={confirmAction} className="flex-1 bg-yellow-500 text-[#0a0a0a] py-2.5 rounded-xl font-bold text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}