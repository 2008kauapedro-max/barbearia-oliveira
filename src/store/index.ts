import { v4 as uuidv4 } from 'uuid';
import type { User, Service, Barber, Appointment, Availability, BlockedDate, Subscription, WhatsAppTemplate, BarbershopSettings, Notification, ChatMessage, ClientTag, BarberProfile, BarberPermissions, Promotion, BroadcastNotification } from '../types';

const K = {
  users: 'bo_users', services: 'bo_services', barbers: 'bo_barbers',
  appointments: 'bo_appointments', availability: 'bo_availability',
  blockedDates: 'bo_blocked', subscriptions: 'bo_subs', templates: 'bo_templates',
  settings: 'bo_settings', notifications: 'bo_notifs', currentUserId: 'bo_current',
  chats: 'bo_chats', tags: 'bo_tags', barberProfiles: 'bo_bprofiles',
  permissions: 'bo_permissions', promotions: 'bo_promotions', broadcasts: 'bo_broadcasts',
  onlineStatus: 'bo_online', autoMessages: 'bo_auto_messages',
};

function get<T>(key: string, defaultValue: T): T {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : defaultValue; } catch { return defaultValue; }
}
function set<T>(key: string, value: T): void { localStorage.setItem(key, JSON.stringify(value)); }

const defaultSettings: BarbershopSettings = {
  name: 'Barbearia Oliveira',
  description: 'Tradição, estilo e precisão. Onde cada corte conta uma história.',
  phone: '+5562999999999',
  whatsapp: '+5562999999999',
  instagram: '@barbeariaoliveira',
  address: 'Quadra 3 Mr 05 Casa 21, Setor Leste',
  openTime: '09:00',
  closeTime: '19:00',
  slotInterval: 30,
};

const defaultServices: Service[] = [
  { id: uuidv4(), name: 'Corte Masculino', description: 'Corte moderno com acabamento perfeito', price: 40, duration: 30, active: true, icon: '✂️' },
  { id: uuidv4(), name: 'Corte + Barba', description: 'Combo completo com toalha quente', price: 60, duration: 50, active: true, icon: '💈' },
  { id: uuidv4(), name: 'Barba', description: 'Barba alinhada com navalha', price: 30, duration: 20, active: true, icon: '🪒' },
  { id: uuidv4(), name: 'Pigmentação', description: 'Disfarce de falhas e volume', price: 50, duration: 30, active: true, icon: '🎨' },
];

function init() {
  if (!localStorage.getItem(K.settings)) set(K.settings, defaultSettings);
  if (!localStorage.getItem(K.services)) set(K.services, defaultServices);
  if (!localStorage.getItem(K.templates)) {
    set(K.templates, [
      { id: uuidv4(), name: 'Assinatura próxima do vencimento', type: 'subscription_warning', message: 'Olá, {nome}! Tudo bem? Sua assinatura vence em {dias} dias. ✂️' },
      { id: uuidv4(), name: 'Lembrete de horário', type: 'appointment_reminder', message: 'Olá, {nome}! Seu horário está marcado para {data} às {hora} com {barbeiro}. ✂️' },
      { id: uuidv4(), name: 'Confirmação', type: 'confirmation', message: 'Olá, {nome}! Horário confirmado para {data} às {hora}. ✂️' },
    ]);
  }
  const users = get<User[]>(K.users, []);
  if (users.length === 0) {
    const ownerId = uuidv4();
    set(K.users, [{ id: ownerId, name: 'Dono Oliveira', phone: '+5562999999999', email: 'dono@barbearia.com', password: 'dono123', role: 'owner', createdAt: new Date().toISOString() }]);
    const barberId = uuidv4();
    set(K.barbers, [{ id: barberId, userId: ownerId, name: 'Dono Oliveira', specialty: 'Cortes e Barba', description: 'Fundador da barbearia', active: true, serviceIds: [] }]);
    set(K.barberProfiles, [{ id: uuidv4(), userId: ownerId, name: 'Dono Oliveira', specialty: 'Cortes e Barba', description: 'Fundador', bio: 'Apaixonado pelo ofício há mais de 10 anos.', experience: '10+ anos', active: true, serviceIds: [] }]);
    // Default permissions for owner (as barber)
    set(K.permissions, [{ barberId: ownerId, canViewAllAppointments: true, canManageClients: true, canManageSubscriptions: true, canViewReports: true, canUsePromotions: true, canManageSchedule: true, canChatWithClients: true }]);
    const avail: Availability[] = [];
    for (let d = 1; d <= 5; d++) avail.push({ id: uuidv4(), barberId, dayOfWeek: d, startTime: '09:00', endTime: '19:00', active: true });
    avail.push({ id: uuidv4(), barberId, dayOfWeek: 6, startTime: '09:00', endTime: '14:00', active: true });
    set(K.availability, avail);
  }
}
init();

