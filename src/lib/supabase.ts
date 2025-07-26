import { supabase } from './client';

// Exportar o cliente supabase
export { supabase };

// Função auxiliar para gerar código de indicação
export const generateReferralCode = (base: string = 'USER') => {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${base.substring(0, 3).toUpperCase()}${random}`;
};

export const signUpUser = async ({
  name,
  email,
  password,
  phone,
  pixKey,
  referredBy
}: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  pixKey?: string;
  referredBy?: string;
}) => {
  // Etapa 1: Criar conta no Auth
  const { data: signUpData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) throw authError;

  const userId = signUpData.user?.id;

  if (!userId) throw new Error('Erro ao criar usuário');

  // ✅ Etapa 1.5: Autenticar para liberar o RLS
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) throw signInError;

  // Aguardar um pouco para garantir que a sessão foi propagada
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Etapa 2: Gerar código de indicação
  const referralCode = generateReferralCode(name);

  // Etapa 3: Criar perfil na tabela 'profiles'
  const profileData = {
    id: userId, // Precisa ser igual a auth.uid()
    name,
    email, // Garantir que o email seja salvo no campo correto
    phone: phone || null,
    pix_key: pixKey || null, // Garantir que pixKey seja salvo no campo correto
    referral_code: referralCode,
    referred_by: referredBy || null,
    credits: 0,
    balance: 0,
    role: 'user'
  };

  console.log('Creating profile with data:', { ...profileData, email: '[HIDDEN]' });

  // Tentar inserir o perfil
  let insertedProfile;
  let insertError;

  try {
    const result = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    insertedProfile = result.data;
    insertError = result.error;
  } catch (error) {
    console.error('Error in profile insertion:', error);
    insertError = error;
  }

  if (insertError) {
    console.error('Error inserting profile:', insertError);
    
    // Se falhar, tentar uma abordagem alternativa usando RPC
    try {
      console.log('Trying alternative approach with RPC...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
        p_user_id: userId,
        p_name: name,
        p_email: email,
        p_phone: phone || null,
        p_pix_key: pixKey || null,
        p_referral_code: referralCode,
        p_referred_by: referredBy || null
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw new Error('Falha ao criar perfil do usuário. Tente novamente.');
      }

      insertedProfile = rpcResult;
    } catch (rpcError) {
      console.error('RPC approach failed:', rpcError);
      throw new Error('Erro ao criar perfil. Entre em contato com o suporte.');
    }
  }

  console.log('Profile created successfully:', { ...insertedProfile, email: '[HIDDEN]' });

  return { user: signUpData.user, profile: insertedProfile };
};

// Função para fazer login do usuário
export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// Função para obter o perfil do usuário
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

// Função para atualizar o perfil do usuário
export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
