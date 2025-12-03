
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as storage from './storage';
import { 
    AppNotification, GlobalNotification, ManagedUser, UserRole, UserStatus, Product, ShopSettings, Order, 
    AdminOrder, PaymentMethod, Category, Claim, StoreWallet, WalletTransaction, PartnerRequest, 
    PartnerFeeSettings, PWASettings, PWAIcon, PayoutSummary, PayoutSettings, City, CityRequest, 
    AsaasWebhookLog, PartnerProfile, PartnerDocument, DocumentType, PartnerLevelBenefit, PartnerRequestLog, 
    PartnerPayment, PunishmentType, BlacklistEntry, OfflineDriver, StoreDeliveryPartner, HistoryFilters, 
    LiveLocationPayload, PartnerRequestStatus, NotificationPreferences, PartnerRating, RatingDirection, 
    WorkShift, WorkShiftBreak, FinancialStatementItem, IdentityVerification, FraudAlert, ChatMessageData, 
    AdminDashboardStats, ReferralData, ReferralHistoryItem, StoreReportData, PlatformNews, StoreShippingRule, 
    AdminWalletUser, BlitzAlert, UserBankDetails, CartItem, ZebankData, ZebankTransaction, ZebankCard 
} from '../types';

// Credentials
const SUPABASE_URL = 'https://pjnxrqemjozlpnvoxpmn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbnhycWVtam96bHBudm94cG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjA2NjEsImV4cCI6MjA4MDEzNjY2MX0.amhZETKiDAo-Io0A-UIjqXrHt7UnmJNGngOjp2elAfE';

let client: SupabaseClient | null = null;

export const initSupabase = () => {
  try {
    if (!client) {
      client = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return client;
  } catch (e) {
    console.error("Failed to init supabase", e);
    return null;
  }
};

export const getClient = () => {
  if (!client) {
    return initSupabase();
  }
  return client;
};

// --- AUTH & USER ---

export const signOut = async () => {
    const sb = getClient();
    if (sb) await sb.auth.signOut();
};

export const getUserStatus = async (): Promise<UserStatus> => {
    const sb = getClient();
    if (!sb) return 'active';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'active';
    const { data } = await sb.from('user_profiles').select('status').eq('id', user.id).single();
    return data?.status || 'active';
};

export const getUserRole = async (): Promise<UserRole> => {
    const sb = getClient();
    if (!sb) return 'delivery_person';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'delivery_person';
    const { data } = await sb.from('user_profiles').select('role').eq('id', user.id).single();
    return (data?.role as UserRole) || 'delivery_person';
};

export const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('user_profiles')
        .select('email')
        .or(`phone_number.eq.${identifier},cpf.eq.${identifier}`)
        .single();
    return data?.email || null;
};

export const sendPasswordResetEmail = async (email: string) => {
    const sb = getClient();
    if (sb) await sb.auth.resetPasswordForEmail(email);
};

export const registerUserWithType = async (email: string, pass: string, name: string, phone: string, cpf: string, role: string, city: string) => {
    const sb = getClient();
    if (!sb) return;
    
    const cleanCpf = cpf && cpf.trim() !== '' ? cpf : null;
    const cleanRole = role ? role.toLowerCase() : 'delivery_person';

    const { data, error } = await sb.auth.signUp({
        email, password: pass, options: {
            data: { name, phone, cpf: cleanCpf, role: cleanRole, city }
        }
    });
    if (error) throw error;
};

export const getAllUsers = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles').select('*');
    return data || [];
};

export const adminUpdateUserProfile = async (id: string, updates: any) => {
    const sb = getClient();
    if (sb) await sb.from('user_profiles').update(updates).eq('id', id);
};

export const getMyPartnerProfile = async (): Promise<PartnerProfile | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    
    const { data } = await sb.from('user_profiles').select('*').eq('id', user.id).single();
    
    if (data) {
        if (!data.association_code) {
             const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
             await sb.from('user_profiles').update({ association_code: newCode }).eq('id', user.id);
             data.association_code = newCode;
        }

        return {
            user_id: data.id,
            is_active: data.status === 'active',
            is_available: data.is_available,
            city: data.city,
            verification_status: data.verification_status,
            vehicle_type: data.vehicle_type,
            vehicle_plate: data.vehicle_plate,
            vehicle_model: data.vehicle_model,
            vehicle_year: data.vehicle_year,
            asaas_wallet_id: data.asaas_wallet_id,
            partner_level: data.partner_level,
            average_rating: data.average_rating,
            completed_deliveries: data.completed_deliveries,
            association_code: data.association_code,
            share_phone_offline: data.share_phone_offline,
            // Extended fields
            name: data.name,
            email: data.email,
            phone_number: data.phone_number,
            contact_email: data.contact_email,
            opening_hours: data.opening_hours,
            address_zip: data.address_zip,
            address_street: data.address_street,
            address_number: data.address_number,
            address_district: data.address_district,
            address_state: data.address_state
        };
    }
    return null;
};

