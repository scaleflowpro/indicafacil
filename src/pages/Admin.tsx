import React, { useState } from 'react';
import { useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Filter,
  Download,
  Search,
  Calendar,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import {
  getAdminStats,
  getAdminUsers,
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  updateUserStatus,
  addCreditsToUser,
  addBalanceToUser,
  getRecentActivity,
  type AdminUser,
  type AdminWithdrawal,
  type AdminStats
} from '../lib/admin';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [withdrawalRequests, setWithdrawalRequests] = useState<AdminWithdrawal[]>([]);
  const [recentActivity, setRecentActivity] = useState<any>({ transactions: [], newUsers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Load data on component mount
  useEffect(() => {
    // Check if user is admin before loading data
    if (user?.role !== 'admin') {
      return;
    }
    loadAdminData();
  }, [user?.role]);

  const loadAdminData = async () => {
    if (!user || user.role !== 'admin') {
      console.error('Access denied: User is not admin');
      return;
    }

    try {
      setIsLoading(true);
      const [statsData, usersData, withdrawalsData, activityData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminWithdrawals(),
        getRecentActivity()
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setWithdrawalRequests(withdrawalsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      alert('Erro ao carregar dados do painel. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      if (!user?.id) return;
      
      await approveWithdrawal(id, user.id);
      await loadAdminData(); // Reload data
      setSelectedWithdrawal(null);
      alert('Saque aprovado com sucesso!');
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Erro ao aprovar saque. Tente novamente.');
    }
  };

  const handleRejectWithdrawal = async (id: string, reason: string) => {
    try {
      if (!user?.id) return;
      
      await rejectWithdrawal(id, user.id, reason);
      await loadAdminData(); // Reload data
      setSelectedWithdrawal(null);
      alert('Saque rejeitado e saldo reembolsado!');
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      alert('Erro ao rejeitar saque. Tente novamente.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(userId, !currentStatus);
      await loadAdminData(); // Reload data
      alert(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Erro ao atualizar status do usuário. Tente novamente.');
    }
  };

  const handleAddCredits = async () => {
    try {
      if (!selectedUserId || !creditsToAdd) {
        alert('Selecione um usuário e digite a quantidade de créditos');
        return;
      }
      
      const credits = parseInt(creditsToAdd);
      if (credits <= 0) {
        alert('Quantidade de créditos deve ser maior que zero');
        return;
      }
      
      await addCreditsToUser(selectedUserId, credits);
      await loadAdminData(); // Reload data
      setCreditsToAdd('');
      setSelectedUserId('');
      alert(`${credits} créditos adicionados com sucesso!`);
    } catch (error) {
      console.error('Error adding credits:', error);
      alert('Erro ao adicionar créditos. Tente novamente.');
    }
  };

  const handleAddBalance = async (userId: string, userName: string) => {
    try {
      const amount = prompt(`Digite o valor para adicionar ao saldo de ${userName}:\n(Use valor negativo para remover)`);
      
      if (amount === null) return; // User cancelled
      
      const numericAmount = parseFloat(amount);
      
      if (isNaN(numericAmount)) {
        alert('Por favor, digite um valor numérico válido');
        return;
      }
      
      if (numericAmount === 0) {
        alert('O valor deve ser diferente de zero');
        return;
      }
      
      // Confirm the action
      const action = numericAmount > 0 ? 'adicionar' : 'remover';
      const confirmMessage = `Confirma ${action} R$ ${Math.abs(numericAmount).toFixed(2)} ${numericAmount > 0 ? 'ao' : 'do'} saldo de ${userName}?`;
      
      if (!confirm(confirmMessage)) return;
      
      await addBalanceToUser(userId, numericAmount);
      await loadAdminData();
      
      alert(`Saldo ${numericAmount > 0 ? 'adicionado' : 'removido'} com sucesso!\nNovo valor: R$ ${Math.abs(numericAmount).toFixed(2)}`);
    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Erro ao atualizar saldo. Tente novamente.');
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
        return 'Aprovado';
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

  const filteredWithdrawals = withdrawalRequests.filter(withdrawal => {
    const matchesSearch = withdrawal.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'pending');
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const completedWithdrawals = withdrawalRequests.filter(w => w.status === 'completed');
  const totalCompletedAmount = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  const statsCards = [
    {
      title: 'Saques Pendentes',
      value: pendingWithdrawals.length,
      amount: `R$ ${totalPendingAmount.toFixed(2)}`,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
    },
    {
      title: 'Saques Aprovados',
      value: completedWithdrawals.length,
      amount: `R$ ${totalCompletedAmount.toFixed(2)}`,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      amount: `${stats.activeUsers} Ativos`,
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toFixed(2)}`,
      amount: 'Este mês',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
        <p className="text-gray-600">
          Gerencie usuários, saques e monitore a plataforma
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="text-center">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
              <div className={stat.color}>
                {stat.icon}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.amount}</p>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'withdrawals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Saques ({pendingWithdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Usuários
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdminData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </nav>
      </div>

      {/* Withdrawals Management */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          {/* Urgent Alert */}
          {pendingWithdrawals.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">
                    {pendingWithdrawals.length} saque{pendingWithdrawals.length > 1 ? 's' : ''} pendente{pendingWithdrawals.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Total de R$ {totalPendingAmount.toFixed(2)} aguardando aprovação
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <Input
                  type="text"
                  placeholder="Buscar por nome, email ou referência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-5 h-5 text-gray-400" />}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendentes</option>
                  <option value="completed">Aprovados</option>
                  <option value="rejected">Rejeitados</option>
                </select>
                
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </Card>

          {/* Withdrawals List */}
          <div className="space-y-4">
            {filteredWithdrawals.length === 0 ? (
              <Card className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum saque encontrado
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Não há solicitações de saque no momento'
                  }
                </p>
              </Card>
            ) : (
              filteredWithdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className={withdrawal.status === 'pending' ? 'border-yellow-200' : ''}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{withdrawal.user_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            {getStatusIcon(withdrawal.status)}
                            <span className="ml-1">{getStatusText(withdrawal.status)}</span>
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{withdrawal.user_email}</div>
                          <div className="flex items-center space-x-4">
                            <span>Valor: R$ {withdrawal.amount.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">
                              (Líquido: R$ {withdrawal.net_amount?.toFixed(2)})
                            </span>
                            <span>Pix: {withdrawal.pix_key}</span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(withdrawal.request_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectWithdrawal(withdrawal.id, 'Dados incorretos')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              {recentActivity.transactions.slice(0, 5).map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{transaction.description}</div>
                      <div className="text-xs text-gray-500">
                        {transaction.profiles?.name} - R$ {Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
              
              {recentActivity.newUsers.slice(0, 3).map((newUser: any, index: number) => (
                <div key={`user-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Novo usuário</div>
                      <div className="text-xs text-gray-500">{newUser.name} se cadastrou</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(newUser.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Adicionar Créditos</label>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Selecionar usuário</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.credits} créditos)
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Créditos"
                    value={creditsToAdd}
                    onChange={(e) => setCreditsToAdd(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={handleAddCredits} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Button 
                fullWidth 
                variant="outline" 
                className="justify-start"
                onClick={() => setActiveTab('users')}
              >
                <Users className="w-4 h-4 mr-3" />
                Gerenciar Usuários ({stats.totalUsers})
              </Button>
              
              <Button 
                fullWidth 
                variant="outline" 
                className="justify-start"
                onClick={() => setActiveTab('withdrawals')}
              >
                <DollarSign className="w-4 h-4 mr-3" />
                Saques Pendentes ({pendingWithdrawals.length})
              </Button>
              
              <Button fullWidth variant="outline" className="justify-start">
                <Download className="w-4 h-4 mr-3" />
                Exportar Dados
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Users Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <Input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-5 h-5 text-gray-400" />}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
                
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </Card>

          {/* Users List */}
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{user.email} • {user.phone}</div>
                        <div className="flex items-center space-x-4">
                          <span>Créditos: {user.credits}</span>
                          <span>Saldo: R$ {user.balance.toFixed(2)}</span>
                          <span>Indicações: {user.total_referrals}</span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const amount = prompt('Digite o valor para adicionar ao saldo (use valor negativo para remover):');
                        if (amount && !isNaN(parseFloat(amount))) {
                          addBalanceToUser(user.id, parseFloat(amount)).then(() => {
                            loadAdminData();
                            alert(`Saldo ${parseFloat(amount) > 0 ? 'adicionado' : 'removido'} com sucesso!`);
                          }).catch((error) => {
                            console.error('Error updating balance:', error);
                            alert('Erro ao atualizar saldo. Tente novamente.');
                          });
                        }
                      }}
                    >
                      💰 Saldo
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {user.is_active ? (
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        Desativar
                      </Button>
                    ) : (
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal Details Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Saque</h2>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">R$ {selectedWithdrawal.amount.toFixed(2)}</div>
                  <div className={`text-sm px-2 py-1 rounded-full ${getStatusColor(selectedWithdrawal.status)}`}>
                    {getStatusText(selectedWithdrawal.status)}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Usuário:</span>
                  <span className="font-medium">{selectedWithdrawal.user_name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">E-mail:</span>
                  <span className="font-medium">{selectedWithdrawal.user_email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Chave Pix:</span>
                  <span className="font-medium">{selectedWithdrawal.pix_key}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa (10%):</span>
                  <span className="font-medium text-red-600">R$ {selectedWithdrawal.fee?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor líquido:</span>
                  <span className="font-medium text-green-600">R$ {selectedWithdrawal.net_amount?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Referência:</span>
                  <span className="font-medium">#{selectedWithdrawal.reference}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Solicitado em:</span>
                  <span className="font-medium">
                    {new Date(selectedWithdrawal.request_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {selectedWithdrawal.processed_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processado em:</span>
                    <span className="font-medium">
                      {new Date(selectedWithdrawal.processed_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              {selectedWithdrawal.status === 'pending' ? (
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    onClick={() => handleRejectWithdrawal(selectedWithdrawal.id, 'Rejeitado pelo administrador')}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleApproveWithdrawal(selectedWithdrawal.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              ) : (
                <Button
                  fullWidth
                  onClick={() => setSelectedWithdrawal(null)}
                >
                  Fechar
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;