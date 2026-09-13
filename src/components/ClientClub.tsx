import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, daysUntil, subscriptionHealth } from '../lib/business';
import { Crown, MessageCircle, CalendarDays, Scissors } from 'lucide-react';

const DAY_LABELS: Record<string, string> = { sun: 'Domingo', mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function ClientClub() {
  const { barbershop, profile } = useAuth();
  const [tab, setTab] = useState<'minhas' | 'planos' | 'faturas'>('minhas');
  const [mySubs, setMySubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const whatsappNumber = barbershop?.settings?.whatsapp || '5561993524201';

  useEffect(() => {
    if (!profile?.id || !barbershop?.id) return;
    supabase.from('subscriptions').select('*, plan:plan_id(name)').eq('client_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => setMySubs(data || []));
    supabase.from('subscription_plans').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true).order('price').then(({ data }) => setPlans(data || []));
    supabase.from('services').select('id, name').eq('barbershop_id', barbershop.id).eq('is_active', true).then(({ data }) => setServices(data || []));
  }, [profile, barbershop]);

  const current = mySubs.find(s => s.status === 'active') || mySubs[0];
  const serviceName = (id: string) => services.find(s => s.id === id)?.name || 'Serviço';
  const daysText = (days: string[]) => (days || []).length === 0 ? 'Todos os dias de funcionamento' : DAY_ORDER.filter(d => (days || []).includes(d)).map(d => DAY_LABELS[d]).join(', ');

  const waSubscribe = (planName: string, price: number) => {
    const msg = encodeURIComponent(`Olá! Quero assinar o plano ${planName} (${formatCurrency(price)}) da Barbearia Oliveira. Como faço o pagamento?`);
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-cream-50 flex items-center gap-1.5"><Crown size={18} className="text-yellow-400" /> Clube de Assinatura</h1>
        <p className="text-xs text-cream-300/50 mt-0.5">Planos, cortes e vencimentos</p>
      </div>

      <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1">
        {(['minhas', 'planos', 'faturas'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${tab === t ? 'bg-zinc-800 text-yellow-400' : 'text-cream-300/40'}`}>
            {t === 'minhas' ? 'Minhas assinaturas' : t === 'planos' ? 'Planos' : 'Faturas'}
          </button>
        ))}
      </div>

      {tab === 'minhas' && (
        !current || current.status === 'cancelled' ? (
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6 text-center">
            <Crown size={28} className="mx-auto text-cream-300/20 mb-2" />
            <p className="text-cream-300/50 text-xs mb-3">Nenhuma assinatura ativa. Veja os planos!</p>
            <button onClick={() => setTab('planos')} className="bg-yellow-500 text-[#0a0a0a] text-xs font-bold px-4 py-2 rounded-xl">Ver planos</button>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-cream-50 text-sm">{current.plan?.name || 'Assinatura'}</p>
              <span className={`text-[10px] font-bold ${subscriptionHealth(current) === 'green' ? 'text-green-400' : subscriptionHealth(current) === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`}>
                {current.status === 'expired' || daysUntil(current.due_date) < 0 ? 'VENCIDA' : `${daysUntil(current.due_date)} dias restantes`}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cream-300/60 mb-1">
                <span>Cortes disponíveis</span>
                <span className="font-bold text-cream-50">{current.cuts_remaining} de {current.cuts_included}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(current.cuts_remaining / current.cuts_included) * 100}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-cream-300/40">Vencimento: {current.due_date?.split('-').reverse().join('/')}</p>
          </div>
        )
      )}

      {tab === 'planos' && (
        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="text-center text-cream-300/40 text-xs py-6">Nenhum plano disponível no momento.</p>
          ) : plans.map(p => (
            <div key={p.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="font-bold text-cream-50 text-sm">{p.name}</p>
                <p className="font-bold text-yellow-500 text-sm">{formatCurrency(Number(p.price))}</p>
              </div>
              <p className="text-xs text-cream-300/50 mb-2">{p.cuts_included} cortes • {p.period_days} dias</p>
              <div className="space-y-1.5 bg-zinc-800/40 rounded-xl p-3 mb-3">
                <p className="text-[10px] text-cream-300/40 flex items-center gap-1"><CalendarDays size={10} /> Dias para utilização:</p>
                <p className="text-xs text-cream-50">{daysText(p.allowed_days)}</p>
                <p className="text-[10px] text-cream-300/40 flex items-center gap-1 pt-1"><Scissors size={10} /> Serviços do plano:</p>
                {(p.included_services || []).length === 0 ? (
                  <p className="text-xs text-cream-300/50">Qualquer serviço ativo</p>
                ) : (
                  (p.included_services || []).map((id: string) => (
                    <p key={id} className="text-xs text-cream-50">• {serviceName(id)} (assinatura)</p>
                  ))
                )}
              </div>
              <button onClick={() => waSubscribe(p.name, Number(p.price))} className="w-full flex items-center justify-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 py-2 rounded-xl text-xs font-bold">
                <MessageCircle size={14} /> Assinar pelo WhatsApp
              </button>
            </div>
          ))}
          <p className="text-[10px] text-cream-300/30 text-center">Pagamento e ativação confirmados pela barbearia; sua assinatura aparece no app em seguida.</p>
        </div>
      )}

      {tab === 'faturas' && (
        <div className="space-y-2">
          {mySubs.length === 0 ? (
            <p className="text-center text-cream-300/40 text-xs py-6">Nenhum pagamento registrado ainda.</p>
          ) : mySubs.map(s => (
            <div key={s.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-cream-50">{s.plan?.name || 'Assinatura'}</p>
                <p className="text-[10px] text-cream-300/40">
                  {s.last_renewed_at ? 'Renovada em ' + new Date(s.last_renewed_at).toLocaleDateString('pt-BR') : 'Início em ' + s.start_date?.split('-').reverse().join('/')}
                  {s.payment_method ? ` • ${s.payment_method.replace('_', ' ')}` : ''}
                </p>
              </div>
              <p className="text-xs font-bold text-cream-50">{formatCurrency(Number(s.price))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}