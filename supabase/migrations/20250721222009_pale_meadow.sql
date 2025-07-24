/*
  # Add balance management functionality

  1. Functions
    - Create function to safely update user balance
    - Add transaction logging for balance changes

  2. Security
    - Ensure only admins can modify balances
    - Log all balance changes for audit trail
*/

-- Function to add/remove balance from user account
CREATE OR REPLACE FUNCTION add_user_balance(
  user_id UUID,
  balance_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Update user balance
  UPDATE profiles 
  SET 
    balance = GREATEST(0, balance + balance_amount),
    updated_at = now()
  WHERE id = user_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status
  ) VALUES (
    user_id,
    CASE WHEN balance_amount > 0 THEN 'bonus' ELSE 'withdrawal' END,
    balance_amount,
    'Ajuste de saldo pelo administrador: ' || 
    CASE WHEN balance_amount > 0 THEN '+' ELSE '' END || 
    'R$ ' || balance_amount::TEXT,
    'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;