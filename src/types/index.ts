export type UserRole = 'owner' | 'barber' | 'client';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  photo?: string;
  createdAt: string;
  createdBy?: string; // owner id who created this barber
}

export interface BarberPermissions {
  barberId: string;
  canViewAllAppointments: boolean;
  canManageClients: boolean;
  canManageSubscriptions: boolean;
  canViewReports: boolean;
  canUsePromotions: boolean;
  canManageSchedule: boolean;
  canChatWithClients: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  promoPrice: number;
  duration: number; // days
  services: string[]; // service ids
  active: boolean;
  startDate: string;
  endDate: string;
  barberInstructions: string; // how barber should present it
  createdAt: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'promo' | 'info' | 'alert' | 'event';
  createdBy: string;
  createdAt: string;
  readBy: string[]; // client ids
}

export interface BarberProfile {
  id: string;
  userId: string;
  name: string;
  photo?: string;
  specialty: string;
  description: string;
  bio?: string;
  experience?: string;
  instagram?: string;
  active: boolean;
  serviceIds: string[];
}

export interface ClientTag {
  id: string;
  clientId: string;
  label: string;
  color: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
  icon?: string;
}

export interface Barber {
  id: string;
  userId: string;
  name: string;
  photo?: string;
  specialty: string;
  description: string;
  active: boolean;
  serviceIds: string[];
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface Availability {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface BlockedDate {
  id: string;
  barberId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  fullDay: boolean;
}

export interface Subscription {
  id: string;
  clientId: string;
  promotionId?: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  note?: string;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  type: 'subscription_warning' | 'appointment_reminder' | 'confirmation' | 'custom';
  message: string;
}

export interface BarbershopSettings {
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  logo?: string;
  openTime: string;
  closeTime: string;
  slotInterval: number;
}

export interface Notification {
  id: string;
  type: 'subscription_warning' | 'new_appointment' | 'cancellation' | 'subscription_expired' | 'new_message' | 'broadcast';
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  targetUserId?: string; // if undefined, goes to all clients
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  createdAt: string;
  read: boolean;
}
