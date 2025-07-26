import React from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Recarga: React.FC = () => {
  const handleCheckout = (url: string) => {
    try {
      window.open(url, '_blank');
    } catch {
      alert('Não foi possível abrir o checkout. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Recarga de Créditos</h1>
          <p className="text-gray-600 text-sm">Selecione um valor abaixo para adicionar créditos à sua conta</p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Recarga de R$ 25</h2>
          <Button fullWidth size="lg" onClick={() => handleCheckout('https://checkout.bspay.co/buy/BSZDG3NDM3Y2')}>
            Recarregar R$25
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Recarga de R$ 50</h2>
          <Button fullWidth size="lg" onClick={() => handleCheckout('https://checkout.bspay.co/buy/BSOGNKZJJKMJ')}>
            Recarregar R$50
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Recarga de R$ 100</h2>
          <Button fullWidth size="lg" onClick={() => handleCheckout('https://checkout.bspay.co/buy/BSMDQWZGNIYJ')}>
            Recarregar R$100
          </Button>
        </Card>

        <div className="text-sm text-gray-500 text-center pt-4">
          Após o pagamento, os créditos serão adicionados automaticamente à sua conta.
        </div>
      </div>
    </div>
  );
};

export default Recarga;
