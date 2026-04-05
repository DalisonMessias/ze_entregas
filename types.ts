
export type Theme = 'light' | 'dark';
export type UserRole = 'admin' | 'store_partner' | 'delivery_partner' | 'delivery_person' | 'collaborator' | 'user';
export type UserStatus = 'active' | 'banned' | 'pending' | 'not_found' | 'blocked' | 'suspended' | 'error';
export interface PublicStoreProfile extends PartnerProfile {
    orders_count?: number;
    is_top_seller?: boolean;
    is_paid_featured?: boolean;
}
export type PartnerRequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'RETURNING' | 'AWAITING_STORE_DECISION' | 'WAITING_PAYMENT_PIX' | 'PAYMENT_TO_ARRANGE';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'CASH' | 'DEBIT_CARD' | 'OTHER' | 'PENDING';
export type PayoutMethodType = 'PIX' | 'BANK_TRANSFER';
export type VehicleType = 'moto' | 'car' | 'bike' | 'other';
export type DocumentType = 'CNH' | 'CRLV' | 'VEHICLE_PHOTO' | 'ADDRESS_PROOF' | 'SELFIE' | 'PERSONAL_ID';
export type RatingDirection = 'STORE_TO_PARTNER' | 'PARTNER_TO_STORE';

export interface BonusTier {
  deliveries: number;
  reward: number;
}

export interface BonusCampaign {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  target_city?: string;
  tiers: BonusTier[];
  created_at?: string;
}

export interface BonusDriverProgress {
  id: string;
  campaign_id: string;
  driver_id: string;
  deliveries_count: number;
  bonus_earned: number;
  bonus_claimed?: number;
  status: string;
  last_updated: string;
  campaign?: BonusCampaign;
}

import { ActiveTab } from './types/navigation';
export interface ManualWaypoint {
    id: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    reference: string;
    lat?: number;
    lng?: number;
}

export interface RouteListItem {
    id: string;
    address: string;
    lat: number;
    lng: number;
    name: string;
    notes?: string;
    completed: boolean;
}

export interface SavedAddress {
    id: string;
    name: string;
    fullAddress: string;
    createdAt: number;
    visitCount?: number;
    lastVisited?: number;
}

export interface DeliveryRecord {
    id: string;
    date: string;
    formattedDate: string;
    formattedTime: string;
    count: number;
    totalValue: number;
    totalKm: number;
    timestamp: number;
    transactions?: DailyTransaction[];
    expenseBreakdown?: Record<string, number>;
    paymentBreakdown?: { cash: number, digital: number };
}

export interface DailyTransaction {
    id: string;
    type: 'standard' | 'extra' | 'expense';
    value: number;
    km?: number;
    timestamp: number;
    description?: string;
    paymentMethod?: 'cash' | 'digital';
    category?: string;
    isRefunded?: boolean;
}

// DailySummary consolidated at line 195

export interface UserBankDetails {
    fullName: string;
    pixKey: string;
    pixType: string;
    bankName: string;
    bankNumber: string;
    agency: string;
    account: string;
    accountType: 'corrente' | 'poupanca';
}

export interface MaintenanceItem {
    id: string;
    name: string;
    lastChangedKm: number;
    intervalKm: number;
}

export interface MaintenanceData {
    currentKm: number;
    items: MaintenanceItem[];
}

export interface NavigationState {
    active: boolean;
    destination?: { lat: number, lng: number, address?: string, label?: string };
    waypoints?: { lat: number, lng: number, address?: string, label?: string }[];
    current_waypoint_index?: number;
    context_id?: string;
    vehicle_type?: VehicleType | 'foot';
    return_tab?: ActiveTab;
    created_at?: string;
}

export interface NavigationStep {
    instruction: string;
    distance_m: number;
    duration_s: number;
    type: number;
    way_points: [number, number];
}

export interface NavigationRoute {
    geometry: { lat: number; lng: number }[];
    distance_m: number;
    duration_s: number;
    steps: NavigationStep[];
    updated_at: string;
}

export interface PromotionDetails {
    name: string;
    phone: string;
    description: string;
    services: string;
    photo_url?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}


export interface ChatMessageData {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    message: string;
    type: 'ORDER' | 'SUPPORT';
    is_read: boolean;
    created_at: string;
    pending?: boolean;
}

export interface QuickReply {
    id: string;
    store_id: string;
    trigger: string;
    message: string;
    created_at: string;
    updated_at: string;
}

export type StorageKey = string;

export interface Reminder {
    id: string;
    text: string;
    time: number;
}

export interface CookiePreferences {
    functionality: boolean;
    analytics: boolean;
    performance: boolean;
}

export interface NotificationSettings {
    enableSound: boolean;
    enableVibration: boolean;
    enablePopup: boolean;
    enableHighContrast?: boolean;
}

export interface SavedRoute {
    id: string;
    name: string;
    waypoints: string[];
    distance?: number;
    duration?: number;
    created_at?: string;
}

export interface NotificationPreferences {
    new_orders: boolean;
    order_updates: boolean;
    system_alerts: boolean;
    marketing: boolean;
    sound_enabled: boolean;
}

export interface Task {
    id: string;
    text: string;
    completed: boolean;
}





export interface CartItem {
    product: Product;
    quantity: number;
    observation?: string;
}

export interface OrderItem {
    product_id: string | null;
    name: string;
    quantity: number;
    price: number;
    unit_price?: number;
    total_price?: number;
    observation?: string;
    additional?: any[];
}

export interface DailySummary {
    profit: number;
    deliveryCount: number;
    km: number;
    expenses?: number; // Added from line 68
    goal: number | null;
    location: { lat: number; lng: number } | null;
    address?: string;
    name?: string;
    lat?: number;
    lng?: number;
    completed?: boolean;
}

