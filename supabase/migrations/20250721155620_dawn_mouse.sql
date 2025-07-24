/*
  # Criação da tabela de recargas de crédito

  1. Nova Tabela
    - `credit_recharges`
      - `id` (integer, chave primária)
      - `user_id` (uuid, usuário que fez a recarga)
      - `credits_purchased` (integer, quantidade de créditos comprados)
      - `bonus_credits` (integer, créditos bônus recebidos)
      - `amount_paid` (numeric, valor pago em reais)
      - `payment_method` (text, método de pagamento)
      - `payment_status` (text, status do pagamento)
      - `payment_reference` (text, referência do pagamento)
      - `created_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `credit_recharges`
    - Usuários podem ver suas próprias recargas
*/

-- Criar tabela de recargas de crédito
CREATE TABLE IF NOT EXISTS credit_recharges (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  credits_purchased integer NOT NULL,
  bonus_credits integer DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'pix',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_reference text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE credit_recharges ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem suas próprias recargas
CREATE POLICY "Users can view their own credit recharges"
  ON credit_recharges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para usuários inserirem suas próprias recargas
CREATE POLICY "Users can insert their own credit recharges"
  ON credit_recharges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Função para processar recarga de créditos
CREATE OR REPLACE FUNCTION process_credit_recharge(
  p_user_id uuid,
  p_credits_purchased integer,
  p_bonus_credits integer,
  p_amount_paid numeric,
  p_payment_reference text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  total_credits integer;
  recharge_id integer;
BEGIN
  total_credits := p_credits_purchased + p_bonus_credits;

  -- Inserir registro da recarga
  INSERT INTO credit_recharges (
    user_id, 
    credits_purchased, 
    bonus_credits, 
    amount_paid, 
    payment_status,
    payment_reference
  )
  VALUES (
    p_user_id, 
    p_credits_purchased, 
    p_bonus_credits, 
    p_amount_paid, 
    'completed',
    p_payment_reference
  )
  RETURNING id INTO recharge_id;

  -- Adicionar créditos ao perfil do usuário
  UPDATE profiles
  SET credits = credits + total_credits,
      updated_at = now()
  WHERE id = p_user_id;

  -- Registrar transação
  PERFORM create_transaction(
    p_user_id,
    'recharge',
    p_amount_paid,
    format('Recarga de %s créditos', total_credits),
    p_payment_reference
  );

  -- Processar bônus residual para quem indicou este usuário
  PERFORM process_residual_bonus(p_user_id, p_amount_paid);

  RETURN json_build_object(
    'success', true, 
    'recharge_id', recharge_id,
    'total_credits', total_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar bônus residual (10% para quem indicou)
CREATE OR REPLACE FUNCTION process_residual_bonus(p_user_id uuid, p_amount numeric)
RETURNS void AS $$
DECLARE
  referrer_id uuid;
  bonus_amount numeric;
BEGIN
  -- Buscar quem indicou este usuário
  SELECT referred_by INTO referrer_id
  FROM profiles
  WHERE id = p_user_id AND referred_by IS NOT NULL;

  -- Se foi indicado por alguém, processar bônus
  IF referrer_id IS NOT NULL THEN
    bonus_amount := p_amount * 0.10; -- 10% de bônus

    -- Adicionar bônus ao saldo do indicador
    UPDATE profiles
    SET balance = balance + bonus_amount,
        total_earnings = total_earnings + bonus_amount,
        updated_at = now()
    WHERE id = referrer_id;

    -- Registrar transação do bônus
    PERFORM create_transaction(
      referrer_id,
      'bonus',
      bonus_amount,
      'Bônus residual (10%)',
      NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;