import { Step } from '@list-labs/react-joyride';

/*
  ================================================================================
  ARQUIVO CENTRAL DE PASSOS DO TOUR (tourSteps.ts)
  ================================================================================
  Este arquivo define os passos para os tours guiados da aplicação,
  organizados por tipo de usuário (userRole) e pela tela (activeTab).

  - A estrutura é: tourSteps[userRole][activeTab] = [array de passos].
  - 'universal' contém tours que podem ser mostrados para qualquer usuário.
  - Os seletores 'target' são cruciais. Eles devem corresponder a um ID
    único de um elemento que exista no DOM no momento em que o passo é exibido.
    Ex: target: '#id-do-botao-de-perfil'
  ================================================================================
*/

type TourSteps = {
  [role: string]: {
    [tab: string]: Step[];
  };
};

export const tourSteps: TourSteps = {
  // ======================================================
  // Universal - Para todos os usuários
  // ======================================================
  universal: {
    welcome: [
      {
        target: 'body',
        content: 'Bem-vindo(a) ao Zé Entregas! Vamos fazer um tour rápido pelas funcionalidades principais.',
        placement: 'center',
        title: 'Boas-Vindas!',
      },
      {
        // ATENÇÃO: '#header-menu-button' é um placeholder. Será adicionado ao elemento.
        target: '#header-menu-button',
        content: 'Clique aqui para abrir o menu principal e navegar por todas as seções do aplicativo.',
        title: 'Menu Principal',
      },
      {
        // ATENÇÃO: '#header-notifications-bell' é um placeholder.
        target: '#header-notifications-bell',
        content: 'Fique de olho nas suas notificações para não perder nenhuma atualização importante.',
        title: 'Central de Notificações',
      },
      {
        // ATENÇÃO: '#header-emergency-button' é um placeholder.
        target: '#header-emergency-button',
        content: 'Em caso de emergências, use este botão para um contato rápido.',
        title: 'Botão de Emergência',
      },
    ],
  },

  // ======================================================
  // Lojista (store_partner)
  // ======================================================
  store_partner: {
    wallet: [
      {
        target: 'body',
        placement: 'center',
        content: 'Este é o seu Painel Financeiro, onde você pode gerenciar suas solicitações e finanças.',
        title: 'Painel da Loja',
      },
      {
        // ATENÇÃO: '#wallet-new-delivery-button' é um placeholder.
        target: '#wallet-new-delivery-button',
        content: 'Use este botão para iniciar uma nova solicitação de entrega de forma rápida.',
        title: 'Nova Entrega',
      },
      {
        // ATENÇÃO: '#wallet-balance-card' é um placeholder.
        target: '#wallet-balance-card',
        content: 'Aqui você acompanha o saldo atual da sua carteira Zé Pay.',
        title: 'Saldo Zé Pay',
      },
    ],
    new_request: [
      {
        target: 'body',
        placement: 'center',
        content: 'Esta é a tela para solicitar uma nova entrega. Preencha os campos para calcular o valor e confirmar.',
        title: 'Solicitar Entrega',
      },
      // Adicionar mais passos específicos para os campos do formulário
    ],
  },

  // ======================================================
  // Entregador Parceiro (delivery_partner)
  // ======================================================
  delivery_partner: {
    daily_panel: [
      {
        target: 'body',
        placement: 'center',
        content: 'Este é o seu Painel Diário, sua central de operações para as entregas do dia.',
        title: 'Painel do Entregador',
      },
      {
        // ATENÇÃO: '#daily-panel-status-toggle' é um placeholder.
        target: '#daily-panel-status-toggle',
        content: 'Ative para ficar online e receber novas solicitações de corrida. Desative para fazer uma pausa.',
        title: 'Status Online/Offline',
      },
       {
        // ATENÇÃO: '#daily-panel-goal-card' é um placeholder.
        target: '#daily-panel-goal-card',
        content: 'Acompanhe seu progresso em relação à sua meta diária de ganhos.',
        title: 'Meta de Ganhos',
      },
    ],
  },

  // ======================================================
  // Admin
  // ======================================================
  admin: {
    admin_dashboard: [
      {
        target: 'body',
        placement: 'center',
        content: 'Bem-vindo ao Dashboard de Admin. Aqui você tem uma visão geral de toda a plataforma.',
        title: 'Dashboard BI',
      },
      {
        // ATENÇÃO: '#admin-user-management-link' é um placeholder.
        target: '#admin-user-management-link',
        content: 'Gerencie todos os usuários, validações e níveis de parceiro nesta seção.',
        title: 'Gestão de Usuários',
      },
    ],
  },
};
