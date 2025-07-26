import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { platform } from '@todesktop/client-core';

/**
 * Tela de cadastro de usuários. Passa por duas etapas:
 * 1) Dados pessoais (nome, e-mail, telefone, CPF, senha)
 * 2) Configuração de chave Pix para pagamento da ativação
 *
 * Após criar a conta, abre o checkout BSPay de R$ 30 usando a API da ToDesktop.
 */
const Signup: React.FC = () => {
  const [referralCode, setReferralCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    pixKey: ''
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = dados pessoais, 2 = pix/payment

  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  // Ao montar o componente, resgata código de indicação do localStorage (se existir)
  useEffect(() => {
    const storedReferralCode = localStorage.getItem('referralCode');
    if (storedReferralCode) {
      setReferralCode(storedReferralCode);
      localStorage.removeItem('referralCode');
    }
  }, []);

  // Atualiza campos do formulário conforme o usuário digita
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Valida a primeira etapa (dados pessoais) e avança para a etapa Pix
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { name, email, phone, cpf, password, confirmPassword } = formData;

    // Verifica campos obrigatórios
    if (!name || !email || !phone || !cpf || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de e-mail inválido');
      return;
    }

    // Senha deve ter no mínimo 6 caracteres
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Senhas precisam coincidir
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validação simples de telefone (apenas verifica tamanho/padrão)
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(phone) && phone.length < 10) {
      setError('Formato de telefone inválido. Use (11) 99999-9999');
      return;
    }

    // Validação simples de CPF (apenas verifica tamanho/padrão)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf) && cpf.length < 11) {
      setError('Formato de CPF inválido. Use 000.000.000-00');
      return;
    }

    setStep(2);
  };

  // Submete os dados completos (incluindo chave Pix) e abre o checkout de R$ 30
  const handlePixDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { name, email, phone, cpf, password, confirmPassword, pixKey } = formData;

    // Verifica campos da segunda etapa
    if (!name || !email || !phone || !cpf || !password || !confirmPassword || !pixKey) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Digite um e-mail válido');
      return;
    }

    try {
      // Cria o usuário na base (supabase) sem adicionar créditos ainda
      const signupData = {
        ...formData,
        referredBy: referralCode,
        credits: 0
      };
      await signup(signupData);

      // Após criar a conta, abre o checkout BSPay de R$ 30
      const BSPAY_CHECKOUT_URL = 'https://checkout.bspay.co/buy/BSMZNJMGUWMM';
      try {
        await platform.os.openURL(BSPAY_CHECKOUT_URL); // em apps ToDesktop
      } catch {
        window.open(BSPAY_CHECKOUT_URL, '_blank');     // fallback no navegador web
      }

      // Mostra mensagem de sucesso e redireciona para o dashboard
      setError('');
      alert('Conta criada com sucesso! O checkout foi aberto em uma nova aba. Após o pagamento, você receberá os créditos automaticamente.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Erro detalhado ao criar conta:', err);

      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      if (err instanceof Error) {
        if (err.message.includes('email')) {
          errorMessage = 'Este e-mail já está em uso. Tente outro e-mail.';
        } else if (err.message.includes('password')) {
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else {
          errorMessage = `Erro: ${err.message}`;
        }
      }
      setError(errorMessage);
    }
  };

  // Volta da etapa Pix para a etapa de dados pessoais
  const handleBackStep = () => {
    setStep(step - 1);
    setError('');
  };

  // Títulos e descrições por etapa
  const getStepTitle = () => (step === 2 ? 'Dados para pagamento' : 'Criar sua conta');
  const getStepDescription = () => (
    step === 2
      ? 'Configure sua chave Pix e será redirecionado para o pagamento'
      : 'Complete os dados abaixo para começar'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">IF</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getStepTitle()}</h1>
          <p className="text-gray-600">{getStepDescription()}</p>
        </div>

        <Card>
          {/* Etapa 1: dados pessoais */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              {referralCode && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🎉 Você foi indicado!</h4>
                  <p className="text-green-800 text-sm">
                    Código de indicação: <span className="font-mono font-bold">{referralCode}</span>
                  </p>
                  <p className="text-green-700 text-xs mt-1">
                    Você receberá 30 créditos iniciais após ativar sua conta!
                  </p>
                </div>
              )}
              <Input
                type="text"
                name="name"
                label="Nome completo"
                placeholder="Seu nome"
                value={formData.name}
                onChange={handleInputChange}
                icon={<User className="w-5 h-5 text-gray-400" />}
                required
              />
              <Input
                type="email"
                name="email"
                label="E-mail"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                icon={<Mail className="w-5 h-5 text-gray-400" />}
                required
              />
              <Input
                type="tel"
                name="phone"
                label="WhatsApp"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={handleInputChange}
                icon={<Phone className="w-5 h-5 text-gray-400" />}
                required
              />
              <Input
                type="text"
                name="cpf"
                label="CPF"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleInputChange}
                icon={<User className="w-5 h-5 text-gray-400" />}
                required
              />
              <Input
                type="password"
                name="password"
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleInputChange}
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                required
              />
              <Input
                type="password"
                name="confirmPassword"
                label="Confirmar senha"
                placeholder="Digite novamente"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                required
              />
              <Button type="submit" fullWidth size="lg">Continuar</Button>
            </form>
          )}

          {/* Etapa 2: chave Pix e pagamento */}
          {step === 2 && (
            <form onSubmit={handlePixDataSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-2">💳 Ativação da Conta</h3>
                <p className="text-blue-700 text-sm">
                  Para ativar sua conta e liberar o sistema de indicações, você será redirecionado para o checkout BSPAY para realizar o pagamento de R$ 30.
                </p>
              </div>
              <Input
                type="text"
                name="pixKey"
                label="Chave Pix"
                placeholder="E-mail, CPF ou telefone"
                value={formData.pixKey}
                onChange={handleInputChange}
                icon={<CreditCard className="w-5 h-5 text-gray-400" />}
                required
              />
              <div className="text-xs text-gray-500">
                Sua chave Pix será usada para receber as comissões e bônus. Você pode alterá-la depois no seu perfil.
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isLoading}
                >
                  Criar Conta e Ir para Pagamento
                </Button>
              </div>
            </form>
          )}

          {/* Link para login */}
          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600">
              Já tem conta?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
