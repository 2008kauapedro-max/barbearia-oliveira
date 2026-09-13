-- =====================================================
-- SUPABASE DATABASE SETUP
-- Barbearia Oliveira - Sistema de Agendamento
-- =====================================================

-- =====================================================
-- 1. TABELA DE BARBEARIAS (TENANTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA DE PERFIS (USUÁRIOS)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'BARBER', 'CLIENT')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA DE SERVIÇOS
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA DE AGENDAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop ON profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS DE ACESSO - BARBEARIAS
-- =====================================================

-- OWNER pode ver sua própria barbearia
CREATE POLICY "Owners can view their barbershop"
ON barbershops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.barbershop_id = barbershops.id
    AND profiles.id = auth.uid()
    AND profiles.role = 'OWNER'
  )
);

-- BARBER pode ver a barbearia onde trabalha
CREATE POLICY "Barbers can view their barbershop"
ON barbershops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.barbershop_id = barbershops.id
    AND profiles.id = auth.uid()
    AND profiles.role = 'BARBER'
  )
);

-- CLIENT pode ver barbearias públicas (para agendamento)
CREATE POLICY "Clients can view barbershops"
ON barbershops FOR SELECT
USING (true);

-- =====================================================
-- 8. POLÍTICAS DE ACESSO - PERFIS
-- =====================================================

-- Usuário pode ver seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- OWNER pode ver todos os perfis da sua barbearia
CREATE POLICY "Owners can view all profiles in their barbershop"
ON profiles FOR SELECT
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- BARBER pode ver perfis de CLIENT da mesma barbearia
CREATE POLICY "Barbers can view client profiles in their barbershop"
ON profiles FOR SELECT
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'BARBER'
  )
  AND role = 'CLIENT'
);

-- OWNER pode inserir perfis na sua barbearia
CREATE POLICY "Owners can insert profiles in their barbershop"
ON profiles FOR INSERT
WITH CHECK (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- OWNER pode atualizar perfis da sua barbearia
CREATE POLICY "Owners can update profiles in their barbershop"
ON profiles FOR UPDATE
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- Usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- =====================================================
-- 9. POLÍTICAS DE ACESSO - SERVIÇOS
-- =====================================================

-- Todos podem ver serviços ativos (para agendamento)
CREATE POLICY "Anyone can view active services"
ON services FOR SELECT
USING (is_active = true);

-- OWNER pode gerenciar serviços da sua barbearia
CREATE POLICY "Owners can manage services in their barbershop"
ON services FOR ALL
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- =====================================================
-- 10. POLÍTICAS DE ACESSO - AGENDAMENTOS
-- =====================================================

-- CLIENT pode ver seus próprios agendamentos
CREATE POLICY "Clients can view their own appointments"
ON appointments FOR SELECT
USING (client_id = auth.uid());

-- BARBER pode ver agendamentos onde é o barbeiro
CREATE POLICY "Barbers can view their appointments"
ON appointments FOR SELECT
USING (barber_id = auth.uid());

-- OWNER pode ver todos os agendamentos da sua barbearia
CREATE POLICY "Owners can view all appointments in their barbershop"
ON appointments FOR SELECT
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- CLIENT pode criar agendamentos
CREATE POLICY "Clients can create appointments"
ON appointments FOR INSERT
WITH CHECK (client_id = auth.uid());

-- CLIENT pode cancelar seus próprios agendamentos
CREATE POLICY "Clients can update their own appointments"
ON appointments FOR UPDATE
USING (client_id = auth.uid());

-- BARBER pode atualizar agendamentos onde é o barbeiro
CREATE POLICY "Barbers can update their appointments"
ON appointments FOR UPDATE
USING (barber_id = auth.uid());

-- OWNER pode gerenciar todos os agendamentos da sua barbearia
CREATE POLICY "Owners can manage all appointments in their barbershop"
ON appointments FOR ALL
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  )
);

-- =====================================================
-- 11. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para obter a barbearia do usuário atual
CREATE OR REPLACE FUNCTION get_user_barbershop()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT barbershop_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é OWNER
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é BARBER
CREATE OR REPLACE FUNCTION is_barber()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'BARBER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. DADOS DE TESTE
-- =====================================================

-- Inserir barbearia demo
INSERT INTO barbershops (name, slug, address, phone, email)
VALUES (
  'Barbearia Demo',
  'barbearia-demo',
  'Rua das Tesouras, 123 - Centro',
  '+5511999999999',
  'contato@barbeariademo.com'
) ON CONFLICT (slug) DO NOTHING;

-- Nota: As contas de teste (OWNER e BARBER) devem ser criadas
-- através do Supabase Auth e depois vinculadas à barbearia
-- através da tabela profiles.
-- 
-- Exemplo de como criar as contas:
-- 1. Criar usuário no Supabase Auth (Authentication > Users)
-- 2. Inserir registro na tabela profiles vinculando ao user_id
--
-- Exemplo SQL:
-- INSERT INTO profiles (id, barbershop_id, role, full_name, phone)
-- VALUES (
--   'USER_UUID_FROM_AUTH',
--   (SELECT id FROM barbershops WHERE slug = 'barbearia-demo'),
--   'OWNER',
--   'Administrador',
--   '+5511999999999'
-- );

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
