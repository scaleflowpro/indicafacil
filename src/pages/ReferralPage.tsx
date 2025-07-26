import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowRight, CheckCircle, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ReferralPage: React.FC = () => {
  const { referralCode } = useParams<{ referralCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Debug logs
  console.log('=== REFERRAL PAGE DEBUG ===');
  console.log('referralCode from params:', referralCode);
  console.log('user:', user);
  console.log('current URL:', window.location.href);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    console.log('ReferralPage useEffect - user check:', user);
    if (user) {
      console.log('User is logged in, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    console.log('ReferralPage useEffect - referralCode check:', referralCode);
    if (referralCode) {
      console.log('Loading referrer info for code:', referralCode);
      loadReferrerInfo();
    } else {
      console.log('No referral code found in URL');
      setError('Código de indicação não encontrado na URL');
      setIsLoading(false);
    }
  }, [referralCode]);

  const loadReferrerInfo = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Searching for referral code:', referralCode);
      
      const { data: referrerData, error } = await supabase
        .from('profiles')
        .select('id, name, referral_code, role')
        .eq('referral_code', referralCode)
        .single();

      console.log('Referrer query result:', { referrerData, error });

      if (error || !referrerData) {
        console.error('Referrer not found:', error);
        
        // Try to find any profile with similar code (case insensitive)
        if (referralCode) {
          const { data: similarCodes, error: similarError } = await supabase
            .from('profiles')
            .select('referral_code')
            .ilike('referral_code', referralCode);
          
          console.log('Similar codes found:', similarCodes);
        }
        
        if (error?.code === 'PGRST116') {
          setError('Código de indicação não encontrado. Verifique se o link está correto.');
        } else if (error) {
          setError(`Erro ao validar código: ${error.message}`);
        } else {
          setError('Link de indicação inválido ou expirado');
        }
        return;
      }

      // Check if referrer is active
      if (referrerData.role === 'admin') {
        console.log('Referrer is admin, allowing referral');
      }

      console.log('Referrer found:', referrerData);
      setReferrer(referrerData);
    } catch (error) {
      console.error('Error loading referrer info:', error);
      setError(`Erro ao carregar informações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    // Store referral code in localStorage to use during signup
    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
    }
    navigate('/cadastro');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !referrer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Inválido</h1>
          <div className="text-gray-600 mb-6">
            <p>{error}</p>
            {referralCode && (
              <p className="text-sm mt-2 text-gray-500">
                Código buscado: <code className="bg-gray-100 px-2 py-1 rounded">{referralCode}</code>
              </p>
            )}
          </div>
          <Button onClick={() => navigate('/')} fullWidth>
            Ir para Página Inicial
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">IF</span>
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">IndicaFácil</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Referrer Info */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Você foi indicado por
              <span className="text-blue-600 block">{referrer.name}</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Junte-se ao IndicaFácil e comece a gerar renda através de indicações!
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">30 Créditos Iniciais</h3>
              <p className="text-gray-600">Comece com créditos para suas primeiras indicações</p>
            </Card>
            
            <Card className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">R$ 30 por Indicação</h3>
              <p className="text-gray-600">Ganhe comissão fixa a cada novo usuário</p>
            </Card>
            
            <Card className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">15% Bônus Residual</h3>
              <p className="text-gray-600">Ganhe em todas as recargas dos seus indicados</p>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center">
            <div className="py-8">
              <h2 className="text-3xl font-bold mb-4">
                Pronto para Começar?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                Cadastre-se agora e comece a gerar renda com suas indicações
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  onClick={handleSignup}
                  className="bg-white text-blue-600 hover:bg-gray-50 flex-1"
                >
                  Cadastrar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              
              <div className="mt-6 text-sm text-blue-200">
                Indicado por: <span className="font-semibold">{referrer.name}</span>
              </div>
            </div>
          </Card>

          {/* How it Works */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Como Funciona</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Cadastre-se</h3>
                <p className="text-gray-600 text-sm">Complete seu cadastro e ative sua conta</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Compartilhe</h3>
                <p className="text-gray-600 text-sm">Use seu link único para indicar pessoas</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Ganhe</h3>
                <p className="text-gray-600 text-sm">Receba comissões e bônus automaticamente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;