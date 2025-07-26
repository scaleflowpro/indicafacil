-- Função RPC para criar perfil de usuário
-- Execute este script no SQL Editor do Supabase Dashboard

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_pix_key text DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_referred_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile profiles%ROWTYPE;
BEGIN
  -- Inserir o perfil
  INSERT INTO profiles (
    id,
    name,
    email,
    phone,
    pix_key,
    referral_code,
    referred_by,
    credits,
    balance,
    role,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_pix_key,
    p_referral_code,
    p_referred_by,
    0,
    0.00,
    'user',
    now(),
    now()
  )
  RETURNING * INTO new_profile;

  -- Retornar o perfil criado
  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(new_profile)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text, text, uuid) TO authenticated; 