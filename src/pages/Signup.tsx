import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import * as platform from '@todesktop/client-core';

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
  const [step, setStep] = useState(1);
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

    if (!formData.name || !formData.email || !formData.phone || !formData.cpf || !formData.password || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Formato de e-mail inválido');
      return;
    }

    if (formData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setStep(2);
  };

  const handlePixDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.pixKey) {
      setError('Informe sua chave Pix');
      return;
    }

    try {
      const signupData = {
        ...formData,
        referredBy: referralCode,
        credits: 0
      };

      await signup(signupData);

      const checkoutUrl = 'https://checkout.bspay.co/buy/BSZDNIZTBMY2'; // valor de R$30

      try {
        await platform.os.openURL(checkoutUrl);
      } catch {
        window.open(checkoutUrl, '_blank');
      }

      alert('Conta criada com sucesso! Agora finalize o pagamento.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      let msg = 'Erro ao criar conta. Tente novamente.';
      if (err instanceof Error) {
        if (err.message.includes('email')) msg = 'E-mail já está em uso.';
        else msg = err.message;
      }
      setError(msg);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 1 ? 'Criar sua conta' : 'Ativação via Pix'}
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Complete os dados abaixo para começar' : 'Informe sua chave Pix para receber bônus'}
          </p>
        </div>

        <Card>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <Input type="text" name="name" label="Nome completo" value={formData.name} onChange={handleInputChange} icon={<User />} required />
              <Input type="email" name="email" label="E-mail" value={formData.email} onChange={handleInputChange} icon={<Mail />} required />
              <Input type="tel" name="phone" label="WhatsApp" value={formData.phone} onChange={handleInputChange} icon={<Phone />} required />
              <Input type="text" name="cpf" label="CPF" value={formData.cpf} onChange={handleInputChange} icon={<User />} required />
              <Input type="password" name="password" label="Senha" value={formData.password} onChange={handleInputChange} icon={<Lock />} required />
              <Input type="password" name="confirmPassword" label="Confirmar senha" value={formData.confirmPassword} onChange={handleInputChange} icon={<Lock />} required />
              <Button type="submit" fullWidth size="lg">Continuar</Button>
            </form>
          ) : (
            <form onSubmit={handlePixDataSubmit} className="space-y-6">
              <Input type="text" name="pixKey" label="Chave Pix" value={formData.pixKey} onChange={handleInputChange} icon={<CreditCard />} required />
              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>Criar Conta e Ir para Pagamento</Button>
            </form>
          )}

          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600">
              Já tem conta? <Link to="/login" className="text-blue-600 font-medium">Entrar</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
