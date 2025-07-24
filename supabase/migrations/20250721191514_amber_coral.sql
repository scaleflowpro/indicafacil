/*
  # Criar usuário administrador

  1. Novo usuário de autenticação
    - Email: rochanathan788@gmail.com
    - Senha: admin123
    - Role: authenticated
  
  2. Perfil de administrador
    - Nome: Administrador
    - Role: admin
    - 100 créditos iniciais
    - Código de referência: ADMIN001
*/

-- Criar usuário no sistema de autenticação do Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'rochanathan788@gmail.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Criar perfil de administrador
INSERT INTO profiles (
  id,
  name,
  phone,
  pix_key,
  referral_code,
  credits,
  balance,
  total_earnings,
  onboarding_completed,
  role
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'rochanathan788@gmail.com'),
  'Administrador',
  '+55 11 99999-0000',
  'rochanathan788@gmail.com',
  'ADMIN001',
  100,
  0.00,
  0.00,
  true,
  'admin'
);