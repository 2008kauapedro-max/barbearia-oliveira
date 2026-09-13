import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Appointment, Service } from '../types/database';
import { generateSlots, findConflict, isFuture, dateKey, formatCurrency, subscriptionHealth, daysUntil } from '../lib/business';
import NotificationBell from '../components/NotificationBell';
import AssistantChat from '../components/AssistantChat';
import ClientFeed from '../components/ClientFeed';
import ClientClub from '../components/ClientClub';
import ConfirmDialog from '../components/ConfirmDialog';
import { Calendar, Clock, LogOut, User as UserIcon, Check, Camera, ChevronLeft, Scissors, MessageCircle, Crown, Image as ImageIcon, Bot, Trash2, Star } from 'lucide-react';

export default function ClientArea() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { profile, barbershop, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mySub, setMySub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) { loadAppointments(); loadServices(); loadMySub(); }
  }, [profile]);

  const loadAppointments = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('appointments').select(`*, services (name, price, duration_minutes), profiles:barber_id (full_name)`).eq('client_id', profile.id).eq('hidden_by_client', false).order('date', { ascending: true }).order('time', { ascending: true });
    if (!error && data) setAppointments(data);
    setLoading(false);
  };

  const loadServices = async () => {
    if (!barbershop) return;
    const { data, error } = await supabase.from('services').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true);
    if (!error && data) setServices(data);
  };

  const loadMySub = async () => {
    if (!profile) return;
    const { data } = await supabase.from('subscriptions').select('*, plan:plan_id (name)').eq('client_id', profile.id).order('created_at', { ascending: false }).limit(1);
    setMySub(data?.[0] || null);
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };
  const whatsappNumber = barbershop?.settings?.whatsapp || '5561993524201';

  const upcomingAppointments = appointments.filter(a => isFuture(a.date, a.time) && a.status !== 'cancelled');
  const nextAppointment = upcomingAppointments[0];

  const tabs = [
    { path: '/cliente', label: 'Início', icon: Calendar },
    { path: '/cliente/agendar', label: 'Agendar', icon: Scissors },
    { path: '/cliente/agendamentos', label: 'Horários', icon: Clock },
    { path: '/cliente/clube', label: 'Clube', icon: Crown },
    { path: '/cliente/feed', label: 'Feed', icon: ImageIcon },
    { path: '/cliente/perfil', label: 'Perfil', icon: UserIcon },
  ];

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-cream-50 pb-20 textura-app"
      style={
        barbershop?.settings?.background_image_url
          ? {
              backgroundImage: `linear-gradient(rgba(10,10,10,0.94), rgba(10,10,10,0.94)), url("${barbershop.settings.background_image_url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      <header className="relative sticky top-0 z-40 border-b border-cream-100/5 overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("/textura.png")', backgroundSize: '420px', backgroundPosition: 'center', backgroundRepeat: 'repeat' }} />
        <div className="relative max-w-2xl mx-auto px-3 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src="/logo.png" alt="Logo Barbearia" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm text-cream-50 truncate max-w-[130px]">{barbershop?.name || 'Barbearia'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/cliente/ia')} className="p-2 text-cream-300/50 hover:text-yellow-400 transition" aria-label="Assistente">
              <Bot size={18} />
            </button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Vim pelo app da Barbearia Oliveira e preciso de ajuda.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-green-400 hover:text-green-300 transition"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-3 md:px-4 py-4 md:py-6">
        <Routes>
          <Route path="/" element={<ClientDashboard profile={profile} nextAppointment={nextAppointment} mySub={mySub} loading={loading} />} />
          <Route path="/agendar" element={<BookingFlow profile={profile} barbershop={barbershop} services={services} onSuccess={loadAppointments} />} />
          <Route path="/agendamentos" element={<ClientAppointments appointments={appointments} onUpdate={loadAppointments} profile={profile} />} />
          <Route path="/clube" element={<ClientClub />} />
          <Route path="/feed" element={<ClientFeed />} />
          <Route path="/perfil" element={<ClientProfile profile={profile} mySub={mySub} />} />
          <Route path="/ia" element={<AssistantChat />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-cream-100/5 z-50">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => {
            const active = path === tab.path || (tab.path !== '/cliente' && path.startsWith(tab.path));
            return (
              <button key={tab.path} onClick={() => navigate(tab.path)} className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition ${active ? 'text-yellow-400' : 'text-cream-300/30'}`}>
                <tab.icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SubscriptionCard({ mySub, compact }: { mySub: any; compact?: boolean }) {
  if (!mySub || mySub.status === 'cancelled') return null;
  const health = subscriptionHealth(mySub);
  const cls = health === 'green' ? 'border-green-500/20 bg-green-500/5' : health === 'yellow' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-red-500/20 bg-red-500/5';
  const txt = health === 'green' ? 'text-green-400' : health === 'yellow' ? 'text-yellow-400' : 'text-red-400';
  const days = daysUntil(mySub.due_date);

  return (
    <div className={`border rounded-2xl p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-cream-50 flex items-center gap-1.5 text-sm"><Crown size={15} className={txt} /> {mySub.plan?.name || 'Minha assinatura'}</p>
        <span className={`text-[10px] font-bold ${txt}`}>
          {mySub.status === 'expired' || days < 0 ? 'VENCIDA' : days === 0 ? 'VENCE HOJE' : `${days} dias restantes`}
        </span>
      </div>
      <div className="flex justify-between text-xs text-cream-300/60 mb-1">
        <span>Cortes disponíveis</span>
        <span className="font-bold text-cream-50">{mySub.cuts_remaining} de {mySub.cuts_included}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${health === 'red' ? 'bg-red-400' : health === 'yellow' ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${(mySub.cuts_remaining / mySub.cuts_included) * 100}%` }} />
      </div>
      {!compact && (
        <p className="text-[10px] text-cream-300/40 mt-2">Vencimento: {mySub.due_date?.split('-').reverse().join('/')} • Renovações na recepção da barbearia</p>
      )}
    </div>
  );
}

