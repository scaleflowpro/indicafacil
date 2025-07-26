import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

interface Package {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
  description: string;
  bspayProductId: string;
}

const Recarga: React.FC = () => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const packages: Package[] = [
    {
      id: '1',
      name: 'Pacote Básico',
      credits: 10,
      bonus: 0,
      price: 10,
      description: '10 créditos',
      bspayProductId: 'BSZDNIZTBMY2'
    },
    {
      id: '2',
      name: 'Pacote Popular',
      credits: 25,
      bonus: 5,
      price: 25,
      description: '25 créditos + 5 bônus',
      bspayProductId: 'BSZDG3NDM3Y2'
    },
    {
      id: '3',
      name: 'Pacote Premium',
      credits: 50,
      bonus: 10,
      price: 50,
      description: '50 créditos + 10 bônus',
      bspayProductId: 'BSOGNKZJJKMJ'
    },
    {
      id: '4',
      name: 'Pacote Máximo',
      credits: 100,
      bonus: 25,
      price: 100,
      description: '100 créditos + 25 bônus',
      bspayProductId: 'BSMDQWZGNIYJ'
    }
  ];

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setError('');
  };

  const handleCheckout = async () => {
    if (!selectedPackage || !user) return;

    setLoading(true);
    setError('');

    try {
      // Gerar ID único para a transação
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // URL correta do checkout BSPay
      const checkoutUrl = `https://checkout.bspay.co/buy/${selectedPackage.bspayProductId}?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&phone=${encodeURIComponent(user.phone || '')}&transaction_id=${transactionId}`;
      
      // Log para debug
      console.log('Abrindo checkout BSPay:', checkoutUrl);
      console.log('Produto:', selectedPackage.bspayProductId);
      console.log('Usuário:', user.email);
      
      // Abrir checkout em nova aba
      const newWindow = window.open(checkoutUrl, '_blank');
      
      // Verificar se a janela foi aberta
      if (newWindow) {
        // Mostrar mensagem de sucesso
        alert('Checkout aberto! Complete o pagamento e os créditos serão adicionados automaticamente.');
      } else {
        setError('Erro ao abrir checkout. Verifique se o popup está bloqueado.');
      }
      
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setError(err.message || 'Erro ao abrir checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recarga de Créditos</h1>
          <p className="text-gray-600">Selecione um pacote para adicionar créditos à sua conta</p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              Créditos atuais: <span className="font-semibold text-blue-600">{user.credits}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{pkg.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                <div className="text-2xl font-bold text-blue-600 mb-4">
                  R$ {pkg.price.toFixed(2)}
                </div>
                <Button
                  onClick={() => handlePackageSelect(pkg)}
                  variant={selectedPackage?.id === pkg.id ? 'primary' : 'outline'}
                  fullWidth
                >
                  {selectedPackage?.id === pkg.id ? 'Selecionado' : 'Selecionar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {selectedPackage && (
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Pagamento via BSPay
              </h2>
              <p className="text-gray-600 mb-6">
                Valor: <span className="font-semibold">R$ {selectedPackage.price.toFixed(2)}</span><br />
                Créditos: <span className="font-semibold text-blue-600">
                  {selectedPackage.credits + selectedPackage.bonus} 
                  {selectedPackage.bonus > 0 && ` (${selectedPackage.credits} + ${selectedPackage.bonus} bônus)`}
                </span>
              </p>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                fullWidth
                size="lg"
              >
                {loading ? 'Abrindo Checkout...' : 'Pagar com BSPay'}
              </Button>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Como funciona:</h3>
                <ol className="text-sm text-blue-700 text-left space-y-1">
                  <li>1. Clique em "Pagar com BSPay"</li>
                  <li>2. Complete o pagamento no checkout</li>
                  <li>3. Os créditos serão adicionados automaticamente</li>
                  <li>4. Você receberá uma confirmação por email</li>
                </ol>
              </div>
            </div>
          </Card>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Após o pagamento, os créditos serão adicionados automaticamente à sua conta via webhook.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Recarga;
