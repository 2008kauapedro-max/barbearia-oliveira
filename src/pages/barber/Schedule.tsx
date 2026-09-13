import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { STATUS_META, dateKey, addDays, getDayHours, formatCurrency } from '../../lib/business';
import { Calendar, Clock } from 'lucide-react';

export default function BarberSchedule() {
  const { barbershop, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [selectedDate]);

  const load = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase.from('appointments').select(`
      *, services (name, price), client:client_id (full_name)
    `).eq('barber_id', profile.id).eq('date', selectedDate).order('time', { ascending: true });
    if (data) setAppointments(data);
    setLoading(false);
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const dayDate = new Date(selectedDate + 'T00:00:00');
  const hours = getDayHours(barbershop, dayDate);
  const dayRevenue = appointments.filter(a => a.status === 'completed').reduce((acc, a) => acc + Number(a.price_charged ?? a.services?.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Meus Horários</h1>
        <p className="text-sm text-cream-300/50 mt-1">Sua semana de atendimentos</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => {
          const key = dateKey(d);
          const label = i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          return (
            <button key={key} onClick={() => setSelectedDate(key)} className={`shrink-0 px-4 py-2.5 rounded-xl text-center transition border ${selectedDate === key ? 'bg-yellow-500 text-[#0a0a0a] border-yellow-500' : 'bg-zinc-900/50 border-cream-100/5 text-cream-300/60'}`}>
              <p className="text-[10px] uppercase font-bold">{label}</p>
              <p className="text-lg font-bold">{d.getDate()}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3 flex items-center gap-2 text-xs text-cream-300/60">
        <Clock size={14} className="text-yellow-400" />
        {hours.closed ? 'Barbearia FECHADA neste dia.' : `Funcionamento: ${hours.open} às ${hours.close}`}
        {!hours.closed && appointments.length > 0 && ` • ${appointments.length} atendimento(s) • ${formatCurrency(dayRevenue)} concluídos`}
      </div>

      {loading ? <p className="text-cream-300/40 text-sm">Carregando...</p> : appointments.length === 0 ? (
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
          <Calendar size={32} className="mx-auto text-cream-300/20 mb-3" />
          <p className="text-cream-300/40 text-sm">Nenhum atendimento nesta data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map(apt => {
            const meta = STATUS_META[apt.status] || STATUS_META.scheduled;
            return (
              <div key={apt.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-cream-50">{apt.time} — {apt.client?.full_name}</p>
                  <p className="text-xs text-cream-300/50">{apt.services?.name}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}