function ClientDashboard({ profile, nextAppointment, mySub, loading }: any) {
  if (loading) return <div className="text-center py-12 animate-pulse text-cream-300/40">Carregando...</div>;
  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <p className="text-cream-300/40 text-sm">Olá,</p>
        <h1 className="text-xl md:text-2xl font-bold mt-0.5 text-cream-50">{profile?.full_name?.split(' ')[0]} 👋</h1>
      </div>

      {nextAppointment ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs font-medium text-yellow-500 uppercase tracking-wide">Próximo horário</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-cream-50 break-words">
            {new Date(nextAppointment.date).toLocaleDateString('pt-BR')} <span className="text-cream-300/60">às {nextAppointment.time}</span>
          </p>
          <p className="text-sm text-cream-300/60 mt-2">{nextAppointment.services?.name}</p>
          <p className="text-sm text-cream-300/60">Com {nextAppointment.profiles?.full_name}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <Calendar size={28} className="text-cream-300/20 mx-auto mb-2" />
          <p className="text-cream-300/40 text-sm">Nenhum horário agendado</p>
        </div>
      )}

      <SubscriptionCard mySub={mySub} />
    </div>
  );
}

function BookingFlow({ profile, barbershop, services, onSuccess }: any) {
  const [step, setStep] = useState(1);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [service, setService] = useState<any>(null);
  const [barber, setBarber] = useState<any>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('profiles').select('id, full_name')
      .eq('barbershop_id', barbershop.id).eq('role', 'BARBER').eq('is_active', true)
      .then(({ data }) => { if (data) setBarbers(data); });
  }, [barbershop]);

  useEffect(() => {
    if (!barber?.id || !date) return;
    supabase.from('appointments').select('id, time, status, services (duration_minutes)')
      .eq('barber_id', barber.id).eq('date', date)
      .then(({ data }) => setDayAppointments(data || []));
  }, [barber, date]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const duration = service?.duration_minutes || 30;
  const slots = date ? generateSlots(barbershop, new Date(date + 'T00:00:00'), duration) : [];

  const confirm = async () => {
    if (!profile || !barbershop) return;
    setSaving(true);
    setError('');
    const { data } = await supabase.rpc('book_appointment', {
      p_barber_id: barber.id,
      p_service_id: service.id,
      p_date: date,
      p_time: time,
      p_client_id: profile.id,
      p_origin: 'app',
      p_subscription_id: null,
    });
    setSaving(false);
    if (data?.error) { setError(data.error); return; }
    onSuccess();
    setDone(true);
  };

  const reset = () => { setDone(false); setStep(1); setService(null); setBarber(null); setDate(''); setTime(''); };

  if (done) return (
    <div className="text-center py-16 animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
        <Check size={32} className="text-green-400" />
      </div>
      <h2 className="text-xl font-bold text-cream-50 mb-2">Agendamento confirmado!</h2>
      <p className="text-sm text-cream-300/50 mb-6">
        {service?.name} com {barber?.full_name}<br />
        {date.split('-').reverse().join('/')} às {time}
      </p>
      <button onClick={reset} className="bg-yellow-500 text-[#0a0a0a] font-bold px-6 py-3 rounded-xl">Fazer outro agendamento</button>
    </div>
  );

  const steps = ['Serviço', 'Barbeiro', 'Horário', 'Confirmar'];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2 mb-5">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="p-2 text-cream-300/50 hover:text-cream-50">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold text-cream-50">Agendar Horário</h1>
      </div>

      <div className="flex gap-1 mb-5">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i + 1 <= step ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
            <p className={`text-[10px] mt-1 text-center ${i + 1 <= step ? 'text-yellow-400' : 'text-cream-300/30'}`}>{s}</p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-cream-300/50 mb-3">Escolha o serviço:</p>
          {services.length === 0 ? (
            <p className="text-center text-cream-300/40 py-8 text-sm">Nenhum serviço disponível no momento.</p>
          ) : services.map((s: any) => (
            <button key={s.id} onClick={() => { setService(s); setStep(2); }} className="w-full bg-zinc-900/50 border border-cream-100/5 rounded-xl p-4 flex items-center justify-between hover:border-yellow-500/30 transition text-left">
              <div>
                <p className="font-bold text-cream-50 text-sm">{s.name}</p>
                <p className="text-xs text-cream-300/50 mt-0.5">{s.duration_minutes} min</p>
              </div>
              <span className="font-bold text-yellow-500 text-sm">{formatCurrency(Number(s.price))}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-cream-300/50 mb-3">Escolha o barbeiro:</p>
          {barbers.length === 0 ? (
            <p className="text-center text-cream-300/40 py-8 text-sm">Nenhum barbeiro disponível.</p>
          ) : barbers.map((b: any) => (
            <button key={b.id} onClick={() => { setBarber(b); setStep(3); }} className="w-full bg-zinc-900/50 border border-cream-100/5 rounded-xl p-4 flex items-center gap-3 hover:border-yellow-500/30 transition text-left">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-yellow-500 shrink-0">
                {b.full_name.charAt(0)}
              </div>
              <p className="font-bold text-cream-50 text-sm">{b.full_name}</p>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-cream-300/50 mb-2">Escolha o dia:</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => {
                const key = dateKey(d);
                const label = i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                return (
                  <button key={key} onClick={() => { setDate(key); setTime(''); }} className={`shrink-0 px-4 py-3 rounded-xl text-center transition border ${date === key ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/60'}`}>
                    <p className="text-[10px] uppercase font-bold">{label}</p>
                    <p className="text-lg font-bold">{d.getDate()}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {date && (
            <div>
              <p className="text-sm text-cream-300/50 mb-2">Escolha o horário:</p>
              {slots.length === 0 ? (
                <p className="text-center text-red-400 text-sm py-4">Barbearia fechada nesta data ou sem horário compatível com a duração do serviço.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(t => {
                    const conflict = !!findConflict(dayAppointments, t, duration);
                    const past = !isFuture(date, t);
                    const free = !conflict && !past;
                    return (
                      <button key={t} disabled={!free} onClick={() => { setTime(t); setStep(4); }} className={`py-2.5 rounded-xl text-sm font-medium transition border ${time === t ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : free ? 'bg-zinc-900/50 border-cream-100/5 text-cream-50 hover:border-yellow-500/30' : 'bg-zinc-900/20 border-cream-100/5 text-cream-300/20 line-through cursor-not-allowed'}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-cream-300/30 mt-2">Horários riscados: ocupados, já passados ou fora do funcionamento.</p>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-cream-300/50">Serviço</span>
              <span className="font-bold text-cream-50">{service?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cream-300/50">Barbeiro</span>
              <span className="font-bold text-cream-50">{barber?.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cream-300/50">Data</span>
              <span className="font-bold text-cream-50">{date.split('-').reverse().join('/')} às {time}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-cream-100/5 pt-3">
              <span className="text-cream-300/50">Total</span>
              <span className="font-bold text-yellow-500">{formatCurrency(Number(service?.price))}</span>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <button onClick={confirm} disabled={saving} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition disabled:opacity-50">
            {saving ? 'Agendando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      )}
    </div>
  );
}

function ClientAppointments({ appointments, onUpdate, profile }: any) {
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [reviews, setReviews] = useState<Record<string, any>>({});
  const [starPick, setStarPick] = useState<Record<string, number>>({});
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description?: string; variant?: 'danger' | 'warning' | 'neutral'; confirmLabel?: string; onConfirm: (() => Promise<any> | any) | null }>({ open: false, title: '', onConfirm: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('reviews').select('*').eq('client_id', profile.id).then(({ data }) => {
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.appointment_id] = r; });
      setReviews(map);
    });
  }, [profile, appointments]);

  const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return dateKey(d); })();

  const upcoming = appointments.filter((a: any) => isFuture(a.date, a.time) && a.status !== 'cancelled');
  const past = appointments.filter((a: any) => !isFuture(a.date, a.time) && a.status !== 'cancelled' && a.date >= cutoff);
  const cancelled = appointments.filter((a: any) => a.status === 'cancelled' && a.date >= cutoff);
  const current = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled;

  const handleCancel = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Cancelar agendamento?',
      description: 'Você perderá o horário reservado. Esta ação não pode ser desfeita.',
      variant: 'danger',
      confirmLabel: 'Sim, cancelar',
      onConfirm: async () => {
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
        if (!error) onUpdate();
      },
    });
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Ocultar este registro?',
      description: 'O atendimento sumirá da sua lista, mas continua no histórico da barbearia.',
      variant: 'warning',
      confirmLabel: 'Sim, ocultar',
      onConfirm: async () => {
        const { data } = await supabase.rpc('hide_appointment', { p_appointment_id: id });
        if (data?.error) alert(data.error);
        else onUpdate();
      },
    });
  };

  const handleConfirmStateConfirm = async () => {
    if (!confirmState.onConfirm) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, title: '', onConfirm: null });
    }
  };

  const submitReview = async (apt: any) => {
    const stars = starPick[apt.id];
    if (!stars) return;
    const { error } = await supabase.from('reviews').insert({
      barbershop_id: apt.barbershop_id, appointment_id: apt.id, client_id: profile.id,
      barber_id: apt.barber_id, rating: stars, comment: commentText[apt.id] || null,
    });
    if (error) alert('Erro ao enviar avaliação.');
    else {
      const { data } = await supabase.from('reviews').select('*').eq('client_id', profile.id);
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.appointment_id] = r; });
      setReviews(map);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="text-xl font-bold mb-4 text-cream-50">Meus agendamentos</h1>
      <div className="flex gap-1 mb-4 bg-zinc-900/50 rounded-xl p-1">
        {(['upcoming', 'past', 'cancelled'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${tab === t ? 'bg-zinc-800 text-yellow-400' : 'text-cream-300/40'}`}>
            {t === 'upcoming' ? 'Próximos' : t === 'past' ? 'Anteriores' : 'Cancelados'}
          </button>
        ))}
      </div>
      {current.length === 0 ? (
        <div className="text-center py-12 text-cream-300/30 text-sm">Nenhum agendamento encontrado.</div>
      ) : (
        <div className="space-y-3">
          {current.map((apt: any) => (
            <div key={apt.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-cream-50 text-sm md:text-base">{new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}</p>
                  <p className="text-sm text-cream-300/50 mt-1">{apt.services?.name}</p>
                  <p className="text-xs text-cream-300/30 mt-1">Com {apt.profiles?.full_name}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {apt.status === 'confirmed' && isFuture(apt.date, apt.time) && (
                    <button onClick={() => handleCancel(apt.id)} className="text-xs text-red-400/70 border border-red-500/20 px-3 py-1.5 rounded-lg transition hover:bg-red-500/10 whitespace-nowrap">Cancelar</button>
                  )}
                  {apt.status === 'cancelled' && <span className="text-xs text-red-400 whitespace-nowrap">Cancelado</span>}
                  {(tab === 'past' || tab === 'cancelled') && (
                    <button onClick={() => handleDelete(apt.id)} className="p-1.5 text-cream-300/30 hover:text-red-400 transition" title="Excluir registro">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {tab === 'past' && apt.status === 'completed' && (
                <div className="mt-3 pt-3 border-t border-cream-100/5">
                  {reviews[apt.id] ? (
                    <p className="text-xs text-cream-300/60 flex items-center gap-1">
                      Sua avaliação:
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={12} className={n <= reviews[apt.id].rating ? 'text-yellow-400' : 'text-cream-300/20'} fill={n <= reviews[apt.id].rating ? 'currentColor' : 'none'} />
                      ))}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-cream-300/50">Como foi seu corte?</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setStarPick({ ...starPick, [apt.id]: n })} className="p-0.5">
                            <Star size={20} className={n <= (starPick[apt.id] || 0) ? 'text-yellow-400' : 'text-cream-300/20'} fill={n <= (starPick[apt.id] || 0) ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                        {starPick[apt.id] && (
                          <button onClick={() => submitReview(apt)} className="ml-2 bg-yellow-500 text-[#0a0a0a] text-[10px] font-bold px-3 py-1.5 rounded-lg">Avaliar</button>
                        )}
                      </div>
                      {starPick[apt.id] && (
                        <>
                          <button onClick={() => setCommentOpen({ ...commentOpen, [apt.id]: !commentOpen[apt.id] })} className="text-[10px] text-cream-300/40 underline">
                            {commentOpen[apt.id] ? 'Fechar comentário' : 'Fazer comentário (opcional)'}
                          </button>
                          {commentOpen[apt.id] && (
                            <input type="text" value={commentText[apt.id] || ''} onChange={e => setCommentText({ ...commentText, [apt.id]: e.target.value })} placeholder="Conte como foi..." className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-3 py-2 text-xs text-cream-50 focus:outline-none focus:border-yellow-500/50" />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-cream-300/30 mt-3 text-center">Registros com mais de 30 dias somem desta lista automaticamente.</p>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        loading={confirmLoading}
        onConfirm={handleConfirmStateConfirm}
        onCancel={() => { setConfirmState({ open: false, title: '', onConfirm: null }); setConfirmLoading(false); }}
      />
    </div>
  );
}

function ClientProfile({ profile, mySub }: any) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="animate-fade-up space-y-4">
      <h1 className="text-xl font-bold text-cream-50">Meu Perfil</h1>
      {saved && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2 rounded-xl flex items-center gap-2"><Check size={16} /> Perfil atualizado!</div>}

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-yellow-500 p-[3px]">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : <span className="text-2xl md:text-3xl font-bold text-yellow-400">{fullName.charAt(0)}</span>}
              </div>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
              <Camera size={14} className="text-[#0a0a0a]" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-cream-50 truncate">{fullName}</p>
            <p className="text-sm text-cream-300/40">Cliente</p>
          </div>
        </div>
      </div>

      <SubscriptionCard mySub={mySub} />

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <h2 className="font-bold mb-4 text-cream-50">Dados pessoais</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-cream-300/30 uppercase font-bold">Nome</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="block w-full bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50 transition" />
          </div>
          <div>
            <label className="text-[10px] text-cream-300/30 uppercase font-bold">Telefone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="block w-full bg-zinc-800/50 border border-cream-100/5 rounded-xl px-3 py-2.5 text-sm text-cream-50 mt-1 focus:outline-none focus:border-yellow-500/50 transition" />
          </div>
        </div>
      </div>
      <button onClick={handleSave} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3 rounded-xl hover:bg-yellow-600 transition-all">Salvar alterações</button>
      <button onClick={() => setConfirmLogout(true)} className="w-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
        <LogOut size={16} /> Sair da conta
      </button>

      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta?"
        description="Você precisará fazer login novamente para acessar seus agendamentos."
        variant="warning"
        confirmLabel="Sim, sair"
        loading={confirmLoading}
        onConfirm={async () => {
          setConfirmLoading(true);
          await signOut();
          navigate('/');
        }}
        onCancel={() => { setConfirmLogout(false); setConfirmLoading(false); }}
      />
    </div>
  );
}