// Order interface consolidated below (lines 371-403)

export interface ManagedUser {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    name?: string;
    phone_number?: string;
    cpf?: string;
    city?: string;
    avatar_url?: string;
    user_metadata?: any;
    bank_details?: UserBankDetails;
    user_type?: UserRole;
    created_at: string;
    verification_status?: string;
    partner_level?: string;
    is_super_store?: boolean;
    vehicle_type?: string;
    average_rating?: number;
    vehicle_plate?: string;
    completed_deliveries?: number;
    score?: number;
    cancellation_count_monthly?: number;
    refusal_count_monthly?: number;
    association_code?: string;
    balance?: number;
    preparation_time?: number;
    preparation_time_min?: number;
    preparation_time_max?: number;
    super_store_expiration?: string;
    store_document?: string;
    store_category_id?: string;
    show_comments_on_menu?: boolean;
    ratings_count?: number;
    ratings_sum?: number;
    super_store_plan_type?: 'MENSALIDADE' | 'COMISSAO';
}

// CompanyInfo consolidated at line 916

export interface GlobalNotification {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    price: number;
    category_id: string;
    images?: string[];
    is_active: boolean;
    stock_quantity: number | null;
    internal_code?: string;
    variations?: any[];
    options?: any[];
    availability?: any;
    observations?: string;
    origin_prefix?: string;
    store_id?: string;
    has_sizes?: boolean;
    available_sizes?: string[];
    price_by_size?: Record<string, number>;
    default_size?: string;
    addon_group_id?: string | null;
    addon_options?: StoreAddonOption[] | null;
    excluded_addon_options?: string[] | null;
}

export interface StoreAddonOption {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
}

export interface StoreAddonGroup {
    id: string;
    store_id: string;
    name: string;
    type: 'SINGLE' | 'MULTIPLE';
    min: number;
    max: number;
    options: StoreAddonOption[];
    is_active: boolean;
    base_addon_group_id?: string; // Rastreamento de importação do catálogo base
    created_at: string;
    updated_at: string;
}

export interface StoreProduct {
    id: string;
    store_id: string;
    name: string;
    description?: string;
    brand?: string;
    price: number;
    category?: string; // Legacy: Name
    category_id?: string | null; // Correct: ID
    image_url?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    internal_code?: string;
    variations?: any[];
    availability?: any;
    observations?: string;
    origin_prefix?: string;
    stock_quantity?: number | null;
    base_product_id?: string | null;
    has_sizes?: boolean;
    available_sizes?: string[];
    price_by_size?: Record<string, number>;
    default_size?: string;
    addon_group_id?: string | null;
    addon_options?: StoreAddonOption[] | null;
    excluded_addon_options?: string[] | null;
}

export interface CatalogBaseProduct {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    category?: string;
    observations?: string;
    valor_sugerido: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;

    // Suporte para detecção de duplicados (UI/Staging)
    isDuplicate?: boolean;
    existingProduct?: CatalogBaseProduct;
}


export interface AdminOrder {
    id: string;
    total_price: number;
    status: string;
}

export interface ShopCoupon {
    code: string;
    discount_percent: number;
    discount_type?: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
    discount_value?: number;
    active: boolean;
    is_stackable?: boolean;
    city_id?: string;
    category_id?: string;
}

export interface ShopSettings {
    id: string;
    is_shop_enabled?: boolean;
    shop_name?: string;
    shop_city?: string;
    banner_title?: string;
    banner_subtitle?: string;
    banner_tag?: string;
    shipping_origin_cep?: string;
    free_shipping_threshold?: number;
    payment_methods?: { pix: boolean, boleto: boolean, credit_card: boolean };
    coupons?: ShopCoupon[];
    social_media?: { instagram?: string, facebook?: string, linkedin?: string, twitter?: string };
    company_info?: CompanyInfo;
    support_phone?: string;
    support_hours_start?: string;
    support_hours_end?: string;
    support_status_override?: 'AUTO' | 'OPEN' | 'CLOSED';
    navigation_voice_id?: string;
    navigation_voice_enabled?: boolean;
    navigation_sounds_enabled?: boolean;
    created_at?: string;
    infinitepay_handle?: string;
}


export interface Category {
    id: string;
    name: string;
}

// Consolidated Order Interface
export interface Order {
    id: string;
    user_id: string;
    status: string;
    items: OrderItem[];
    total_price: number;
    payment_method: PaymentMethod;
    infinitepay_url?: string;
    infinitepay_id?: string;
    infinitepay_status?: string;
    infinitepay_metadata?: any;
    shipping_address?: any;
    payment_details?: any;
    shipping_cost?: number;
    discount?: number;
    coupon_code?: string;
    order_type?: 'LOCAL' | 'PICKUP' | 'DELIVERY';

    // Internal constants
    customer_name?: string;
    customer_phone?: string;
    observation?: string;
    origin?: 'APP' | 'INTERNAL';
    amount_paid?: number;
    change_amount?: number;
    custom_payment_label?: string;
    store_id?: string;
    delivery_mode?: 'OWN' | 'PLATFORM' | 'ASSOCIATE';
    delivery_location_reference?: string;
    driver_id?: string;
    payment_status?: string;
    is_location_delivery?: boolean;

    // Mediation Fields
    pickup_code?: string;
    delivery_code?: string;
    return_code?: string;
    is_mediation_active?: boolean;

    store?: any;
    partner?: any;
    collaborator_name?: string;
    points_earned?: number;
    points_redeemed?: number;
    loyalty_discount_value?: number;
    created_at: string;
}

// Removed duplicate ShopCoupon and Category


export interface Claim {
    id: string;
    user_id: string;
    type: string;
    description: string;
    status: 'open' | 'resolved' | 'closed';
    created_at: string;
    admin_response?: string;
    user_email?: string;
    attachments?: string[];
}

