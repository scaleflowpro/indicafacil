import React, { useState } from 'react';
import { CreditCard, Zap, Gift, Copy, Check, QrCode, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createRecharge, checkRechargeStatus, type RechargeData } from '../lib/recharge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Recarga: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    transactionId: string;
    pixCode: string;
    qrCode: string;
    expiresAt: string;
    amount: number;
    credits: number;
    bonusCredits: number;
  } | null>(null);
  const [pixCodeCopied, setPixCodeCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cpf: '',
    phone: user?.phone || ''
  });

  const packages = [
    {
      id: 1,
      credits: 30,
      price: 30,
      bonus: 0,
      popular: false,
      description: 'Pacote inicial'
    },
    {
      id: 2,
      credits: 25,
      price: 25,
      bonus: 5,
      popular: true,
      description: 'Mais escolhido'
    },
    {
      id: 3,
      credits: 50,
      price: 50,
      bonus: 10,
      popular: false,
      description: 'Melhor custo-benefício'
    },
    {
      id: 4,
      credits: 100,
      price: 100,
      bonus: 25,
      popular: false,
      description: 'Para profissionais'
    }
  ];

  const CHECKOUT_LINKS = {
    10: 'https://checkout.payindicafacil.shop/buy/BSZDNIZTBMY2',
    25: 'https://checkout.payindicafacil.shop/buy/BSZDG3NDM3Y2',
    50: 'https://checkout.payindicafacil.shop/buy/BSOGNKZJJKMJ',
    100: 'https://checkout.payindicafacil.shop/buy/BSMDQWZGNIYJ',
  };

  // Link fixo do produto BSPAY para R$ 30
  const BSPAY_CHECKOUT_URL = 'https://checkout.payindicafacil.shop/buy/BSMZNJMGUWMM'; // Substitua pelo ID real do produto

  // Função para redirecionar para o checkout BSPAY
  const redirectToCheckout = () => {
    if (BSPAY_CHECKOUT_URL && BSPAY_CHECKOUT_URL !== 'https://checkout.payindicafacil.shop/buy/BSMZNJMGUWMM') {
      window.location.href = BSPAY_CHECKOUT_URL;
    } else {
      alert('Link de checkout não configurado. Entre em contato com o suporte.');
    }
  };

  const handlePurchase = (selectedPackageId: number) => {
    // Para o pacote de R$ 30, usar o checkout BSPAY fixo
    if (selectedPackageId === 1 && packages[0].price === 30) {
      redirectToCheckout();
    } else {
      // Para outros pacotes, manter a lógica existente se necessário
      const checkoutUrl = CHECKOUT_LINKS[selectedPackageId];
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Link de checkout não configurado para este pacote.');
      }
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
      const status = await checkRechargeStatus(paymentData.transactionId);
      
      if (status.status === 'paid') {
        // Payment confirmed, update user credits
        const newCredits = (user?.credits || 0) + (status.creditsAdded || 0);
        await updateUser({ credits: newCredits });
        
        alert(`Recarga confirmada! Você recebeu ${status.creditsAdded} créditos.`);
        setShowPayment(false);
        setPaymentData(null);
        setSelectedPackage(null);
      } else if (status.status === 'expired' || status.status === 'cancelled') {
        alert('Pagamento expirado ou cancelado. Tente novamente.');
        setShowPayment(false);
        setPaymentData(null);
      } else {
        alert('Pagamento ainda não foi confirmado. Aguarde alguns instantes.');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleBackToPackages = () => {
    setShowPayment(false);
    setPaymentData(null);
    setSelectedPackage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recarregar Créditos</h1>
        <p className="text-gray-600">
          Adicione créditos para continuar fazendo suas indicações
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Status Atual</h2>
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-sm text-gray-600">Créditos Disponíveis</div>
                <div className="text-2xl font-bold text-blue-600">{user?.credits}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Saldo</div>
                <div className="text-2xl font-bold text-green-600">
                  R$ {user?.balance?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          {user?.credits === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-red-800 font-medium">⚠️ Sem créditos</div>
              <div className="text-red-600 text-sm">Seu link está inativo</div>
            </div>
          )}
        </div>
      </Card>

      {/* Package Selection */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Escolha seu Pacote</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`cursor-pointer transition-all duration-200 relative bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl p-6 ${
                selectedPackage === pkg.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-xl hover:scale-105'
              } ${pkg.popular ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Mais Popular
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {pkg.credits}
                </div>
                <div className="text-sm text-gray-600 mb-4">créditos</div>
                
                {pkg.bonus > 0 && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mb-4">
                    <Gift className="w-3 h-3 inline mr-1" />
                    +{pkg.bonus} bônus
                  </div>
                )}
                
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  R$ {pkg.price}
                </div>
                
                <div className="text-xs text-gray-500 mb-4">
                  {pkg.description}
                </div>
                
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                  R$ {(pkg.price / (pkg.credits + pkg.bonus)).toFixed(2)} por crédito
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Section */}
      {selectedPackage && !showPayment && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Dados para Pagamento</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-blue-900">
                  Pacote: {packages.find(p => p.id === selectedPackage)?.credits} créditos
                  {packages.find(p => p.id === selectedPackage)?.bonus! > 0 && 
                    ` + ${packages.find(p => p.id === selectedPackage)?.bonus} bônus`
                  }
                </h3>
                <p className="text-blue-700">
                  Valor: R$ {packages.find(p => p.id === selectedPackage)?.price}
                </p>
              </div>
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                required
              />
              
              <Input
                label="E-mail"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                required
              />
              
              <Input
                label="CPF"
                value={userInfo.cpf}
                onChange={(e) => setUserInfo({ ...userInfo, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
              
              <Input
                label="WhatsApp"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setSelectedPackage(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                fullWidth
                isLoading={isProcessing}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isProcessing ? 'Gerando...' : 'Gerar Cobrança Pix'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Payment Display */}
      {showPayment && paymentData && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Pagamento via Pix</h2>
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Pagamento de R$ {paymentData.amount.toFixed(2)}
            </h3>
            <p className="text-gray-600 text-sm">
              {paymentData.credits} créditos + {paymentData.bonusCredits} bônus
            </p>
          </div>

          {paymentData.qrCode && (
            <div className="flex justify-center mb-6">
              <img 
                src={paymentData.qrCode}
                alt="QR Code Pix"
                className="w-48 h-48 border rounded-lg"
              />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Pix (Copia e Cola)
              </label>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-xs font-mono break-all text-gray-800 mb-2">
                  {paymentData.pixCode}
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
                <li>• Confirme o pagamento de R$ {paymentData.amount.toFixed(2)}</li>
                <li>• Clique em "Verificar Pagamento" após pagar</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={handleBackToPackages}
              >
                Voltar
              </Button>
              <Button
                fullWidth
                onClick={checkPayment}
                isLoading={checkingPayment}
              >
                {checkingPayment ? 'Verificando...' : 'Verificar Pagamento'}
              </Button>
            </div>

            {paymentData.expiresAt && (
              <div className="text-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 inline mr-1" />
                Expira em: {new Date(paymentData.expiresAt).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Benefits */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Por que recarregar?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Ganhe R$ 30</h3>
            <p className="text-sm text-gray-600">Por cada indicado que se cadastrar</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Bônus Residual</h3>
            <p className="text-sm text-gray-600">10% em todas as recargas dos seus indicados</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Link Ativo</h3>
            <p className="text-sm text-gray-600">Mantenha seu link sempre funcionando</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Recarga;