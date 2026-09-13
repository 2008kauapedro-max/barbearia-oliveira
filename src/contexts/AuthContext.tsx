import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  barbershop_id: string | null;
  role: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  disable_reason?: string;
}
interface Barbershop {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  settings?: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  barbershop: Barbershop | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshBarbershop: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfileAndBarbershop = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
      if (profileData.barbershop_id) {
        const { data: shopData } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', profileData.barbershop_id)
          .single();
        if (shopData) setBarbershop(shopData);
      }
    }
  };

  // Recarrega os dados da barbearia sem precisar relogar
  const refreshBarbershop = async () => {
    if (!profile?.barbershop_id) return;
    const { data } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', profile.barbershop_id)
      .single();
    if (data) setBarbershop(data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadProfileAndBarbershop(session.user.id);
        }
      } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
      }
      setLoading(false);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadProfileAndBarbershop(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setBarbershop(null);
      }
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setBarbershop(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, barbershop, loading, signIn, signOut, refreshBarbershop }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return ctx;
}