// Consolidated StoreWallet and WalletTransaction
export interface StoreWallet {
    store_id: string;
    balance: number;
    balance_decimal: number;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    store_id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | string; // Allow string for flexibility or strict union
    status: string;
    created_at: string;
    description?: string;
}

export interface PartnerRequest {
    id: string;
    store_id: string;
    partner_id?: string;
    pickup_address: string;
    delivery_address: string;
    distance_km: number;
    total_charged_store: number;
    net_value_partner: number;
    fee_fixed: number;
    fee_percent_value: number;
    status: PartnerRequestStatus;
    created_at: string;
    updated_at: string;
    store?: { name: string; phone_number: string };
    partner?: { name: string; vehicle_plate: string; phone_number: string; vehicle_type: string };
    failure_reason?: string;
    rated_by_store?: boolean;
    rated_by_partner?: boolean;
    customer_name?: string;
    is_location_delivery?: boolean;
    latitude?: number;
    longitude?: number;
}

export interface PartnerFeeSettings {
    global_tax_fixed: number;
    global_tax_percent: number;
    super_store_monthly_fee: number;
    association_fee: number;
    base_delivery_value: number;
    base_delivery_km: number;
    extra_km_value: number;
    additional_stop_fee: number;
    weekday?: number;
    hour?: string;
    emergency_percentage?: number;
    emergency_cooldown_hours?: number;
    emergency_enabled?: boolean;
    emergency_message?: string;
    pos_min_value?: number;
    pos_max_value?: number;
    combo_discount_percent?: number;
    combo_discount_enabled?: boolean;
    super_store_monthly_enabled?: boolean;
    super_store_commission_enabled?: boolean;
    super_store_commission_percent?: number;
    super_store_commission_fixed?: number;
}

export interface PWASettings {
    display_name: string; // Prioridade total: Nome usado no Titulo, Manifesto e Splash
    short_name: string;
    theme_color: string;
    background_color: string;
    description: string;
    name?: string; // Legado
    start_url?: string;
    orientation?: string;
    language?: string;
    app_version?: number;
    scope?: string;
    icons?: PWAIcon[];
    screenshots?: PWAScreenshot[];
    shortcuts?: PWAShortcut[];
    categories?: string[];
    iarc_rating_id?: string;
    related_applications?: PWARelatedApplication[];
    prefer_related_applications?: boolean;
    custom_splash_screens?: PWASplashScreen[];
    status_bar_color?: string;
    display?: string;
}

export interface PWAScreenshot {
    src: string;
    sizes?: string;
    type?: string;
    form_factor?: 'wide' | 'narrow';
    label?: string;
}

export interface PWAShortcut {
    name: string;
    short_name?: string;
    description?: string;
    url: string;
    icons?: PWAIcon[];
}

export interface PWARelatedApplication {
    platform: string;
    url: string;
    id?: string;
}

export interface PWASplashScreen {
    src: string;
    sizes: string;
    type: string;
    media?: string; // e.g. "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
}

export interface PWAIcon {
    src: string;
    sizes: string;
    type: string;
}

export interface PayoutSummary {
    total_earnings: number;
    available_balance: number;
    settings: PartnerFeeSettings;
    max_emergency_value: number;
    can_request_emergency: boolean;
}

export type PayoutDayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface PayoutSettings {
    weekday?: number;
    hour?: string;
    emergency_percentage?: number;
    emergency_cooldown_hours?: number;
    emergency_enabled?: boolean;
    min_payout_amount?: number;
    automatic_payouts_enabled?: boolean;
    payout_day_of_week?: PayoutDayOfWeek;
    payout_time?: string;
    default_payout_method_type?: PayoutMethodType;
}

// moved definitions to single canonical declarations below to avoid duplication

export interface City {
    id: string;
    name: string;
    state: string;
    ibge_code?: string;
    is_active: boolean;
}

