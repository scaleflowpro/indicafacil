import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, AlertCircle, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Saques: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [pixKey, setPixKey] = useState(user?.pixKey || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real withdrawal data
  useEffect(() => {
    if (user?.id) {
      loadWithdrawalHistory();
    }
  }, [user?.id]);

  const loadWithdrawalHistory = async () => {
    try {
      setIsLoading(true);
      
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawals:', error);
        return;
      }

      const formattedWithdrawals = withdrawals?.map(w => ({
        id: w.id,
        amount: w.amount,
        pixKey: w.pix_key,
        status: w.status,
        requestDate: w.created_at,
        processedDate: w.processed_at,
        fee: w.fee || 0,
        netAmount: w.net_amount,
        reference: w.reference,
        rejectionReason: w.rejection_reason
      })) || [];

      setWithdrawalHistory(formattedWithdrawals);
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const minWithdrawal = 100;
  const maxWithdrawal = user?.balance || 0;
  const withdrawalFee = 0.10; // Taxa de 10% para saques

  const validateWithdrawal = () => {
    const newErrors: Record<string, string> = {};
    const amount = parseFloat(withdrawalAmount);

    if (!withdrawalAmount) {
      newErrors.amount = 'Valor é obrigatório';
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (amount < minWithdrawal) {
      newErrors.amount = `Valor mínimo é R$ ${minWithdrawal.toFixed(2)}`;
    } else if (amount > maxWithdrawal) {
      newErrors.amount = 'Valor maior que saldo disponível';
    }

    if (!pixKey.trim()) {
      newErrors.pixKey = 'Chave Pix é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWithdrawal = async () => {
    if (!validateWithdrawal()) return;

    setIsProcessing(true);
    
    try {
      const amount = parseFloat(withdrawalAmount);
      const feeAmount = amount * withdrawalFee;
      const netAmount = amount - feeAmount;
      const reference = `SAQ${Date.now()}`;

      // Create withdrawal request
      const { error: insertError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amount,
          pix_key: pixKey,
          status: 'pending',
          fee: feeAmount,
          net_amount: netAmount,
          reference: reference
        });

      if (insertError) {
        throw new Error('Erro ao criar solicitação de saque');
      }

      // Update user balance
      const newBalance = (user?.balance || 0) - amount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Erro ao atualizar saldo');
      }
      
      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: -amount,
          description: `Saque via Pix - ${pixKey}`,
          status: 'pending',
          reference_id: reference
        });
      
      await updateUser({ balance: newBalance });
      await loadWithdrawalHistory(); // Reload withdrawal history
      
      setWithdrawalAmount('');
      alert('Solicitação de saque enviada com sucesso! Será processada em até 24 horas.');
    } catch (error) {
      alert('Erro ao processar saque. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingWithdrawals = withdrawalHistory.filter(w => w.status === 'pending');
  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Saques</h1>
        <p className="text-gray-600">
          Solicite o saque do seu saldo disponível via Pix
        </p>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">R$ {user?.balance?.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Saldo Disponível</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">R$ {totalPending.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Saques Pendentes</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">R$ {minWithdrawal.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Valor Mínimo</div>
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Solicitar Saque</h2>
        
        {(user?.balance || 0) < minWithdrawal ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Saldo Insuficiente
            </h3>
            <p className="text-yellow-700">
              Você precisa de pelo menos R$ {minWithdrawal.toFixed(2)} para solicitar um saque.
              Seu saldo atual é R$ {user?.balance?.toFixed(2)}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Valor do Saque"
                type="number"
                placeholder="0,00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                error={errors.amount}
                icon={<DollarSign className="w-5 h-5 text-gray-400" />}
              />
              
              <Input
                label="Chave Pix"
                placeholder="E-mail, CPF ou telefone"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                error={errors.pixKey}
                icon={<CreditCard className="w-5 h-5 text-gray-400" />}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informações Importantes</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Valor mínimo para saque: R$ {minWithdrawal.toFixed(2)}</li>
                <li>• Taxa de saque: {(withdrawalFee * 100).toFixed(0)}% sobre o valor</li>
                <li>• Processamento: até 24 horas úteis</li>
                <li>• Disponível apenas via Pix</li>
              </ul>
            </div>

            {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Resumo do Saque:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor solicitado:</span>
                    <span className="font-medium">R$ {parseFloat(withdrawalAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa ({(withdrawalFee * 100).toFixed(0)}%):</span>
                    <span className="font-medium text-red-600">- R$ {(parseFloat(withdrawalAmount || '0') * withdrawalFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-semibold text-gray-900">Valor a receber:</span>
                    <span className="font-bold text-green-600">
                      R$ {(parseFloat(withdrawalAmount || '0') * (1 - withdrawalFee)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              fullWidth
              onClick={handleWithdrawal}
              isLoading={isProcessing}
              disabled={!withdrawalAmount || !pixKey}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processando...' : 'Solicitar Saque'}
            </Button>
          </div>
        )}
      </Card>

      {/* Withdrawal History */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Histórico de Saques</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum saque realizado
            </h3>
            <p className="text-gray-600">
              Seus saques aparecerão aqui após a primeira solicitação
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawalHistory.map((withdrawal) => (
              <div key={withdrawal.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          R$ {withdrawal.amount.toFixed(2)}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          <span className="ml-1">{getStatusText(withdrawal.status)}</span>
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Chave Pix: {withdrawal.pixKey}</div>
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Solicitado: {new Date(withdrawal.requestDate).toLocaleDateString('pt-BR')}
                          </span>
                          <span>#{withdrawal.reference}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {withdrawal.status === 'completed' && withdrawal.processedDate && (
                      <div className="text-sm text-green-600">
                        Processado em {new Date(withdrawal.processedDate).toLocaleDateString('pt-BR')}
                        {withdrawal.netAmount && (
                          <div className="text-xs text-gray-500">
                            Líquido: R$ {withdrawal.netAmount.toFixed(2)} (Taxa: R$ {withdrawal.fee.toFixed(2)})
                          </div>
                        )}
                      </div>
                    )}
                    {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
                      <div className="text-sm text-red-600">
                        Motivo: {withdrawal.rejectionReason}
                      </div>
                    )}
                    {withdrawal.status === 'pending' && (
                      <div className="text-sm text-yellow-600">
                        Aguardando processamento
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Saques;