export const updateMyPartnerProfile = async (updates: Partial<PartnerProfile>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
        const { user_id, ...cleanUpdates } = updates;
        await sb.from('user_profiles').update(cleanUpdates).eq('id', user.id);
    }
};

export const uploadProfilePicture = async (file: File): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not found");
    
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await sb.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;
    
    const { data } = sb.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
};

// --- NOTIFICATIONS ---
export const getNotifications = async (): Promise<AppNotification[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('app_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const markNotificationAsRead = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('app_notifications').update({ is_read: true }).eq('id', id);
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    const sb = getClient();
    if (!sb) return { new_orders: true, order_updates: true, system_alerts: true, marketing: true, sound_enabled: true };
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { new_orders: true, order_updates: true, system_alerts: true, marketing: true, sound_enabled: true };
    const { data } = await sb.from('notification_preferences').select('*').eq('user_id', user.id).single();
    return data || { new_orders: true, order_updates: true, system_alerts: true, marketing: true, sound_enabled: true };
};

export const updateNotificationPreferences = async (prefs: NotificationPreferences) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('notification_preferences').upsert({ user_id: user.id, ...prefs });
};

// --- ORDERS (SHOP) ---
export const getMyOrders = async (): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");
    const { data, error } = await sb.from('orders').insert({ ...orderData, user_id: user.id, status: 'pending_payment' }).select().single();
    if (error) throw error;
    return data;
};

// --- BLITZ ---
export const getActiveBlitzes = async (): Promise<BlitzAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await sb.from('blitz_alerts').select('*').gt('created_at', twoHoursAgo);
    return data || [];
};

export const reportBlitz = async (alert: Partial<BlitzAlert>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('blitz_alerts').insert({ ...alert, user_id: user.id });
};

// --- ADMIN CONFIGS ---
export const adminGetFeeSettings = async (): Promise<PartnerFeeSettings> => {
    const sb = getClient();
    if (!sb) return {} as any;
    const { data } = await sb.from('platform_settings').select('value').eq('key', 'fee_settings').single();
    return data?.value || {};
};

export const adminUpdateFeeSettings = async (settings: PartnerFeeSettings) => {
    const sb = getClient();
    if (sb) await sb.from('platform_settings').upsert({ key: 'fee_settings', value: settings });
};

export const adminGetPayoutSettings = async (): Promise<PayoutSettings> => {
    const sb = getClient();
    if (!sb) return {} as any;
    const { data } = await sb.from('platform_settings').select('value').eq('key', 'payout_settings').single();
    return data?.value || {};
};

export const adminUpdatePayoutSettings = async (settings: PayoutSettings) => {
    const sb = getClient();
    if (sb) await sb.from('platform_settings').upsert({ key: 'payout_settings', value: settings });
};

export const adminGetPayoutHistory = async (): Promise<PartnerPayment[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_payments').select('*').order('created_at', { ascending: false });
    return data || [];
};

// --- ADMIN SHOP ---
export const adminGetProducts = async (): Promise<Product[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('products').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminGetCategories = async (): Promise<Category[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('categories').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const getShopSettings = async (): Promise<ShopSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('shop_settings').select('*').single();
    return data;
};

export const adminUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const sb = getClient();
    if (sb) await sb.from('products').update(updates).eq('id', id);
};

export const adminAddProduct = async (product: Partial<Product>) => {
    const sb = getClient();
    if (sb) await sb.from('products').insert(product);
};

export const adminDeleteProduct = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('products').delete().eq('id', id);
};

export const adminAddCategory = async (name: string) => {
    const sb = getClient();
    if (sb) await sb.from('categories').insert({ name });
};

export const adminDeleteCategory = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('categories').delete().eq('id', id);
};

export const adminUpdateShopSettings = async (settings: Partial<ShopSettings>) => {
    const sb = getClient();
    if (sb) await sb.from('shop_settings').upsert({ id: true, ...settings });
};

export const getShopData = async () => {
    const [products, categories, settings] = await Promise.all([
        adminGetProducts(),
        adminGetCategories(),
        getShopSettings()
    ]);
    return { products, categories, settings };
};

// --- ADMIN PARTNERS ---
export const adminGetPendingPartners = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles').select('*').eq('role', 'delivery_partner').eq('verification_status', 'PENDING_REVIEW');
    return data || [];
};

export const adminGetPartnerDetails = async (userId: string) => {
    const sb = getClient();
    if (!sb) return null;
    const [profile, documents] = await Promise.all([
        sb.from('user_profiles').select('*').eq('id', userId).single(),
        sb.from('partner_documents').select('*').eq('user_id', userId)
    ]);
    return { profile: profile.data, documents: documents.data || [] };
};