export interface CityRequest {
    id: string;
    city_name: string;
    state: string;
    user_email: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface StreetRequest {
    id: string;
    user_id: string;
    street_name: string;
    city: string;
    state?: string;
    neighborhood?: string;
    reference?: string;
    latitude?: number;
    longitude?: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ApprovedStreet {
    id: string;
    name: string;
    city: string;
    state?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
    request_id?: string;
    created_at: string;
    updated_at: string;
}




// Consolidated PartnerProfile
export interface PartnerProfile {
    id: string; // user_id
    user_id?: string; // Backwards compatibility if needed
    name?: string;
    email?: string;
    phone_number?: string;
    is_active: boolean;
    is_available?: boolean;
    is_currently_open?: boolean; // Manual Toggle
    city?: string;
    verification_status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    vehicle_type: VehicleType;
    vehicle_plate?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    partner_level?: string;
    completed_deliveries?: number;
    association_code?: string;
    share_phone_offline?: boolean;

    // Contact & Address
    contact_email?: string;
    opening_hours?: string;
    opening_hours_structured?: any; // JSON Object for automation
    address_zip?: string;
    address_street?: string;
    address_number?: string;
    address_district?: string;
    address_state?: string;

    // Store Branding & Address (Separated)
    cover_url?: string;
    store_logo_url?: string;
    store_address_zip?: string;
    store_address_street?: string;
    store_address_number?: string;
    store_address_district?: string;
    store_address_city?: string;
    store_address_state?: string;
    store_address_complement?: string;

    is_super_store?: boolean;
    store_category_id?: string;
    store_name?: string;
    is_open?: boolean;
    manual_override?: boolean;
    preparation_time?: number;
    preparation_time_min?: number;
    preparation_time_max?: number;
    super_store_expiration?: string;
    pix_key?: string;
    pix_key_type?: string;
    city_slug?: string;
    store_slug?: string;
    description?: string;
    delivery_time_max?: number;
    address_complement?: string;


    // Order Configuration
    receive_orders_via_platform?: boolean;
    receive_orders_via_chat?: boolean;
    chat_number?: string;
    config?: any;
    show_comments_on_menu?: boolean;
    ratings_count?: number;
    ratings_sum?: number;
    average_rating?: number;
    super_store_plan_type?: 'MENSALIDADE' | 'COMISSAO';
    loyalty_settings?: LoyaltySettings;
}

export interface LoyaltySettings {
    store_id: string;
    is_active: boolean;
    conversion_factor: number;
    calculation_base: 'SUBTOTAL' | 'PAID';
    rounding_rule: 'TRUNC' | 'ROUND';
    points_expiry_days?: number;
    min_points_redemption: number;
    max_discount_percentage: number;
    created_at?: string;
    updated_at?: string;
}

export interface LoyaltyPoints {
    id: string;
    store_id: string;
    user_id: string;
    balance: number;
    updated_at?: string;
}

export interface LoyaltyHistory {
    id: string;
    store_id: string;
    user_id: string;
    order_id?: string;
    points: number;
    type: 'CREDIT' | 'DEBIT' | 'REVERSAL' | 'ADJUSTMENT';
    description: string;
    created_at: string;
}

export interface StoreDailyReport {
    id: string;
    store_id: string;
    report_date: string;
    total_orders: number;
    total_revenue: number;
    total_delivery_fees: number;
    orders_summary: any[];
    created_at: string;
}

export interface PartnerDocument {
    id: string;
    document_type: DocumentType;
    file_url: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_notes?: string;
    created_at: string;
}

export interface PartnerLevelBenefit {
    id: string;
    display_name: string;
    min_deliveries: number;
    min_rating: number;
    store_discount_percent: number;
    service_fee_reduction_percent: number;
    delivery_price_extra_percent: number;
}

export interface PartnerRequestLog {
    id: string;
    request_id: string;
    status_from: string;
    status_to: string;
    created_at: string;
}

export interface EmergencyWithdrawalRequest {
    id: string;
    partner_id: string;
    amount: number;
    status: string;
    created_at: string;
}

export interface PartnerPayment {
    id: string;
    partner_id: string;
    amount: number;
    is_emergency: boolean;
    status: string;
    created_at: string;
    partner_email?: string; // joined
}

export interface InsurancePartner {
    id: string;
    name: string;
    logo_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface InsurancePlan {
    id: string;
    partner_id: string;
    title: string;
    description?: string;
    price_mensal: number;
    features: string[];
    is_popular: boolean;
    is_active: boolean;
    deductible_percent?: number;
    deductible_info?: string;
    created_at: string;
    updated_at: string;
    partner?: InsurancePartner;
}

export interface InsuranceSubscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
    payment_method: 'WALLET' | 'CARD';
    next_billing_date: string | null;
    created_at: string;
    updated_at: string;
    plan?: InsurancePlan;
}

export interface BlacklistEntry {
    id: string;
    user_id: string;
    reason: string;
    admin_id: string;
    created_at: string;
    email?: string;
    phone_number?: string;
    punishment_type: string;
    status: string;
}

export interface OfflineDriver {
    id: string;
    name: string;
    phone_number: string;
    vehicle_type: string;
    average_rating: number;
}

export interface StoreDeliveryPartner {
    id: string;
    store_id: string;
    partner_id: string;
    partner_name: string;
    partner_phone: string;
    partner_vehicle: string;
    partner_avatar?: string | null;
    created_at: string;
}

export interface PartnerRating {
    id: string;
    rating: number;
    comment: string;
    direction: RatingDirection;
    created_at: string;
    store_response?: string;
    store_response_at?: string;
    evaluated_city_slug?: string;
}

// WorkShift consolidated at line 875

export interface WorkShiftBreak {
    start: string;
    end?: string;
}

// Consolidated FinancialStatementItem below


export interface PhotoVerificationPayload {
    id: string;
    user_id: string;
    photo_url: string;
    location_data: { lat: number, lng: number, accuracy: number };
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    created_at: string;
    admin_notes?: string;
}

export interface FraudAlert {
    id: string;
    user_id: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    type: string;
    description?: string;
    status: 'OPEN' | 'RESOLVED';
    created_at: string;
}

// PlatformNews consolidated at line 902

export interface SystemTip {
    id: string;
    message: string;
    target_role: UserRole | 'all';
    is_active: boolean;
    created_at: string;
}

export interface CofrinhoSettings {
    yield_frequency: 'daily' | 'weekly' | 'monthly';
    interest_type: 'simple' | 'compound';
    rate_percent: number;
    min_lock_days: number;
    allow_early_withdrawal: boolean;
    penalty_percent: number;
    min_deposit: number;
    formula_script?: string | null;
    change_policy: 'keep_previous' | 'migrate_new';
}

export interface CofrinhoAccount {
    user_id: string;
    principal: number;
    accrued_yield: number;
    last_yield_applied: string;
    lock_until?: string | null;
}

// Payment Gateway Types
export interface PaymentGatewayConfig {
    id: string;
    gateway_name: 'infinitepay' | 'mercadopago' | 'pix';
    is_active: boolean;
    is_primary: boolean;
    credentials: Record<string, string>;
    fees?: {
        pix: number;
        credit_card: number;
        credit_card_installments: number;
    };
    tax_percentage?: number;
    tax_fixed?: number;
    created_at?: string;
    updated_at?: string;
}

export interface PaymentGatewayLog {
    id: string;
    gateway_name: string;
    operation_type: string;
    success: boolean;
    request_data?: any;
    response_data?: any;
    error_message?: string;
    created_at: string;
}

export interface FinancialTransaction {
    id: string;
    user_id: string | null;
    user_name: string | null;
    amount: number;
    type: string;
    status: string;
    source: 'ZEBANK' | 'ZEPAY_STORE' | 'TERMINAL' | 'GATEWAY_LOG';
    description: string;
    created_at: string;
}

export type AdminSubTab = 'dashboard' | 'users' | 'lojas' | 'validation' | 'notifications' | 'payment_gateways' | 'shop' | 'support' | 'claims' | 'ai_config' | 'fees' | 'pwa' | 'payouts' | 'cities' | 'infinitepay' | 'levels' | 'ratings' | 'security' | 'blacklist' | 'referrals' | 'institutional' | 'platform_news' | 'store_finance' | 'store_orders' | 'wallet_control' | 'maintenance' | 'routing' | 'api_keys' | 'loan_config' | 'investments' | 'slides' | 'city_banners' | 'tips' | 'chat' | 'score_config' | 'mercadopago' | 'location_map' | 'base_catalog' | 'store_categories' | 'image_gallery' | 'pix_config' | 'global_coupons' | 'insurance' | 'street_requests' | 'street_catalog' | 'mediation' | 'bonuses' | 'store_ratings';

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    is_read: boolean;
    created_at: string;
    updated_at?: string; // Opcional pois notificações antigas podem não ter na pratica se migração falhar (mas SQL garante default)
    pending?: boolean;
}

export type Notification = AppNotification;


// Consolidated AdminDashboardStats below




// Removed duplicate WalletTransaction


// Removed duplicate PartnerRequest


export interface ReferralData {
    my_code: string;
    total_referrals: number;
    is_reward_active: boolean;
    reward_active_until?: string;
}

// Removed duplicate PayoutSummary


export interface ReferralBonusPayment {
    id: string;
    referred_user_name: string;
    created_at: string;
    status: string;
    amount: number;
}

export interface WorkShift {
    id: string;
    user_id: string;
    start_time: string;
    end_time?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    breaks?: { start: string, end?: string }[];
}

export interface StoreReportData {
    totalRequests: number;
    totalValue: number;
    completedCount: number;
    cancelledCount: number;
    failedCount: number;
    peakHours: { hour: number, count: number }[];
    driverPerformance: { partner_id: string, partner_name: string, count: number }[];
    lowSalesProducts?: Array<{ product_id: string | null; name: string; quantity: number; revenue: number }>;
    salesWindowDays?: number;
}

export interface StoreShippingRule {
    id: string;
    store_id: string;
    rule_type: 'free_above' | 'fixed_rate';
    value: number;
    threshold?: number;
}

export interface PlatformNews {
    id: string;
    title: string;
    description: string;
    icon_name: string;
    is_active: boolean;
    sort_order?: number; // Added from line 756
    image_url?: string;  // Added from line 756
    created_at: string;
    peakHours?: { hour: number, count: number }[];
    driverPerformance?: { partner_id: string, partner_name: string, count: number }[];
    counts?: { completed: number; cancelled: number; failed: number };
}



export interface CompanyInfo {
    about_text?: string;
    careers_text?: string;
    careers_email?: string;
    press_text?: string;
    press_email?: string;
    contact_support_email?: string;
    contact_commercial_email?: string;
    contact_address?: string;
    loan_config?: LoanConfig;
}

export interface LoanConfig {
    interest_rate_percent: number;
    repayment_days: number;
    credit_limit: number;
    early_repayment_discount_percent?: number;
}

export type ContentStatus = 'draft' | 'published' | 'disabled';

export type InstitutionalPageKey = 'faq' | 'solutions' | 'benefits' | 'about' | 'landing';

export interface InstitutionalCategory {
    id: string;
    name: string;
    slug: string;
}

export interface InstitutionalTag {
    id: string;
    name: string;
    slug: string;
}

export interface InstitutionalContentImage {
    id: number;
    content_id: string;
    storage_path: string;
    alt_text?: string;
    order_index?: number;
}

export interface InstitutionalContent {
    id: string;
    page_key: InstitutionalPageKey;
    title: string;
    description?: string;
    slug: string;
    status: ContentStatus;
    is_active: boolean;
    category_id?: string | null;
    author_id?: string | null;
    metadata?: any;
    order_index?: number;
    created_at?: string;
    updated_at?: string;
    images?: InstitutionalContentImage[];
    tags?: InstitutionalTag[];
}

export interface InstitutionalContentVersion {
    id: number;
    content_id: string;
    version: number;
    snapshot: any;
    created_at: string;
    created_by?: string | null;
}

export interface MaintenanceSettings {
    is_active: boolean;
    start_time: string;
    end_time: string;
    message: string;
}

export interface BlitzAlert {
    id: string;
    user_id: string;
    type: 'BLITZ' | 'ACCIDENT' | 'TRAFFIC' | 'DANGER';
    lat: number;
    lng: number;
    city?: string;
    address?: string;
    created_at: string;
}

export interface AdminDashboardStats {
    orders: { today: number, week: number, month: number, total: number, graphData: { date: string, count: number }[], trend?: number };
    finance: {
        gmv: number;
        platformRevenue: number;
        averageTicket: number;
        gmvTrend?: number;
        revenueTrend?: number;
        recharges?: number;      // Recargas de Lojas
        fees?: number;           // Taxas de Lojas
        subscriptions?: number;  // Assinaturas de Lojas
        driverFees?: number;     // Taxas de Motoristas
    };
    users: { stores: { active: number, total: number }, drivers: { online: number, total: number } };
}



export interface ReferralHistoryItem {
    id: string;
    referred_user_name: string;
    status: 'PENDING' | 'REWARDED';
    created_at: string;
}

export interface AdminWalletUser {
    user_id: string;
    name: string;
    email: string;
    role: string;
    balance: number; // Saldo da carteira da loja (store_wallets)
    personal_balance?: number; // Saldo da carteira pessoal (driver_wallets)
    is_super_store?: boolean;
}

export interface FinancialStatementItem {
    id: string;
    date: string;
    type: 'EARNING' | 'WITHDRAWAL' | 'FEE' | 'ADJUSTMENT' | 'DEBIT' | 'REFUND';
    description: string;
    amount: number;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    payer?: string;
}

export interface LiveLocationPayload {
    lat: number;
    lng: number;
    type: 'BLITZ' | 'ACCIDENT' | 'TRAFFIC' | 'DANGER';
    address?: string;
    city?: string;
    created_at: string;
    expires_at: string;
}

export interface ZebankTransaction {
    id: string;
    type: 'TRANSFER_P2P' | 'TRANSFER_STORE' | 'WITHDRAWAL_EMERGENCY' | 'SAVINGS_DEPOSIT' | 'SAVINGS_RETRIEVE' | 'EARNING' | 'PAYMENT' | 'INTERNAL_TRANSFER';
    amount: number;
    description: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    direction: 'IN' | 'OUT';
    created_at: string;
    payer_name?: string;
}

export interface ZePayData {
    balance: number;
    my_code: string;
    cards: StoreVirtualCard[];
    recent_transactions: ZePayTransaction[];
}

export interface ZePayTransaction {
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
}

export interface StoreVirtualCard {
    id: string;
    name: string;
    card_number: string; // Masked
    spending_limit_percent: number;
    status: 'ACTIVE' | 'BLOCKED';
}

export interface PartnerRating {
    id: string;
    rating: number;
    comment: string;
    direction: RatingDirection; // used alias
    created_at: string;
    evaluator_name?: string;
    evaluated_name?: string;
    evaluator_id?: string;
    evaluated_id?: string;
    store_response?: string;
    store_response_at?: string;
    is_anonymous?: boolean;
    evaluated_slug?: string;
    evaluated_city_slug?: string;
}

// Removed duplicate OfflineDriver


// Removed duplicate StoreDeliveryPartner


export interface HistoryFilters {
    startDate?: string;
    endDate?: string;
    status?: PartnerRequestStatus | 'ALL';
}

export interface UserTerminal {
    id: string;
    user_id: string;
    terminal_id: string;
    api_key: string;
    status: 'ACTIVE' | 'INACTIVE';
    activated_at: string;
    deactivated_at?: string;
    label?: string;
    fee_payer?: 'MERCHANT' | 'CUSTOMER';
    pin_code?: string;
    // FIX: Add missing optional 'auto_lock_minutes' property to the UserTerminal interface.
    auto_lock_minutes?: number;
}

export interface UserTerminalTransaction {
    id: string;
    terminal_id: string;
    amount: number;
    status: string;
}

export interface Collaborator {
    id: string;
    store_id: string;
    email: string;
    name: string;
    active: boolean;
    function: 'waiter' | 'kitchen';
    created_at: string;
    avatar_url?: string;
}

export interface CollaboratorOrder {
    id: string;
    store_id: string;
    collaborator_id?: string;
    table_identifier: string;
    status: 'opened' | 'sent' | 'completed';
    created_at: string;
    items?: CollaboratorOrderItem[];
}

export interface CollaboratorOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    additional: any[];
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: Product;
}

