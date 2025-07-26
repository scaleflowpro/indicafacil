import React, { useState } from 'react';
import { CreditCard, Zap, Gift, Copy, Check, QrCode, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createRecharge, checkRechargeStatus, type RechargeData } from '../lib/recharge';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { platform } from '@todesktop/client-core';

/**
 * Página de recarga de créditos. Permite escolher um pacote e abrir o checkout
 * correspondente na BSPay. Se o pacote for o de ativação (30 créditos), usa o
 * link fixo de R$ 30. Para os demais, usa o mapeamento CHECKOUT_LINKS.
 */
const Recarga: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Estados relacionados à geração e verificação do pagamento via Pix
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

  // Informações do usuário, usadas caso precise enviar ao backend
  const [userInfo, setUserInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cpf: '',
    phone: user?.phone || ''
  });

  // Definição dos pacotes disponíveis
  const packages = [
    { id: 1, credits: 30, price: 30, bonus: 0, popular: false, description: 'Pacote inicial' },
    { id: 2, credits: 25, price: 25, bonus: 5, popular: true,  description: 'Mais escolhido' },
    { id: 3, credits: 50, price: 50, bonus: 10, popular: false, description: 'Melhor custo-benefício' },
    { id: 4, credits: 100, price: 100, bonus: 25, popular: false, description: 'Para profissionais' },
  ];

  // Mapeia a quantidade de créditos para o link de checkout correspondente
  const CHECKOUT_LINKS: Record<number, string> = {
    25: 'https://checkout.bspay.co/buy/BSZDG3NDM3Y2',
    50: 'https://checkout.bspay.co/buy/BSOGNKZJJKMJ',
    100: 'https://checkout.bspay.co/buy/BSMDQWZGNIYJ',
  };

  // Link fixo do produto BSPAY para R$ 30 (ativação da conta)
  const BSPAY_CHECKOUT_URL = 'https://checkout.bspay.co/buy/BSMZNJMGUWMM';

  /**
   * Abre o checkout para o pacote solicitado. Para o pacote de 30 créditos (ativação
   * da conta), usa o link fixo; para os demais pacotes, usa o mapeamento.
   */
  const handlePurchase = async (credits: number) => {
    // Pacote de 30 -> link fixo de ativação
    if (credits === 30) {
      try {
        await platform.os.openURL(BSPAY_CHECKOUT_URL);
      } catch {
        window.open(BSPAY_CHECKOUT_URL, '_blank');
      }
      return;
    }
    // Demais pacotes -> usa CHECKOUT_LINKS
    const checkoutUrl = CHECKOUT_LINKS[credits];
    if (!checkoutUrl) {
      alert('Link de checkout não configurado para este pacote.');
      return;
    }
    try {
      await platform.os.openURL(checkoutUrl);
    } catch {
      window.open(checkoutUrl, '_blank');
    }
  };

  // Função para copiar o código Pix (quando em pagamentos via Pix)
  const copyPixCode = () => {
    if (paymentData?.pixCode) {
      navigator.clipboard.writeText(paymentData.pixCode);
      setPixCodeCopied(true);
      setTimeout(() => setPixCodeCopied(false), 2000);
    }
  };

  // Verifica o status do pagamento no backend
  const checkPayment = async () => {
    if (!paymentData?.transactionId) return;
    setCheckingPayment(true);
    try {
      const status = await checkRechargeStatus(paymentData.transactionId);
      if (status.status === 'paid') {
        // Pagamento confirmado -> atualiza créditos do usuário
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
        <p className="text-gray-600">Adicione créditos para continuar fazendo suas indicações</p>
      </div>

      {/* Status atual do usuário */}
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
              <p className="text-red-700 font-semibold">⚠️ Sem créditos</p>
              <p className="text-red-600 text-sm">Seu link está inativo</p>
            </div>
          )}
        </div>
      </Card>

      {/* Seleção de pacotes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Escolha seu Pacote</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="cursor-pointer hover:border-blue-400 transition-all"
              onClick={() => handlePurchase(pkg.credits)}
            >
              {pkg.popular && (
                <div className="text-xs uppercase font-bold text-blue-600 mb-2">Mais Popular</div>
              )}
              <div className="text-2xl font-bold text-gray-900">{pkg.credits} créditos</div>
              {pkg.bonus > 0 && <div className="text-sm text-green-600">+{pkg.bonus} bônus</div>}
              <div className="text-xl font-semibold text-gray-900 mt-2">R$ {pkg.price}</div>
              <div className="text-sm text-gray-600">{pkg.description}</div>
              <div className="text-xs text-gray-500 mt-1">
                R$ {(pkg.price / (pkg.credits + pkg.bonus)).toFixed(2)} por crédito
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Se você manter a geração de cobrança via Pix, aqui continua o restante
          da lógica de pagamento (inputs de nome, email, cpf, telefone, QR Code, etc.)
          … mas como agora cada pacote abre o checkout direto, essas seções
          podem ser removidas ou mantidas dependendo da sua necessidade.
      */}

      {/* Benefícios */}
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
