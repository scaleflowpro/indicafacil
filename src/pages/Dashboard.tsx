import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, TrendingUp, Users, CreditCard, DollarSign, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const getReferralLink = () => {
    if (!user?.referralCode) return '';
    
    // Use the actual domain in production
    const baseUrl = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://indicafacil.online';
    
    return `${baseUrl}/r/${user.referralCode}`;
  };
  
  const referralLink = getReferralLink();

  // Redirect admin users to admin panel
  if (user?.role === 'admin') {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">
              🛡️ Painel Administrativo
            </h1>
            <p className="text-purple-100 text-lg mb-6">
              Bem-vindo ao sistema de administração do IndicaFácil
            </p>
            <Link to="/admin">
              <Button variant="secondary" size="lg" className="bg-white text-purple-600 hover:bg-gray-50">
                Acessar Painel Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const copyReferralLink = () => {
    if (!referralLink) {
      alert('Link de indicação não disponível');
      return;
    }
    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareReferralLink = () => {
    if (!referralLink) {
      alert('Link de indicação não disponível');
      return;
    }
    
    const shareText = `🚀 Junte-se ao IndicaFácil e comece a gerar renda com indicações!\n\n💰 R$ 30 por cada indicação\n🎁 15% de bônus residual\n⚡ Sistema automatizado\n\nCadastre-se pelo meu link: ${referralLink}`;
    
    if (navigator.share) {
      // Use native share API if available (mobile)
      navigator.share({
        title: 'IndicaFácil - Plataforma de Indicações',
        text: shareText,
        url: referralLink
      }).catch(err => {
        console.log('Error sharing:', err);
        fallbackShare();
      });
    } else {
      fallbackShare();
    }
  };
  
  const fallbackShare = () => {
    const shareText = `🚀 Junte-se ao IndicaFácil e comece a gerar renda com indicações!\n\n💰 R$ 30 por cada indicação\n🎁 15% de bônus residual\n⚡ Sistema automatizado\n\nCadastre-se pelo meu link: ${referralLink}`;
    
    // Copy to clipboard as fallback
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Texto de compartilhamento copiado! Cole em suas redes sociais.');
    }).catch(() => {
      // Final fallback - show text in alert
      alert(`Compartilhe este texto:\n\n${shareText}`);
    });
  };
  // Load real data
  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get recent referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          commission_paid,
          created_at,
          profiles!referrals_referred_id_fkey (
            name
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
      } else {
        const formattedReferrals = referralsData?.map(ref => ({
          name: ref.profiles?.name || 'Nome não disponível',
          status: ref.status,
          date: ref.created_at,
          commission: ref.commission_paid || 0
        })) || [];
        setRecentReferrals(formattedReferrals);
      }

      // Get monthly earnings
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .in('type', ['commission', 'bonus'])
        .eq('status', 'completed')
        .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      } else {
        const monthlyTotal = transactionsData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        setMonthlyEarnings(monthlyTotal);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      title: 'Saldo Disponível',
      value: `R$ ${user?.balance?.toFixed(2)}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Total de Indicados',
      value: user?.totalReferrals,
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Créditos Restantes',
      value: user?.credits,
      icon: <CreditCard className="w-6 h-6" />,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      title: 'Ganho Mensal',
      value: `R$ ${monthlyEarnings.toFixed(2)}`,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Você tem {user?.credits} créditos disponíveis para suas indicações
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-right">
              <div className="text-sm text-blue-200">Saldo total</div>
              <div className="text-3xl font-bold">R$ {user?.balance?.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="text-center">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
              <div className={stat.color}>
                {stat.icon}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Referral Link Section */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Seu Link de Indicação</h2>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 text-sm text-gray-600 break-all">
              {referralLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralLink}
              className="flex-shrink-0"
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={copyReferralLink} className="flex-1">
            {linkCopied ? 'Link Copiado!' : 'Copiar Link'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={shareReferralLink}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>

        {user?.credits === 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <div className="text-yellow-600">⚠️</div>
              <div>
                <p className="text-yellow-800 font-medium">Créditos esgotados</p>
                <p className="text-yellow-700 text-sm">
                  Recarregue seus créditos para continuar fazendo indicações.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Referrals */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Indicações Recentes</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} onClick={loadDashboardData} />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReferrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma indicação ainda
                  </h3>
                  <p className="text-gray-600">
                    Compartilhe seu link para começar a ganhar!
                  </p>
                </div>
              ) : (
                recentReferrals.map((referral, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h3 className="font-medium text-gray-900">{referral.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(referral.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium mb-1 ${
                        referral.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.status === 'active' ? 'Ativo' : 'Pendente'}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {referral.commission > 0 ? `R$ ${referral.commission.toFixed(2)}` : '-'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link to="/recarga">
              <Button fullWidth variant="success" className="justify-start text-left h-14">
                <DollarSign className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-semibold">Recarregar Créditos</div>
                  <div className="text-sm opacity-90">Adicione mais créditos para indicar</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/indicados">
              <Button fullWidth variant="outline" className="justify-start text-left h-14">
                <Users className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-semibold">Ver Todos os Indicados</div>
                  <div className="text-sm text-gray-500">Acompanhe sua rede completa</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/historico">
              <Button fullWidth variant="outline" className="justify-start text-left h-14">
                <TrendingUp className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-semibold">Histórico Completo</div>
                  <div className="text-sm text-gray-500">Veja todos seus ganhos</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/saques">
              <Button fullWidth variant="outline" className="justify-start text-left h-14">
                <DollarSign className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-semibold">Solicitar Saque</div>
                  <div className="text-sm text-gray-500">Retire seus ganhos via Pix</div>
                </div>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;