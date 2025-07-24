/*
  # Adicionar colunas faltantes na tabela profiles

  1. Colunas a adicionar:
    - `experience` (text, experiência do usuário)
    - `credits` (integer, créditos disponíveis, default 30)
    - `balance` (numeric, saldo disponível, default 0.00)
    - `total_earnings` (numeric, ganhos totais, default 0.00)
    - `referral_code` (text, código de indicação único)
    - `onboarding_completed` (boolean, onboarding concluído, default false)
    - `referred_by` (uuid, referência para quem indicou)
    - `role` (text, papel do usuário, default 'user')
    - `created_at` (timestamptz, data de criação, default now())
    - `updated_at` (timestamptz, data de atualização, default now())

  2. Índices e constraints:
    - Unique constraint no referral_code
    - Foreign key para referred_by
    - Índices para performance

  3. Trigger para auto-update do updated_at
*/

-- Adicionar colunas faltantes
DO $$
BEGIN
  -- Adicionar experience se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'experience'
  ) THEN
    ALTER TABLE profiles ADD COLUMN experience text;
  END IF;

  -- Adicionar credits se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits integer DEFAULT 30;
  END IF;

  -- Adicionar balance se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN balance numeric(10,2) DEFAULT 0.00;
  END IF;

  -- Adicionar total_earnings se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_earnings numeric(10,2) DEFAULT 0.00;
  END IF;

  -- Adicionar referral_code se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code text;
  END IF;

  -- Adicionar onboarding_completed se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- Adicionar referred_by se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id);
  END IF;

  -- Adicionar role se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
  END IF;

  -- Adicionar created_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Adicionar updated_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Adicionar constraint unique no referral_code se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Criar função para admin se não existir
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para auto-update do updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Habilitar RLS se não estiver habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recriar políticas RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT TO authenticated
  USING (true);