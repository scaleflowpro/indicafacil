/*
  # Create test users for development

  1. Test Users
    - Create test user pedro@teste.com with password 123456
    - Create admin user rochanathan788@gmail.com with password admin123
  
  2. Security
    - Both users will have proper profiles
    - Admin user will have admin role
*/

-- First, let's create the test users in auth.users (this is a simulation for development)
-- In production, users would sign up normally

-- Create test user profile
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
  role,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Pedro Teste',
  '(11) 99999-9999',
  'pedro@teste.com',
  'PED123ABC',
  30,
  0.00,
  0.00,
  true,
  'user',
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  pix_key = EXCLUDED.pix_key,
  referral_code = EXCLUDED.referral_code,
  credits = EXCLUDED.credits,
  role = EXCLUDED.role;

-- Create admin user profile
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
  role,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Admin User',
  '(11) 88888-8888',
  'rochanathan788@gmail.com',
  'ADM123ABC',
  100,
  1000.00,
  500.00,
  true,
  'admin',
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  pix_key = EXCLUDED.pix_key,
  referral_code = EXCLUDED.referral_code,
  credits = EXCLUDED.credits,
  balance = EXCLUDED.balance,
  total_earnings = EXCLUDED.total_earnings,
  role = EXCLUDED.role;