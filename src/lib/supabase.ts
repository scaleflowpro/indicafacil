import { supabase } from './client'; // ou ajuste o caminho se for diferente

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
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) throw authError;

  const authUser = data.user;
  if (!authUser) throw new Error('Erro ao criar usuário');

  // Etapa 2: Gerar código de indicação
  const referralCode = generateReferralCode(name);

  // Etapa 3: Criar perfil na tabela 'profiles'
  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id, // IMPORTANTE: obrigatório por causa da RLS
      name,
      email,
      phone,
      pix_key: pixKey,
      referral_code: referralCode,
      referred_by: referredBy || null,
      credits: 0,
      balance: 0,
      role: 'user'
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return { user: authUser, profile: insertedProfile };
};
