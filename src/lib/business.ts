// ===== REGRAS DE NEGÓCIO CENTRAIS (uma fonte, todo o app usa) =====

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Agendado', cls: 'bg-blue-500/10 text-blue-400' },
  confirmed: { label: 'Confirmado', cls: 'bg-teal-500/10 text-teal-400' },
  in_service: { label: 'Em atendimento', cls: 'bg-yellow-500/10 text-yellow-400' },
  completed: { label: 'Concluído', cls: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-500/10 text-red-400' },
  no_show: { label: 'Não compareceu', cls: 'bg-orange-500/10 text-orange-400' },
};

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export const daysUntil = (dateStr: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

// VERDE >7 dias | AMARELO 3-7 | VERMELHO 0-2 ou vencida
export const subscriptionHealth = (sub: any): 'green' | 'yellow' | 'red' => {
  const d = daysUntil(sub.due_date);
  if (d < 3) return 'red';
  if (d <= 7) return 'yellow';
  return 'green';
};

export const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const minToTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const WEEK_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const getDayHours = (barbershop: any, date: Date) => {
  const day = barbershop?.settings?.opening_hours?.[WEEK_KEYS[date.getDay()]];
  if (day) return { open: day.open || '09:00', close: day.close || '18:00', closed: !!day.closed, lunch_start: day.lunch_start, lunch_end: day.lunch_end };
  return { open: '09:00', close: '18:00', closed: false, lunch_start: undefined, lunch_end: undefined };
};

// Gera horários respeitando: funcionamento, dia fechado, intervalo e DURAÇÃO do serviço
export function generateSlots(barbershop: any, date: Date, durationMinutes: number): string[] {
  const h = getDayHours(barbershop, date);
  if (h.closed || durationMinutes <= 0) return [];
  const start = timeToMin(h.open);
  const end = timeToMin(h.close);
  const ls = h.lunch_start ? timeToMin(h.lunch_start) : null;
  const le = h.lunch_end ? timeToMin(h.lunch_end) : null;
  const slots: string[] = [];
  for (let t = start; t + durationMinutes <= end; t += 30) {
    if (ls !== null && le !== null && t + durationMinutes > ls && t < le) continue;
    slots.push(minToTime(t));
  }
  return slots;
}

// Conflito: mesmo barbeiro, horários sobrepostos (não conta cancelado/no-show)
export function findConflict(appointments: any[], startTime: string, durationMinutes: number, excludeId?: string) {
  const s = timeToMin(startTime);
  const e = s + durationMinutes;
  return appointments.find(a => {
    if (excludeId && a.id === excludeId) return false;
    if (['cancelled', 'no_show'].includes(a.status)) return false;
    const as = timeToMin(a.time);
    const ae = as + (a.services?.duration_minutes || 30);
    return s < ae && as < e;
  });
}

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
// [5] Data+hora no futuro? (não conta horário de hoje que já passou)
export const isFuture = (dateStr: string, timeStr: string) => {
  const now = new Date();
  const today = dateKey(now);
  if (dateStr > today) return true;
  if (dateStr < today) return false;
  return timeToMin(timeStr) > now.getHours() * 60 + now.getMinutes();
};