import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, subscriptionHealth, daysUntil } from '../../lib/business';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Crown, Plus, RefreshCw, X, AlertCircle, Check, ChevronDown, ChevronUp, Search, Sparkles, Scissors, CalendarDays } from 'lucide-react';

const DAY_LABELS: Record<string, string> = { sun: 'Domingo', mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function OwnerSubscriptions() {
  const [tab, setTab] = useState<'subscriptions' | 'plans'>('subscriptions');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Assinaturas</h1>
        <p className="text-sm text-cream-300/50 mt-1">Gerencie planos e assinantes</p>
      </div>

      <div className="flex gap-2 bg-zinc-900/50 rounded-xl p-1">
        <button onClick={() => setTab('subscriptions')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tab === 'subscriptions' ? 'bg-yellow-500 text-[#0a0a0a]' : 'text-cream-300/50'}`}>
          Assinantes
        </button>
        <button onClick={() => setTab('plans')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tab === 'plans' ? 'bg-yellow-500 text-[#0a0a0a]' : 'text-cream-300/50'}`}>
          Planos
        </button>
      </div>

      {tab === 'subscriptions' ? <SubscriptionsList /> : <PlansList />}
    </div>
  );
}

// ===== ASSINANTES =====
function SubscriptionsList() {
  const { barbershop } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'cancelled'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; subId: string | null; clientName: string }>({ open: false, subId: null, clientName: '' });
  const [renewConfirm, setRenewConfirm] = useState<{ open: boolean; subId: string | null; clientName: string }>({ open: false, subId: null, clientName: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => { loadSubs(); }, []);

  const loadSubs = async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    const { data } = await supabase.from('subscriptions').select(`
      *,
      client:client_id (full_name, phone),
      plan:plan_id (name),
      referrer:referred_by (full_name)
    `).eq('barbershop_id', barbershop.id).order('due_date', { ascending: true });
    if (data) setSubs(data);
    setLoading(false);
  };

  const requestRenew = (sub: any) => {
    setRenewConfirm({ open: true, subId: sub.id, clientName: sub.client?.full_name || 'Cliente' });
  };

  const handleRenewConfirm = async () => {
    if (!renewConfirm.subId) return;
    setConfirmLoading(true);
    try {
      const { data } = await supabase.rpc('renew_subscription', { p_subscription_id: renewConfirm.subId });
      if (data?.error) alert(data.error);
      else loadSubs();
    } finally {
      setConfirmLoading(false);
      setRenewConfirm({ open: false, subId: null, clientName: '' });
    }
  };

  const requestCancel = (sub: any) => {
    setCancelConfirm({ open: true, subId: sub.id, clientName: sub.client?.full_name || 'Cliente' });
  };

  const handleCancelConfirm = async () => {
    if (!cancelConfirm.subId) return;
    setConfirmLoading(true);
    try {
      await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', cancelConfirm.subId);
      loadSubs();
    } finally {
      setConfirmLoading(false);
      setCancelConfirm({ open: false, subId: null, clientName: '' });
    }
  };

  const filtered = subs.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.client?.full_name?.toLowerCase().includes(q) && !s.client?.phone?.includes(q)) return false;
    }
    if (filter === 'all') return true;
    if (filter === 'active') return s.status === 'active' && daysUntil(s.due_date) > 7;
    if (filter === 'expiring') return s.status === 'active' && daysUntil(s.due_date) <= 7 && daysUntil(s.due_date) >= 0;
    if (filter === 'expired') return s.status === 'expired' || (s.status === 'active' && daysUntil(s.due_date) < 0);
    if (filter === 'cancelled') return s.status === 'cancelled';
    return true;
  });

  const counts = {
    all: subs.length,
    active: subs.filter(s => s.status === 'active' && daysUntil(s.due_date) > 7).length,
    expiring: subs.filter(s => s.status === 'active' && daysUntil(s.due_date) <= 7 && daysUntil(s.due_date) >= 0).length,
    expired: subs.filter(s => s.status === 'expired' || (s.status === 'active' && daysUntil(s.due_date) < 0)).length,
    cancelled: subs.filter(s => s.status === 'cancelled').length,
  };

  const healthColor = (s: any) => {
    if (s.status === 'cancelled') return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    const h = subscriptionHealth(s);
    if (h === 'green') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (h === 'yellow') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const healthDot = (s: any) => {
    if (s.status === 'cancelled') return 'bg-zinc-400';
    const h = subscriptionHealth(s);
    if (h === 'green') return 'bg-green-400';
    if (h === 'yellow') return 'bg-yellow-400';
    return 'bg-red-400';
  };

  if (loading) return <p className="text-cream-300/40 text-sm">Carregando...</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowCreate(true)} className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-[#0a0a0a] font-bold py-3 rounded-xl hover:bg-yellow-600 transition">
        <Plus size={18} /> Nova Assinatura
      </button>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/30" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="w-full bg-zinc-900/50 border border-cream-100/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          { key: 'all', label: 'Todas' },
          { key: 'active', label: '🟢 Ativas' },
          { key: 'expiring', label: '🟡 Vencendo' },
          { key: 'expired', label: '🔴 Vencidas' },
          { key: 'cancelled', label: 'Canceladas' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filter === f.key ? 'bg-zinc-700 text-cream-50 border-cream-100/10' : 'bg-zinc-900/30 border-cream-100/5 text-cream-300/40'}`}>
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
          <Crown size={32} className="mx-auto text-cream-300/20 mb-3" />
          <p className="text-cream-300/40 text-sm">Nenhuma assinatura encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const days = daysUntil(s.due_date);
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className={`border rounded-2xl transition ${healthColor(s)}`}>
                <button onClick={() => setExpandedId(expanded ? null : s.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${healthDot(s)}`} />
                      <div>
                        <p className="font-bold text-cream-50 text-sm">{s.client?.full_name}</p>
                        <p className="text-xs text-cream-300/50">{s.plan?.name || 'Sem plano'} • {s.client?.phone}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="text-xs font-bold">
                          {s.status === 'cancelled' ? 'Cancelada' : days < 0 ? `Vencida há ${Math.abs(days)}d` : days === 0 ? 'Vence HOJE' : `${days} dias`}
                        </p>
                        <p className="text-[10px] text-cream-300/40">{s.cuts_remaining}/{s.cuts_included} cortes</p>
                      </div>
                      {expanded ? <ChevronUp size={16} className="text-cream-300/30" /> : <ChevronDown size={16} className="text-cream-300/30" />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-current/10">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div>
                        <p className="text-[10px] text-cream-300/40 uppercase">Início</p>
                        <p className="text-xs font-medium text-cream-50">{s.start_date?.split('-').reverse().join('/')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-cream-300/40 uppercase">Vencimento</p>
                        <p className="text-xs font-medium text-cream-50">{s.due_date?.split('-').reverse().join('/')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-cream-300/40 uppercase">Valor</p>
                        <p className="text-xs font-medium text-cream-50">{formatCurrency(Number(s.price))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-cream-300/40 uppercase">Cortes usados</p>
                        <p className="text-xs font-medium text-cream-50">{s.cuts_used} de {s.cuts_included}</p>
                      </div>
                      {s.referrer && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-cream-300/40 uppercase">Indicado por</p>
                          <p className="text-xs font-medium text-yellow-400">{s.referrer.full_name}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-cream-300/40 mb-1">
                        <span>Cortes utilizados</span>
                        <span>{s.cuts_used}/{s.cuts_included}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${(s.cuts_used / s.cuts_included) * 100}%` }} />
                      </div>
                    </div>

                    {s.status !== 'cancelled' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => requestRenew(s)} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 text-green-400 py-2.5 rounded-xl text-xs font-bold hover:bg-green-500/20 transition">
                          <RefreshCw size={14} /> Renovar
                        </button>
                        <button onClick={() => requestCancel(s)} className="flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-red-500/20 transition">
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateSubscriptionModal onClose={() => setShowCreate(false)} onSuccess={loadSubs} />}

      <ConfirmDialog
        open={renewConfirm.open}
        title="Renovar assinatura?"
        description={`A assinatura de ${renewConfirm.clientName} será renovada. Os cortes serão resetados e o vencimento estendido. Esta ação não pode ser desfeita.`}
        variant="neutral"
        confirmLabel="Sim, renovar"
        loading={confirmLoading}
        onConfirm={handleRenewConfirm}
        onCancel={() => { setRenewConfirm({ open: false, subId: null, clientName: '' }); setConfirmLoading(false); }}
      />

      <ConfirmDialog
        open={cancelConfirm.open}
        title="Cancelar assinatura?"
        description={`A assinatura de ${cancelConfirm.clientName} será cancelada. O cliente perderá os cortes restantes. Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmLabel="Sim, cancelar"
        loading={confirmLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => { setCancelConfirm({ open: false, subId: null, clientName: '' }); setConfirmLoading(false); }}
      />
    </div>
  );
}

// ===== CRIAR ASSINATURA =====
function CreateSubscriptionModal({ onClose, onSuccess }: any) {
  const { barbershop } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [planId, setPlanId] = useState('');
  const [clientId, setClientId] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const plan = plans.find(p => p.id === planId);

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('subscription_plans').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true).then(({ data }) => { if (data) setPlans(data); });
    supabase.from('profiles').select('id, full_name, phone').eq('barbershop_id', barbershop.id).eq('role', 'CLIENT').order('full_name').then(({ data }) => { if (data) setClients(data); });
    supabase.from('profiles').select('id, full_name').eq('barbershop_id', barbershop.id).eq('role', 'BARBER').eq('is_active', true).then(({ data }) => { if (data) setBarbers(data); });
  }, [barbershop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop || !plan) return;
    setSaving(true);
    setError('');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + plan.period_days);

    const { error: insertError } = await supabase.from('subscriptions').insert({
      barbershop_id: barbershop.id,
      client_id: clientId,
      plan_id: planId,
      start_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      status: 'active',
      cuts_included: plan.cuts_included,
      cuts_used: 0,
      cuts_remaining: plan.cuts_included,
      price: plan.price,
      payment_method: paymentMethod || null,
      referred_by: referredBy || null,
      next_renewal_at: dueDate.toISOString().split('T')[0],
    });

    setSaving(false);
    if (insertError) { setError('Erro: ' + insertError.message); return; }
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-cream-100/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-cream-50">Nova Assinatura</h2>
          <button onClick={onClose} className="p-1 text-cream-300/40"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

          {plans.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl text-sm">
              ⚠️ Nenhum plano cadastrado. Crie um na aba "Planos" primeiro.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Cliente *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
              <option value="">Selecione o cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `- ${c.phone}` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Plano *</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
              <option value="">Selecione o plano</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.cuts_included} cortes — {formatCurrency(Number(p.price))}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Indicado por (funcionário)</label>
            <select value={referredBy} onChange={e => setReferredBy(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50">
              <option value="">Nenhum / não se aplica</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Forma de pagamento</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50">
              <option value="">Selecione</option>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="cartao_debito">Cartão de débito</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={saving || !planId || !clientId} className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {saving ? 'Criando...' : 'Criar Assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== PLANOS (com modelo pronto, igual ao app de referência) =====
function PlansList() {
  const { barbershop } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ name: '', price: '', cuts_included: '4', period_days: '30', allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], included_services: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!barbershop?.id) return;
    const [p, s] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('barbershop_id', barbershop.id).order('created_at', { ascending: false }),
      supabase.from('services').select('id, name').eq('barbershop_id', barbershop.id).eq('is_active', true),
    ]);
    if (p.data) setPlans(p.data);
    if (s.data) setServices(s.data);
    setLoading(false);
  };

  const applyTemplate = (kind: 'mensal' | 'quinzenal' | 'semanal') => {
    const allServices = services.map(s => s.id);
    if (kind === 'mensal') setForm({ name: 'Plano Mensal — Corte', price: '', cuts_included: '4', period_days: '30', allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], included_services: allServices });
    if (kind === 'quinzenal') setForm({ name: 'Plano Quinzenal — Corte', price: '', cuts_included: '2', period_days: '15', allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], included_services: allServices });
    if (kind === 'semanal') setForm({ name: 'Plano Semanal — Corte + Barba', price: '', cuts_included: '1', period_days: '7', allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri'], included_services: allServices });
  };

  const toggleDay = (d: string) =>
    setForm((f: any) => ({ ...f, allowed_days: f.allowed_days.includes(d) ? f.allowed_days.filter((x: string) => x !== d) : [...f.allowed_days, d] }));

  const toggleService = (id: string) =>
    setForm((f: any) => ({ ...f, included_services: f.included_services.includes(id) ? f.included_services.filter((x: string) => x !== id) : [...f.included_services, id] }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('subscription_plans').insert({
      barbershop_id: barbershop.id,
      name: form.name,
      price: parseFloat(form.price),
      cuts_included: parseInt(form.cuts_included),
      period_days: parseInt(form.period_days),
      allowed_days: form.allowed_days,
      included_services: form.included_services,
    });
    setSaving(false);
    if (err) { setError('Erro: ' + err.message); return; }
    setForm({ name: '', price: '', cuts_included: '4', period_days: '30', allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], included_services: [] });
    setShowCreate(false);
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('subscription_plans').update({ is_active: !current }).eq('id', id);
    load();
  };

  const serviceName = (id: string) => services.find(s => s.id === id)?.name || 'Serviço';
  const daysText = (days: string[]) => (days || []).length === 0 ? 'Todos os dias de funcionamento' : DAY_ORDER.filter(d => (days || []).includes(d)).map(d => DAY_LABELS[d]).join(', ');

  if (loading) return <p className="text-cream-300/40 text-sm">Carregando...</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowCreate(true)} className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-[#0a0a0a] font-bold py-3 rounded-xl hover:bg-yellow-600 transition">
        <Plus size={18} /> Novo Plano
      </button>

      {plans.length === 0 ? (
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
          <Crown size={32} className="mx-auto text-cream-300/20 mb-3" />
          <p className="text-cream-300/40 text-sm">Nenhum plano cadastrado. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <div key={p.id} className={`bg-zinc-900/50 border rounded-2xl p-4 ${p.is_active ? 'border-cream-100/5' : 'border-red-500/20 opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-cream-50 text-sm">{p.name}</p>
                  <p className="text-xs text-cream-300/50 mt-0.5">Valor: <b className="text-yellow-500">{formatCurrency(Number(p.price))}</b> • {p.cuts_included} cortes • {p.period_days} dias</p>
                </div>
                <button onClick={() => toggleActive(p.id, p.is_active)} className={`text-[10px] font-bold shrink-0 ${p.is_active ? 'text-green-400' : 'text-red-400'}`}>
                  {p.is_active ? '✅ Ativo' : '❌ Desativado'}
                </button>
              </div>
              <div className="space-y-1.5 bg-zinc-800/40 rounded-xl p-3">
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
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-cream-100/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-cream-50">Novo Plano</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-cream-300/40"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm">{error}</div>}

              {/* Modelos prontos */}
              <div>
                <p className="text-[10px] text-cream-300/40 uppercase font-bold mb-1.5 flex items-center gap-1"><Sparkles size={10} /> Começar de um modelo:</p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => applyTemplate('mensal')} className="flex-1 bg-zinc-800 text-cream-50 py-2 rounded-lg text-[10px] font-bold">Mensal (4 cortes)</button>
                  <button type="button" onClick={() => applyTemplate('quinzenal')} className="flex-1 bg-zinc-800 text-cream-50 py-2 rounded-lg text-[10px] font-bold">Quinzenal (2)</button>
                  <button type="button" onClick={() => applyTemplate('semanal')} className="flex-1 bg-zinc-800 text-cream-50 py-2 rounded-lg text-[10px] font-bold">Semanal (1)</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-cream-300/40 uppercase font-bold">Nome do plano</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Shark Basic - Corte e Sobrancelha" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-cream-300/40 uppercase font-bold">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" required />
                </div>
                <div>
                  <label className="text-[10px] text-cream-300/40 uppercase font-bold">Cortes</label>
                  <input type="number" value={form.cuts_included} onChange={e => setForm({ ...form, cuts_included: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" required />
                </div>
                <div>
                  <label className="text-[10px] text-cream-300/40 uppercase font-bold">Dias</label>
                  <input type="number" value={form.period_days} onChange={e => setForm({ ...form, period_days: e.target.value })} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50" required />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-cream-300/40 uppercase font-bold mb-1.5 block">Dias para utilização</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_ORDER.map(d => (
                    <button type="button" key={d} onClick={() => toggleDay(d)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${form.allowed_days.includes(d) ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-800 border-cream-100/5 text-cream-300/50'}`}>
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-cream-300/40 uppercase font-bold mb-1.5 block">Serviços do plano</label>
                {services.length === 0 ? (
                  <p className="text-xs text-cream-300/40">Cadastre serviços primeiro. Vazio = qualquer serviço ativo.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-cream-50 bg-zinc-800/50 rounded-lg px-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={form.included_services.includes(s.id)} onChange={() => toggleService(s.id)} className="accent-yellow-500" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold text-sm disabled:opacity-50">{saving ? 'Criando...' : 'Criar Plano'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}