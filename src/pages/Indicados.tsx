import React, { useState } from 'react';
import { useEffect } from 'react';
import { Search, Filter, Download, User, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Indicados: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real referrals data
  useEffect(() => {
    if (user?.id) {
      loadReferralsData();
    }
  }, [user?.id]);

  const loadReferralsData = async () => {
    try {
      setIsLoading(true);
      
      // Get referrals with referred user details
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          commission_paid,
          commission_date,
          created_at,
          profiles!referrals_referred_id_fkey (
            id,
            name,
            phone,
            created_at
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        return;
      }

      // Get auth users to get emails
      const userIds = referralsData?.map(r => r.profiles?.id).filter(Boolean) || [];
      
      let authUsers: any[] = [];
      if (userIds.length > 0) {
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
          if (!authError && authData) {
            authUsers = authData.users.filter(u => userIds.includes(u.id));
          }
        } catch (error) {
          console.error('Error fetching auth users:', error);
        }
      }

      // Get recharge counts and bonus amounts for each referred user
      const referralsWithDetails = await Promise.all(
        (referralsData || []).map(async (referral) => {
          const referredUserId = referral.profiles?.id;
          const authUser = authUsers.find(u => u.id === referredUserId);
          
          // Get recharge count
          const { count: rechargeCount } = await supabase
            .from('pix_payments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', referredUserId)
            .eq('status', 'paid');

          // Get total bonus from this referral
          const { data: bonusTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'bonus')
            .eq('status', 'completed')
            .like('description', `%${referral.profiles?.name || ''}%`);

          const totalBonus = bonusTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          return {
            id: referral.id,
            name: referral.profiles?.name || 'Nome não disponível',
            email: authUser?.email || 'Email não disponível',
            phone: referral.profiles?.phone || 'Telefone não disponível',
            status: referral.status,
            commission: referral.commission_paid || 0,
            registrationDate: referral.created_at,
            activationDate: referral.commission_date,
            totalRecharges: rechargeCount || 0,
            residualBonus: totalBonus
          };
        })
      );

      setReferrals(referralsWithDetails);
    } catch (error) {
      console.error('Error loading referrals data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'pending':
        return 'Pendente';
      case 'inactive':
        return 'Inativo';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = referral.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCommissions = referrals
    .filter(r => r.commission > 0)
    .reduce((sum, r) => sum + r.commission, 0);

  const totalBonus = referrals.reduce((sum, r) => sum + r.residualBonus, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Indicados</h1>
        <p className="text-gray-600">
          Acompanhe todos os seus indicados e seus respectivos ganhos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {isLoading ? '...' : referrals.length}
          </div>
          <div className="text-sm text-gray-600">Total de Indicados</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : referrals.filter(r => r.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Indicados Ativos</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            R$ {isLoading ? '...' : totalCommissions.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Comissões</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            R$ {isLoading ? '...' : totalBonus.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Bônus</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
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
              <option value="pending">Pendentes</option>
              <option value="inactive">Inativos</option>
            </select>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      {/* Referrals List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando indicados...</p>
          </Card>
        ) : filteredReferrals.length === 0 ? (
          <Card className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum indicado encontrado
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Você ainda não tem indicados. Comece compartilhando seu link!'
              }
            </p>
          </Card>
        ) : (
          filteredReferrals.map((referral) => (
            <Card key={referral.id}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{referral.name}</h3>
                    <div className="text-sm text-gray-600">
                      <div>{referral.email}</div>
                      <div>{referral.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                      {getStatusIcon(referral.status)}
                      <span>{getStatusText(referral.status)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Cadastro</div>
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(referral.registrationDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Comissão</div>
                    <div className="text-sm font-bold text-green-600">
                      R$ {referral.commission.toFixed(2)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bônus Total</div>
                    <div className="text-sm font-bold text-purple-600">
                      R$ {referral.residualBonus.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {referral.totalRecharges > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    💰 {referral.totalRecharges} recarga{referral.totalRecharges > 1 ? 's' : ''} realizada{referral.totalRecharges > 1 ? 's' : ''}
                    {referral.residualBonus > 0 && ` • Bônus residual: R$ ${referral.residualBonus.toFixed(2)}`}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Indicados;