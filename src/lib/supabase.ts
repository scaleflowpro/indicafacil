import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsuoxowufivosxcchgqx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdW94b3d1Zml2b3N4Y2NoZ3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjA2MzAsImV4cCI6MjA2ODY5NjYzMH0.G7GaBVUU7znrYALJmaBoTrBnoPKTKZ4fZ9idHQCAC-4';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to generate referral code
export const generateReferralCode = (name: string): string => {
  const prefix = name.substring(0, 3).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${suffix}`;
};

// Auth helpers
export const signUpUser = async (userData: {
  name: string;
  email: string;
  phone: string;
  password: string;
  pixKey: string;
  referredBy?: string;
  transactionId?: string;
}) => {
  try {
    let referrerId: string | null = null;

    console.log('Starting signup process for:', userData.email);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Formato de e-mail inválido');
    }

    // Validate password strength
    if (userData.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation
        data: {
          email_confirm: true // Skip email confirmation
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    console.log('Auth user created:', authData.user.id);

    // 2. Check for referrer if referredBy is provided
    if (userData.referredBy) {
      console.log('Looking for referrer with code:', userData.referredBy);
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', userData.referredBy)
        .single();

      if (!referrerError && referrer) {
        referrerId = referrer.id;
        console.log('Found referrer:', referrerId);
      } else {
        console.log('Referrer not found or error:', referrerError);
      }
    }

    // 3. Generate referral code
    const referralCode = generateReferralCode(userData.name);

    console.log('Generated referral code:', referralCode);

    // 4. Create profile
    const profileData = {
      id: authData.user.id,
      name: userData.name,
      phone: userData.phone,
      pix_key: userData.pixKey,
      referral_code: referralCode,
      referred_by: referrerId,
      credits: userData.transactionId ? 30 : 0, // Só dá créditos se pagamento foi feito
      balance: 0,
      total_earnings: 0,
      onboarding_completed: true,
      role: 'user'
    };

    console.log('Creating profile with data:', profileData);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError || !profile) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    console.log('Profile created successfully');
    
    // 5. Process referral commission if there's a referrer and payment was made
    if (referrerId) {
      try {
        console.log('Processing referral commission...');
        
        // Create referral record
        const { error: referralError } = await supabase
          .from('referrals')
          .insert({
            referrer_id: referrerId,
            referred_id: authData.user.id,
            status: 'pending'
          });
        
        if (referralError) {
          console.error('Referral record creation error:', referralError);
        } else {
          console.log('Referral record created successfully');
        }
        
        // Process commission if payment was made
        if (userData.transactionId) {
          const { error: commissionError } = await supabase.rpc('process_referral_commission', {
            referred_user_id: authData.user.id
          });
          
          if (commissionError) {
            console.error('Commission processing error:', commissionError);
          } else {
            console.log('Commission processed successfully');
          }
        }
      } catch (error) {
        console.error('Referral processing failed:', error);
      }
    }
    
    return { user: authData.user, profile };
  } catch (error) {
    console.error('Error signing up user:', error);
    throw error;
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    console.log('Attempting to sign in user:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      throw error;
    }
    
    if (!data.user) {
      throw new Error('No user returned from authentication');
    }
    
    console.log('Sign in successful:', data);
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    console.log('Fetching profile for user:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Profile query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        console.log('No profile found for user:', userId);
        return null;
      }
      console.error('Profile fetch error:', error);
      throw error;
    }
    console.log('Profile found:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};