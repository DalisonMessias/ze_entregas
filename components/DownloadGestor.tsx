import React from 'react';
import { Download, Laptop, CheckCircle, Bell, ArrowRight, ShieldCheck, Sparkles, Zap, Globe } from 'lucide-react';
import { ActiveTab } from '../types/navigation';

interface DownloadGestorProps {
  onNavigate?: (tab: ActiveTab) => void;
}

export const DownloadGestor: React.FC<DownloadGestorProps> = ({ onNavigate }) => {
  const handleDownload = () => {
    // Aponta diretamente para o executável que o lojista colocará na pasta public
    window.location.href = '/Instalar_Gestor_ZeEntregas.exe';
  };

  const handleUseWebVersion = () => {
    if (onNavigate) {
      // Redireciona o lojista para a aba operacional dedicada do Gestor Web
      onNavigate('store_gestor');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm animate-pulse flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> CANAL DE ATENDIMENTO
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Gestor de Pedidos Zé Entregas
        </h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-3xl">
          Escolha como deseja gerenciar a sua operação hoje. Utilize o aplicativo nativo instalado no seu computador para foco total ou acesse diretamente pelo navegador web.
        </p>
      </div>

      {/* Grid das Duas Opções */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Opção 1: Versão Desktop (Dedicada) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 flex flex-col justify-between hover:border-amber-300/50 dark:hover:border-amber-700/50 transition-all duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  <Laptop className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-md">
                    Instalável
                  </span>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    Aplicativo Desktop (EXE)
                  </h2>
                </div>
              </div>
              <span className="hidden sm:inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                RECOMENDADO
              </span>
            </div>

            {/* Benefícios Desktop */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Notificação Sonora Contínua</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Sons intermitentes e persistentes de campainha para novos pedidos, mesmo minimizado.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Janela Dedicada & Focada</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Interface otimizada e limpa sem abas de navegação para evitar erros e distrações na cozinha.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Inicialização com o Windows</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Abre automaticamente ao ligar o computador. Atalho exclusivo adicionado à Área de Trabalho.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-150/10 mt-6 space-y-3">
            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <Download className="w-4.5 h-4.5" /> Baixar Instalador Windows (.exe)
            </button>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Windows 10 / 11 • Tamanho leve ~1MB
            </p>
          </div>
        </div>

        {/* Opção 2: Versão Web (Rápida) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 flex flex-col justify-between hover:border-emerald-300/50 dark:hover:border-emerald-700/50 transition-all duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <Globe className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded-md">
                    Instantâneo
                  </span>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    Navegador Web (Online)
                  </h2>
                </div>
              </div>
              <span className="hidden sm:inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                SEM INSTALAÇÃO
              </span>
            </div>

            {/* Benefícios Web */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Acesso com Um Clique</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Não requer instalação nem privilégios de administrador em sua máquina atual.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Multiplataforma Universal</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Acesse de qualquer computador (macOS, Linux, Windows), tablet ou celular instantaneamente.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-250 text-sm">Sempre Atualizado</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Todos os novos recursos, correções e novidades operacionais carregam no mesmo instante em que entram no ar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-150/10 mt-6 space-y-3">
            <button
              onClick={handleUseWebVersion}
              className="w-full bg-gray-900 hover:bg-gray-950 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              Acessar Versão Web Agora <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Abre instantaneamente em sua tela de pedidos ativos
            </p>
          </div>
        </div>

      </div>

      {/* Seção Explicativa e Passo a Passo da Instalação */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Passo a Passo */}
        <div className="md:col-span-8 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Passo a Passo de Instalação do EXE
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shadow-sm">
                1
              </div>
              <h5 className="font-bold text-sm text-gray-900 dark:text-white">Baixe o Executável</h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Clique no botão de download acima. O arquivo `Instalar_Gestor_ZeEntregas.exe` será baixado.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shadow-sm">
                2
              </div>
              <h5 className="font-bold text-sm text-gray-900 dark:text-white">Execute e Instale</h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Dê dois cliques no instalador. Ele configurará automaticamente o atalho na sua Área de Trabalho.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shadow-sm">
                3
              </div>
              <h5 className="font-bold text-sm text-gray-900 dark:text-white">Opere Integrado</h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Abra o atalho exclusivo do Zé Entregas criado e opere seus pedidos com som persistente na cozinha!
              </p>
            </div>
          </div>
        </div>

        {/* Card Informativo de Segurança */}
        <div className="md:col-span-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 h-fit self-center">
          <div className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">Aviso de Segurança</h5>
            <p className="text-[11px] text-amber-700/85 dark:text-amber-400/80 leading-relaxed">
              Caso o Windows SmartScreen exiba um alerta de "Fornecedor Desconhecido" na instalação do seu EXE, clique em <strong>"Mais Informações"</strong> e depois em <strong>"Executar assim mesmo"</strong> para prosseguir de forma segura.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
