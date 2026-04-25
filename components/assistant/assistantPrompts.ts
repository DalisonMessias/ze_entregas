import { DailySummary, DailyTransaction, UserRole } from '../../types';
import { getPermittedTabsForRole, getRoleLabel } from '../../utils/accessControl';
import { CollaboratorFunction } from './assistantResourcesData';

export interface AssistantStoreInsights {
  productsTotal: number;
  productsActive: number;
  productsInactive: number;
  addonGroupsTotal: number;
  topProducts: Array<{ name: string; price: number; stock: number | null }>;
  internalOrdersRecent: number;
  internalOrdersPending: number;
  lowSalesProducts?: Array<{ product_id: string | null; name: string; quantity: number; revenue: number }>;
  salesWindowDays?: number;
  report?: {
    totalRequests: number;
    totalValue: number;
    completedCount: number;
    cancelledCount: number;
    failedCount: number;
    peakHours: Array<{ hour: number; count: number }>;
  } | null;
  financial?: {
    corporateBalance: number;
    recentTransactions: Array<{ type: string; amount: number; created_at?: string; description?: string }>;
  } | null;
}

export const getBusinessStatus = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const isWeekDay = day >= 1 && day <= 5;
  const isWorkingHours = hour >= 9 && hour < 18;

  const isOpen = isWeekDay && isWorkingHours;

  return {
    isOpen,
    currentTime: now.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
    nextOpen: 'Segunda a Sexta, das 09h às 18h'
  };
};

export const getPromptLibrary = (role: UserRole) => {
  if (role === 'admin') {
    return {
      plataforma: [
        'Resumo da saúde do sistema agora.',
        'Quais lojas estão com mais problemas técnicos?',
        'Status dos serviços externos (Gemini, Groq, etc).'
      ],
      financeiro: [
        'Total movimentado na rede hoje.',
        'Volume de depósitos pendentes.',
        'Top 10 lojas por faturamento hoje.'
      ],
      seguranca: [
        'Alertas de segurança e fraude recentes.',
        'Lojas sinalizadas por comportamento atípico.',
        'Log de ações administrativas críticas.'
      ]
    };
  }

  if (role === 'store_partner' || role === 'collaborator') {
    return {
      operacional: [
        'Resuma pedidos pendentes e tempos de preparo.',
        'Mostre prioridades do turno com foco em atrasos.',
        'Liste alertas críticos do dia.'
      ],
      catalogo: [
        'Quais produtos estão com baixa saída esta semana?',
        'Sugira melhorias de descrição para meus produtos.',
        'Indique ajustes de preço para itens estratégicos.'
      ],
      marketing: [
        'Crie uma promoção rápida para aumentar pedidos.',
        'Sugira um combo com maior margem.',
        'Gere um texto curto para divulgar no WhatsApp.'
      ]
    };
  }

  if (role === 'delivery_partner' || role === 'delivery_person') {
    return {
      ganhos: [
        'Resumo de ganhos da última semana.',
        'Minha posição no ranking de entregadores.',
        'Dicas para aumentar meus ganhos mensais.'
      ],
      logistica: [
        'Quais regiões estão com maior demanda agora?',
        'Como otimizar meu tempo entre coletas?',
        'Status das taxas de entrega na minha cidade.'
      ]
    };
  }

  return {
    ajuda: [
      'Onde está o meu pedido atual?',
      'Como cancelar um pedido em andamento?',
      'Como aplicar meu cupom de desconto?'
    ],
    suporte: [
      'Problema com o pagamento do pedido.',
      'Minha comida veio errada, o que fazer?',
      'Como falar com o suporte humano?'
    ]
  };
};

