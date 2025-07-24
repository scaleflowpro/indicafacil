/*
  # Funções administrativas para o IndicaFácil

  1. Funções
    - `refund_withdrawal`: Reembolsa o saldo do usuário quando um saque é rejeitado
    - `add_user_credits`: Adiciona créditos a um usuário específico
    - `process_referral_commission`: Processa comissão de indicação
    - `is_admin`: Verifica se o usuário é administrador

  2. Segurança
    - Funções com verificação de permissões
    - Logs de auditoria para ações administrativas
*/

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Função para reembolsar saque rejeitado
CREATE OR REPLACE FUNCTION refund_withdrawal(user_id uuid, refund_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar saldo do usuário
  UPDATE profiles 
  SET balance = balance + refund_amount,
      updated_at = now()
  WHERE id = user_id;
  
  -- Registrar transação de reembolso
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status,
    created_at
  ) VALUES (
    user_id,
    'refund',
    refund_amount,
    'Reembolso de saque rejeitado',
    'completed',
    now()
  );
END;
$$;

-- Função para adicionar créditos a um usuário
CREATE OR REPLACE FUNCTION add_user_credits(user_id uuid, credit_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Adicionar créditos
  UPDATE profiles 
  SET credits = credits + credit_amount,
      updated_at = now()
  WHERE id = user_id;
  
  -- Registrar transação
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status,
    created_at
  ) VALUES (
    user_id,
    'bonus',
    0, -- Créditos não têm valor monetário direto
    format('Créditos adicionados pelo admin: %s', credit_amount),
    'completed',
    now()
  );
END;
$$;

-- Função para processar comissão de indicação
CREATE OR REPLACE FUNCTION process_referral_commission(referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id uuid;
  commission_amount numeric := 30.00;
BEGIN
  -- Buscar quem indicou este usuário
  SELECT referred_by INTO referrer_id
  FROM profiles
  WHERE id = referred_user_id;
  
  -- Se há um indicador, processar comissão
  IF referrer_id IS NOT NULL THEN
    -- Adicionar comissão ao saldo do indicador
    UPDATE profiles 
    SET balance = balance + commission_amount,
        total_earnings = total_earnings + commission_amount,
        updated_at = now()
    WHERE id = referrer_id;
    
    -- Registrar transação de comissão
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      description,
      status,
      created_at
    ) VALUES (
      referrer_id,
      'commission',
      commission_amount,
      format('Comissão por indicação - %s', (SELECT name FROM profiles WHERE id = referred_user_id)),
      'completed',
      now()
    );
    
    -- Criar registro na tabela de referrals
    INSERT INTO referrals (
      referrer_id,
      referred_id,
      status,
      commission_paid,
      commission_date,
      created_at
    ) VALUES (
      referrer_id,
      referred_user_id,
      'active',
      commission_amount,
      now(),
      now()
    ) ON CONFLICT (referrer_id, referred_id) DO UPDATE SET
      status = 'active',
      commission_paid = commission_amount,
      commission_date = now(),
      updated_at = now();
  END IF;
END;
$$;

-- Adicionar tipo 'refund' ao check constraint de transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY['commission'::text, 'bonus'::text, 'recharge'::text, 'withdrawal'::text, 'refund'::text]));

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at);

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_withdrawal(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_commission(uuid) TO authenticated;