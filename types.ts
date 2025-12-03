
export type Theme = 'light' | 'dark';
export type UserRole = 'admin' | 'store_partner' | 'delivery_partner' | 'delivery_person';
export type UserStatus = 'active' | 'banned' | 'pending';
export type PartnerRequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'RETURNING' | 'AWAITING_STORE_DECISION';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'CASH';
export type DocumentType = 'CNH' | 'CRLV' | 'VEHICLE_PHOTO' | 'ADDRESS_PROOF' | 'SELFIE' | 'PERSONAL_ID';
export type VehicleType = 'moto' | 'car' | 'bike' | 'other';
export type PunishmentType = 'BAN' | 'SUSPENSION' | 'WARNING';
export type RatingDirection = 'STORE_TO_PARTNER' | 'PARTNER_TO_STORE';
export type AdminSubTab = 'dashboard' | 'users' | 'validation' | 'notifications' | 'shop' | 'support' | 'ai_config' | 'fees' | 'pwa' | 'payouts' | 'cities' | 'asaas_webhook' | 'levels' | 'ratings' | 'security' | 'blacklist' | 'referrals' | 'institutional' | 'platform_news' | 'store_finance' | 'wallet_control' | 'claims';

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

export interface SavedRoute {
    id: string;
    name: string;
    waypoints: ManualWaypoint[];
}

export interface HistoryFilters {
    startDate?: string;
    endDate?: string;
    status?: PartnerRequestStatus | 'ALL';
    minPrice?: number;
    maxPrice?: number;
}

export interface LiveLocationPayload {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    status?: PartnerRequestStatus;
    updated_at: string;
}

export interface DailyTransaction {
    id: string;
    type: 'standard' | 'extra' | 'expense';
    value: number;
    km?: number;
    timestamp: number;
    description?: string;
    category?: string; // for expenses
    paymentMethod?: 'cash' | 'digital';
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
    paymentBreakdown?: { cash: number; digital: number };
    expenseBreakdown?: Record<string, number>;
}

export interface SavedAddress {
    id: string;
    name: string;
    fullAddress: string;
    createdAt: number;
    visitCount?: number;
    lastVisited?: number;
}

export interface UserBankDetails {
    fullName: string;
    pixKey: string;
    pixType: 'cpf' | 'email' | 'phone' | 'random';
    bankName?: string;
    bankNumber?: string;
    agency?: string;
    account?: string;
    accountType?: 'corrente' | 'poupanca';
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
    destination: { lat: number; lng: number; name: string; fullAddress: string };
    steps: any[];
    currentStepIndex: number;
    routeGeoJSON: any;
    initialTotalDistance: number;
    initialTotalDuration: number;
}

export interface PromotionDetails {
    name: string;
    phone: string;
    description: string;
    services: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export type StorageKey = 'delivery_today_transactions' | 'delivery_history' | 'saved_addresses' | 'custom_reminder_time' | 'delivery_fixed_value' | 'delivery_daily_goal' | 'user_bank_details' | 'vehicle_maintenance_v2' | 'promotion_details' | 'chat_assistant_history' | 'ai_reminders' | 'app_cookie_preferences' | 'saved_routes' | 'notification_preferences' | 'task_list' | 'route_list_items';

export interface Reminder {
    id: string;
    text: string;
    date: string; // ISO
    completed: boolean;
}

export interface CookiePreferences {
    functionality: boolean;
    analytics: boolean;
    performance: boolean;
}

export interface NotificationPreferences {
    user_id?: string;
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

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    images?: string[];
    stock_quantity: number | null;
    is_active: boolean;
    category_id?: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface OrderItem {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
}

export interface DailySummary {
    profit: number;
    deliveryCount: number;
    km: number;
    goal: number | null;
    location: { lat: number; lng: number } | null;
}

export interface GlobalNotification {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

export interface ManagedUser {
    id: string;
    email: string;
    created_at: string;
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
    verification_status?: string;
    is_available?: boolean;
    vehicle_type?: string;
    average_rating?: number;
    is_super_store?: boolean;
    vehicle_plate?: string;
    completed_deliveries?: number;
    association_code?: string;
    balance?: number; // Visual only for lists
}

export interface CompanyInfo {
    about_text?: string;
    careers_email?: string;
    careers_text?: string;
    press_email?: string;
    press_text?: string;
    contact_address?: string;
    contact_support_email?: string;
    contact_commercial_email?: string;
}

export interface ShopCoupon {
    code: string;
    discount_percent: number;
    active: boolean;
}

export interface ShopSettings {
    id: boolean;
    is_shop_enabled?: boolean;
    asaas_active?: boolean;
    payment_methods?: { pix: boolean; boleto: boolean; credit_card: boolean };
    asaas_api_key?: string;
    social_media?: any;
    company_info?: CompanyInfo;
    shop_name?: string;
    shop_city?: string;
    support_phone?: string;
    support_hours_start?: string;
    support_hours_end?: string;
    banner_title?: string;
    banner_subtitle?: string;
    banner_tag?: string;
    shipping_origin_cep?: string;
    free_shipping_threshold?: number;
    coupons?: ShopCoupon[];
    google_gemini_api_key?: string;
    support_status_override?: 'AUTO' | 'OPEN' | 'CLOSED';
}

export interface Category {
    id: string;
    name: string;
}

export interface Order {
    id: string;
    user_id: string;
    items: OrderItem[];
    total_price: number;
    payment_method: PaymentMethod;
    status: string;
    created_at: string;
    shipping_address?: any;
    payment_details?: any;
    shipping_cost?: number;
    discount?: number;
    coupon_code?: string;
    asaas_pix_copy_paste?: string;
    asaas_bank_slip_url?: string;
    store?: any;
    partner?: any;
}

export interface AdminOrder extends Order {}

export interface Claim {
    id: string;
    user_id: string;
    type: string;
    description: string;
    status: 'open' | 'resolved' | 'closed';
    created_at: string;
    admin_response?: string;
    user_email?: string;
}

export interface StoreWallet {
    store_id: string;
    balance: number; // integer representation (cents)
    balance_decimal: number; // visual float representation
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    store_id: string;
    amount: number;
    type: string;
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
    emergency_message?: string;
}

export interface PWASettings {
    name: string;
    short_name: string;
    theme_color: string;
    background_color: string;
    description: string;
}

export interface PWAIcon {
    src: string;
    sizes: string;
    type: string;
}

export interface PayoutSummary {
    settings: PartnerFeeSettings;
    max_emergency_value: number;
    can_request_emergency: boolean;
}

export interface PayoutSettings {
    weekday: number;
    hour: string;
    emergency_percentage: number;
    emergency_cooldown_hours: number;
    emergency_enabled: boolean;
}

export interface City {
    id: number;
    name: string;
    state: string;
    is_active: boolean;
}

export interface CityRequest {
    id: string;
    city_name: string;
    state: string;
    user_email: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AsaasWebhookLog {
    id: string;
    event_type: string;
    payload: any;
    status: string;
    action_taken?: string;
    created_at: string;
}

export interface PartnerProfile {
    user_id: string;
    name?: string;
    email?: string;
    phone_number?: string;
    is_active: boolean;
    is_available: boolean;
    city?: string;
    verification_status?: string;
    vehicle_type: VehicleType;
    vehicle_plate?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    asaas_wallet_id?: string;
    partner_level?: string;
    average_rating?: number;
    completed_deliveries?: number;
    association_code?: string;
    share_phone_offline?: boolean;
    
