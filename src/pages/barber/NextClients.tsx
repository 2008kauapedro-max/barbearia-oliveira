import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { STATUS_META, isFuture, formatCurrency } from '../../lib/business';
import { Users, Phone, MessageCircle, Play, CheckCircle } from 'lucide-react';

export default function BarberNextClients() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('appointments').select(`
      *, services (name, price), client:client_id (full_name, phone)
    `).eq('barber_id', profile.id).in('status', ['scheduled', 'confirmed', 'in_service']).order('date', { ascending: true }).order('time', { ascending: true }).limit(15);
    if (data) setAppointments(data.filter((a: any) => isFuture(a.date, a.time)));
    setLoading(false);
  };

  const changeStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    load();
  };

  const handleComplete = async (id: string) => {
    const { data } = await supabase.rpc('complete_appointment', { p_appointment_id: id });
    if (data?.error) alert(data.error);
    else load();
  };

  const waLink = (phone?: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    const full = digits.startsWith('55') ? digits : '55' + digits;
    return `https://wa.me/${full}?text=${encodeURIComponent('Olá! Passando pra lembrar do seu horário na Barbearia Oliveira 💈')}`;
  };

  if (loading) return <p className="text-cream-300/40 text-sm">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Próximos Clientes</h1>
        <p className="text-sm text-cream-300/50 mt-1">Seus próximos atendimentos confirmados</p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-8 text-center">
          <Users size={32} className="mx-auto text-cream-300/20 mb-3" />
          <p className="text-cream-300/40 text-sm">Nenhum cliente próximo na fila.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => {
            const meta = STATUS_META[apt.status] || STATUS_META.scheduled;
            return (
              <div key={apt.id} className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-cream-50">{apt.client?.full_name}</p>
                    <p className="text-xs text-cream-300/50 mt-0.5">{apt.date.split('-').reverse().join('/')} às {apt.time} • {apt.services?.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-cream-100/5">
                  {apt.client?.phone && (
                    <a href={waLink(apt.client.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-2 rounded-xl text-xs font-medium">
                      <MessageCircle size={14} /> Zap
                    </a>
                  )}
                  {apt.client?.phone && (
                    <a href={`tel:${apt.client.phone}`} className="flex items-center justify-center gap-1.5 bg-zinc-800 text-cream-300/60 px-3 py-2 rounded-xl text-xs font-medium">
                      <Phone size={14} /> Ligar
                    </a>
                  )}
                  {apt.status === 'confirmed' && (
                    <button onClick={() => changeStatus(apt.id, 'in_service')} className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500/10 text-yellow-400 py-2 rounded-xl text-xs font-bold">
                      <Play size={14} /> Iniciar
                    </button>
                  )}
                  {apt.status === 'in_service' && (
                    <button onClick={() => handleComplete(apt.id)} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 text-green-400 py-2 rounded-xl text-xs font-bold">
                      <CheckCircle size={14} /> Concluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}