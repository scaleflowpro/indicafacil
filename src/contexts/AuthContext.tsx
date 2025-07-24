import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { supabase, signUpUser, signInUser, getUserProfile, updateUserProfile } from '../lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get total referrals count
const getTotalReferrals = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId);
    
    if (error) {
      console.error('Error fetching referrals count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getTotalReferrals:', error);
    return 0;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session data:', session);
        if (session?.user) {
          console.log('Session user found:', session.user.id);
          const profile = await getUserProfile(session.user.id);
          console.log('Profile data:', profile);
          if (profile) {
            console.log('Profile loaded:', profile);
            console.log('User role:', profile.role);
            setUser({
              id: profile.id,
              name: profile.name || '',
              email: session.user.email || '',
              phone: profile.phone || '',
              pixKey: profile.pix_key || '',
              referralCode: profile.referral_code,
              credits: profile.credits || 0,
              balance: profile.balance || 0,
              totalReferrals: await getTotalReferrals(profile.id),
              isActive: true,
              role: profile.role || 'user',
              createdAt: profile.created_at
            });
          } else {
            console.log('No profile found for user, signing out...');
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          console.log('No session found');
          // Clear any stale session data
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setError('Erro ao carregar sessão');
        // Clear user state on session error
        setUser(null);
        // Also sign out to clear any corrupted session
        await supabase.auth.signOut();
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          console.log('Processing SIGNED_IN event...');
          const profile = await getUserProfile(session.user.id);
          console.log('Profile for signed in user:', profile);
          if (profile) {
            console.log('Profile loaded on sign in:', profile);
            console.log('User role on sign in:', profile.role);
            setUser({
              id: profile.id,
              name: profile.name || '',
              email: session.user.email || '',
              phone: profile.phone || '',
              pixKey: profile.pix_key || '',
              referralCode: profile.referral_code,
              credits: profile.credits || 0,
              balance: profile.balance || 0,
              totalReferrals: await getTotalReferrals(profile.id),
              isActive: true,
              role: profile.role || 'user',
              createdAt: profile.created_at
            });
          } else {
            console.log('No profile found for signed in user, signing out...');
            await supabase.auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching profile on sign in:', error);
          await supabase.auth.signOut();
          setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('Processing SIGNED_OUT event...');
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Handle token refresh
        console.log('Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        // Handle user updates
        console.log('User updated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Starting login process for:', email);
      
      const authResult = await signInUser(email, password);
      const authUser = authResult.user;
      
      if (authUser) {
        console.log('Auth user found, fetching profile...');
        const profile = await getUserProfile(authUser.id);
        console.log('Profile fetched during login:', profile);
        if (profile) {
          console.log('Profile found, setting user state...');
          console.log('User role from profile:', profile.role);
          const userData = {
            id: profile.id,
            name: profile.name || '',
            email: authUser.email || '',
            phone: profile.phone || '',
            pixKey: profile.pix_key || '',
            referralCode: profile.referral_code,
            credits: profile.credits || 0,
            balance: profile.balance || 0,
            totalReferrals: await getTotalReferrals(profile.id),
            isActive: true,
            role: profile.role || 'user',
            createdAt: profile.created_at
          };
          console.log('Setting user data:', userData);
          setUser(userData);
        } else {
          console.error('Profile not found for user:', authUser.id);
          // Try to create a basic profile for existing auth users
          console.log('Attempting to create profile for existing user...');
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                name: authUser.email?.split('@')[0] || 'Usuário',
                referral_code: generateReferralCode(authUser.email?.split('@')[0] || 'USER'),
                credits: 0,
                balance: 0,
                role: 'user'
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating profile:', createError);
              throw new Error('Erro ao criar perfil. Entre em contato com o suporte.');
            }
            
            if (newProfile) {
              const userData = {
                id: newProfile.id,
                name: newProfile.name || '',
                email: authUser.email || '',
                phone: newProfile.phone || '',
                pixKey: newProfile.pix_key || '',
                referralCode: newProfile.referral_code,
                credits: newProfile.credits || 0,
                balance: newProfile.balance || 0,
                totalReferrals: 0,
                isActive: true,
                role: newProfile.role || 'user',
                createdAt: newProfile.created_at
              };
              setUser(userData);
            }
          } catch (profileError) {
            console.error('Failed to create profile:', profileError);
            throw new Error('Perfil não encontrado. Entre em contato com o suporte.');
          }
        }
      } else {
        console.error('No auth user returned');
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-mail ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'E-mail não confirmado';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any) => {
    setIsLoading(true);
    try {
      console.log('Starting signup with data:', { ...data, password: '[HIDDEN]' });
      const { user: authUser, profile } = await signUpUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        pixKey: data.pixKey,
        referredBy: data.referredBy,
        transactionId: data.transactionId
      });

      if (authUser && profile) {
        console.log('Auth user and profile created successfully:', profile);
        setUser({
          id: profile.id,
          name: profile.name || '',
          email: authUser.email || '',
          phone: profile.phone || '',
          pixKey: profile.pix_key || '',
          referralCode: profile.referral_code,
          credits: profile.credits || 0,
          balance: profile.balance || 0,
          totalReferrals: await getTotalReferrals(profile.id),
          isActive: true,
          role: profile.role || 'user',
          createdAt: profile.created_at
        });
      } else {
        console.error('Auth user or profile not created');
        throw new Error('Failed to create user or profile');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (user) {
      try {
        const updatedProfile = await updateUserProfile(user.id, data);
        if (updatedProfile) {
          setUser({
            ...user,
            ...data
          });
        }
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Erro ao fazer logout');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    signup,
    updateUser,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};