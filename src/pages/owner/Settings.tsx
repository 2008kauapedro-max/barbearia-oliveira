import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, Clock, ShieldAlert, AlertCircle } from 'lucide-react';

const DAYS = [
  { key: 'mon', label: 'Segunda' }, { key: 'tue', label: 'Terça' }, { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' }, { key: 'fri', label: 'Sexta' }, { key: 'sat', label: 'Sábado' }, { key: 'sun', label: 'Domingo' },
];
const DEFAULT_DAY = { open: '09:00', close: '18:00', closed: false };

const PERMS = [
  { key: 'can_register_walkin', label: 'Registrar atendimento avulso (balcão)' },
  { key: 'can_complete', label: 'Concluir atendimentos' },
  { key: 'can_cancel', label: 'Cancelar agendamentos' },
  { key: 'can_no_show', label: 'Marcar falta do cliente' },
  { key: 'can_post_feed', label: 'Publicar fotos no Feed' },
  { key: 'can_add_services', label: 'Criar e editar serviços' },
];

export default function OwnerSettings() {
  const { barbershop, refreshBarbershop } = useAuth();
  const [hours, setHours] = useState<Record<string, any>>({});
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!barbershop || loaded) return;
    const raw = barbershop?.settings?.opening_hours || {};
    const normalized: Record<string, any> = {};
    DAYS.forEach(d => {
      const existing = raw[d.key] && typeof raw[d.key] === 'object' ? raw[d.key] : null;
      normalized[d.key] = existing ? { open: existing.open || '09:00', close: existing.close || '18:00', closed: !!existing.closed } : { ...DEFAULT_DAY };
    });
    setHours(normalized);
    const sp = barbershop?.settings?.staff_permissions || {};
    const initial: Record<string, boolean> = {};
    PERMS.forEach(p => { initial[p.key] = p.key === 'can_add_services' ? !!(barbershop as any)?.allow_barbers_add_services : sp[p.key] !== false; });
    setPerms(initial);
    setLoaded(true);
  }, [barbershop, loaded]);

  const setDay = (key: string, patch: any) => setHours(prev => ({ ...prev, [key]: { ...(prev[key] || DEFAULT_DAY), ...patch } }));

  const handleSave = async () => {
    if (!barbershop) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('barbershops').update({
      settings: { ...(barbershop.settings || {}), opening_hours: hours, staff_permissions: perms },
      allow_barbers_add_services: !!perms.can_add_services,
    }).eq('id', barbershop.id);
    setSaving(false);
    if (err) { setError('Erro ao salvar: ' + err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    refreshBarbershop();
  };

  if (!loaded) return <p className="text-cream-300/40 text-sm">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-cream-50">Configurações</h1>
        <p className="text-sm text-cream-300/50 mt-1">Horários e permissões da equipe</p>
      </div>

      {saved && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2"><Check size={16} /> Configurações salvas!</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <p className="font-bold text-cream-50 mb-3 flex items-center gap-2"><Clock size={16} className="text-yellow-400" /> Horários de funcionamento</p>
        <div className="space-y-2">
          {DAYS.map(d => {
            const day = hours[d.key] || DEFAULT_DAY;
            return (
              <div key={d.key} className={`flex items-center gap-2 rounded-xl p-2.5 border border-cream-100/5 ${day.closed ? 'bg-zinc-900/30 opacity-60' : 'bg-zinc-800/40'}`}>
                <span className="w-20 text-xs font-bold text-cream-50 shrink-0">{d.label}</span>
                <input type="time" value={day.open} disabled={day.closed} onChange={e => setDay(d.key, { open: e.target.value })} className="flex-1 min-w-0 bg-zinc-800 border border-cream-100/10 rounded-lg px-2 py-1.5 text-xs text-cream-50 disabled:opacity-40" />
                <span className="text-cream-300/40 text-xs">às</span>
                <input type="time" value={day.close} disabled={day.closed} onChange={e => setDay(d.key, { close: e.target.value })} className="flex-1 min-w-0 bg-zinc-800 border border-cream-100/10 rounded-lg px-2 py-1.5 text-xs text-cream-50 disabled:opacity-40" />
                <button onClick={() => setDay(d.key, { closed: !day.closed })} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${day.closed ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  {day.closed ? 'Fechado' : 'Aberto'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-cream-100/5 rounded-2xl p-4">
        <p className="font-bold text-cream-50 mb-1 flex items-center gap-2"><ShieldAlert size={16} className="text-yellow-400" /> Permissões da equipe</p>
        <p className="text-[10px] text-cream-300/40 mb-3">O que os funcionários PODEM fazer. Desligou aqui, some o botão pra eles e o sistema bloqueia.</p>
        <div className="space-y-2">
          {PERMS.map(p => (
            <label key={p.key} className="flex items-center justify-between gap-3 bg-zinc-800/40 rounded-xl px-3 py-2.5 cursor-pointer">
              <span className="text-xs font-medium text-cream-50">{p.label}</span>
              <button
                onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                className={`relative w-11 h-6 rounded-full transition shrink-0 ${perms[p.key] ? 'bg-yellow-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${perms[p.key] ? 'left-6' : 'left-1'}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 text-[#0a0a0a] font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}