import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CreditCard, ArrowLeft, Copy, Check, RefreshCw, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [step, setStep] = useState(1); // 1: dados pessoais, 2: dados pix, 3: pagamento

  
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  // Check for referral code from localStorage on component mount
  useEffect(() => {
    const storedReferralCode = localStorage.getItem('referralCode');
    if (storedReferralCode) {
      setReferralCode(storedReferralCode);
      // Clear it from localStorage after using
      localStorage.removeItem('referralCode');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.cpf || !formData.password || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Formato de e-mail inválido');
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validate phone format (basic)
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(formData.phone) && formData.phone.length < 10) {
      setError('Formato de telefone inválido. Use (11) 99999-9999');
      return;
    }

    // Validate CPF format (basic)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf) && formData.cpf.length < 11) {
      setError('Formato de CPF inválido. Use 000.000.000-00');
      return;
    }
    setStep(2);
  };

  const handlePixDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.pixKey || !formData.cpf) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    // Primeiro, criar a conta do usuário
    try {
      console.log('Criando conta do usuário...');
      await signup({
        ...formData,
        referredBy: referralCode,
        // Não dar créditos ainda, pois o pagamento será feito via checkout
        credits: 0
      });
      
      console.log('Conta criada com sucesso! Abrindo checkout...');
      
      // Abrir checkout em nova aba para evitar redirecionamento
      const BSPAY_CHECKOUT_URL = 'https://checkout.payindicafacil.shop/buy/BSMZNJMGUWMM';
      console.log('Abrindo checkout em nova aba:', BSPAY_CHECKOUT_URL);
      
      // Abrir em nova aba
      window.open(BSPAY_CHECKOUT_URL, '_blank');
      
      // Mostrar mensagem de sucesso
      setError('');
      alert('Conta criada com sucesso! O checkout foi aberto em uma nova aba. Após o pagamento, você receberá os créditos automaticamente.');
      
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      setError('Erro ao criar conta. Tente novamente.');
    }
  };







  const handleBackStep = () => {
    setStep(step - 1);
    setError('');
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Criar sua conta';
      case 2: return 'Dados para pagamento';
      default: return 'Criar sua conta';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Complete os dados abaixo para começar';
      case 2: return 'Configure sua chave Pix e será redirecionado para o pagamento';
      default: return 'Complete os dados abaixo para começar';
    }
  };

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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getStepTitle()}
          </h1>
          <p className="text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        <Card>
          {step === 1 ? (
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

              <Button type="submit" fullWidth size="lg">
                Continuar
              </Button>
            </form>
          ) : step === 2 ? (
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
          ) : null}

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