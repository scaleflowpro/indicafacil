import React, { useState } from 'react';
import { useEffect } from 'react';
import { Calendar, Filter, Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Gift, Search, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Historico: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real transaction data
  useEffect(() => {
    if (user?.id) {
      loadTransactionHistory();
    }
  }, [user?.id]);

  const loadTransactionHistory = async () => {
    try {
      setIsLoading(true);
      
      const { data: transactionData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      const formattedTransactions = transactionData?.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        referenceId: t.reference_id || t.id,
        createdAt: t.created_at,
        details: t.metadata || {}
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return <Users className="w-5 h-5" />;
      case 'bonus':
        return <Gift className="w-5 h-5" />;
      case 'recharge':
        return <CreditCard className="w-5 h-5" />;
      case 'withdrawal':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600 bg-green-100';
    } else {
      return 'text-red-600 bg-red-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'commission':
        return 'Comissão';
      case 'bonus':
        return 'Bônus';
      case 'recharge':
        return 'Recarga';
      case 'withdrawal':
        return 'Saque';
      default:
        return type;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.referenceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = transactionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Calculate statistics
  const totalIncome = transactions
    .filter(t => t.amount > 0 && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(transactions
    .filter(t => t.amount < 0 && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0));

  const totalCommissions = transactions
    .filter(t => t.type === 'commission' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBonus = transactions
    .filter(t => t.type === 'bonus' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico Financeiro</h1>
        <p className="text-gray-600">
          Acompanhe todas suas transações, comissões e movimentações
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">R$ {totalIncome.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Recebido</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">R$ {totalCommissions.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Comissões</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Gift className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">R$ {totalBonus.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Bônus</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">R$ {totalExpenses.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Gastos</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Buscar por descrição ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-5 h-5 text-gray-400" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="commission">Comissões</option>
              <option value="bonus">Bônus</option>
              <option value="recharge">Recargas</option>
              <option value="withdrawal">Saques</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluído</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todo o Período</option>
              <option value="today">Hoje</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Transactions List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando histórico...</p>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma transação encontrada
            </h3>
            <p className="text-gray-600">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Você ainda não tem transações registradas'
              }
            </p>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionColor(transaction.type, transaction.amount)}`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{transaction.description}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {getTypeText(transaction.type)}
                      </span>
                      <span className="text-gray-400">#{transaction.referenceId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}R$ {Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Detalhes da Transação</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTransactionColor(selectedTransaction.type, selectedTransaction.amount)}`}>
                  {getTransactionIcon(selectedTransaction.type)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{getTypeText(selectedTransaction.type)}</div>
                  <div className={`text-lg font-bold ${selectedTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedTransaction.amount > 0 ? '+' : ''}R$ {Math.abs(selectedTransaction.amount).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Referência:</span>
                  <span className="font-medium">#{selectedTransaction.referenceId}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                    {getStatusText(selectedTransaction.status)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Data:</span>
                  <span className="font-medium">
                    {new Date(selectedTransaction.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Descrição:</span>
                  <span className="font-medium text-right max-w-48">{selectedTransaction.description}</span>
                </div>

                {/* Additional details based on transaction type */}
                {selectedTransaction.details && Object.keys(selectedTransaction.details).length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {selectedTransaction.type === 'commission' && selectedTransaction.details.referredName && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Indicado:</span>
                          <span className="font-medium">{selectedTransaction.details.referredName}</span>
                        </div>
                        {selectedTransaction.details.referredEmail && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">E-mail:</span>
                            <span className="font-medium">{selectedTransaction.details.referredEmail}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedTransaction.type === 'bonus' && selectedTransaction.details.referredName && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Indicado:</span>
                          <span className="font-medium">{selectedTransaction.details.referredName}</span>
                        </div>
                        {selectedTransaction.details.rechargeAmount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Valor da Recarga:</span>
                            <span className="font-medium">R$ {selectedTransaction.details.rechargeAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedTransaction.details.bonusPercentage && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Percentual:</span>
                            <span className="font-medium">{selectedTransaction.details.bonusPercentage}%</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedTransaction.type === 'recharge' && selectedTransaction.details.credits && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Créditos:</span>
                          <span className="font-medium">{selectedTransaction.details.credits}</span>
                        </div>
                        {selectedTransaction.details.bonusCredits && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Créditos Bônus:</span>
                            <span className="font-medium">{selectedTransaction.details.bonusCredits}</span>
                          </div>
                        )}
                        {selectedTransaction.details.paymentMethod && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Método:</span>
                            <span className="font-medium">{selectedTransaction.details.paymentMethod}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedTransaction.type === 'withdrawal' && selectedTransaction.details.pixKey && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Chave Pix:</span>
                          <span className="font-medium">{selectedTransaction.details.pixKey}</span>
                        </div>
                        {selectedTransaction.details.withdrawalFee !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taxa:</span>
                            <span className="font-medium">R$ {selectedTransaction.details.withdrawalFee.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button
                fullWidth
                onClick={() => setSelectedTransaction(null)}
              >
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Historico;