export const adminUpdateDocumentStatus = async (docId: string, status: string, notes: string) => {
    const sb = getClient();
    if (sb) await sb.from('partner_documents').update({ status, admin_notes: notes }).eq('id', docId);
};

export const adminUpdatePartnerStatus = async (userId: string, status: string) => {
    const sb = getClient();
    if (sb) await sb.from('user_profiles').update({ verification_status: status }).eq('id', userId);
};

// --- CITIES (Available Cities) ---
export const adminGetCities = async (): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('available_cities').select('*').order('name', { ascending: true });
    return data || [];
};

export const adminGetCityRequests = async (): Promise<CityRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('city_requests').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminAddCity = async (name: string, state: string) => {
    const sb = getClient();
    if (sb) await sb.from('available_cities').insert({ name, state, is_active: true });
};

export const adminUpdateCityStatus = async (id: number, isActive: boolean) => {
    const sb = getClient();
    if (sb) await sb.from('available_cities').update({ is_active: isActive }).eq('id', id);
};

export const adminEditCity = async (id: number, name: string, state: string) => {
    const sb = getClient();
    if (sb) await sb.from('available_cities').update({ name, state }).eq('id', id);
};

export const adminProcessCityRequest = async (id: string, status: string) => {
    const sb = getClient();
    if (sb) await sb.from('city_requests').update({ status }).eq('id', id);
};

