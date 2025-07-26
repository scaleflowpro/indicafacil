import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { QRCodeCanvas } from 'qrcode.react';
import { platform } from '@todesktop/client-core';

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
  const [step, setStep] = useState(1); // 1: dados pessoais, 2: dados pix
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedReferralCode = localStorage.getItem('referralCode');
    if (storedReferralCode) {
      setReferralCode(storedReferralCode);
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
    // Validações (nome, email, telefone, cpf, senha e confirmação)...
    // (mantém o código de validação já existente)
    setStep(2);
  };

  const handlePixDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações finais (nome, email, telefone, cpf, senha e pixKey)...
    // (mantém o código de validação já existente)

    try {
      const signupData = {
        ...formData,
        referredBy: referralCode,
        credits: 0
      };
      await signup(signupData);

      // Link de checkout para ativação da conta (R$ 30)
      const BSPAY_CHECKOUT_URL = 'https://checkout.bspay.co/buy/BSMZNJMGUWMM';

      try {
        await platform.os.openURL(BSPAY_CHECKOUT_URL);
      } catch {
        window.open(BSPAY_CHECKOUT_URL, '_blank');
      }

      setError('');
      alert('Conta criada com sucesso! O checkout foi aberto em uma nova aba. Após o pagamento, você receberá os créditos automaticamente.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      // Tratamento de erros (mantém o código de erro já existente)
    }
  };

  const handleBackStep = () => {
    setStep(step - 1);
    setError('');
  };

  const getStepTitle = () => (step === 2 ? 'Dados para pagamento' : 'Criar sua conta');
  const getStepDescription = () => (step === 2 ? 'Configure sua chave Pix e será redirecionado para o pagamento' : 'Complete os dados abaixo para começar');

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
          {step === 1 ? (
            // formulário de dados pessoais (mantém o código existente)
            <form onSubmit={handleNextStep} className="space-y-4">
              {/* ...inputs e validações... */}
            </form>
          ) : (
            // formulário de dados Pix e pagamento (mantém o código existente)
            <form onSubmit={handlePixDataSubmit} className="space-y-6">
              {/* ...inputs e validações... */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBackStep} className="flex-1">Voltar</Button>
                <Button type="submit" className="flex-1" isLoading={isLoading}>Criar Conta e Ir para Pagamento</Button>
              </div>
            </form>
          )}
          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600">
              Já tem conta?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Faça login</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