export const store = {
  // Users
  getUsers: () => get<User[]>(K.users, []),
  saveUser: (u: User) => { const l = get<User[]>(K.users, []); l.push(u); set(K.users, l); },
  updateUser: (u: User) => { const l = get<User[]>(K.users, []); const i = l.findIndex(x => x.id === u.id); if (i >= 0) l[i] = u; set(K.users, l); },
  deleteUser: (id: string) => set(K.users, get<User[]>(K.users, []).filter(u => u.id !== id)),
  getUserById: (id: string) => get<User[]>(K.users, []).find(u => u.id === id),
  getUserByPhone: (p: string) => get<User[]>(K.users, []).find(u => u.phone === p),
  getClients: () => get<User[]>(K.users, []).filter(u => u.role === 'client'),
  getBarbers: () => get<User[]>(K.users, []).filter(u => u.role === 'barber'),
  getOwner: () => get<User[]>(K.users, []).find(u => u.role === 'owner'),
  getCurrentUserId: () => get<string | null>(K.currentUserId, null),
  setCurrentUserId: (id: string | null) => set(K.currentUserId, id),
  getCurrentUser: () => { const id = store.getCurrentUserId(); return id ? store.getUserById(id) || null : null; },

  // Services
  getServices: () => get<Service[]>(K.services, []),
  getActiveServices: () => get<Service[]>(K.services, []).filter(s => s.active),
  saveService: (s: Service) => { const l = get<Service[]>(K.services, []); l.push(s); set(K.services, l); },
  updateService: (s: Service) => { const l = get<Service[]>(K.services, []); const i = l.findIndex(x => x.id === s.id); if (i >= 0) l[i] = s; set(K.services, l); },

  // Barbers (professional records)
  getBarberRecords: () => get<Barber[]>(K.barbers, []),
  getActiveBarberRecords: () => get<Barber[]>(K.barbers, []).filter(b => b.active),
  saveBarberRecord: (b: Barber) => { const l = get<Barber[]>(K.barbers, []); l.push(b); set(K.barbers, l); },
  updateBarberRecord: (b: Barber) => { const l = get<Barber[]>(K.barbers, []); const i = l.findIndex(x => x.id === b.id); if (i >= 0) l[i] = b; set(K.barbers, l); },
  deleteBarberRecord: (id: string) => set(K.barbers, get<Barber[]>(K.barbers, []).filter(b => b.id !== id)),
  getBarberRecordById: (id: string) => get<Barber[]>(K.barbers, []).find(b => b.id === id),
  getBarberRecordByUserId: (userId: string) => get<Barber[]>(K.barbers, []).find(b => b.userId === userId),

  // Helpers (compatibility)
  getBarberById: (id: string) => get<Barber[]>(K.barbers, []).find(b => b.id === id),
  getActiveBarbers: () => get<Barber[]>(K.barbers, []).filter(b => b.active),

  // Online Status
  setOnlineStatus: (userId: string, online: boolean) => {
    const status = get<Record<string, { online: boolean; lastSeen: string }>>(K.onlineStatus, {});
    status[userId] = { online, lastSeen: new Date().toISOString() };
    set(K.onlineStatus, status);
  },
  getOnlineStatus: (userId: string): { online: boolean; lastSeen: string } => {
    const status = get<Record<string, { online: boolean; lastSeen: string }>>(K.onlineStatus, {});
    return status[userId] || { online: false, lastSeen: new Date().toISOString() };
  },
  isOnline: (userId: string): boolean => {
    const status = get<Record<string, { online: boolean; lastSeen: string }>>(K.onlineStatus, {});
    const userStatus = status[userId];
    if (!userStatus) return false;
    // Consider offline if last seen more than 2 minutes ago
    const lastSeen = new Date(userStatus.lastSeen).getTime();
    const now = Date.now();
    return userStatus.online && (now - lastSeen) < 120000;
  },

  // Auto Messages (Scheduled reminders)
  getAutoMessages: () => get<any[]>(K.autoMessages, []),
  saveAutoMessage: (msg: any) => {
    const l = get<any[]>(K.autoMessages, []);
    l.push(msg);
    set(K.autoMessages, l);
  },
  updateAutoMessage: (msg: any) => {
    const l = get<any[]>(K.autoMessages, []);
    const i = l.findIndex(x => x.id === msg.id);
    if (i >= 0) l[i] = msg;
    set(K.autoMessages, l);
  },
  deleteAutoMessage: (id: string) => {
    set(K.autoMessages, get<any[]>(K.autoMessages, []).filter(m => m.id !== id));
  },
  getPendingAutoMessages: () => {
    const now = new Date().getTime();
    return get<any[]>(K.autoMessages, []).filter(m => !m.sent && new Date(m.scheduledAt).getTime() <= now);
  },

  // Barber Profile (public info)
  getBarberProfiles: () => get<BarberProfile[]>(K.barberProfiles, []),
  getBarberProfileByUserId: (userId: string) => get<BarberProfile[]>(K.barberProfiles, []).find(b => b.userId === userId),
  saveBarberProfile: (p: BarberProfile) => { const l = get<BarberProfile[]>(K.barberProfiles, []); const i = l.findIndex(x => x.userId === p.userId); if (i >= 0) l[i] = p; else l.push(p); set(K.barberProfiles, l); },

  // Permissions
  getPermissions: () => get<BarberPermissions[]>(K.permissions, []),
  getBarberPermissions: (barberUserId: string): BarberPermissions => {
    const p = get<BarberPermissions[]>(K.permissions, []).find(x => x.barberId === barberUserId);
    return p || { barberId: barberUserId, canViewAllAppointments: false, canManageClients: false, canManageSubscriptions: false, canViewReports: false, canUsePromotions: false, canManageSchedule: true, canChatWithClients: true };
  },
  savePermissions: (p: BarberPermissions) => {
    const l = get<BarberPermissions[]>(K.permissions, []);
    const i = l.findIndex(x => x.barberId === p.barberId);
    if (i >= 0) l[i] = p; else l.push(p);
    set(K.permissions, l);
  },

  // Promotions
  getPromotions: () => get<Promotion[]>(K.promotions, []),
  getActivePromotions: () => get<Promotion[]>(K.promotions, []).filter(p => p.active),
  savePromotion: (p: Promotion) => { const l = get<Promotion[]>(K.promotions, []); l.push(p); set(K.promotions, l); },
  updatePromotion: (p: Promotion) => { const l = get<Promotion[]>(K.promotions, []); const i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; set(K.promotions, l); },
  deletePromotion: (id: string) => set(K.promotions, get<Promotion[]>(K.promotions, []).filter(p => p.id !== id)),

  // Broadcast Notifications (from owner to all clients)
  getBroadcasts: () => get<BroadcastNotification[]>(K.broadcasts, []),
  saveBroadcast: (b: BroadcastNotification) => {
    const l = get<BroadcastNotification[]>(K.broadcasts, []);
    l.unshift(b);
    set(K.broadcasts, l);
    // Also create individual notifications for all clients
    const clients = store.getClients();
    const notifs = get<Notification[]>(K.notifications, []);
    clients.forEach(c => {
      notifs.unshift({ id: uuidv4(), type: 'broadcast', message: `${b.title}: ${b.message}`, read: false, createdAt: b.createdAt, targetUserId: c.id });
    });
    set(K.notifications, notifs.slice(0, 200));
  },
  deleteBroadcast: (id: string) => set(K.broadcasts, get<BroadcastNotification[]>(K.broadcasts, []).filter(b => b.id !== id)),

  // Client Tags
  getTags: () => get<ClientTag[]>(K.tags, []),
  getClientTags: (clientId: string) => get<ClientTag[]>(K.tags, []).filter(t => t.clientId === clientId),
  saveTag: (t: ClientTag) => { const l = get<ClientTag[]>(K.tags, []); l.push(t); set(K.tags, l); },
  deleteTag: (id: string) => set(K.tags, get<ClientTag[]>(K.tags, []).filter(t => t.id !== id)),

  // Appointments
  getAppointments: () => get<Appointment[]>(K.appointments, []),
  saveAppointment: (a: Appointment): boolean => {
    const l = get<Appointment[]>(K.appointments, []);
    if (l.some(x => x.barberId === a.barberId && x.date === a.date && x.time === a.time && x.status !== 'cancelled')) return false;
    l.push(a); set(K.appointments, l); return true;
  },
  updateAppointment: (a: Appointment) => { const l = get<Appointment[]>(K.appointments, []); const i = l.findIndex(x => x.id === a.id); if (i >= 0) l[i] = a; set(K.appointments, l); },
  getAppointmentsByBarber: (id: string) => get<Appointment[]>(K.appointments, []).filter(a => a.barberId === id),
  getAppointmentsByClient: (id: string) => get<Appointment[]>(K.appointments, []).filter(a => a.clientId === id),
  checkConflict: (barberId: string, date: string, time: string) => get<Appointment[]>(K.appointments, []).some(a => a.barberId === barberId && a.date === date && a.time === time && a.status !== 'cancelled'),

  // Availability
  getAvailability: () => get<Availability[]>(K.availability, []),
  getAvailabilityByBarber: (id: string) => get<Availability[]>(K.availability, []).filter(a => a.barberId === id),
  saveAvailability: (a: Availability) => { const l = get<Availability[]>(K.availability, []); l.push(a); set(K.availability, l); },
  deleteAvailability: (id: string) => set(K.availability, get<Availability[]>(K.availability, []).filter(x => x.id !== id)),

  // Blocked Dates
  getBlockedDates: () => get<BlockedDate[]>(K.blockedDates, []),
  getBlockedByBarber: (id: string) => get<BlockedDate[]>(K.blockedDates, []).filter(b => b.barberId === id),
  saveBlockedDate: (b: BlockedDate) => { const l = get<BlockedDate[]>(K.blockedDates, []); l.push(b); set(K.blockedDates, l); },
  deleteBlockedDate: (id: string) => set(K.blockedDates, get<BlockedDate[]>(K.blockedDates, []).filter(x => x.id !== id)),

  // Subscriptions
  getSubscriptions: () => get<Subscription[]>(K.subscriptions, []),
  saveSubscription: (s: Subscription) => { const l = get<Subscription[]>(K.subscriptions, []); l.push(s); set(K.subscriptions, l); },
  getSubscriptionByClient: (id: string) => get<Subscription[]>(K.subscriptions, []).filter(s => s.clientId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
  getClientSubscriptions: (id: string) => get<Subscription[]>(K.subscriptions, []).filter(s => s.clientId === id),

  // Templates
  getTemplates: () => get<WhatsAppTemplate[]>(K.templates, []),
  saveTemplate: (t: WhatsAppTemplate) => { const l = get<WhatsAppTemplate[]>(K.templates, []); l.push(t); set(K.templates, l); },
  updateTemplate: (t: WhatsAppTemplate) => { const l = get<WhatsAppTemplate[]>(K.templates, []); const i = l.findIndex(x => x.id === t.id); if (i >= 0) l[i] = t; set(K.templates, l); },
  deleteTemplate: (id: string) => set(K.templates, get<WhatsAppTemplate[]>(K.templates, []).filter(x => x.id !== id)),

  // Settings
  getSettings: () => get<BarbershopSettings>(K.settings, defaultSettings),
  updateSettings: (s: BarbershopSettings) => set(K.settings, s),

  // Notifications (per user)
  getNotifications: () => get<Notification[]>(K.notifications, []),
  getUserNotifications: (userId: string) => get<Notification[]>(K.notifications, []).filter(n => !n.targetUserId || n.targetUserId === userId),
  saveNotification: (n: Notification) => { const l = get<Notification[]>(K.notifications, []); l.unshift(n); set(K.notifications, l.slice(0, 200)); },
  markNotificationRead: (id: string) => { const l = get<Notification[]>(K.notifications, []); const i = l.findIndex(x => x.id === id); if (i >= 0) l[i].read = true; set(K.notifications, l); },
  getUnreadCount: (userId: string) => get<Notification[]>(K.notifications, []).filter(n => !n.read && (!n.targetUserId || n.targetUserId === userId)).length,

  // Chat
  getChats: () => get<ChatMessage[]>(K.chats, []),
  getConversation: (userId1: string, userId2: string) => get<ChatMessage[]>(K.chats, []).filter(m => (m.fromId === userId1 && m.toId === userId2) || (m.fromId === userId2 && m.toId === userId1)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  sendMessage: (fromId: string, toId: string, text: string) => {
    const msg: ChatMessage = { id: uuidv4(), fromId, toId, text, createdAt: new Date().toISOString(), read: false };
    const l = get<ChatMessage[]>(K.chats, []); l.push(msg); set(K.chats, l);
    return msg;
  },
  markMessagesRead: (fromId: string, toId: string) => {
    const l = get<ChatMessage[]>(K.chats, []);
    l.forEach(m => { if (m.fromId === fromId && m.toId === toId) m.read = true; });
    set(K.chats, l);
  },
  getThreads: (userId: string) => {
    const all = get<ChatMessage[]>(K.chats, []);
    const relevant = all.filter(m => m.fromId === userId || m.toId === userId);
    const map = new Map<string, { contactId: string; lastMessage: string; lastAt: string; unread: number }>();
    relevant.forEach(m => {
      const contactId = m.fromId === userId ? m.toId : m.fromId;
      const existing = map.get(contactId);
      if (!existing || new Date(m.createdAt) > new Date(existing.lastAt)) {
        map.set(contactId, { contactId, lastMessage: m.text, lastAt: m.createdAt, unread: 0 });
      }
      if (m.toId === userId && !m.read) {
        const curr = map.get(contactId)!;
        curr.unread += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  },
};
