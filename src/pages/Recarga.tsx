import React from 'react';
import { Button } from '../components/ui/Button';
import { useUser } from '../hooks/useUser';
import { Zap } from 'lucide-react';
import * as platform from '@todesktop/client-core';

const CHECKOUT_LINKS = {
  25: 'https://checkout.bspay.co/buy/BSZDG3NDM3Y2',
  50: 'https://checkout.bspay.co/buy/BSOGNKZJJKMJ',
  100: 'https://checkout.bspay.co/buy/BSMDQWZGNIYJ'
};

const Recarga = () => {
  const { userInfo } = useUser();

  const handlePurchase = async (value: number) => {
    const url = CHECKOUT_LINKS[value];
    if (!url) return alert('Valor inválido');

    try {
      // Para versão desktop (ToDesktop)
      await platform.os.openURL(url);
    } catch {
      // Fallback web
      window.open(url, '_blank');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Recarregar Créditos</h1>

      <div className="grid gap-4">
        {[25, 50, 100].map((valor) => (
          <div key={valor} className="p-4 border rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <p className="text-lg font-semibold">Pacote de R$ {valor},00</p>
              <p className="text-sm text-gray-600">Ganhe créditos para indicar</p>
            </div>
            <Button onClick={() => handlePurchase(valor)}>
              <Zap className="w-4 h-4 mr-2" />
              Gerar Cobrança Pix
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-10 text-sm text-center text-gray-500">
        Sua chave Pix será associada à sua conta e usada para bônus.
      </div>
    </div>
  );
};

export default Recarga;