export interface InstitutionalCategory {
    id: string;
    name: string;
    slug: string;
    image_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserTerminalHistoryItem {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    payer_name: string;
}

export interface ZebankData {
    balance: number;
    savings_balance: number;
    my_code: string;
    partner_level: string;
    cards: ZebankCard[];
    recent_transactions: ZebankTransaction[];
    cofrinho_balance?: number;
    cofrinho_accrued_yield?: number;
    cofrinho_next_withdrawal_date?: string;
    cofrinho_rate?: string;
    cofrinho_rules?: string;
    next_payout_date?: string;
}

export interface ZebankCard {
    id: string;
    name: string;
    card_number: string;
    card_last_four: string;
    expiration_date: string;
    cvv: string;
    card_holder: string;
    status: 'ACTIVE' | 'BLOCKED';
    spending_limit_percent?: number;
    type?: 'VIRTUAL' | 'PHYSICAL';
    brand?: 'mastercard' | 'visa';
}

// Removed duplicate ZebankTransaction


export interface AssociatedStore {
    id: string;
    name: string;
    // Adicionar outros campos relevantes se necessário, como terminal_id da loja
    // ou informações de contato do lojista.
}

export interface SalesSimulation {
    id: string;
    user_id: string;
    sale_value: number;
    fee_payer: 'seller' | 'buyer';
    gross_value: number;
    net_value: number;
    fees: number;
    created_at: string;
}

export interface DriverPaymentInfo {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
    role: UserRole;
    bank_details?: UserBankDetails;
    automatic_payouts_enabled?: boolean;
    preferred_payout_method_type?: PayoutMethodType; // NOVO
}

export interface PendingPayoutSummary {
    driver_id: string;
    driver_name: string;
    driver_email: string;
    driver_automatic_payouts_enabled: boolean;
    eligible_earnings: number;
    next_payout_date?: string | null;
    last_payout_date?: string | null;
}

// LoanStatus definido mais abaixo no módulo de Empréstimos (2026-01-11)

export interface LoanItem {
    id: string;
    borrowerName: string;
    amount: number;
    startDate: string;
    dueDate: string;
    status: LoanStatus;
    outstandingBalance: number;
}

export interface LoanSummary {
    totalLoaned: number;
    totalPaid: number;
    totalOutstanding: number;
    overdueCount: number;
}

export interface AppSlide {
    id: string;
    name: string;
    image_url: string;
    link?: string;
    display_days: number;
    target_audience: 'drivers' | 'merchants' | 'both';
    is_active: boolean;
    created_at: string;
    expires_at?: string;
}

export interface CityStoreBanner {
    id: string;
    city_slug: string;
    name: string;
    image_url: string;
    link?: string;
    is_active: boolean;
    starts_at?: string;
    ends_at?: string;
    sort_order?: number;
    created_at: string;
    updated_at?: string;
}

export interface CityStoreBannerAssets {
    id: string;
    template_link?: string;
    canva_link?: string;
    created_at: string;
    updated_at?: string;
}

export interface CityStoreBannerRequest {
    id: string;
    store_id: string;
    city_slug: string;
    request_type: string;
    topic?: string;
    status: string;
    banner_url?: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
    store?: {
        id: string;
        name?: string;
        store_name?: string;
        city?: string;
        city_slug?: string;
    };
}

export interface CityStoreBannerRequestMessage {
    id: string;
    request_id: string;
    sender_id?: string;
    sender_role: 'store' | 'admin';
    message: string;
    message_type?: 'text' | 'file';
    file_url?: string;
    file_name?: string;
    file_mime_type?: string;
    file_size?: number;
    created_at: string;
}


export interface CityStoreHighlightSettings {
    id: string;
    highlight_price: number;
    highlight_duration_days: number;
    cancel_fee?: number;
    banner_ready_price?: number;
    banner_design_price?: number;
    banner_duration_days?: number;
    banner_enabled?: boolean;
    highlight_enabled?: boolean;
    created_at: string;
    updated_at?: string;
}


export interface CityStoreHighlightOrder {
    id: string;
    store_id: string;
    city_slug: string;
    amount_paid: number;
    duration_days: number;
    starts_at: string;
    ends_at: string;
    status: string;
    created_at: string;
    updated_at?: string;
    views_count?: number;
    clicks_count?: number;
    store?: {
        id: string;
        name?: string;
        store_name?: string;
        city?: string;
        city_slug?: string;
    };
}

export interface CityPromotionOrder {
    id: string;
    store_id: string;
    city_slug: string;
    order_type: 'BANNER' | 'HIGHLIGHT';
    amount_paid: number;
    duration_days?: number;
    payment_method: 'WALLET' | 'PIX' | 'CREDIT_CARD';
    payment_status: 'PENDING' | 'PAID' | 'CANCELLED';
    external_payment_id?: string;
    banner_request_id?: string;
    highlight_order_id?: string;
    metadata?: any;
    created_at: string;
    updated_at?: string;
}


export interface MarketingTemplate {
    id: string;
    name: string;
    category: string;
    format: 'square' | 'story' | 'horizontal';
    config: MarketingCanvasConfig;
    thumbnail_url?: string;
    is_active: boolean;
}

export interface MarketingDesign {
    id: string;
    user_id: string;
    template_id?: string;
    name: string;
    config: MarketingCanvasConfig;
    last_image_url?: string;
    created_at: string;
    updated_at: string;
    related_user_id?: string;
}



export interface MarketingCanvasConfig {
    backgroundColor: string;
    backgroundImageUrl?: string; // Imagem de fundo opcional
    textColor: string;
    format: 'post' | 'story'; // Formato do canvas
    elements: MarketingElement[];
}

export interface MarketingElement {
    id: string;
    type: 'text' | 'image' | 'icon';
    // Posicionamento livre (obrigatórios)
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number; // Controle de camadas
    // Propriedades de texto
    text?: string;
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string; // Fonte do Google Fonts
    color?: string;
    // Propriedades de imagem
    shape?: 'square' | 'circle';
    imageUrl?: string;
    iconName?: string;
    // Bordas
    borderColor?: string;
    borderWidth?: number;
    rotation?: number; // Rotação em graus (0-360)
}

// ==================================================================
// LOAN MODULE TYPES (2026-01-11)
// ==================================================================

export type LoanStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'PAID' | 'DEFAULTED' | 'OVERDUE';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';

export interface LoanType {
    id: string;
    name: string;
    description?: string;
    interest_rate_monthly: number;
    max_installments: number;
    max_amount?: number;
    target_audience?: 'STORE' | 'COURIER' | 'BOTH';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LoanLevelLimit {
    id: string;
    user_type: 'DELIVERY' | 'STORE';
    partner_level: string;
    max_limit: number;
    max_installments: number;
    allow_negative_balance: boolean;
    created_at: string;
    updated_at: string;
}

export interface PartnerLoan {
    id: string;
    user_id: string;
    loan_type_id: string;
    amount_requested: number;
    amount_total: number;
    installments_count: number;
    interest_rate_applied: number;
    status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'OVERDUE';
    created_at: string;
    rejection_reason?: string;
    disbursement_method?: 'WALLET' | 'BANK_ACCOUNT';
    updated_at: string;

