import React, { useState } from 'react';
import { CreditCard, Zap, Gift, Copy, Check, QrCode, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createRecharge, checkRechargeStatus, type RechargeData } from '../lib/recharge';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { platform } from '@todesktop/client-core';

const Recarga: React.FC = () => {
  const { user, updateUser } = useAuth();

  // estados diversos: selectedPackage, isProcessing, showPayment, paymentData...
  // (mantém o código de estado já existente)

  // Definição dos pacotes disponíveis
  const packages = [
    { id: 1, credits: 30, price: 30, bonus: 0, popular: false, description: 'Pacote inicial' },
    { id: 2, credits: 25, price: 25, bonus: 5, popular: true, description: 'Mais escolhido' },
    { id: 3, credits: 50, price: 50, bonus: 12, popular: false, description: 'Para profissionais' },
    { id: 4, credits: 100, price: 100, bonus: 25, popular: false, description: 'Para profissionais' },
  ];

// Mapeia quantidade de créditos para o link de checkout correspondente
const CHECKOUT_LINKS: Record<number, string> = {
  25: 'https://checkout.bspay.co/buy/BSZDG3NDM3Y2',
  50: 'https://checkout.bspay.co/buy/BSOGNKZJJKMJ',
  100: 'https://checkout.bspay.co/buy/BSMDQWZGNIYJ',
};

  // Link fixo para o pacote de R$ 30 (ativação da conta)
  const BSPAY_CHECKOUT_URL = 'https://checkout.bspay.co/buy/BSMZNJMGUWMM';

  // Abre o checkout do pacote fixo de R$ 30
  const redirectToCheckout = async () => {
    if (BSPAY_CHECKOUT_URL) {
      try {
        await platform.os.openURL(BSPAY_CHECKOUT_URL);
      } catch {
        window.open(BSPAY_CHECKOUT_URL, '_blank');
      }
    } else {
      alert('Link de checkout não configurado. Entre em contato com o suporte.');
    }
  };

  // Trata a compra de qualquer pacote selecionado
  const handlePurchase = async (selectedPackageId: number) => {
    // Para o pacote de R$ 30, usar o link fixo
    if (selectedPackageId === 1 && packages[0].price === 30) {
      await redirectToCheckout();
    } else {
      const checkoutUrl = CHECKOUT_LINKS[selectedPackageId];
      if (checkoutUrl) {
        try {
          await platform.os.openURL(checkoutUrl);
        } catch {
          window.open(checkoutUrl, '_blank');
        }
      } else {
        alert('Link de checkout não configurado para este pacote.');
      }
    }
  };

  // ...demais funções e JSX permanecem os mesmos (exibe pacotes, mostra QRCode, etc.)...

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card>
          {/* Exibição dos pacotes e botões de compra */}
          {/* Ao clicar em um pacote, chamar handlePurchase com o id correspondente */}
        </Card>
      </div>
    </div>
  );
};

export default Recarga;
