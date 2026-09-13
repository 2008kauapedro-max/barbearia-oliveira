export type UserRole = 'OWNER' | 'BARBER' | 'CLIENT';

export interface Database {
  public: {
    Tables: {
      barbershops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          settings: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          barbershop_id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          barbershop_id: string;
          role: UserRole;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          name: string;
          description?: string | null;
          price: number;
          duration_minutes: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          barbershop_id: string;
          client_id: string;
          barber_id: string;
          service_id: string;
          date: string;
          time: string;
          status: 'confirmed' | 'cancelled' | 'completed';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          client_id: string;
          barber_id: string;
          service_id: string;
          date: string;
          time: string;
          status?: 'confirmed' | 'cancelled' | 'completed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          client_id?: string;
          barber_id?: string;
          service_id?: string;
          date?: string;
          time?: string;
          status?: 'confirmed' | 'cancelled' | 'completed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Barbershop = Database['public']['Tables']['barbershops']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