    // Joined data
    loan_type?: LoanType;
    user?: {
        name: string;
        email: string;
        partner_level?: string;
        avatar_url?: string;
        cpf?: string;
        phone_number?: string;
        vehicle_type?: string;
        bank_details?: UserBankDetails;
    };
}

export interface LoanInstallment {
    id: string;
    loan_id: string;
    installment_number: number;
    due_date: string;
    amount: number;
    status: InstallmentStatus;
    paid_amount: number;
    paid_at?: string;
    created_at: string;
    updated_at: string;
}

export interface LoanAuditLog {
    id: string;
    loan_id?: string;
    action: string;
    details: any;
    performed_by?: string;
    created_at: string;
}

export interface LoanSimulation {
    amount: number;
    loan_type_id: string;
    installments_count: number;
    interest_rate: number;
    amount_per_installment: number;
    total_amount: number;
    total_interest: number;
    first_due_date: string;
}

export interface LoanConfig {
    is_enabled: boolean;
    auto_approve: boolean;
    require_approval: boolean;
    allow_manual_payment: boolean;
    deduct_from_payout: boolean;
}

export interface StoreDeliverySettings {
    id: string;
    store_id: string;
    is_pickup_enabled: boolean;
    is_own_delivery_enabled: boolean;
    own_delivery_mode: 'FIXED' | 'NEIGHBORHOOD' | 'RADIUS';
    fixed_fee: number;
    is_partner_delivery_enabled: boolean;
    radius_km: number;
    delivery_time_min: number;
    delivery_time_max: number;
    created_at: string;
    updated_at: string;
    // Legado suportado via mapping se necessário, mas ideal usar novos
    allow_outside_city?: boolean;
}
export interface StoreNeighborhoodFee {
    id: string;
    store_id: string;
    neighborhood_name: string;
    fee: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AnalysisReport {
    score: number;
    summary: string;
    metrics: {
        descriptionQuality: number;
        mixCompleteness: number;
        pricingConsistency: number;
    };
    strengths: string[];
    weaknesses: string[];
}

export interface AnalysisSuggestion {
    id: string;
    type: 'improvement' | 'new_product';
    suggestion: string;
    reason: string;
    new_data?: Partial<StoreProduct & { category_name: string }>;
}





export interface MediationSession {
    id: string;
    order_id: string;
    status: 'ACTIVE' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';
    current_step: string;
    ai_memory: any;
    created_at: string;
    updated_at: string;
    order?: Order;
}

export interface MediationAction {
    id: string;
    session_id: string;
    action_type: string;
    description: string;
    payload: any;
    created_at: string;
}

export interface Promotion {
    id: string;
    store_id: string;
    name: string;
    description?: string;
    discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
    discount_value: number;
    min_order_value: number;
    start_date: string;
    end_date?: string | null;
    is_active: boolean;
    applies_to_all_products: boolean;
    products?: string[]; // IDs dos produtos (carregados via junção)
    created_at?: string;
    updated_at?: string;
}

export interface Coupon {
    id: string;
    store_id: string;
    city_id?: string | null;
    category_id?: string | null;
    code: string;
    description?: string;
    discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
    discount_value: number;
    min_order_value: number;
    max_discount_value?: number | null;
    usage_limit?: number | null;
    user_usage_limit?: number | null;
    usage_count: number;
    start_date: string;
    end_date?: string | null;
    is_active: boolean;
    is_stackable: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface RatingChangeRequest {
    id: string;
    protocol: string;
    store_id: string;
    rating_id: string;
    request_types: ('EDIT_COMMENT' | 'DELETE_RATING')[];
    status: 'OPEN' | 'IN_ANALYSIS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
    reason: string;
    new_comment?: string;
    fee_charged: number;
    base_value?: number;
    discount_percent_applied?: number;
    discount_value?: number;
    final_value?: number;
    executed_by?: string;
    admin_notes?: string;
    created_at: string;
    updated_at: string;
    store?: {
        name: string;
        store_name?: string;
    };
    rating?: PartnerRating;
}


export interface SystemFee {
    key: string;
    description: string;
    value: number;
    updated_at?: string;
    updated_by?: string;
}

// ============================================================================
// ADICIONAIS - CATÁLOGO BASE (ADMIN)
// ============================================================================

export interface BaseAddonGroup {
    id: string;
    name: string;
    type: 'SINGLE' | 'MULTIPLE';
    min: number;
    max: number;
    is_active: boolean;
    options: BaseAddonOption[];
    created_at?: string;
    updated_at?: string;
}

export interface BaseAddonOption {
    id: string;
    group_id: string;
    name: string;
    price: number;
    is_active: boolean;
    created_at?: string;
}

// ============================================================================
// SISTEMA DE INDIQUE E GANHE (PONTOS)
// ============================================================================

export interface ReferralConfig {
    id: string;
    is_active: boolean;
    points_per_referral_user: number;
    points_per_referral_store: number;
    points_per_referral_courier: number;
    reward_validity_days: number;
    min_order_value_for_credit: number;
    updated_at: string;
}

export interface ReferralReward {
    id: string;
    title: string;
    description?: string;
    cost_points: number;
    reward_type: 'CUPOM_FIXED' | 'CUPOM_PERCENT' | 'FREE_SHIPPING';
    reward_value: number;
    min_order_value: number;
    is_active: boolean;
    created_at: string;
}

export interface ReferralPointTransaction {
    id: string;
    user_id: string;
    operation_type: 'CREDIT_REFERRAL' | 'DEBIT_REDEEM' | 'CREDIT_BONUS' | 'REVERSAL';
    amount: number;
    balance_after: number;
    description: string;
    reference_id?: string;
    created_at: string;
}

export interface ClaimedReward {
    id: string;
    user_id: string;
    reward_id: string;
    coupon_code: string;
    status: 'ACTIVE' | 'USED' | 'EXPIRED';
    created_at: string;
    expires_at: string;
}

export interface ReferralDashboardData {
    balance: number;
    my_code: string;
    history: ReferralPointTransaction[];
    rewards: ReferralReward[];
    active_claims: ClaimedReward[];
}

export interface ValidateReferralCodeResponse {
    valid: boolean;
    referrer_id?: string;
    referrer_name?: string;
    message?: string;
}

export interface AdminReferralHistoryEntry extends ReferralPointTransaction {
    referrer_name?: string;
    referrer_role?: string;
    referred_name?: string;
}

export interface WhatsBotStatus {
    enabled: boolean;
    connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'WAITING_QR';
    qrCode?: string;
    connectedPhone?: string | null;
    customMessage: string;
    catalogUrl: string;
    lastError?: string | null;
}

export interface WhatsBotConfigPayload {
    customMessage: string;
}
