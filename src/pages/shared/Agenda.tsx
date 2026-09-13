import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { STATUS_META, dateKey, addDays, generateSlots, findConflict, timeToMin, minToTime, formatCurrency } from '../../lib/business';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Calendar, Plus, Clock, User, Scissors, CheckCircle, Play, X, UserX, AlertCircle, Crown, KeyRound } from 'lucide-react';

const makeTempAuth = () =>
  createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export default function SharedAgenda() {
  const { barbershop, profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';
  const perms = (barbershop as any)?.settings?.staff_permissions || {};
  const can = (k: string) => isOwner || (perms as any)[k] !== false;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [barberFilter, setBarberFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [quickRegister, setQuickRegister] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<null | { id: string; status: string; clientName?: string; time?: string }>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    const today = new Date().toDateString();
    if (localStorage.getItem('automation_last_run') === today) return;
    supabase.rpc('run_subscription_automation').then(() => localStorage.setItem('automation_last_run', today));
  }, [isOwner]);

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('services').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true).then(({ data }) => { if (data) setServices(data); });
    if (isOwner) {
      supabase.from('profiles').select('id, full_name').eq('barbershop_id', barbershop.id).eq('role', 'BARBER').eq('is_active', true).then(({ data }) => { if (data) setBarbers(data); });
    }
  }, [barbershop, isOwner]);

  useEffect(() => { loadAppointments(); }, [selectedDate, barberFilter]);

  const loadAppointments = async () => {
    if (!barbershop?.id) return;
    setLoading(true);
    let query = supabase.from('appointments').select(`
      *,
      services (name, price, duration_minutes),
      client:client_id (full_name, phone),
      barber:barber_id (full_name)
    `).eq('barbershop_id', barbershop.id).eq('date', selectedDate).order('time', { ascending: true });

    if (!isOwner) query = query.eq('barber_id', profile?.id);
    else if (barberFilter) query = query.eq('barber_id', barberFilter);

    const { data } = await query;
    if (data) setAppointments(data);
    setLoading(false);
  };

  const changeStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) alert('Erro ao atualizar status.');
    else loadAppointments();
  };

  const handleComplete = async (id: string) => {
    const { data } = await supabase.rpc('complete_appointment', { p_appointment_id: id });
    if (data?.error) alert(data.error);
    else loadAppointments();
  };

  const requestStatusChange = (id: string, status: string, clientName?: string, time?: string) => {
    setPendingStatus({ id, status, clientName, time });
  };

  const handleConfirmStatus = async () => {
    if (!pendingStatus) return;
    setConfirmLoading(true);
    try {
      await changeStatus(pendingStatus.id, pendingStatus.status);
    } finally {
      setConfirmLoading(false);
      setPendingStatus(null);
    }
  };

  const getDialogProps = () => {
    if (!pendingStatus) return null;
    if (pendingStatus.status === 'cancelled') {
      return {
        title: 'Cancelar agendamento?',
        description: `${pendingStatus.clientName || 'Cliente'} às ${pendingStatus.time || ''}. O horário será liberado na agenda. Esta ação não pode ser desfeita.`,
        variant: 'danger' as const,
        confirmLabel: 'Sim, cancelar',
      };
    }
    if (pendingStatus.status === 'no_show') {
      return {
        title: 'Marcar como falta?',
        description: `${pendingStatus.clientName || 'Cliente'} às ${pendingStatus.time || ''} será marcado como faltante. Esta ação não pode ser desfeita.`,
        variant: 'warning' as const,
        confirmLabel: 'Sim, marcar falta',
      };
    }
    return null;
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="space-y-3 overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-cream-50">Agenda</h1>
          <p className="text-xs text-cream-300/50 mt-0.5">{isOwner ? 'Todos os barbeiros' : 'Meus atendimentos'}</p>
        </div>
        <button
          onClick={() => { setQuickRegister(!isOwner); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-yellow-500 text-[#0a0a0a] px-3 py-2 rounded-xl font-bold hover:bg-yellow-600 transition text-xs"
        >
          <Plus size={16} /> {isOwner ? 'Novo Agendamento' : 'Registrar Atendimento'}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const key = dateKey(d);
          const label = i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          return (
            <button key={key} onClick={() => setSelectedDate(key)} className={`shrink-0 px-3 py-2 rounded-xl text-center transition border ${selectedDate === key ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/60'}`}>
              <p className="text-[9px] uppercase font-bold">{label}</p>
              <p className="text-base font-bold">{d.getDate()}</p>
            </button>
          );
        })}
      </div>

      {isOwner && barbers.length > 0 && (
        <select value={barberFilter} onChange={e => setBarberFilter(e.target.value)} className="w-full bg-zinc-900/50 border border-cream-100/5 rounded-xl px-3 py-2 text-xs text-cream-50 focus:outline-none focus:border-yellow-500/50">
          <option value="">Todos os barbeiros</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
        </select>
      )}

      {loading ? <p className="text-cream-300/40 text-xs">Carregando...</p> : (
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-6 text-center">
              <Calendar size={28} className="mx-auto text-cream-300/20 mb-2" />
              <p className="text-cream-300/40 text-xs">Nenhum agendamento para esta data.</p>
            </div>
          ) : appointments.map(apt => {
            const meta = STATUS_META[apt.status] || STATUS_META.scheduled;
            return (
              <div key={apt.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Clock size={16} className="text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-cream-50">{apt.time}</p>
                      <p className="text-[10px] text-cream-300/50">{apt.services?.duration_minutes || 30} min</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
                </div>

                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <User size={12} className="text-cream-300/40 shrink-0" />
                    <span className="text-cream-50 truncate">{apt.client?.full_name}</span>
                    {apt.subscription_id && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[9px] font-bold shrink-0">
                        <Crown size={9} /> ASSINANTE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Scissors size={12} className="text-cream-300/40 shrink-0" />
                    <span className="text-cream-50 truncate">{apt.services?.name}</span>
                    <span className="text-yellow-500 text-[10px] ml-auto shrink-0">
                      {apt.subscription_id ? 'Assinatura' : formatCurrency(Number(apt.price_charged ?? apt.services?.price ?? 0))}
                    </span>
                  </div>
                  {isOwner && <p className="text-[10px] text-cream-300/40">Barbeiro: {apt.barber?.full_name}</p>}
                </div>

                <div className="flex gap-1.5 pt-2 border-t border-cream-100/5">
                  {apt.status === 'scheduled' && (
                    <>
                      <button onClick={() => changeStatus(apt.id, 'confirmed')} className="flex-1 flex items-center justify-center gap-1 bg-teal-500/10 text-teal-400 py-1.5 rounded-lg text-[10px] font-medium">
                        <CheckCircle size={12} /> Confirmar
                      </button>
                      {can('can_cancel') && (
                        <button onClick={() => requestStatusChange(apt.id, 'cancelled', apt.client?.full_name, apt.time)} className="flex items-center justify-center bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] font-medium">
                          <X size={12} />
                        </button>
                      )}
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button onClick={() => changeStatus(apt.id, 'in_service')} className="flex-1 flex items-center justify-center gap-1 bg-yellow-500/10 text-yellow-400 py-1.5 rounded-lg text-[10px] font-medium">
                        <Play size={12} /> Iniciar
                      </button>
                      {can('can_no_show') && (
                        <button onClick={() => requestStatusChange(apt.id, 'no_show', apt.client?.full_name, apt.time)} className="flex items-center justify-center gap-1 bg-orange-500/10 text-orange-400 px-2.5 py-1.5 rounded-lg text-[10px] font-medium">
                          <UserX size={12} /> Faltou
                        </button>
                      )}
                      {can('can_cancel') && (
                        <button onClick={() => requestStatusChange(apt.id, 'cancelled', apt.client?.full_name, apt.time)} className="flex items-center justify-center bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] font-medium">
                          <X size={12} />
                        </button>
                      )}
                    </>
                  )}
                  {apt.status === 'in_service' && (
                    <>
                      {can('can_complete') && (
                        <button onClick={() => handleComplete(apt.id)} className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 text-green-400 py-1.5 rounded-lg text-[10px] font-bold">
                          <CheckCircle size={12} /> Concluir
                        </button>
                      )}
                      {can('can_no_show') && (
                        <button onClick={() => requestStatusChange(apt.id, 'no_show', apt.client?.full_name, apt.time)} className="flex items-center justify-center gap-1 bg-orange-500/10 text-orange-400 px-2.5 py-1.5 rounded-lg text-[10px] font-medium">
                          <UserX size={12} /> Faltou
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AppointmentModal
          quickRegister={quickRegister}
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSuccess={loadAppointments}
          services={services}
          barbers={barbers}
        />
      )}

      {pendingStatus && getDialogProps() && (
        <ConfirmDialog
          open={true}
          title={getDialogProps()!.title}
          description={getDialogProps()!.description}
          variant={getDialogProps()!.variant}
          confirmLabel={getDialogProps()!.confirmLabel}
          loading={confirmLoading}
          onConfirm={handleConfirmStatus}
          onCancel={() => { setPendingStatus(null); setConfirmLoading(false); }}
        />
      )}
    </div>
  );
}

function AppointmentModal({ quickRegister, defaultDate, onClose, onSuccess, services, barbers }: any) {
  const { barbershop, profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState(isOwner ? '' : profile?.id);
  const [date, setDate] = useState(quickRegister ? dateKey(new Date()) : defaultDate);
  const [time, setTime] = useState('');
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [expiredSub, setExpiredSub] = useState<any>(null);
  const [useSubscription, setUseSubscription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const service = services.find((s: any) => s.id === serviceId);
  const duration = service?.duration_minutes || 30;

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('profiles').select('id, full_name, phone').eq('barbershop_id', barbershop.id).eq('role', 'CLIENT').order('full_name').then(({ data }) => { if (data) setClients(data); });
  }, [barbershop]);

  useEffect(() => {
    if (!barberId || !date) return;
    supabase.from('appointments').select('id, time, status, services (duration_minutes)')
      .eq('barber_id', barberId).eq('date', date)
      .then(({ data }) => setDayAppointments(data || []));
  }, [barberId, date]);

  useEffect(() => {
    setSubscription(null); setExpiredSub(null); setUseSubscription(false);
    if (!clientId) return;
    supabase.from('subscriptions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        const sub = data?.[0];
        if (!sub) return;
        const active = sub.status === 'active' && sub.due_date >= dateKey(new Date());
        if (active && sub.cuts_remaining > 0) setSubscription(sub);
        else if (sub.status !== 'cancelled') setExpiredSub(sub);
      });
  }, [clientId]);

  const slots = generateSlots(barbershop, new Date(date + 'T00:00:00'), duration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!barbershop) return;
    setSaving(true);

    let finalClientId = clientId;
    if (isNewClient) {
      let newId: string | null = null;
      if (createAccount) {
        if (!accEmail || accPassword.length < 6) {
          setError('Preencha e-mail e senha (mín. 6 caracteres) para criar o acesso.');
          setSaving(false);
          return;
        }
        const temp = makeTempAuth();
        const { data: authData, error: authErr } = await temp.auth.signUp({ email: accEmail.trim(), password: accPassword });
        if (authErr || !authData.user) {
          setError('Erro ao criar login: ' + (authErr?.message || 'e-mail já cadastrado?'));
          setSaving(false);
          return;
        }
        newId = authData.user.id;
      }
      const { data: created } = await supabase.rpc('create_client_profile', { p_full_name: newName, p_phone: newPhone, p_id: newId });
      if (!created?.id) { setError('Erro ao cadastrar cliente.'); setSaving(false); return; }
      finalClientId = created.id;
    }

    let nowTime = time;
    if (quickRegister && !nowTime) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      nowTime = minToTime(Math.ceil(nowMin / 30) * 30);
    }

    const { data } = await supabase.rpc('book_appointment', {
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_date: date,
      p_time: nowTime,
      p_client_id: finalClientId,
      p_origin: quickRegister ? 'balcao' : 'app',
      p_subscription_id: useSubscription ? subscription.id : null,
    });

    setSaving(false);
    if (data?.error) setError(data.error);
    else { onSuccess(); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="p-3 border-b border-cream-100/5 flex items-center justify-between">
          <h2 className="text-base font-bold text-cream-50">{quickRegister ? 'Registrar Atendimento' : 'Novo Agendamento'}</h2>
          <button onClick={onClose} className="p-1 text-cream-300/40"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {error && <div className="bg-red-500/10 text-red-400 p-2.5 rounded-xl text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}

          <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1">
            <button type="button" onClick={() => setIsNewClient(false)} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${!isNewClient ? 'bg-zinc-700 text-cream-50' : 'text-cream-300/40'}`}>Cliente existente</button>
            <button type="button" onClick={() => setIsNewClient(true)} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${isNewClient ? 'bg-zinc-700 text-cream-50' : 'text-cream-300/40'}`}>Novo cliente</button>
          </div>

          {isNewClient ? (
            <div className="space-y-2 bg-zinc-800/30 rounded-xl p-3">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do cliente *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Telefone *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              <label className="flex items-center gap-2 text-xs text-cream-50 cursor-pointer pt-1">
                <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} className="accent-yellow-500" />
                <KeyRound size={12} className="text-yellow-400" /> Criar login pro cliente (ele entra no app sozinho)
              </label>
              {createAccount && (
                <>
                  <input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="E-mail do cliente *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
                  <input type="text" value={accPassword} onChange={e => setAccPassword(e.target.value)} placeholder="Senha inicial (mín. 6) *" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" />
                  <p className="text-[10px] text-cream-300/40">Sem marcar essa opção, ele vira um registro permanente da casa (não some).</p>
                </>
              )}
            </div>
          ) : (
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
              <option value="">Selecione o cliente *</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}

          {subscription && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5">
              <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5"><Crown size={12} /> Cliente ASSINANTE</p>
              <p className="text-[10px] text-cream-300/60 mt-0.5">{subscription.cuts_remaining} corte(s) restante(s)</p>
              <label className="flex items-center gap-2 mt-1.5 text-xs text-cream-50 cursor-pointer">
                <input type="checkbox" checked={useSubscription} onChange={e => setUseSubscription(e.target.checked)} className="accent-yellow-500" />
                Usar assinatura (R$ 0)
              </label>
            </div>
          )}
          {expiredSub && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
              <p className="text-xs font-bold text-red-400">Assinatura VENCIDA</p>
              <p className="text-[10px] text-cream-300/60 mt-0.5">Cobre o valor normal ou renove.</p>
            </div>
          )}

          <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
            <option value="">Selecione o serviço *</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes} min — {formatCurrency(Number(s.price))}</option>)}
          </select>

          {isOwner && (
            <select value={barberId} onChange={e => setBarberId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
              <option value="">Selecione o barbeiro *</option>
              {barbers.map((b: any) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
          )}

          {!quickRegister && (
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setTime(''); }} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2.5 text-sm text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
          )}

          {serviceId && barberId && (
            <div>
              <p className="text-[10px] text-cream-300/50 mb-1.5">Horários disponíveis:</p>
              {slots.length === 0 ? (
                <p className="text-xs text-red-400">Fechado nesta data ou sem horário compatível.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
                  {slots.map(t => {
                    const conflict = !!findConflict(dayAppointments, t, duration);
                    const past = date === dateKey(new Date()) && timeToMin(t) < new Date().getHours() * 60 + new Date().getMinutes();
                    const disabled = conflict || past;
                    return (
                      <button type="button" key={t} disabled={disabled} onClick={() => setTime(t)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition ${time === t ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : disabled ? 'bg-zinc-900/30 border-cream-100/5 text-cream-300/20 line-through cursor-not-allowed' : 'bg-zinc-800 border-cream-100/5 text-cream-50'}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
              {quickRegister && <p className="text-[9px] text-cream-300/30 mt-1">Deixe vazio para usar o horário atual.</p>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-cream-50 py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={saving || (!time && !quickRegister)} className="flex-1 bg-yellow-500 text-[#0a0a0a] py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}