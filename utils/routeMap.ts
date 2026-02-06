import { ActiveTab } from '../types/navigation';
import { UserRole } from '../types';

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
    '/admin/banners-cidades': 'admin_city_banners',
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
    '/admin/config-navegacao': 'admin_navigation_config',
    '/admin/zepoint': 'zepoint',

    // Shared / Core Routes
    '/perfil': 'profile',
    '/loja/perfil': 'profile',
    '/entregador/perfil': 'profile',
    '/user/perfil': 'profile',

    '/suporte': 'support',
    '/loja/suporte': 'support',
    '/entregador/suporte': 'support',
    '/user/suporte': 'support',

    '/shop': 'shop',
    '/assistente': 'assistant',
    '/meus-pedidos': 'my_orders',


    '/mapa-calor': 'heatmap',
    '/status': 'status',
    '/privacidade': 'privacy',
    '/loja/privacidade': 'privacy',
    '/entregador/privacidade': 'privacy',

    '/notificacoes': 'notifications',
    '/loja/notificacoes': 'notifications',
    '/entregador/notificacoes': 'notifications',

    '/configuracoes': 'settings',
    '/entregador/configuracoes': 'settings',

    '/sobre': 'about',
    '/loja/sobre': 'about',
    '/entregador/sobre': 'about',

    '/faq': 'faq',
    '/loja/faq': 'faq',
    '/entregador/faq': 'faq',

    '/nuvem': 'cloud',
    '/loja/nuvem': 'cloud',
    '/entregador/nuvem': 'cloud',

    '/carteira': 'zebank',
    '/loja/carteira': 'zebank',
    '/entregador/carteira': 'zebank',

    // Store Partner Routes
    '/loja/equipe': 'store_team',
    '/loja/relatorios': 'store_reports',
    '/loja/desempenho': 'store_performance',
    '/loja/marketing': 'store_marketing',
    '/loja/destaque': 'store_highlight',
    '/loja/integracoes': 'store_integrations',
    '/loja/configuracoes': 'store_settings',
    '/loja/receiving-payment': 'store_receiving_payment',
    '/loja/produtos': 'store_product_import',
    '/loja/status': 'store_status',
    '/loja/financeiro': 'store_finance_panel',
    '/loja/catalogo': 'store_catalog',
    '/loja/catalogo-impresso': 'store_print_catalog',
    '/loja/api': 'store_api_docs',
    '/loja/zepay': 'zepay_store',
    '/loja/emprestimos': 'store_loans',
    '/loja/comanda': 'internal_orders_new',
    '/loja/pedidos': 'internal_orders',
    '/loja/dashboard': 'wallet',
    '/loja/colaborador': 'collaborator_area',
    '/loja/chat': 'internal_chat',
    '/loja/entregadores-chat': 'store_drivers_chat',
    '/loja/nova-entrega': 'new_request',
    '/loja/pedidos-entregas': 'associate_orders',
    '/loja/historico': 'history',
    '/loja/zepoint': 'zepoint',

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
    '/entregador/zepoint': 'zepoint',
    '/entregador/navegacao': 'delivery_navigation',

    // Public/Misc
    '/instalar': 'install_app',
    '/upgrade': 'upgrade_to_partner',
    '/ruas': 'streets_list',
    '/navegacao': 'delivery_navigation',
    '/home': 'home',
    '/': 'home',
    '/partner-store': 'partner_store',
    '/partner-delivery': 'partner_delivery',
    // User Routes (Novas)

    '/user/inicio': 'home', // Usuário comum cai na home (landing page busca)
    '/user/pedidos': 'my_orders',
    '/user/historico': 'my_orders',

    // Authentication Routes
    '/login': 'login',
    '/cadastro': 'signup',
    '/recuperar-senha': 'forgot_password'
};

// Agrupa caminhos por Tab para busca eficiente por Role
const tabToPaths = Object.entries(routeMap).reduce((acc, [path, tab]) => {
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push(path);
    return acc;
}, {} as Record<string, string[]>);

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

    // Check for Digital Menu Products (/city/store/produtos)
    // Regex: /slug/slug/produtos
    const productsMatch = pathname.match(/^\/[^\/]+\/[^\/]+\/produtos$/);
    if (productsMatch) {
        return 'digital_menu';
    }

    const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    // Check for Dynamic POS slugs (/loja/{slug} or /entregador/{slug})
    // Only if it doesn't match an existing route in routeMap
    if (!routeMap[cleanPath]) {
        if (pathname.match(/^\/loja\/[^\/]+$/)) return 'zepoint';
        if (pathname.match(/^\/entregador\/[^\/]+$/)) return 'zepoint';
    }

    // Normaliza removendo trailing slash, exceto se for raiz
    return routeMap[cleanPath] || null;
};

/**
 * Retorna a URL (slug) correspondente à Tab, considerando a Role do usuário para prefixação.
 * Se não encontrar, retorna null.
 */
export const getUrlFromTab = (tab: ActiveTab, role?: UserRole): string | null => {
    const paths = tabToPaths[tab];
    if (!paths || paths.length === 0) return null;

    // Canonical public path for FAQ (avoid role-specific prefixes)
    if (tab === 'faq') {
        return paths.find(p => p === '/faq') || paths[0];
    }

    // Se houver Role, tenta encontrar o caminho com o prefixo ideal
    if (role === 'admin') {
        const found = paths.find(p => p.startsWith('/admin/'));
        if (found) return found;
    }

    if (role === 'store_partner' || role === 'collaborator') {
        const found = paths.find(p => p.startsWith('/loja/'));
        if (found) return found;
    }

    if (role === 'delivery_partner' || role === 'delivery_person') {
        const found = paths.find(p => p.startsWith('/entregador/'));
        if (found) return found;
    }

    if (role === 'user') {
        const found = paths.find(p => p.startsWith('/user/'));
        if (found) return found;
    }

    // Prefere rotas curtas (root) se não houver match de prefixo específico de role
    // Ou simplesmente retorna o primeiro disponível
    return paths.find(p => !p.includes('/', 1)) || paths[0];
};

/**
 * Atualiza a URL do navegador sem recarregar a página.
 */
export const syncUrlWithTab = (tab: ActiveTab, role?: UserRole) => {
    const path = getUrlFromTab(tab, role);
    if (path) {
        // Se a URL já for a correta, não faz nada
        if (window.location.pathname === path) return;
        window.history.pushState({ tab }, '', path);
    }
};
