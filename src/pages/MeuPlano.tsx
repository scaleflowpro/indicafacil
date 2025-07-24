import React, { useState } from 'react';
import { useEffect } from 'react';
import { Target, TrendingUp, Calendar, Edit3, Save, X, Plus, Trophy, DollarSign, Users, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  type: 'referrals' | 'earnings' | 'credits';
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

const MeuPlano: React.FC = () => {
  const { user } = useAuth();
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetValue: '',
    deadline: '',
    type: 'referrals' as const
  });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real goals data
  useEffect(() => {
    if (user?.id) {
      loadGoalsData();
    }
  }, [user?.id]);

  const loadGoalsData = async () => {
    try {
      setIsLoading(true);
      
      const { data: goalsData, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        return;
      }

      // Calculate current values based on real data
      const goalsWithCurrentValues = await Promise.all(
        (goalsData || []).map(async (goal) => {
          let currentValue = 0;

          if (goal.target_type === 'referrals') {
            // Count active referrals
            const { count } = await supabase
              .from('referrals')
              .select('*', { count: 'exact', head: true })
              .eq('referrer_id', user.id)
              .eq('status', 'active');
            currentValue = count || 0;
          } else if (goal.target_type === 'earnings') {
            // Sum completed transactions (commission + bonus)
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .in('type', ['commission', 'bonus'])
              .eq('status', 'completed')
              .gte('created_at', goal.created_at);
            
            currentValue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
          } else if (goal.target_type === 'credits') {
            // Use current credits from user profile
            currentValue = user?.credits || 0;
          }

          return {
            id: goal.id,
            title: goal.title,
            description: goal.description || '',
            targetValue: goal.target_value,
            currentValue: currentValue,
            deadline: goal.deadline,
            type: goal.target_type as 'referrals' | 'earnings' | 'credits',
            status: goal.status as 'active' | 'completed' | 'paused',
            createdAt: goal.created_at
          };
        })
      );

      setGoals(goalsWithCurrentValues);
    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'referrals':
        return <Users className="w-5 h-5" />;
      case 'earnings':
        return <DollarSign className="w-5 h-5" />;
      case 'credits':
        return <Zap className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'referrals':
        return 'text-blue-600 bg-blue-100';
      case 'earnings':
        return 'text-green-600 bg-green-100';
      case 'credits':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'active':
        return 'Ativa';
      case 'paused':
        return 'Pausada';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'referrals':
        return 'Indicações';
      case 'earnings':
        return 'Ganhos';
      case 'credits':
        return 'Créditos';
      default:
        return type;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleNewGoal = () => {
    if (!newGoal.title || !newGoal.targetValue || !newGoal.deadline) return;

    const createGoal = async () => {
      try {
        const { data: goalData, error } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: newGoal.title,
            description: newGoal.description,
            target_value: parseInt(newGoal.targetValue),
            target_type: newGoal.type,
            deadline: newGoal.deadline,
            status: 'active'
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Reload goals to get updated data
        await loadGoalsData();
        
        setNewGoal({
          title: '',
          description: '',
          targetValue: '',
          deadline: '',
          type: 'referrals'
        });
        setShowNewGoalForm(false);
        
      } catch (error) {
        console.error('Error creating goal:', error);
        alert('Erro ao criar meta. Tente novamente.');
      }
    };

    createGoal();
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadGoalsData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Erro ao excluir meta. Tente novamente.');
    }
  };

  const handleToggleGoalStatus = async (goalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      
      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadGoalsData();
    } catch (error) {
      console.error('Error updating goal status:', error);
      alert('Erro ao atualizar status da meta. Tente novamente.');
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: 'completed' })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadGoalsData();
    } catch (error) {
      console.error('Error completing goal:', error);
      alert('Erro ao marcar meta como concluída. Tente novamente.');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  // Calculate overall statistics
  const totalGoals = goals.length;
  const completedCount = completedGoals.length;
  const completionRate = totalGoals > 0 ? (completedCount / totalGoals) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Plano</h1>
          <p className="text-gray-600">
            Defina suas metas e acompanhe seu progresso no IndicaFácil
          </p>
        </div>
        
        <Button onClick={() => setShowNewGoalForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{totalGoals}</div>
          <div className="text-sm text-gray-600">Total de Metas</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-gray-600">Metas Concluídas</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{activeGoals.length}</div>
          <div className="text-sm text-gray-600">Metas Ativas</div>
        </Card>
        
        <Card className="text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{completionRate.toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Taxa de Sucesso</div>
        </Card>
      </div>

      {/* New Goal Form */}
      {showNewGoalForm && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Nova Meta</h2>
            <button
              onClick={() => setShowNewGoalForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Título da Meta"
                placeholder="Ex: Conseguir 20 indicações este mês"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2">
              <Input
                label="Descrição (opcional)"
                placeholder="Descreva sua meta em detalhes"
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta</label>
              <select
                value={newGoal.type}
                onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="referrals">Indicações</option>
                <option value="earnings">Ganhos (R$)</option>
                <option value="credits">Créditos</option>
              </select>
            </div>
            
            <div>
              <Input
                type="number"
                label="Valor Alvo"
                placeholder="Ex: 20"
                value={newGoal.targetValue}
                onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2">
              <Input
                type="date"
                label="Prazo"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewGoalForm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleNewGoal} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Criar Meta
            </Button>
          </div>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Metas Ativas</h2>
          {isLoading ? (
            <Card className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando metas...</p>
            </Card>
          ) : (
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue);
              const daysRemaining = getDaysRemaining(goal.deadline);
              
              return (
                <Card key={goal.id}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getGoalColor(goal.type)}`}>
                        {getGoalIcon(goal.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {getStatusText(goal.status)}
                          </span>
                        </div>
                        
                        {goal.description && (
                          <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progresso</span>
                            <span className="font-medium">
                              {goal.currentValue} / {goal.targetValue} {getTypeText(goal.type).toLowerCase()}
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{progress.toFixed(0)}% concluído</span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Prazo vencido'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {progress === 100 && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleCompleteGoal(goal.id)}
                          >
                            🎉 Marcar como Concluída
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleGoalStatus(goal.id, goal.status)}
                      >
                        {goal.status === 'active' ? 'Pausar' : 'Ativar'}
                      </Button>
                      
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta meta?')) {
                            handleDeleteGoal(goal.id);
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Metas Concluídas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="bg-green-50 border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    <div className="text-sm text-gray-600">
                      {goal.currentValue} {getTypeText(goal.type).toLowerCase()} • Concluída em {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <div className="text-green-600 text-2xl">🏆</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && goals.length === 0 && (
        <Card className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Defina suas primeiras metas
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Crie metas personalizadas para acompanhar seu progresso e alcançar seus objetivos no IndicaFácil
          </p>
          <Button onClick={() => setShowNewGoalForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Meta
          </Button>
        </Card>
      )}

      {/* Tips Section */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">💡 Dicas para o Sucesso</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Defina metas realistas e alcançáveis</li>
              <li>• Acompanhe seu progresso regularmente</li>
              <li>• Celebre cada conquista, por menor que seja</li>
              <li>• Ajuste suas metas conforme necessário</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MeuPlano;