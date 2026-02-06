import { DailySummary, DailyTransaction, ShopSettings, UserRole } from '../../types';
import { getPermittedTabsForRole, getRoleLabel } from '../../utils/accessControl';
import { CollaboratorFunction } from './assistantResources';

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

export const promptLibrary = {
  operacional: [
    'Resuma pedidos pendentes e tempos médios de preparo.',
    'Mostre prioridades do turno com foco em atrasos.',
    'Liste alertas críticos do dia.'
  ],
  catalogo: [
    'Quais produtos estão com baixa saída esta semana?',
    'Sugira melhorias de descrição para meus top 5 itens.',
    'Indique ajustes de preço para itens estratégicos.'
  ],
  marketing: [
    'Crie uma promoção rápida para aumentar pedidos hoje.',
    'Sugira um combo com maior margem.',
    'Gere um texto curto para divulgar no WhatsApp.'
  ],
  suporte: [
    'Explique o erro mais comum e como resolver.',
    'Dê um script rápido para atraso de entrega.',
    'Checklist para atendimento quando o cliente reclama.'
  ]
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
  shopSettings?: ShopSettings | null;
  route: string;
  collaboratorFunction?: CollaboratorFunction | null;
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

  const shopContext = context.shopSettings
    ? `
LOJA/UNIDADE:
- Nome: ${context.shopSettings.shop_name || 'Não informado'}
- Cidade: ${context.shopSettings.shop_city || 'Não informada'}
`
    : '';

  const collaboratorContext = context.collaboratorFunction
    ? `
FUNÇÃO DO COLABORADOR: ${context.collaboratorFunction === 'kitchen' ? 'Cozinha' : 'Atendimento'}
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
${collaboratorContext}${shopContext}
${businessRule}

DIRETRIZES:
- Identifique a intenção do usuário e confirme brevemente o objetivo antes de detalhar.
- Responda de forma curta e objetiva por padrão (mobile-first).
- Quando necessário, adicione detalhes em um bloco separado.
- Se usar dados estruturados, prefira JSON puro ou bloco ```json```.

FORMATO PADRÃO:
RESUMO: (1 a 3 frases)
DETALHES: (opcional, só se necessário)
`;
};

interface UserPromptContext {
  dailySummary: DailySummary;
  transactions: DailyTransaction[];
  userInput: string;
}

export const buildUserPrompt = ({ dailySummary, transactions, userInput }: UserPromptContext) => {
  const recentTransactions = transactions.slice(-5);

  return `DADOS DO DIA:
- Lucro: R$ ${dailySummary.profit.toFixed(2)}
- Entregas: ${dailySummary.deliveryCount}
- KM rodados: ${dailySummary.km.toFixed(1)}
- Meta diária: ${dailySummary.goal ? `R$ ${dailySummary.goal.toFixed(2)}` : 'Não definida'}
- Últimas transações: ${JSON.stringify(recentTransactions)}

PERGUNTA DO USUÁRIO:
${userInput}

Lembrete: mantenha o padrão RESUMO/DETALHES e seja direto.`;
};

