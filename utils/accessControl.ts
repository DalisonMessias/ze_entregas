import { UserRole } from '../types';
import { ActiveTab } from '../types/navigation';

export const generalTabs = new Set<ActiveTab>([
  'shop',
  'profile',
  'support',
  'assistant',
  'cloud',
  'about',
  'faq',
  'solutions',
  'benefits',
  'install_app',
  'status',
  'privacy',
  'streets_list',
  'settings',
  'upgrade_to_partner',
  'internal_chat',
  'partner_store',
  'partner_delivery',
  'home',
  'digital_menu',
  'login',
  'signup',
  'order_tracking',
  'delivery_navigation',
  'my_orders',
  'store_public_chat',
  'street_request',
  'not_found'
]);

export const allowedTabsByRole: Record<UserRole, Set<ActiveTab>> = {
  admin: new Set<ActiveTab>([
    ...generalTabs,
    'admin_dashboard', 'admin_users', 'admin_lojas', 'admin_validation', 'admin_notifications', 'admin_shop', 'admin_support',
    'admin_api_keys', 'admin_ai_config', 'admin_routing', 'admin_fees', 'admin_pwa', 'admin_payouts', 'admin_cities', 'admin_infinitepay',
    'admin_levels', 'admin_ratings', 'admin_security', 'admin_blacklist', 'admin_referrals', 'admin_institutional',
    'admin_platform_news', 'admin_store_finance', 'admin_wallet_control', 'admin_claims', 'admin_maintenance', 'admin_slides', 'admin_city_banners', 'admin_tips', 'admin_loan_config',
    'admin_investments', 'admin_chat', 'admin_payment_gateways', 'admin_mercadopago', 'admin_pix_config', 'admin_location_map', 'admin_base_catalog', 'admin_store_categories', 'admin_global_coupons', 'admin_insurance', 'admin_street_requests', 'admin_mediation', 'zepoint',
    'store_drivers_chat'
  ]),
  store_partner: new Set<ActiveTab>([
    'store_status', 'wallet', 'new_request', 'history', 'store_team', 'store_reports', 'store_marketing',
    'store_integrations', 'store_settings', 'store_ratings', 'store_receiving_payment', 'store_product_import', 'store_finance_panel',
    'zepay_store', 'zebank', 'internal_orders', 'internal_orders_new', 'store_catalog', 'store_print_catalog',
    'store_api_docs', 'store_loans', 'store_promotions', 'store_highlight', 'internal_chat', 'store_drivers_chat', 'zepoint', 'store_performance'
  ]),
  delivery_partner: new Set<ActiveTab>([
    'daily_panel', 'associate_orders', 'partner', 'zebank', 'driver_marketing', 'local_history',
    'associate_driver', 'route_tools', 'route_list', 'tasks', 'reports', 'heatmap', 'addresses',
    'loans', 'insurance', 'score', 'zepoint'
  ]),
  delivery_person: new Set<ActiveTab>([
    'daily_panel', 'associate_orders', 'partner', 'zebank', 'driver_marketing', 'local_history',
    'associate_driver', 'route_tools', 'route_list', 'tasks', 'reports', 'heatmap', 'addresses',
    'insurance', 'score', 'zepoint'
  ]),
  collaborator: new Set<ActiveTab>(['collaborator_area', 'shop', 'internal_orders', 'internal_orders_new', 'store_catalog']),
  user: new Set<ActiveTab>(['shop', 'profile', 'support', 'addresses', 'home', 'notifications', 'privacy', 'settings', 'zebank'])
};

export const canAccessTabForRole = (role: UserRole, tab: ActiveTab): boolean => {
  if (tab.startsWith('admin_')) return role === 'admin';
  if (generalTabs.has(tab)) return true;
  const set = allowedTabsByRole[role];
  return !!set && set.has(tab);
};

export const getPermittedTabsForRole = (role: UserRole): ActiveTab[] => {
  const roleTabs = allowedTabsByRole[role] ? Array.from(allowedTabsByRole[role]) : [];
  return Array.from(new Set<ActiveTab>([...generalTabs, ...roleTabs]));
};

export const getRolesForTab = (tab: ActiveTab): UserRole[] => {
  if (generalTabs.has(tab)) return [];
  const roles: UserRole[] = [];
  for (const [role, tabs] of Object.entries(allowedTabsByRole)) {
    if (tabs.has(tab)) roles.push(role as UserRole);
  }
  return roles;
};

export const getRoleLabel = (role?: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'store_partner':
      return 'Loja';
    case 'delivery_partner':
      return 'Entregador Parceiro';
    case 'delivery_person':
      return 'Entregador';
    case 'collaborator':
      return 'Colaborador';
    case 'user':
      return 'Cliente';
    default:
      return 'Usuário';
  }
};
