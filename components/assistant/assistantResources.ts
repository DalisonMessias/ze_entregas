import {
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardList,
  HelpCircle,
  Lightbulb,
  MapPin,
  Megaphone,
  Package,
  Settings,
  Star,
  Truck,
  Users,
  Wallet
} from 'lucide-react';
import { UserRole } from '../../types';
import { ActiveTab } from '../../types/navigation';

export type CollaboratorFunction = 'waiter' | 'kitchen';

export interface AssistantResource {
  id: string;
  title: string;
  description: string;
  tab: ActiveTab;
  icon: typeof AlertTriangle;
  tag?: string;
  actionLabel?: string;
}

const adminResources: AssistantResource[] = [
  {
    id: 'admin-health',
    title: 'Relatórios rápidos',
    description: 'Visão geral de vendas, pedidos e saúde da plataforma.',
    tab: 'admin_dashboard',
    icon: BarChart3,
    tag: 'HOJE'
  },
  {
    id: 'admin-security',
    title: 'Alertas críticos',
    description: 'Acompanhe segurança, fraude e incidentes prioritários.',
    tab: 'admin_security',
    icon: AlertTriangle
  },
  {
    id: 'admin-finance',
    title: 'Financeiro lojas',
    description: 'Análise rápida de taxas, repasses e receita.',
    tab: 'admin_store_finance',
    icon: Wallet
  },
  {
    id: 'admin-ai',
    title: 'Configurações IA',
    description: 'Ajuste prompts, integrações e chaves do Zé.',
    tab: 'admin_ai_config',
    icon: Settings
  }
];

const storeResources: AssistantResource[] = [
  {
    id: 'store-orders',
    title: 'Pedidos pendentes',
    description: 'Confira fila e priorize pedidos em aberto.',
    tab: 'internal_orders',
    icon: ClipboardList,
    tag: 'AGORA'
  },
  {
    id: 'store-catalog',
    title: 'Catálogo & preços',
    description: 'Atualize produtos, adicionais e disponibilidade.',
    tab: 'store_catalog',
    icon: Package
  },
  {
    id: 'store-team',
    title: 'Equipe',
    description: 'Gerencie colaboradores e permissões da loja.',
    tab: 'store_team',
    icon: Users
  },
  {
    id: 'store-reports',
    title: 'Relatórios operacionais',
    description: 'Resumo de vendas, horários de pico e performance.',
    tab: 'store_reports',
    icon: BarChart3
  },
  {
    id: 'store-marketing',
    title: 'Promoções rápidas',
    description: 'Crie cupons e campanhas para atrair clientes.',
    tab: 'store_marketing',
    icon: Megaphone
  }
];

const collaboratorWaiterResources: AssistantResource[] = [
  {
    id: 'collab-orders',
    title: 'Pedidos em aberto',
    description: 'Acompanhe pedidos e responda clientes com agilidade.',
    tab: 'internal_orders',
    icon: ClipboardList
  },
  {
    id: 'collab-new',
    title: 'Novo pedido',
    description: 'Abra pedidos balcão e mesas com rapidez.',
    tab: 'internal_orders_new',
    icon: Star
  },
  {
    id: 'collab-catalog',
    title: 'Cardápio',
    description: 'Consulte produtos e complementos disponíveis.',
    tab: 'store_catalog',
    icon: Package
  }
];

const collaboratorKitchenResources: AssistantResource[] = [
  {
    id: 'kitchen-queue',
    title: 'Fila de preparo',
    description: 'Priorize pedidos em produção e tempos críticos.',
    tab: 'internal_orders',
    icon: ClipboardList,
    tag: 'COZINHA'
  },
  {
    id: 'kitchen-stock',
    title: 'Itens em falta',
    description: 'Ajuste disponibilidade rapidamente.',
    tab: 'store_catalog',
    icon: AlertTriangle
  },
  {
    id: 'kitchen-balcao',
    title: 'Pedidos balcão',
    description: 'Gerencie entradas locais e retire da fila.',
    tab: 'internal_orders_new',
    icon: Package
  }
];

const deliveryResources: AssistantResource[] = [
  {
    id: 'driver-today',
    title: 'Meu dia',
    description: 'Resumo de ganhos, corridas e metas.',
    tab: 'daily_panel',
    icon: BarChart3
  },
  {
    id: 'driver-orders',
    title: 'Pedidos da loja',
    description: 'Veja solicitações e status dos pedidos.',
    tab: 'associate_orders',
    icon: ClipboardList
  },
  {
    id: 'driver-routes',
    title: 'Rotas inteligentes',
    description: 'Ferramentas para otimizar trajetos.',
    tab: 'route_tools',
    icon: MapPin
  },
  {
    id: 'driver-wallet',
    title: 'ZéBank',
    description: 'Saldo, extrato e transferências.',
    tab: 'zebank',
    icon: Wallet
  },
  {
    id: 'driver-score',
    title: 'Score & ranking',
    description: 'Melhore sua posição e notas.',
    tab: 'score',
    icon: Star
  }
];

const userResources: AssistantResource[] = [
  {
    id: 'user-orders',
    title: 'Meus pedidos',
    description: 'Acompanhe pagamento, entrega e histórico.',
    tab: 'my_orders',
    icon: Truck
  },
  {
    id: 'user-support',
    title: 'Suporte rápido',
    description: 'Resolver problemas com atendimento ou FAQ.',
    tab: 'support',
    icon: HelpCircle
  },
  {
    id: 'user-faq',
    title: 'FAQ',
    description: 'Dúvidas comuns sobre pedidos e entregas.',
    tab: 'faq',
    icon: Lightbulb
  },
  {
    id: 'user-shop',
    title: 'Explorar lojas',
    description: 'Encontre ofertas e novos parceiros.',
    tab: 'shop',
    icon: Bell
  }
];

export const getResourcesForRole = (
  role: UserRole,
  collaboratorFunction?: CollaboratorFunction | null
): AssistantResource[] => {
  if (role === 'admin') return adminResources;
  if (role === 'store_partner') return storeResources;
  if (role === 'collaborator') {
    if (collaboratorFunction === 'kitchen') return collaboratorKitchenResources;
    return collaboratorWaiterResources;
  }
  if (role === 'delivery_partner' || role === 'delivery_person') return deliveryResources;
  return userResources;
};

