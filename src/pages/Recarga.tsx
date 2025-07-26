import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';

interface Package {
  id: number;
  name: string;
  credits: number;
  bonus: number;
  price: number;
  description: string;
}

const Recarga: React.FC = () => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    pixCode: string;
    transactionId: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState('');

  const packages: Package[] = [
    {
      id: 1,
      name: 'Pacote Básico',
      credits: 10,
      bonus: 0,
      price: 10,
      description: '10 créditos'
    },
    {
      id: 2,
      name: 'Pacote Popular',
      credits: 25,
      bonus: 5,
      price: 25,
      description: '25 créditos + 5 bônus'
    },
    {
      id: 3,
      name: 'Pacote Premium',
      credits: 50,
      bonus: 10,
      price: 50,
      description: '50 créditos + 10 bônus'
    },
    {
      id: 4,
      name: 'Pacote Máximo',
      credits: 100,
      bonus: 25,
      price: 100,
      description: '100 créditos + 25 bônus'
    }
  ];

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPixData(null);
    setError('');
  };

  const generatePix = async () => {
    if (!selectedPackage || !user) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('pix-recharge', {
        body: {
          action: 'create',
          data: {
            packageId: selectedPackage.id,
            name: user.name,
            email: user.email,
            cpf: '', // Adicionar campo CPF se necessário
            phone: user.phone
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setPixData({
          qrCode: data.qrCode,
          pixCode: data.pixCode,
          transactionId: data.transactionId,
          expiresAt: data.expiresAt
        });
      } else {
        setError(data.error || 'Erro ao gerar PIX');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!pixData) return;

    try {
      const { data, error } = await supabase.functions.invoke('pix-recharge', {
        body: {
          action: 'check',
          transactionId: pixData.transactionId
        }
      });

      if (error) throw error;

      if (data.status === 'paid') {
        alert('Pagamento confirmado! Seus créditos foram adicionados.');
        setPixData(null);
        setSelectedPackage(null);
        // Recarregar dados do usuário
        window.location.reload();
      } else if (data.status === 'expired') {
        setError('PIX expirado. Gere um novo PIX.');
        setPixData(null);
      }
    } catch (err: any) {
      console.error('Erro ao verificar pagamento:', err);
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
                Pagamento via PIX
              </h2>
              <p className="text-gray-600 mb-6">
                Valor: <span className="font-semibold">R$ {selectedPackage.price.toFixed(2)}</span><br />
                Créditos: <span className="font-semibold text-blue-600">
                  {selectedPackage.credits + selectedPackage.bonus} 
                  {selectedPackage.bonus > 0 && ` (${selectedPackage.credits} + ${selectedPackage.bonus} bônus)`}
                </span>
              </p>

              {!pixData ? (
                <Button
                  onClick={generatePix}
                  disabled={loading}
                  fullWidth
                  size="lg"
                >
                  {loading ? 'Gerando PIX...' : 'Gerar PIX'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Escaneie o QR Code:</h3>
                    <div className="flex justify-center">
                      <img 
                        src={pixData.qrCode} 
                        alt="QR Code PIX" 
                        className="max-w-48 h-auto"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Ou copie o código PIX:</h3>
                    <textarea
                      value={pixData.pixCode}
                      readOnly
                      className="w-full p-3 border rounded-lg text-sm font-mono"
                      rows={3}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={checkPaymentStatus}
                      variant="outline"
                      fullWidth
                    >
                      Verificar Pagamento
                    </Button>
                    <Button
                      onClick={() => {
                        setPixData(null);
                        setSelectedPackage(null);
                      }}
                      variant="outline"
                      fullWidth
                    >
                      Cancelar
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Expira em: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Após o pagamento, os créditos serão adicionados automaticamente à sua conta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Recarga;
