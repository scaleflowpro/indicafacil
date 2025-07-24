/*
  # Create Admin User

  1. Admin Setup
    - Create admin user profile for rochanathan788@gmail.com
    - Set role as 'admin'
    - Grant necessary permissions

  2. Security
    - Ensure admin has access to all admin functions
    - Verify admin role is properly set
*/

-- First, we need to check if the user exists in auth.users
-- This migration assumes the user has already signed up

-- Update the profile to admin role for the specified email
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the user ID from auth.users table
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'rochanathan788@gmail.com';
    
    -- If user exists, update their profile to admin
    IF admin_user_id IS NOT NULL THEN
        -- Update or insert profile with admin role
        INSERT INTO profiles (
            id, 
            role, 
            name, 
            credits, 
            balance, 
            total_earnings,
            referral_code,
            onboarding_completed
        ) VALUES (
            admin_user_id,
            'admin',
            'Administrador',
            999999,
            0,
            0,
            'ADMIN001',
            true
        )
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            credits = 999999,
            onboarding_completed = true;
            
        RAISE NOTICE 'Admin user profile created/updated for: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User with email rochanathan788@gmail.com not found in auth.users';
    END IF;
END $$;