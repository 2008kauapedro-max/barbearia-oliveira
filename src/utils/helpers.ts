import { format, parseISO, differenceInDays, isToday, isFuture, isPast, addDays, startOfDay } from 'date-fns';

export function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd/MM/yyyy"); } catch { return dateStr; }
}

export function formatDateShort(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd/MM"); } catch { return dateStr; }
}

export function formatDateLong(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy"); } catch { return dateStr; }
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(startOfDay(parseISO(dateStr)), startOfDay(new Date()));
}

export function isDateToday(dateStr: string): boolean {
  return isToday(parseISO(dateStr));
}

export function isDateFuture(dateStr: string): boolean {
  return isFuture(startOfDay(parseISO(dateStr)));
}

export function isDatePast(dateStr: string): boolean {
  return isPast(startOfDay(parseISO(dateStr)));
}

export function getSubscriptionStatus(endDate: string): { label: string; color: string; class: string } {
  const days = daysUntil(endDate);
  if (days < 0) return { label: 'VENCIDA', color: 'text-red-600', class: 'bg-red-50 text-red-700 border-red-200' };
  if (days <= 7) return { label: 'VENCE EM BREVE', color: 'text-amber-600', class: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'ATIVA', color: 'text-emerald-600', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return `+55${cleaned}`;
  if (cleaned.length === 13 && cleaned.startsWith('55')) return `+${cleaned}`;
  if (cleaned.startsWith('+')) return cleaned;
  return `+55${cleaned}`;
}

export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  if (cleaned.length === 13 && cleaned.startsWith('55')) return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,9)}-${cleaned.slice(9)}`;
  return phone;
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  let number = cleaned;
  if (cleaned.length === 11) number = `55${cleaned}`;
  else if (cleaned.length === 13 && cleaned.startsWith('55')) number = cleaned;
  else if (cleaned.startsWith('+')) number = cleaned.slice(1);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

export function generateTimeSlots(startTime: string, endTime: string, interval: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += interval;
  }
  return slots;
}

export function getNextDays(count: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    days.push(format(addDays(today, i), 'yyyy-MM-dd'));
  }
  return days;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

export function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getDayName(dayOfWeek: number): string {
  const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return names[dayOfWeek] || '';
}
