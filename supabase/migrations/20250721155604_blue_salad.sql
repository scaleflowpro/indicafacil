/*
  # Criação da tabela de indicações

  1. Nova Tabela
    - `referrals`
      - `id` (integer, chave primária)
      - `referrer_id` (uuid, quem fez a indicação)
      - `referred_id` (uuid, quem foi indicado)
      - `commission_amount` (numeric, valor da comissão, padrão R$30)
      - `status` (text, status da indicação: pending, active, paid)
      - `created_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `referrals`
    - Usuários podem ver suas próprias indicações
    - Usuários podem inserir novas indicações
*/

-- Criar tabela de indicações
CREATE TABLE IF NOT EXISTS referrals (
  id serial PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES profiles(id),
  referred_id uuid NOT NULL REFERENCES profiles(id),
  commission_amount numeric(10,2) DEFAULT 30.00,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paid')),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem suas próprias indicações
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

-- Política para inserir indicações
CREATE POLICY "Users can insert their own referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- Função para processar nova indicação
CREATE OR REPLACE FUNCTION process_referral(referrer_code text, referred_user_id uuid)
RETURNS json AS $$
DECLARE
  referrer_profile profiles%ROWTYPE;
  result json;
BEGIN
  -- Buscar o perfil do indicador pelo código
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE referral_code = referrer_code;

  -- Verificar se o indicador existe e tem créditos
  IF referrer_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de indicação inválido');
  END IF;

  IF referrer_profile.credits <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Indicador sem créditos disponíveis');
  END IF;

  -- Atualizar o perfil do indicado com quem o indicou
  UPDATE profiles
  SET referred_by = referrer_profile.id
  WHERE id = referred_user_id;

  -- Consumir 1 crédito do indicador
  UPDATE profiles
  SET credits = credits - 1,
      updated_at = now()
  WHERE id = referrer_profile.id;

  -- Criar registro da indicação
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (referrer_profile.id, referred_user_id, 'active');

  -- Adicionar comissão ao saldo do indicador
  UPDATE profiles
  SET balance = balance + 30.00,
      total_earnings = total_earnings + 30.00,
      updated_at = now()
  WHERE id = referrer_profile.id;

  RETURN json_build_object('success', true, 'commission', 30.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;