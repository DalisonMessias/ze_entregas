import { ActiveTab } from '../components/App';

// Mapeamento de rotas amigáveis para Tabs internas
// Estrutura: { slug_da_url: nome_da_active_tab }
const routeMap: Record<string, ActiveTab> = {
    // Admin Routes
    '/admin/dashboard': 'admin_dashboard',
    '/admin/usuarios': 'admin_users',
    '/admin/lojas': 'admin_lojas',
    '/admin/validacao': 'admin_validation',
    '/admin/notificacoes': 'admin_notifications',
    '/admin/loja': 'admin_shop',
    '/admin/suporte': 'admin_support',
    '/admin/api-keys': 'admin_api_keys',
    '/admin/ia-config': 'admin_ai_config',
    '/admin/roteamento': 'admin_routing',
    '/admin/infinitepay': 'admin_infinitepay',
    '/admin/taxas': 'admin_fees',
    '/admin/pwa': 'admin_pwa',
    '/admin/pagamentos': 'admin_payouts',
    '/admin/cidades': 'admin_cities',
    '/admin/niveis': 'admin_levels',
    '/admin/avaliacoes': 'admin_ratings',
    '/admin/seguranca': 'admin_security',
    '/admin/blacklist': 'admin_blacklist',
    '/admin/indicacoes': 'admin_referrals',
    '/admin/institucional': 'admin_institutional',
    '/admin/novidades': 'admin_platform_news',
    '/admin/financeiro-loja': 'admin_store_finance',
    '/admin/controle-carteira': 'admin_wallet_control',
    '/admin/reclamacoes': 'admin_claims',
    '/admin/manutencao': 'admin_maintenance',
    '/admin/config-emprestimo': 'admin_loan_config',
    '/admin/investimentos': 'admin_investments',
    '/admin/slides': 'admin_slides',
    '/admin/dicas': 'admin_tips',
    '/admin/whatsapp': 'admin_chat',
    '/admin/gateways': 'admin_payment_gateways',
    '/admin/mercadopago': 'admin_mercadopago',
    '/admin/mapa-localizacao': 'admin_location_map',
    '/admin/catalogo-produtos': 'admin_base_catalog',
    '/admin/categorias-loja': 'admin_store_categories',
    '/admin/galeria-imagens': 'admin_image_gallery',
    '/admin/solicitacoes-ruas': 'admin_street_requests',
    '/admin/mediacao': 'admin_mediation',

    // Shared / Core Routes
    '/perfil': 'profile',
    '/suporte': 'support',
    '/shop': 'shop',
    '/assistente': 'assistant',


    '/mapa-calor': 'heatmap',
    '/status': 'status',
    '/privacidade': 'privacy',
    '/notificacoes': 'notifications',
    '/configuracoes': 'settings',
    '/sobre': 'about',
    '/faq': 'faq',
    '/nuvem': 'cloud',

    // Store Partner Routes
    '/loja/equipe': 'store_team',
    '/loja/relatorios': 'store_reports',
    '/loja/marketing': 'store_marketing',
    '/loja/integracoes': 'store_integrations',
    '/loja/configuracoes': 'store_settings',
    '/loja/receiving-payment': 'store_receiving_payment',
    '/loja/produtos': 'store_product_import',
    '/loja/status': 'store_status',
    '/loja/financeiro': 'store_finance_panel',
    '/loja/catalogo': 'store_catalog',
    '/loja/api': 'store_api_docs',
    '/loja/zepay': 'zepay_store',
    '/loja/emprestimos': 'store_loans',
    '/loja/comanda': 'internal_orders',
    '/loja/dashboard': 'wallet',
    '/loja/colaborador': 'collaborator_area',
    '/loja/chat': 'internal_chat',
    '/loja/nova-entrega': 'new_request',
    '/loja/pedidos': 'associate_orders',
    '/loja/historico': 'history',

    // Delivery Partner/Person Routes
    '/entregador/inicio': 'daily_panel',
    '/entregador/painel': 'partner',
    '/entregador/marketing': 'driver_marketing',
    '/entregador/rotas': 'route_list',
    '/entregador/ferramentas': 'route_tools',
    '/entregador/historico-local': 'local_history',
    '/entregador/associar': 'associate_driver',
    '/entregador/emprestimos': 'loans',
    '/entregador/tarefas': 'tasks',
    '/entregador/relatorios': 'reports',
    '/entregador/enderecos': 'addresses',
    '/entregador/pedidos': 'associate_orders',
    '/entregador/pontuacao': 'score',

    // Public/Misc
    '/instalar': 'install_app',
    '/upgrade': 'upgrade_to_partner',
    '/ruas': 'streets_list',
    '/carteira': 'zebank',
    // User Routes (Novas)
    '/user/inicio': 'home', // Usuário comum cai na home (landing page busca)
    '/user/perfil': 'profile',
    '/user/pedidos': 'profile', // Pedidos estão no perfil
    '/user/historico': 'profile',
    '/user/suporte': 'support',
    '/user/carteira': 'zebank',
    '/user/configuracoes': 'settings',
    '/user/privacidade': 'privacy',
    '/user/notificacoes': 'notifications',

    // Authentication Routes
    '/login': 'login',
    '/cadastro': 'signup',
    '/recuperar-senha': 'forgot_password'
};

// Inverte o mapa para buscar URL a partir da Tab
// active_tab -> /slug
const reverseRouteMap: Record<string, string> = Object.entries(routeMap).reduce((acc, [path, tab]) => {
    acc[tab] = path;
    return acc;
}, {} as Record<string, string>);

/**
 * Retorna a ActiveTab correspondente à URL atual.
 * Se não encontrar, retorna null (o App deve decidir o default).
 */
export const getTabFromUrl = (pathname: string): ActiveTab | null => {
    // Check for Order Tracking
    if (pathname.startsWith('/track/')) {
        return 'order_tracking';
    }

    // Check for Store Public Chat (/city/store/chat)
    // Regex: /slug/slug/chat
    const chatMatch = pathname.match(/^\/[^\/]+\/[^\/]+\/chat$/);
    if (chatMatch) {
        return 'store_public_chat';
    }

    // Normaliza removendo trailing slash, exceto se for raiz
    const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    return routeMap[cleanPath] || null;
};

/**
 * Retorna a URL (slug) correspondente à Tab.
 * Se não encontrar, retorna null.
 */
export const getUrlFromTab = (tab: ActiveTab): string | null => {
    return reverseRouteMap[tab] || null;
};

/**
 * Atualiza a URL do navegador sem recarregar a página.
 */
export const syncUrlWithTab = (tab: ActiveTab) => {
    const path = getUrlFromTab(tab);
    if (path) {
        // Se a URL já for a correta, não faz nada
        if (window.location.pathname === path) return;
        window.history.pushState({ tab }, '', path);
    } else {
        // Se for uma tab sem rota mapeada, volta para raiz ou mantém? 
        // Idealmente todas deveriam ter rota. Se não tiver, voltamos pro root ou hash.
        // Vamos manter a URL limpa se não tiver mapping, ou usar um default.
        // window.history.pushState({ tab }, '', '/'); 
    }
};
