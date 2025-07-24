import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CreditCard, ArrowLeft, Copy, Check, RefreshCw, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createPixPayment, checkPaymentStatus, type PaymentData } from '../lib/payment';
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
  const [paymentData, setPaymentData] = useState<{
    transactionId: string;
    pixCode: string;
    qrCode?: string;
    expiresAt: string;
  } | null>(null);
  const [pixCodeCopied, setPixCodeCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
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

    // Create Pix payment for account activation
    const paymentRequest: PaymentData = {
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf,
      phone: formData.phone,
      amount: 3000, // R$ 30.00 em centavos conforme documentação
      description: "Ativação da Conta - IndicaFácil"
    };

    try {
      const payment = await createPixPayment(paymentRequest);
      
      if (payment.success && payment.pixCode && payment.transactionId) {
        setPaymentData({
          transactionId: payment.transactionId,
          pixCode: payment.pixCode,
          qrCode: payment.qrCode,
          expiresAt: payment.expiresAt || ''
        });
        setStep(3);
      } else {
        setError(payment.error || 'Erro ao gerar cobrança Pix');
      }
    } catch (err) {
      console.error('Payment creation error:', err);
      setError('Erro ao gerar cobrança Pix. Tente novamente.');
    }
  };

  const copyPixCode = () => {
    if (paymentData?.pixCode) {
      navigator.clipboard.writeText(paymentData.pixCode);
      setPixCodeCopied(true);
      setTimeout(() => setPixCodeCopied(false), 2000);
    }
  };

  const checkPayment = async () => {
    if (!paymentData?.transactionId) return;

    setCheckingPayment(true);
    try {
      const status = await checkPaymentStatus(paymentData.transactionId);
      
      if (status.status === 'paid') {
        // Payment confirmed, create account
        await handleAccountCreation();
      } else if (status.status === 'expired' || status.status === 'cancelled') {
        setError('Pagamento expirado ou cancelado. Tente novamente.');
        setStep(2);
        setPaymentData(null);
      } else {
        setError('Pagamento ainda não foi confirmado. Aguarde alguns instantes.');
      }
    } catch (err) {
      setError('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleAccountCreation = async () => {
    try {
      console.log('Submitting signup form...');
      await signup({
        ...formData,
        referredBy: referralCode,
        transactionId: paymentData?.transactionId,
        // Account is activated since payment was confirmed
        credits: 30 // Give initial credits after payment
      });
      navigate('/dashboard');
    } catch (err) {
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
      case 3: return 'Pagamento via Pix';
      default: return 'Criar sua conta';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Complete os dados abaixo para começar';
      case 2: return 'Configure sua chave Pix para receber pagamentos';
      case 3: return 'Realize o pagamento para ativar sua conta';
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
                  Para ativar sua conta e liberar o sistema de indicações, será necessário realizar um depósito inicial de R$ 30 via Pix após o cadastro.
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
                  Gerar Cobrança Pix
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Pagamento de R$ 30,00
                </h3>
                <p className="text-gray-600 text-sm">
                  Escaneie o QR Code ou copie o código Pix abaixo
                </p>
              </div>

              {paymentData?.qrCode && (
                <div className="flex justify-center">
                  <img 
                    src={paymentData.qrCode}
                    alt="QR Code Pix"
                    className="w-48 h-48 border rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Código Pix (Copia e Cola)
                </label>
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-xs font-mono break-all text-gray-800 mb-2">
                    {paymentData?.pixCode}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPixCode}
                    className="w-full"
                  >
                    {pixCodeCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {pixCodeCopied ? 'Código Copiado!' : 'Copiar Código Pix'}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Instruções:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Abra seu app do banco</li>
                  <li>• Escolha a opção Pix</li>
                  <li>• Escaneie o QR Code ou cole o código</li>
                  <li>• Confirme o pagamento de R$ 30,00</li>
                  <li>• Clique em "Verificar Pagamento" após pagar</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={checkPayment}
                  isLoading={checkingPayment}
                  className="flex-1"
                >
                  {checkingPayment ? 'Verificando...' : 'Verificar Pagamento'}
                </Button>
              </div>

              {paymentData?.expiresAt && (
                <div className="text-center text-xs text-gray-500">
                  Expira em: {new Date(paymentData.expiresAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}

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