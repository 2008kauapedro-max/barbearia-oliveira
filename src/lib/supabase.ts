import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,     // SALVA a sessão no aparelho (memória do navegador/app)
    autoRefreshToken: true,   // renova o token sozinho antes de expirar
    detectSessionInUrl: true, // pega sessão de link mágico/confirmação
  },
});