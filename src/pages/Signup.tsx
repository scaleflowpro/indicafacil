import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';

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
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedReferralCode = localStorage.getItem('referralCode');
    if (storedReferralCode) {
      setReferralCode(storedReferralCode);
      localStorage.removeItem('referralCode');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      await signup({
        ...formData,
        referredBy: referralCode,
        credits: 0
      });
      const BSPAY_CHECKOUT_URL = 'https://checkout.bspay.co/buy/BSMZNJMGUWMM';
      window.open(BSPAY_CHECKOUT_URL, '_blank');
      alert('Conta criada com sucesso! Faça o pagamento para ativar.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar sua conta</h1>
          <p className="text-gray-600">Complete os dados abaixo para começar</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-100 border border-red-200 text-red-600 p-3 rounded-lg">{error}</div>}

            <Input name="name" label="Nome completo" value={formData.name} onChange={handleChange} required />
            <Input name="email" label="E-mail" type="email" value={formData.email} onChange={handleChange} required />
            <Input name="phone" label="WhatsApp" value={formData.phone} onChange={handleChange} />
            <Input name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
            <Input name="password" label="Senha" type="password" value={formData.password} onChange={handleChange} required />
            <Input name="confirmPassword" label="Confirmar senha" type="password" value={formData.confirmPassword} onChange={handleChange} required />
            <Input name="pixKey" label="Chave Pix" value={formData.pixKey} onChange={handleChange} />

            <Button type="submit" fullWidth isLoading={isLoading}>Criar Conta</Button>
          </form>

          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600">
              Já tem conta? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Faça login</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