export const getQuickSuggestions = (
  role: UserRole,
  collaboratorFunction?: CollaboratorFunction | null
) => {
  if (role === 'admin') {
    return [
      { label: 'Saúde do sistema', text: 'Me dê um resumo da saúde da plataforma hoje.' },
      { label: 'Alertas críticos', text: 'Quais alertas críticos exigem ação imediata?' },
      { label: 'Visão financeira', text: 'Quais são os destaques financeiros do dia?' }
    ];
  }

  if (role === 'store_partner') {
    return [
      { label: 'Pedidos em risco', text: 'Liste pedidos com risco de atraso e ações recomendadas.' },
      { label: 'Meta do dia', text: 'Qual o status da meta de hoje e o que posso fazer agora?' },
      { label: 'Promoção rápida', text: 'Sugira uma promoção rápida para aumentar pedidos hoje.' }
    ];
  }

  if (role === 'collaborator') {
    if (collaboratorFunction === 'kitchen') {
      return [
        { label: 'Prioridades', text: 'Quais pedidos devo priorizar agora na cozinha?' },
        { label: 'Itens em falta', text: 'Como devo comunicar itens em falta ao time?' },
        { label: 'Organização', text: 'Sugira uma sequência de preparo para reduzir atrasos.' }
      ];
    }
    return [
      { label: 'Scripts rápidos', text: 'Me dê um script curto para atraso de pedido.' },
      { label: 'Dúvidas comuns', text: 'Responda dúvidas comuns de clientes hoje.' },
      { label: 'Checklist do turno', text: 'Monte um checklist rápido para o início do turno.' }
    ];
  }

  if (role === 'delivery_partner' || role === 'delivery_person') {
    return [
      { label: 'Ganhos do dia', text: 'Qual meu resumo de ganhos e entregas hoje?' },
      { label: 'Rotas', text: 'Sugira rotas para reduzir tempo e combustível.' },
      { label: 'Avaliação', text: 'O que posso fazer para melhorar minha avaliação?' }
    ];
  }

  return [
    { label: 'Status do pedido', text: 'Qual o status do meu pedido mais recente?' },
    { label: 'Pagamento', text: 'Como resolver um problema de pagamento?' },
    { label: 'Entrega', text: 'Meu pedido está atrasado, o que devo fazer?' }
  ];
};

interface SystemPromptContext {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  walletBalance: number;
  userCity: string;
  userLocation: { lat: number; lng: number } | null;
  storeName?: string | null;
  storeCity?: string | null;
  route: string;
  collaboratorFunction?: CollaboratorFunction | null;
  storeInsights?: AssistantStoreInsights | null;
}

export const buildSystemPrompt = (context: SystemPromptContext) => {
  const { isOpen, currentTime, nextOpen } = getBusinessStatus();

  const locationContext = context.userLocation
    ? `[COORDENADAS GPS ATUAIS: ${context.userLocation.lat}, ${context.userLocation.lng}]`
    : '[COORDENADAS GPS ATUAIS: INDISPONÍVEL/OFFLINE]';

  const businessRule = isOpen
    ? `[STATUS ATENDIMENTO: ABERTO]
- O suporte humano está disponível agora.
- Se o problema for complexo, oriente a aba "Suporte".`
    : `[STATUS ATENDIMENTO: FECHADO]
- Horário atual: ${currentTime}.
- Reabertura: ${nextOpen}.
- Resolva de forma autônoma e objetiva.`;

  const permissions = getPermittedTabsForRole(context.userRole).join(', ');
  const roleLabel = getRoleLabel(context.userRole);

  const shopContext = context.storeName || context.storeCity
    ? `
LOJA/UNIDADE:
- Nome: ${context.storeName || 'Não informado'}
- Cidade: ${context.storeCity || 'Não informada'}
`
    : '';

  const collaboratorContext = context.collaboratorFunction
    ? `
FUNÇÃO DO COLABORADOR: ${context.collaboratorFunction === 'kitchen' ? 'Cozinha' : 'Atendimento'}
`
    : '';

  const storeInsightsContext = context.userRole === 'store_partner' && context.storeInsights
    ? `
CONTEXTO OPERACIONAL DA LOJA (USUÁRIO LOGADO):
- Produtos totais: ${context.storeInsights.productsTotal}
- Produtos ativos: ${context.storeInsights.productsActive}
- Produtos inativos: ${context.storeInsights.productsInactive}
- Grupos de adicionais/derivados: ${context.storeInsights.addonGroupsTotal}
- Pedidos internos recentes: ${context.storeInsights.internalOrdersRecent}
- Pedidos internos pendentes: ${context.storeInsights.internalOrdersPending}
- Top produtos (amostra): ${context.storeInsights.topProducts.map(item => `${item.name} (R$ ${item.price.toFixed(2)})`).join(', ') || 'Sem dados'}
- Saldo corporativo (ZePay): R$ ${(context.storeInsights.financial?.corporateBalance || 0).toFixed(2)}
`
    : '';

  return `Você é o Zé, assistente virtual do app Zé Entregas.

CONTEXTO DA PÁGINA:
- Rota atual: ${context.route}
- Objetivo da página: central de suporte, operação e decisões rápidas.

CONTEXTO DO USUÁRIO:
- Nome: ${context.userName}
- Email: ${context.userEmail}
- Perfil: ${roleLabel}
- Função no app: ${context.userRole}
- Cidade principal: ${context.userCity}
- Saldo (quando aplicável): R$ ${context.walletBalance.toFixed(2)}
- Permissões relevantes: ${permissions}
- ${locationContext}
${collaboratorContext}${shopContext}${storeInsightsContext}
${businessRule}

DIRETRIZES:
- Identifique a intenção do usuário e confirme brevemente o objetivo antes de detalhar.
- Responda de forma curta e objetiva por padrão (mobile-first).
- Quando necessário, adicione detalhes em um bloco separado.
- Se usar dados estruturados, prefira JSON puro ou bloco \`\`\`json\`\`\`.
- Nunca misture dados de outro usuário/loja.
- Se o perfil for lojista, priorize respostas com foco em catálogo, pedidos, financeiro e operação da loja logada.
- Se houver dados de baixa saída disponíveis, responda com eles antes de pedir relatórios extras.

FORMATO PADRÃO:
RESUMO: (1 a 3 frases)
DETALHES: (opcional, só se necessário)
`;
};