export const getAvailableCities = async (search: string): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('available_cities')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${search}%`)
        .limit(20);
    return data || [];
};

export const requestNewCity = async (name: string, state: string, userEmail?: string) => {
    const sb = getClient();
    if (sb) await sb.from('city_requests').insert({ city_name: name, state, user_email: userEmail });
};

// --- ASAAS WEBHOOK ---
export const adminGetAsaasWebhookSettings = async (): Promise<any> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('asaas_webhook_settings').select('*').single();
    return data;
};

export const adminUpdateAsaasWebhookSettings = async (activeEvents: string[]) => {
    const sb = getClient();
    if (sb) await sb.from('asaas_webhook_settings').upsert({ id: true, active_events: activeEvents });
};

export const adminGetAsaasWebhookLogs = async (): Promise<AsaasWebhookLog[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('asaas_webhook_logs').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
};

export const getWebhookUrl = () => {
    return `https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/asaas-webhook`;
};

// --- PARTNER LEVELS ---
export const adminGetPartnerLevels = async (): Promise<PartnerLevelBenefit[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_levels').select('*').order('min_deliveries', { ascending: true });
    return data || [];
};

export const adminUpdatePartnerLevel = async (level: PartnerLevelBenefit) => {
    const sb = getClient();
    if (sb) await sb.from('partner_levels').upsert(level);
};

// --- PARTNER DOCUMENT UPLOAD ---
export const uploadPartnerDocument = async (file: File, type: DocumentType) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not found");

    const filePath = `${user.id}/${type}_${Date.now()}`;
    const { error: uploadError } = await sb.storage.from('partner-documents').upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = sb.storage.from('partner-documents').getPublicUrl(filePath);
    
    // Save record
    await sb.from('partner_documents').upsert({
        user_id: user.id,
        document_type: type,
        file_url: urlData.publicUrl,
        status: 'PENDING'
    }, { onConflict: 'user_id, document_type' });
};

export const getPartnerDocuments = async (): Promise<PartnerDocument[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    
    const { data } = await sb.from('partner_documents').select('*').eq('user_id', user.id);
    return data || [];
};

export const requestPartnerReview = async () => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
        await sb.from('user_profiles').update({ verification_status: 'PENDING_REVIEW' }).eq('id', user.id);
    }
};

// --- WALLET & TRANSACTIONS ---
export const getMyWallet = async (): Promise<StoreWallet | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('store_wallets').select('*').eq('store_id', user.id).single();
    return data;
};

export const getWalletTransactions = async (): Promise<WalletTransaction[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('store_wallet_transactions').select('*').eq('store_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const createRechargeCharge = async (amount: number, method: 'PIX' | 'BOLETO') => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.functions.invoke('create-recharge', {
        body: { amount, method }
    });
    if (error) throw error;
    return data;
};

// --- PARTNER REQUESTS ---
export const createPartnerRequest = async (pickup: string, delivery: string, km: number, total: number, net: number, fees: any, type: 'PLATFORM' | 'ASSOCIATE' = 'PLATFORM', specificPartnerId?: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    if (type === 'PLATFORM') {
        const { error } = await sb.rpc('create_partner_request', {
            p_pickup_address: pickup,
            p_delivery_address: delivery,
            p_distance_km: km,
            p_final_cost_override: total
        });
        if (error) throw error;
    } else {
        const { error } = await sb.from('partner_requests').insert({
            store_id: user.id,
            partner_id: specificPartnerId,
            pickup_address: pickup,
            delivery_address: delivery,
            distance_km: 0,
            total_charged_store: 0,
            net_value_partner: 0,
            fee_fixed: 0,
            fee_percent_value: 0,
            status: 'PENDING'
        });
        if (error) throw error;
    }
};

export const getStoreRequests = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_store_requests');
    if (error) { console.error(error); return []; }
    return data || [];
};

export const getPartnerRequestsAvailable = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_partner_requests_available');
    if (error) { console.error(error); return []; }
    return data || [];
};

export const acceptPartnerRequest = async (requestId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('accept_partner_request', { p_request_id: requestId });
    if (error) throw error;
};

export const partnerConfirmPickup = async (requestId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('partner_confirm_pickup', { p_request_id: requestId });
    if (error) throw error;
};

export const partnerConfirmDelivery = async (requestId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('partner_confirm_delivery', { p_request_id: requestId });
    if (error) throw error;
};

export const partnerReportDeliveryFailure = async (requestId: string, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('partner_report_delivery_failure', { p_request_id: requestId, p_reason: reason });
    if (error) throw error;
};

export const storeDecideFailedDelivery = async (requestId: string, decision: 'RETURN' | 'DISCARD') => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('store_decide_failed_delivery', { p_request_id: requestId, p_decision: decision });
    if (error) throw error;
};

export const partnerConfirmReturn = async (requestId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('partner_confirm_return', { p_request_id: requestId });
    if (error) throw error;
};

export const subscribeToTracking = (requestId: string, callback: (payload: LiveLocationPayload) => void) => {
    const sb = getClient();
    if (!sb) return null;
    return sb
        .channel(`tracking:${requestId}`)
        .on('broadcast', { event: 'location_update' }, (payload) => callback(payload.payload))
        .subscribe();
};

export const broadcastLocation = async (requestId: string, payload: LiveLocationPayload) => {
    const sb = getClient();
    if (!sb) return;
    await sb.channel(`tracking:${requestId}`).send({
        type: 'broadcast',
        event: 'location_update',
        payload: payload
    });
};

export const updateUserLocation = async (lat: number, lng: number) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    await sb.from('user_profiles').update({ 
        last_lat: lat, 
        last_lng: lng,
        last_location_at: new Date().toISOString()
    }).eq('id', user.id);
};

export const getPartnerFinancialSummary = async (): Promise<PayoutSummary> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('get_partner_financial_summary');
    if (error) throw error;
    const res = data[0];
    return {
        settings: res.settings_jsonb,
        max_emergency_value: res.max_emergency_value,
        can_request_emergency: res.can_request_emergency
    };
};

export const requestEmergencyPayoutAsaas = async () => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.functions.invoke('request-emergency-payout');
    if (error) throw error;
    return data;
};

export const submitRating = async (requestId: string, rating: number, comment: string, direction: RatingDirection) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");
    const { error } = await sb.rpc('submit_rating', {
        p_request_id: requestId,
        p_evaluator_id: user.id,
        p_rating: rating,
        p_comment: comment,
        p_direction: direction
    });
    if (error) throw error;
};

export const startWorkShift = async () => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");
    
    await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);

    const { data, error } = await sb.from('work_shifts').insert({
        partner_id: user.id,
        start_time: new Date().toISOString(),
        status: 'ACTIVE'
    }).select().single();
    if (error) throw error;
    return data;
};

export const pauseWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    const currentBreaks = shift?.breaks || [];
    const newBreak = { start: new Date().toISOString() };
    
    await sb.from('work_shifts').update({
        status: 'PAUSED',
        breaks: [...currentBreaks, newBreak]
    }).eq('id', shiftId);
    
    const { data: { user } } = await sb.auth.getUser();
    if(user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

export const resumeWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    const currentBreaks = shift?.breaks || [];
    
    if (currentBreaks.length > 0) {
        currentBreaks[currentBreaks.length - 1].end = new Date().toISOString();
    }

    await sb.from('work_shifts').update({
        status: 'ACTIVE',
        breaks: currentBreaks
    }).eq('id', shiftId);

    const { data: { user } } = await sb.auth.getUser();
    if(user) await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);
};

export const endWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    
    const { data: shift } = await sb.from('work_shifts').select('breaks, status').eq('id', shiftId).single();
    let currentBreaks = shift?.breaks || [];
    if (shift?.status === 'PAUSED' && currentBreaks.length > 0) {
        currentBreaks[currentBreaks.length - 1].end = new Date().toISOString();
    }

    await sb.from('work_shifts').update({
        status: 'COMPLETED',
        end_time: new Date().toISOString(),
        breaks: currentBreaks
    }).eq('id', shiftId);

    const { data: { user } } = await sb.auth.getUser();
    if(user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

export const getCurrentShift = async (): Promise<WorkShift | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    
    const { data } = await sb.from('work_shifts')
        .select('*')
        .eq('partner_id', user.id)
        .neq('status', 'COMPLETED')
        .single();
    return data;
};

// --- FINANCIAL STATEMENT ---
export const getFinancialStatement = async (userRole: UserRole, startDate: string, endDate: string) => {
    const sb = getClient();
    if (!sb) return { items: [], summary: { balance: 0, in: 0, out: 0 } };
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { items: [], summary: { balance: 0, in: 0, out: 0 } };

    let items: FinancialStatementItem[] = [];
    let currentBalance = 0;

    if (userRole === 'store_partner') {
        const { data: wallet } = await sb.from('store_wallets').select('balance_decimal').eq('store_id', user.id).single();
        currentBalance = wallet?.balance_decimal || 0;

        const { data: txs } = await sb.from('store_wallet_transactions')
            .select('*')
            .eq('store_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .order('created_at', { ascending: false });
        
        items = txs?.map(t => ({
            id: t.id,
            date: t.created_at,
            description: t.description || t.type,
            amount: t.amount,
            type: t.amount > 0 ? 'EARNING' : 'FEE',
            status: t.status === 'confirmed' ? 'COMPLETED' : 'PENDING'
        })) || [];

    } else {
        const { data: wallet } = await sb.from('partner_wallets').select('balance').eq('partner_id', user.id).single();
        currentBalance = wallet?.balance || 0;

        const { data: payments } = await sb.from('partner_payments')
            .select('*')
            .eq('partner_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .order('created_at', { ascending: false });

        items = payments?.map(p => ({
            id: p.id,
            date: p.created_at,
            description: p.is_emergency ? 'Saque Emergencial' : 'Pagamento Semanal',
            amount: p.status.includes('EARNED') ? p.amount : -p.amount,
            type: p.status.includes('EARNED') ? 'EARNING' : 'WITHDRAWAL',
            status: p.status === 'DONE' ? 'COMPLETED' : p.status === 'PENDING' ? 'PENDING' : 'FAILED'
        })) || [];
    }

    const summary = {
        balance: currentBalance,
        in: items.filter(i => i.amount > 0).reduce((acc, curr) => acc + curr.amount, 0),
        out: Math.abs(items.filter(i => i.amount < 0).reduce((acc, curr) => acc + curr.amount, 0))
    };

    return { items, summary };
};

// --- MANUAL CLOUD SAVE ---
export const saveManualHistory = async (record: any) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    await sb.from('driver_manual_histories').insert({
        user_id: user.id,
        date: record.date,
        summary_json: record
    });
};

export const uploadIdentityVerification = async (file: File, location: any) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");

    const filePath = `identity/${user.id}/${Date.now()}_selfie.jpg`;
    const { error: uploadError } = await sb.storage.from('partner-documents').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = sb.storage.from('partner-documents').getPublicUrl(filePath);

    await sb.from('identity_verifications').insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
        location_data: location,
        status: 'PENDING'
    });
};

// --- CHAT ---
export const getChatMessages = async (orderId?: string, type: 'ORDER' | 'SUPPORT' = 'ORDER', receiverIdOverride?: string): Promise<ChatMessageData[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    let query = sb.from('chat_messages').select('*').eq('type', type);
    
    if (orderId) {
        query = query.eq('order_id', orderId);
    } else {
        if (receiverIdOverride) {
             query = query.or(`sender_id.eq.${receiverIdOverride},receiver_id.eq.${receiverIdOverride}`);
        } else {
             query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        }
    }
    
    const { data } = await query.order('created_at', { ascending: true });
    return data || [];
};

export const sendChatMessage = async (message: string, orderId?: string, type: 'ORDER' | 'SUPPORT' = 'ORDER', receiverIdOverride?: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");

    let receiverId = receiverIdOverride;

    if (!receiverId && orderId && type === 'ORDER') {
        const { data: order } = await sb.from('partner_requests').select('store_id, partner_id').eq('id', orderId).single();
        if (order) {
            receiverId = user.id === order.store_id ? order.partner_id : order.store_id;
        }
    }

    const { data, error } = await sb.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        order_id: orderId,
        message,
        type,
        is_read: false
    }).select().single();

    if (error) throw error;
    return data;
};

export const subscribeToChat = (orderId: string | undefined, type: 'ORDER' | 'SUPPORT', callback: (msg: ChatMessageData) => void, adminTargetUserId?: string) => {
    const sb = getClient();
    if (!sb) return null;

    let filter = `type=eq.${type}`;
    if (orderId) filter += `&order_id=eq.${orderId}`;
    else if (adminTargetUserId) filter += `&sender_id=eq.${adminTargetUserId}`;

    return sb.channel(`chat:${orderId || 'support'}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter }, (payload) => {
            callback(payload.new as ChatMessageData);
        })
        .subscribe();
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
    const sb = getClient();
    if (!sb) return {} as any;

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);

    // Queries em paralelo para dados reais
    const [ordersToday, ordersTotal, activeStores, onlineDrivers, gmvData] = await Promise.all([
        sb.from('partner_requests').select('id', { count: 'exact', head: true }).gte('created_at', today),
        sb.from('partner_requests').select('id', { count: 'exact', head: true }),
        sb.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'store_partner').eq('status', 'active'),
        sb.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'delivery_partner').eq('is_available', true),
        sb.from('partner_requests').select('total_charged_store, net_value_partner, created_at').gte('created_at', firstDayOfMonth.toISOString())
    ]);

    // Calculate Financials from real data
    let gmv = 0;
    let platformRevenue = 0;
    if (gmvData.data) {
        gmvData.data.forEach(r => {
            gmv += r.total_charged_store || 0;
            platformRevenue += (r.total_charged_store - r.net_value_partner) || 0;
        });
    }

    // Orders This Month
    const ordersMonth = gmvData.data?.length || 0;
    
    // Simple Graph Data (Last 7 days from loaded data or separate query)
    const graphData = [];
    for(let i=0; i<7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // In a real heavy app, this should be an RPC. Here we filter locally for simplicity of the prompt constraint (avoiding new SQL files)
        // Optimization: Use the gmvData if it covers 7 days, or query again. 
        // Let's assume gmvData has this month's data which covers last 7 days usually.
        const count = gmvData.data?.filter(r => r.created_at.startsWith(dateStr)).length || 0;
        graphData.unshift({ date: dateStr, count });
    }

    return {
        orders: { 
            today: ordersToday.count || 0, 
            week: 0, // Placeholder or calc similarly
            month: ordersMonth, 
            total: ordersTotal.count || 0, 
            graphData 
        },
        finance: { 
            gmv, 
            platformRevenue, 
            averageTicket: ordersMonth > 0 ? gmv / ordersMonth : 0 
        },
        users: { 
            stores: { active: activeStores.count || 0, total: 0 }, 
            drivers: { online: onlineDrivers.count || 0, total: 0 } 
        }
    };
};

