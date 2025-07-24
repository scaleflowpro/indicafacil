/*
  # Sistema de Recarga com Pix

  1. Novas Tabelas
    - `pix_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `amount` (numeric, valor em reais)
      - `credits` (integer, créditos a serem adicionados)
      - `bonus_credits` (integer, créditos bônus)
      - `transaction_id` (text, ID da transação externa)
      - `pix_code` (text, código Pix)
      - `qr_code` (text, QR code base64)
      - `status` (text, status do pagamento)
      - `expires_at` (timestamp, expiração)
      - `paid_at` (timestamp, data do pagamento)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS on `pix_payments` table
    - Add policies for users to manage their own payments

  3. Funções
    - `process_pix_payment` para processar pagamentos confirmados
    - `check_payment_expiration` para verificar pagamentos expirados
*/

-- Create pix_payments table
CREATE TABLE IF NOT EXISTS pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer DEFAULT 0,
  transaction_id text UNIQUE NOT NULL,
  pix_code text NOT NULL,
  qr_code text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments"
  ON pix_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payments"
  ON pix_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all payments"
  ON pix_payments
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON pix_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_transaction_id ON pix_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_expires_at ON pix_payments(expires_at);

-- Create updated_at trigger
CREATE TRIGGER update_pix_payments_updated_at
  BEFORE UPDATE ON pix_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to process confirmed Pix payment
CREATE OR REPLACE FUNCTION process_pix_payment(payment_transaction_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_record pix_payments%ROWTYPE;
  user_profile profiles%ROWTYPE;
  total_credits integer;
  result json;
BEGIN
  -- Get payment record
  SELECT * INTO payment_record
  FROM pix_payments
  WHERE transaction_id = payment_transaction_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Payment not found or already processed'
    );
  END IF;

  -- Check if payment is expired
  IF payment_record.expires_at < now() THEN
    UPDATE pix_payments
    SET status = 'expired', updated_at = now()
    WHERE id = payment_record.id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Payment expired'
    );
  END IF;

  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = payment_record.user_id;

  -- Calculate total credits
  total_credits := payment_record.credits + payment_record.bonus_credits;

  -- Update payment status
  UPDATE pix_payments
  SET 
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = payment_record.id;

  -- Add credits to user
  UPDATE profiles
  SET 
    credits = COALESCE(credits, 0) + total_credits,
    updated_at = now()
  WHERE id = payment_record.user_id;

  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status,
    reference_id,
    metadata
  ) VALUES (
    payment_record.user_id,
    'recharge',
    payment_record.amount,
    format('Recarga de %s créditos (+%s bônus)', payment_record.credits, payment_record.bonus_credits),
    'completed',
    payment_record.transaction_id,
    json_build_object(
      'credits', payment_record.credits,
      'bonus_credits', payment_record.bonus_credits,
      'total_credits', total_credits,
      'payment_method', 'pix'
    )
  );

  RETURN json_build_object(
    'success', true,
    'credits_added', total_credits,
    'new_balance', user_profile.credits + total_credits
  );
END;
$$;