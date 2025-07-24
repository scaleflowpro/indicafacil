import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, DollarSign, Zap, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'R$ 30 por Indicação',
      description: 'Ganhe comissão fixa a cada novo usuário que se cadastrar através do seu link'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Bônus Residual',
      description: '15% de bônus em todas as recargas dos seus indicados'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Sistema Automatizado',
      description: 'Controle total com dashboard em tempo real e pagamentos automáticos'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Seguro e Confiável',
      description: 'Plataforma segura com controle de créditos e transparência total'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">IF</span>
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">IndicaFácil</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Entrar
              </Link>
              <Link to="/cadastro">
                <Button>Cadastrar-se</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Transforme suas
            <span className="text-blue-600"> Indicações</span> em
            <span className="text-green-600"> Renda</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Plataforma completa para gerar renda através de indicações. 
            Sistema automatizado com controle de créditos e comissões em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/cadastro">
              <Button size="lg" className="px-10">
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-10">
                Já tenho conta
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">30</div>
              <div className="text-gray-600">Créditos Iniciais</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">R$ 30</div>
              <div className="text-gray-600">Por Indicação</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">15%</div>
              <div className="text-gray-600">Bônus Residual</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Um sistema simples e transparente para maximizar seus ganhos com indicações
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:scale-105 transition-transform">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-600">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para Começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de pessoas que já estão gerando renda com o IndicaFácil
          </p>
          <Link to="/cadastro">
            <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-50 px-10">
              Cadastrar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">IF</span>
            </div>
            <span className="ml-3 text-2xl font-bold">IndicaFácil</span>
          </div>
          <p className="text-gray-400 mb-4">
            Transformando indicações em renda de forma simples e segura
          </p>
          <div className="text-sm text-gray-500">
            © 2024 IndicaFácil. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;