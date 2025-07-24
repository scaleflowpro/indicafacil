/*
  # Verificação e Correção do Banco de Dados IndicaFácil

  1. Verificar estrutura da tabela profiles
  2. Adicionar colunas faltantes se necessário
  3. Verificar e corrigir funções
  4. Verificar e corrigir políticas RLS
  5. Criar dados de teste se necessário
*/

-- =====================================================
-- 1. VERIFICAR E CORRIGIR TABELA PROFILES
-- =====================================================

-- Adicionar colunas faltantes na tabela profiles
DO $$
BEGIN
  -- Verificar e adicionar coluna credits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credits') THEN
    ALTER TABLE profiles ADD COLUMN credits integer DEFAULT 30;
    RAISE NOTICE '✅ Coluna credits adicionada';
  END IF;

  -- Verificar e adicionar coluna balance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'balance') THEN
    ALTER TABLE profiles ADD COLUMN balance numeric(10,2) DEFAULT 0.00;
    RAISE NOTICE '✅ Coluna balance adicionada';
  END IF;

  -- Verificar e adicionar coluna total_earnings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_earnings') THEN
    ALTER TABLE profiles ADD COLUMN total_earnings numeric(10,2) DEFAULT 0.00;
    RAISE NOTICE '✅ Coluna total_earnings adicionada';
  END IF;

  -- Verificar e adicionar coluna referral_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE NOT NULL DEFAULT '';
    RAISE NOTICE '✅ Coluna referral_code adicionada';
  END IF;

  -- Verificar e adicionar coluna referred_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
    ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id);
    RAISE NOTICE '✅ Coluna referred_by adicionada';
  END IF;

  -- Verificar e adicionar coluna role
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
    RAISE NOTICE '✅ Coluna role adicionada';
  END IF;

  -- Verificar e adicionar coluna onboarding_completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
    RAISE NOTICE '✅ Coluna onboarding_completed adicionada';
  END IF;

  -- Verificar e adicionar coluna created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE '✅ Coluna created_at adicionada';
  END IF;

  -- Verificar e adicionar coluna updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE '✅ Coluna updated_at adicionada';
  END IF;

  RAISE NOTICE '🎉 Verificação da tabela profiles concluída!';
END $$;

-- =====================================================
-- 2. CRIAR FUNÇÃO update_updated_at_column SE NÃO EXISTIR
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CRIAR TRIGGER PARA AUTO-UPDATE DE updated_at
-- =====================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. CRIAR ÍNDICES NECESSÁRIOS
-- =====================================================

CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- =====================================================
-- 5. HABILITAR RLS NA TABELA PROFILES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CRIAR POLÍTICAS RLS PARA PROFILES
-- =====================================================

-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Criar políticas RLS
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 7. CRIAR FUNÇÃO is_admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CRIAR FUNÇÃO process_referral_commission
-- =====================================================

CREATE OR REPLACE FUNCTION process_referral_commission(referred_user_id uuid)
RETURNS void AS $$
DECLARE
  referrer_user_id uuid;
  commission_amount numeric(10,2) := 30.00;
BEGIN
  -- Buscar o indicador
  SELECT referred_by INTO referrer_user_id
  FROM profiles
  WHERE id = referred_user_id AND referred_by IS NOT NULL;
  
  IF referrer_user_id IS NOT NULL THEN
    -- Atualizar saldo do indicador
    UPDATE profiles
    SET balance = balance + commission_amount,
        total_earnings = total_earnings + commission_amount,
        updated_at = now()
    WHERE id = referrer_user_id;
    
    RAISE NOTICE 'Comissão de R$ % processada para usuário %', commission_amount, referrer_user_id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao processar comissão: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CRIAR CONSTRAINT UNIQUE PARA referral_code SE NÃO EXISTIR
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
    RAISE NOTICE '✅ Constraint UNIQUE para referral_code adicionada';
  END IF;
END $$;

-- =====================================================
-- 10. CRIAR FOREIGN KEY PARA referred_by SE NÃO EXISTIR
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_referred_by_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_referred_by_fkey 
    FOREIGN KEY (referred_by) REFERENCES profiles(id);
    RAISE NOTICE '✅ Foreign Key para referred_by adicionada';
  END IF;
END $$;

-- =====================================================
-- 11. VERIFICAÇÃO FINAL E RELATÓRIO
-- =====================================================

DO $$
DECLARE
  profile_count integer;
  missing_columns text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '=== RELATÓRIO FINAL DA VERIFICAÇÃO ===';
  
  -- Contar profiles existentes
  SELECT COUNT(*) INTO profile_count FROM profiles;
  RAISE NOTICE 'Total de profiles na tabela: %', profile_count;
  
  -- Verificar colunas essenciais
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    missing_columns := array_append(missing_columns, 'referral_code');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credits') THEN
    missing_columns := array_append(missing_columns, 'credits');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'balance') THEN
    missing_columns := array_append(missing_columns, 'balance');
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE '❌ Colunas ainda faltando: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ Todas as colunas essenciais estão presentes!';
  END IF;
  
  -- Verificar funções
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE NOTICE '✅ Função is_admin: OK';
  ELSE
    RAISE NOTICE '❌ Função is_admin: FALTANDO';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_referral_commission') THEN
    RAISE NOTICE '✅ Função process_referral_commission: OK';
  ELSE
    RAISE NOTICE '❌ Função process_referral_commission: FALTANDO';
  END IF;
  
  -- Verificar RLS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
    RAISE NOTICE '✅ RLS habilitado na tabela profiles';
  ELSE
    RAISE NOTICE '❌ RLS não habilitado na tabela profiles';
  END IF;
  
  RAISE NOTICE '=== FIM DO RELATÓRIO ===';
  RAISE NOTICE '🚀 Banco de dados verificado e corrigido!';
  RAISE NOTICE '💡 Agora teste o cadastro novamente no frontend';
END $$;