interface UserPromptContext {
  dailySummary: DailySummary;
  transactions: DailyTransaction[];
  userInput: string;
  userRole: UserRole;
  storeInsights?: AssistantStoreInsights | null;
}

export const buildUserPrompt = ({
  dailySummary,
  transactions,
  userInput,
  userRole,
  storeInsights
}: UserPromptContext) => {
  const recentTransactions = transactions.slice(-5);
  const salesWindowLabel = storeInsights?.salesWindowDays
    ? `${storeInsights.salesWindowDays} dias`
    : 'últimos 7 dias';
  const storeBlock = userRole === 'store_partner' && storeInsights
    ? `
DADOS REAIS DO LOJISTA (LOJA LOGADA):
- Produtos: ${storeInsights.productsTotal} (ativos: ${storeInsights.productsActive}, inativos: ${storeInsights.productsInactive})
- Adicionais/derivados: ${storeInsights.addonGroupsTotal} grupos
- Pedidos internos pendentes: ${storeInsights.internalOrdersPending}
- Pedidos internos recentes: ${storeInsights.internalOrdersRecent}
- Relatório rápido: ${storeInsights.report
        ? `requisições=${storeInsights.report.totalRequests}, valor=${storeInsights.report.totalValue}, concluídos=${storeInsights.report.completedCount}, cancelados=${storeInsights.report.cancelledCount}`
        : 'indisponível'}
- Financeiro ZePay: saldo corporativo R$ ${(storeInsights.financial?.corporateBalance || 0).toFixed(2)}
${storeInsights.lowSalesProducts && storeInsights.lowSalesProducts.length > 0
        ? `- Baixa saída (${salesWindowLabel}): ${storeInsights.lowSalesProducts
          .map(item => `${item.name} (qtd ${item.quantity}, R$ ${item.revenue.toFixed(2)})`)
          .join('; ')}`
        : ''}
`
    : '';

  return `DADOS DO DIA:
- Lucro: R$ ${dailySummary.profit.toFixed(2)}
- Entregas: ${dailySummary.deliveryCount}
- KM rodados: ${dailySummary.km.toFixed(1)}
- Meta diária: ${dailySummary.goal ? `R$ ${dailySummary.goal.toFixed(2)}` : 'Não definida'}
- Últimas transações: ${JSON.stringify(recentTransactions)}
${storeBlock}

PERGUNTA DO USUÁRIO:
${userInput}

Lembrete: mantenha o padrão RESUMO/DETALHES e seja direto.`;
};