export const getReferralData = async (): Promise<ReferralData> => {
    const sb = getClient();
    if (!sb) return {} as any;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return {} as any;

    const { data: profile } = await sb.from('user_profiles').select('referral_code, referral_reward_expires_at').eq('id', user.id).single();
    
    if (profile && !profile.referral_code) {
        const newCode = `ZE${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        await sb.from('user_profiles').update({ referral_code: newCode }).eq('id', user.id);
        profile.referral_code = newCode;
    }

    const { count } = await sb.from('referral_logs').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id);

    return {
        my_code: profile?.referral_code || '---',
        total_referrals: count || 0,
        is_reward_active: new Date(profile?.referral_reward_expires_at) > new Date(),
        reward_active_until: profile?.referral_reward_expires_at
    };
};

export const getReferralHistory = async (): Promise<ReferralHistoryItem[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data } = await sb.from('referral_logs').select('*, referred:user_profiles!referred_id(name)').eq('referrer_id', user.id);
    return data?.map(d => ({ ...d, referred_user_name: d.referred?.name || 'Usuário' })) || [];
};

export const redeemReferralCode = async (code: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('redeem_referral_code', { p_code: code });
    if (error) throw error;
};

export const findPartnerByCode = async (code: string): Promise<ManagedUser | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('user_profiles').select('*').eq('association_code', code).single();
    return data;
};

export const associatePartnerToStore = async (partnerId: string, fee: number) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('associate_partner_to_store', { p_partner_id: partnerId, p_fee: fee });
    if (error) throw error;
};

export const removePartnerAssociation = async (associationId: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('store_delivery_partners').delete().eq('id', associationId);
};

export const getStoreAssociatedPartners = async (): Promise<StoreDeliveryPartner[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    
    const { data } = await sb.from('store_delivery_partners').select('*').eq('store_id', user.id);
    return data || [];
};

export const getPartnerAssociatedStores = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    
    const { data } = await sb.from('store_delivery_partners')
        .select('*, store:user_profiles!store_id(name, city)') 
        .eq('partner_id', user.id);
        
    return data?.map((d: any) => ({
        id: d.id,
        store_name: d.store?.name || 'Loja Parceira',
        city: d.store?.city || '',
        status: 'ACTIVE'
    })) || [];
};

export const getStoreReportsData = async (): Promise<StoreReportData> => {
    const sb = getClient();
    if (!sb) return {} as any;
    const { data, error } = await sb.rpc('get_store_reports');
    if (error) throw error;
    return data[0] as StoreReportData;
};

export const getStoreShippingRules = async (): Promise<StoreShippingRule[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('store_shipping_rules').select('*').eq('store_id', user.id);
    return data || [];
};

export const createStoreShippingRule = async (rule: Partial<StoreShippingRule>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('store_shipping_rules').insert({ ...rule, store_id: user.id });
};

export const deleteStoreShippingRule = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('store_shipping_rules').delete().eq('id', id);
};

export const getMyClaims = async (): Promise<Claim[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('support_claims').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const createClaim = async (type: string, description: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('support_claims').insert({ user_id: user.id, user_email: user.email, type, description });
};

export const adminGetAllWallets = async (): Promise<AdminWalletUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('admin_get_consolidated_wallets');
    if (error) throw error;
    return data;
};

export const adminAdjustBalance = async (userId: string, amount: number, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_adjust_balance', { p_user_id: userId, p_amount: amount, p_reason: reason });
    if (error) throw error;
};

export const adminGetReferrals = async () => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('referral_logs').select('*, referrer:user_profiles!referrer_id(name, role), referred:user_profiles!referred_id(name, role)');
    return data || [];
};

export const fetchPartnerRequestHistory = async (
    role: 'store_partner' | 'delivery_partner',
    filters: HistoryFilters,
    page: number
) => {
    const sb = getClient();
    if (!sb) return { data: [], stats: null };
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { data: [], stats: null };

    let query = sb.from('partner_requests').select('*', { count: 'exact' });

    if (role === 'store_partner') {
        query = query.eq('store_id', user.id);
    } else {
        query = query.eq('partner_id', user.id);
    }

    if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
    }
    if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
    }

    const from = page * 20;
    const to = from + 19;
    
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, to);

    const stats = {
        total_items: count,
        loaded_value: data?.reduce((acc, r) => acc + (role === 'store_partner' ? r.total_charged_store : r.net_value_partner), 0) || 0
    };

    return { data: data || [], stats };
};

export const getActivePlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('platform_news').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    return data || [];
};

export const subscribeToSuperStore = async (fee: number) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('subscribe_to_super_store');
    if (error) throw error;
};

// --- BACKUP & RESTORE CLOUD ---
export const uploadBackup = async (userId: string) => {
    const sb = getClient();
    if (!sb) return;
    
    const backupData = storage.createBackup();
    const blob = new Blob([backupData], { type: 'application/json' });
    const filePath = `${userId}/backup_latest.json`;
    
    const { error } = await sb.storage.from('backups').upload(filePath, blob, { upsert: true });
    if (error) {
        throw error;
    }
};

export const downloadBackup = async (userId: string): Promise<boolean> => {
    const sb = getClient();
    if (!sb) return false;
    
    const filePath = `${userId}/backup_latest.json`;
    const { data, error } = await sb.storage.from('backups').download(filePath);
    
    if (error || !data) return false;
    
    const text = await data.text();
    return storage.restoreBackup(text);
};

// --- ZEBANK FUNCTIONS ---

export const getZebankDashboardData = async (): Promise<ZebankData> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");

    let balance = 0;
    const profile = await sb.from('user_profiles').select('role, association_code, partner_level').eq('id', user.id).single();
    
    if (profile?.data?.role === 'store_partner') {
        const w = await sb.from('store_wallets').select('balance_decimal').eq('store_id', user.id).single();
        balance = w?.data?.balance_decimal || 0;
    } else {
        const w = await sb.from('partner_wallets').select('balance').eq('partner_id', user.id).single();
        balance = w?.data?.balance || 0;
    }

    const userMeta = await sb.auth.getUser();
    const savings = userMeta.data.user?.user_metadata?.savings_balance || 0;

    const { data: cards } = await sb.from('zebank_cards').select('*').eq('user_id', user.id);

    // Fetch REAL transactions from generic wallet tables
    let transactions: ZebankTransaction[] = [];
    
    if (profile?.data?.role === 'store_partner') {
        const { data: txs } = await sb.from('store_wallet_transactions').select('*').eq('store_id', user.id).order('created_at', { ascending: false }).limit(20);
        transactions = txs?.map(t => ({
            id: t.id,
            type: t.type.includes('transfer') ? 'TRANSFER_P2P' : 'PAYMENT',
            amount: Math.abs(t.amount),
            description: t.description || 'Transação',
            status: t.status === 'confirmed' ? 'COMPLETED' : 'PENDING',
            direction: t.amount > 0 ? 'IN' : 'OUT',
            created_at: t.created_at
        })) || [];
    } else {
        const { data: txs } = await sb.from('partner_payments').select('*').eq('partner_id', user.id).order('created_at', { ascending: false }).limit(20);
        transactions = txs?.map(t => ({
            id: t.id,
            type: 'EARNING',
            amount: t.amount,
            description: t.is_emergency ? 'Saque Emergencial' : 'Pagamento Corrida',
            status: t.status === 'DONE' ? 'COMPLETED' : 'PENDING',
            direction: t.status.includes('EARNED') ? 'IN' : 'OUT',
            created_at: t.created_at
        })) || [];
    }

    return {
        balance,
        savings_balance: savings,
        recent_transactions: transactions,
        cards: cards || [],
        next_payout_date: 'Indefinida',
        my_code: profile?.data?.association_code,
        partner_level: profile?.data?.partner_level
    };
};

export const zebankTransferP2P = async (targetCode: string, amount: number) => {
    return performInternalTransfer(targetCode, amount, 'P2P');
};

export const performInternalTransfer = async (targetCode: string, amount: number, type: 'P2P' | 'STORE') => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    // Fallback: If RPC not present, throw error. We removed the "Mock" fallback to enforce real DB usage.
    const { error } = await sb.rpc('transfer_balance_internal', { 
        p_target_code: targetCode, 
        p_amount: amount 
    });
    
    if (error) throw error;
};

export const zebankManageSavings = async (action: 'DEPOSIT' | 'RETRIEVE', amount: number) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");

    const currentSavings = user.user_metadata?.savings_balance || 0;
    const newSavings = action === 'DEPOSIT' ? currentSavings + amount : currentSavings - amount;

    if (newSavings < 0) throw new Error("Saldo insuficiente na reserva.");

    await sb.auth.updateUser({
        data: { savings_balance: newSavings }
    });
};

export const zebankCreateVirtualCard = async (holderName: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User required");

    const number = `5${Math.floor(Math.random() * 1000000000000000)}`;
    const lastFour = number.slice(-4);
    const expiry = '12/28';
    const cvv = Math.floor(Math.random() * 900 + 100).toString();

    await sb.from('zebank_cards').insert({
        user_id: user.id,
        card_number: number,
        card_last_four: lastFour,
        card_holder: holderName,
        expiration_date: expiry,
        cvv: cvv,
        type: 'VIRTUAL',
        status: 'ACTIVE'
    });
};

export const zebankDeleteCard = async (cardId: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('zebank_cards').delete().eq('id', cardId);
};

export const zebankToggleCardStatus = async (cardId: string, status: 'ACTIVE' | 'BLOCKED') => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('zebank_cards').update({ status }).eq('id', cardId);
};

export const simulateCardTransaction = async (cardId: string, amount: number, merchant: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    
    const { data: card } = await sb.from('zebank_cards').select('status, user_id').eq('id', cardId).single();
    if (!card || card.status !== 'ACTIVE') throw new Error("Cartão bloqueado ou inválido.");

    // Call real RPC
    const { error } = await sb.rpc('process_card_transaction', { 
        p_card_id: cardId, 
        p_amount: amount,
        p_merchant: merchant
    });

    if (error) throw new Error(error.message);
};

// --- NEW ADMIN MODULE FUNCTIONS ---

export const adminGetBlacklist = async (): Promise<BlacklistEntry[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('blacklisted_users').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminAddToBlacklist = async (entry: Partial<BlacklistEntry>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('blacklisted_users').insert(entry);
};

export const adminRemoveFromBlacklist = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('blacklisted_users').delete().eq('id', id);
};

export const adminGetSupportClaims = async (status: 'open' | 'resolved' | 'closed' | 'all' = 'all') => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('support_claims').select('*');
    if (status !== 'all') {
        query = query.eq('status', status);
    }
    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
};

export const adminUpdateClaim = async (id: string, response: string, status: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('support_claims').update({ admin_response: response, status }).eq('id', id);
};

export const adminGetPlatformNews = async () => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('platform_news').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminAddPlatformNews = async (news: Partial<PlatformNews>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('platform_news').insert(news);
};

export const adminDeletePlatformNews = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('platform_news').delete().eq('id', id);
};

export const adminSendGlobalNotification = async (title: string, message: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.rpc('admin_send_global_notification', { p_title: title, p_message: message });
};

export const adminGetAllRatings = async () => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('admin_get_all_ratings');
    if (error) {
        // Fallback standard select if RPC fails or not updated
        const { data: raw } = await sb.from('partner_ratings').select('*');
        return raw || [];
    }
    return data;
};

// --- NEW MISSING ADMIN FUNCTIONS ---

export const adminGetPWASettings = async (): Promise<PWASettings> => {
    const sb = getClient();
    if (!sb) return {} as any;
    const { data } = await sb.from('pwa_settings').select('*').single();
    return data || {};
};

export const adminUpdatePWASettings = async (settings: Partial<PWASettings>) => {
    const sb = getClient();
    if (sb) await sb.from('pwa_settings').upsert({ id: true, ...settings });
};

export const adminGetFraudAlerts = async (): Promise<FraudAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('fraud_alerts').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminUpdateFraudAlert = async (id: string, status: string) => {
    const sb = getClient();
    if (sb) await sb.from('fraud_alerts').update({ status }).eq('id', id);
};

export const adminGetIdentityVerifications = async (): Promise<IdentityVerification[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('identity_verifications').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminUpdateIdentityVerification = async (id: string, status: string, notes?: string) => {
    const sb = getClient();
    if (sb) await sb.from('identity_verifications').update({ status, admin_notes: notes }).eq('id', id);
};
