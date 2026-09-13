import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Clock, User, Scissors, CheckCircle } from 'lucide-react';

export default function BarberAgenda() {
  const { barbershop, profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => { loadAppointments(); }, [selectedDate]);

  const loadAppointments = async () => {
    if (!barbershop?.id || !profile?.id) return;
    setLoading(true);
    const { data } = await supabase.from('appointments').select(`
      *,
      services (name, price, duration_minutes),
      client:client_id (full_name, phone)
    `).eq('barber_id', profile.id).eq('date', selectedDate).order('time', { ascending: true });
    if (data) setAppointments(data);
    setLoading(false);
  };

  const handleComplete = async (id: string) => {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', id);
    loadAppointments();
  };

  const dateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Minha Agenda</h1>
        <p className="text-sm text-cream-300/50 mt-1">Atendimentos do dia</p>
      </div>

      {/* Seletor de data compacto */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => {
          const key = dateKey(d);
          const label = i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          return (
            <button key={key} onClick={() => setSelectedDate(key)} className={`shrink-0 px-4 py-3 rounded-xl text-center transition border ${selectedDate === key ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/60'}`}>
              <p className="text-[10px] uppercase font-bold">{label}</p>
              <p className="text-lg font-bold">{d.getDate()}</p>
            </button>
          );
        })}
      </div>

      {/* Botão gigante pra registrar atendimento avulso */}
      <button onClick={() => setShowRegister(true)} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-600 transition">
        <Plus size={20} />
        Registrar Atendimento
      </button>

      {loading ? <p className="text-cream-300/40">Carregando...</p> : (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
              <Calendar size={32} className="mx-auto text-cream-300/20 mb-3" />
              <p className="text-cream-300/40 text-sm">Nenhum agendamento para este dia</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Clock size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-cream-50">{apt.time}</p>
                      <p className="text-xs text-cream-300/50">{apt.services?.duration_minutes} min</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    apt.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                    apt.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {apt.status === 'confirmed' ? 'Agendado' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-cream-300/40" />
                    <span className="text-cream-50">{apt.client?.full_name}</span>
                    <span className="text-cream-300/40 text-xs">({apt.client?.phone})</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors size={14} className="text-cream-300/40" />
                    <span className="text-cream-50">{apt.services?.name}</span>
                    <span className="text-yellow-500 text-xs ml-auto">R$ {apt.services?.price}</span>
                  </div>
                </div>

                {apt.status === 'confirmed' && (
                  <button onClick={() => handleComplete(apt.id)} className="w-full flex items-center justify-center gap-2 bg-green-500/10 text-green-400 py-2.5 rounded-xl text-sm font-medium hover:bg-green-500/20 transition">
                    <CheckCircle size={16} />
                    Marcar como Concluído
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showRegister && (
        <RegisterAppointmentModal onClose={() => setShowRegister(false)} onSuccess={loadAppointments} />
      )}
    </div>
  );
}

function RegisterAppointmentModal({ onClose, onSuccess }: any) {
  const { barbershop, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!barbershop?.id) return;
    supabase.from('services').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true)
      .then(({ data }) => { if (data) setServices(data); });
    supabase.from('profiles').select('id, full_name, phone').eq('barbershop_id', barbershop.id).eq('role', 'CLIENT')
      .then(({ data }) => { if (data) setClients(data); });
  }, [barbershop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop || !profile) return;
    setSaving(true);
    setError('');

    let finalClientId = clientId;

    // Se é cliente novo, cria primeiro
    if (isNewClient) {
      const { data: newClient, error: clientError } = await supabase.from('profiles').insert({
        barbershop_id: barbershop.id,
        role: 'CLIENT',
        full_name: newClientName,
        phone: newClientPhone
      }).select('id').single();

      if (clientError || !newClient) {
        setError('Erro ao cadastrar cliente.');
        setSaving(false);
        return;
      }
      finalClientId = newClient.id;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const { error } = await supabase.from('appointments').insert({
      barbershop_id: barbershop.id,
      client_id: finalClientId,
      barber_id: profile.id,
      service_id: serviceId,
      date: today,
      time,
      status: 'completed',
      notes: 'Atendimento avulso registrado pelo barbeiro'
    });

    if (error) {
      setError('Erro ao registrar atendimento.');
    } else {
      onSuccess();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-cream-100/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-cream-100/5">
          <h2 className="text-lg font-bold text-cream-50">Registrar Atendimento</h2>
          <p className="text-xs text-cream-300/50 mt-1">Registre um corte que acabou de fazer</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Serviço realizado *</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
              <option value="">Selecione o serviço</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
            </select>
          </div>

          <div className="flex gap-2 bg-zinc-800/50 rounded-xl p-1">
            <button type="button" onClick={() => setIsNewClient(false)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${!isNewClient ? 'bg-zinc-700 text-cream-50' : 'text-cream-300/40'}`}>
              Cliente existente
            </button>
            <button type="button" onClick={() => setIsNewClient(true)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${isNewClient ? 'bg-zinc-700 text-cream-50' : 'text-cream-300/40'}`}>
              Novo cliente
            </button>
          </div>

          {isNewClient ? (
            <>
              <div>
                <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Nome do cliente *</label>
                <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              </div>
              <div>
                <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Telefone *</label>
                <input type="tel" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-cream-300/60 mb-1.5 block">Cliente *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-zinc-800 border border-cream-100/10 rounded-xl px-4 py-3 text-cream-50 focus:outline-none focus:border-yellow-500/50" required>
                <option value="">Selecione o cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.phone || 'sem telefone'}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-cream-50 py-3 rounded-xl font-bold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-yellow-500 text-[#0a0a0a] py-3 rounded-xl font-bold disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}