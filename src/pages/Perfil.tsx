import React, { useState } from 'react';
import { User, Mail, Phone, CreditCard, Key, Shield, Save, Edit3, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Perfil: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pixKey: user?.pixKey || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.pixKey.trim()) {
      newErrors.pixKey = 'Chave Pix é obrigatória';
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'Nova senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await updateUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        pixKey: formData.pixKey
      });
      
      setIsEditing(false);
      // In real app, show success toast
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      pixKey: user?.pixKey || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const accountStats = [
    {
      label: 'Membro desde',
      value: new Date(user?.createdAt || '').toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
      }),
      icon: <User className="w-5 h-5" />
    },
    {
      label: 'Total de Indicações',
      value: user?.totalReferrals || 0,
      icon: <User className="w-5 h-5" />
    },
    {
      label: 'Status da Conta',
      value: user?.isActive ? 'Ativa' : 'Inativa',
      icon: <Shield className="w-5 h-5" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
          <p className="text-gray-600">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Profile Overview */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
            <p className="text-gray-600 mb-2">{user?.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Conta Ativa</span>
              </div>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{user?.credits} créditos</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Saldo: R$ {user?.balance?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Informações Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                error={errors.name}
                icon={<User className="w-5 h-5 text-gray-400" />}
              />
              
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                error={errors.email}
                icon={<Mail className="w-5 h-5 text-gray-400" />}
              />
              
              <Input
                label="WhatsApp"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                error={errors.phone}
                icon={<Phone className="w-5 h-5 text-gray-400" />}
              />
              
              <Input
                label="Chave Pix"
                name="pixKey"
                value={formData.pixKey}
                onChange={handleInputChange}
                disabled={!isEditing}
                error={errors.pixKey}
                icon={<CreditCard className="w-5 h-5 text-gray-400" />}
              />
            </div>
          </Card>

          {/* Security Settings */}
          {isEditing && (
            <Card>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Alterar Senha</h3>
              
              <div className="space-y-4">
                <Input
                  label="Senha Atual"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Digite sua senha atual"
                  icon={<Key className="w-5 h-5 text-gray-400" />}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nova Senha"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Mínimo 6 caracteres"
                    error={errors.newPassword}
                    icon={<Key className="w-5 h-5 text-gray-400" />}
                  />
                  
                  <Input
                    label="Confirmar Nova Senha"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Digite novamente"
                    error={errors.confirmPassword}
                    icon={<Key className="w-5 h-5 text-gray-400" />}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showPassword ? 'Ocultar' : 'Mostrar'} senhas</span>
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Account Stats & Referral Code */}
        <div className="space-y-6">
          {/* Account Statistics */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas da Conta</h3>
            
            <div className="space-y-4">
              {accountStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-400">
                      {stat.icon}
                    </div>
                    <span className="text-sm text-gray-600">{stat.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stat.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Referral Code */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Código de Indicação</h3>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {user?.referralCode}
                </div>
                <div className="text-xs text-gray-500">
                  Seu código único de indicação
                </div>
              </div>
            </div>
            
            <Button
              fullWidth
              variant="outline"
              onClick={copyReferralCode}
              size="sm"
            >
              {codeCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {codeCopied ? 'Copiado!' : 'Copiar Código'}
            </Button>
          </Card>

          {/* Account Status */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status da Conta</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verificação</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Verificada
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Plano</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  Ativo
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Link de Indicação</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  (user?.credits || 0) > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {(user?.credits || 0) > 0 ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Zona de Perigo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Ações irreversíveis que afetam permanentemente sua conta.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
            Desativar Conta
          </Button>
          <Button variant="danger">
            Excluir Conta
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Perfil;