    // Extended Store Fields
    address_street?: string;
    address_number?: string;
    address_district?: string;
    address_zip?: string;
    address_state?: string;
    contact_email?: string;
    opening_hours?: string;
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
    level: string;
    display_name: string;
    min_deliveries: number;
    min_rating: number;
    store_discount_percent: number;
    service_fee_reduction_percent: number;
}

export interface PartnerRequestLog {
    id: string;
    request_id: string;
    status_from: string;
    status_to: string;
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

export interface BlacklistEntry {
    id: string;
    user_id: string;
    reason: string;
    admin_id: string;
    created_at: string;
    email?: string;
    phone_number?: string;
    status?: string;
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
    created_at: string;
}

export interface PartnerRating {
    id: string;
    rating: number;
    comment: string;
    direction: RatingDirection;
    created_at: string;
}

export interface WorkShift {
    id: string;
    partner_id: string;
    start_time: string;
    end_time?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    breaks?: { start: string, end?: string }[];
}

export interface WorkShiftBreak {
    start: string;
    end?: string;
}

export interface FinancialStatementItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'EARNING' | 'WITHDRAWAL' | 'FEE' | 'ADJUSTMENT';
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface IdentityVerification {
    id: string;
    user_id: string;
    photo_url: string;
    location_data: any;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    created_at: string;
}

export interface FraudAlert {
    id: string;
    user_id: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    created_at: string;
}

export interface ChatMessageData {
    id: string;
    order_id?: string;
    sender_id: string;
    receiver_id?: string | null;
    message: string;
    type: string;
    created_at: string;
    is_read: boolean;
    pending?: boolean; // UI only
}

export interface AdminDashboardStats {
    orders: { today: number, week: number, month: number, total: number, graphData: any[] };
    finance: { gmv: number, platformRevenue: number, averageTicket: number };
    users: { stores: { active: number, total: number }, drivers: { online: number, total: number } };
}

export interface ReferralData {
    my_code: string;
    total_referrals: number;
    is_reward_active: boolean;
    reward_active_until?: string;
}

export interface ReferralHistoryItem {
    id: string;
    referred_user_name: string;
    created_at: string;
    status: string;
}

export interface StoreReportData {
    totalRequests: number;
    totalValue: number;
    peakHours: { hour: number, count: number }[];
    driverPerformance: { partner_id: string, partner_name: string, count: number }[];
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
    created_at: string;
}

export interface AdminWalletUser {
    user_id: string;
    name: string;
    email: string;
    role: string;
    balance: number;
}

export interface BlitzAlert {
    id: string;
    user_id: string;
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
    related_user_id?: string;
}

export interface ZebankCard {
    id: string;
    card_number: string; // Full number for simulation
    card_last_four: string;
    card_holder: string;
    expiration_date: string;
    cvv?: string; 
    type: 'VIRTUAL' | 'PHYSICAL';
    status: 'ACTIVE' | 'BLOCKED';
    brand?: 'mastercard' | 'visa'; 
}

export interface ZebankData {
    balance: number;
    savings_balance: number;
    recent_transactions: ZebankTransaction[];
    cards?: ZebankCard[];
    next_payout_date?: string;
    my_code?: string;
    partner_level?: string;
}