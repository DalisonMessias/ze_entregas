
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
    PartnerRequest, UserRole, ManagedUser, PartnerProfile, PartnerDocument, 
    City, CityRequest, PayoutSettings, PartnerLevelBenefit, PartnerFeeSettings, 
    BlacklistEntry, FraudAlert, PartnerRating, Claim, PlatformNews, 
    ShopSettings, Product, Category, Order, StoreWallet, WalletTransaction,
    LiveLocationPayload, NotificationPreferences, ChatMessageData, BlitzAlert,
    StoreDeliveryPartner, DailySummary, FinancialStatementItem,
    ReferralData, ReferralHistoryItem, StoreReportData, StoreShippingRule,
    AdminWalletUser, AdminDashboardStats, PWASettings, MaintenanceData,
    AppNotification, PayoutSummary
} from '../types';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

let supabase: SupabaseClient | null = null;

export const initSupabase = () => {
    if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabase;
};

export const getClient = () => {
    if (!supabase) initSupabase();
    return supabase;
};

// --- AUTH & USER ---

export const getUserStatus = async (): Promise<string> => {
    const sb = getClient();
    if (!sb) return 'active';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'active';
    const { data } = await sb.from('user_profiles').select('status').eq('id', user.id).single();
    return data?.status || 'active';
};

export const getUserRole = async (): Promise<UserRole> => {
    const sb = getClient();
    if (!sb) return 'user';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'user';
    const { data } = await sb.from('user_profiles').select('role').eq('id', user.id).single();
    return (data?.role?.toLowerCase() as UserRole) || 'user';
};

export const getAllUsers = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles').select('*');
    return data || [];
};

export const updateUserRole = async (userId: string, role: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('user_profiles').update({ role }).eq('id', userId);
};

export const getMyPartnerProfile = async (): Promise<PartnerProfile | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('partner_profiles').select('*').eq('user_id', user.id).single();
    return data;
};

export const updateMyPartnerProfile = async (updates: Partial<PartnerProfile>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('partner_profiles').update(updates).eq('user_id', user.id);
};

export const uploadProfilePicture = async (file: File): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not init");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");
    
    const filePath = `avatars/${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await sb.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;
    
    const { data } = sb.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
};

export const signOut = async () => {
    const sb = getClient();
    if (sb) await sb.auth.signOut();
};

export const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const sb = getClient();
    if (!sb) return null;
    // Try to find user by phone or CPF in user_profiles to get email
    const { data } = await sb.from('user_profiles')
        .select('email')
        .or(`phone_number.eq.${identifier},cpf.eq.${identifier}`)
        .single();
    return data?.email || null;
};

export const sendPasswordResetEmail = async (email: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
};

export const registerUserWithType = async (email: string, pass: string, name: string, phone: string, cpf: string, role: string, city?: string) => {
    const sb = getClient();
    if (!sb) return;
    
    const { data, error } = await sb.auth.signUp({
        email,
        password: pass,
        options: {
            data: { name, phone, city }
        }
    });
    if (error) throw error;
    
    if (data.user) {
        // Create profile
        await sb.from('user_profiles').insert({
            id: data.user.id,
            email,
            name,
            phone_number: phone,
            cpf,
            role,
            city
        });
        
        // If partner, create partner profile
        if (role === 'DELIVERY_PARTNER') {
            await sb.from('partner_profiles').insert({
                user_id: data.user.id,
                city,
                verification_status: 'PENDING_REVIEW'
            });
        }
    }
};

// --- BACKUP ---

export const uploadBackup = async (userId: string) => {
    const sb = getClient();
    if (!sb) return;
    // Mock backup upload - real implementation would store JSON in storage
    const backupData = localStorage.getItem('delivery_history') || '[]';
    const blob = new Blob([backupData], { type: 'application/json' });
    await sb.storage.from('backups').upload(`${userId}/backup.json`, blob, { upsert: true });
};

export const downloadBackup = async (userId: string): Promise<boolean> => {
    const sb = getClient();
    if (!sb) return false;
    const { data, error } = await sb.storage.from('backups').download(`${userId}/backup.json`);
    if (error) return false;
    const text = await data.text();
    localStorage.setItem('delivery_history', text);
    return true;
};

// --- BLITZ & LOCATION ---

export const getActiveBlitzes = async (): Promise<BlitzAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    // Fetch last 2 hours
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await sb.from('blitz_alerts').select('*').gt('created_at', since);
    return data || [];
};

export const updateUserLocation = async (lat: number, lng: number) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    // Upsert live location
    await sb.from('live_locations').upsert({ user_id: user.id, lat, lng, updated_at: new Date().toISOString() });
};

export const getOnlineDrivers = async (lat: number, lng: number, radiusKm: number = 10): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    // Mock: fetch all active drivers and filter client-side for now, normally use PostGIS
    const { data } = await sb.from('user_profiles').select('id, name, current_lat, current_lng').eq('role', 'DELIVERY_PARTNER').eq('is_online', true);
    return data || [];
};

// --- ADMIN SHOP ---

export const adminGetProducts = async (): Promise<Product[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('products').select('*');
    return data || [];
};

export const adminAddProduct = async (product: Partial<Product>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('products').insert(product);
};

export const adminUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('products').update(updates).eq('id', id);
};

export const adminDeleteProduct = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('products').delete().eq('id', id);
};

export const adminGetCategories = async (): Promise<Category[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('categories').select('*');
    return data || [];
};

export const adminAddCategory = async (name: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('categories').insert({ name });
};

export const adminDeleteCategory = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('categories').delete().eq('id', id);
};

export const getShopSettings = async (): Promise<ShopSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('shop_settings').select('*').single();
    return data;
};

export const adminUpdateShopSettings = async (settings: Partial<ShopSettings>) => {
    const sb = getClient();
    if (!sb) return;
    // Assuming single row with ID true or 1
    await sb.from('shop_settings').update(settings).eq('id', true); 
};

// --- ADMIN PARTNERS ---

export const adminGetPendingPartners = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles').select('*').eq('role', 'DELIVERY_PARTNER'); // Filter by pending status in real app via join
    // Mock filter based on partner_profiles
    const profiles = await sb.from('partner_profiles').select('user_id').eq('verification_status', 'PENDING_REVIEW');
    const ids = profiles.data?.map(p => p.user_id) || [];
    return data?.filter(u => ids.includes(u.id)) || [];
};

export const adminGetPartnerDetails = async (userId: string): Promise<{ profile: PartnerProfile, documents: PartnerDocument[] }> => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const p = await sb.from('partner_profiles').select('*').eq('user_id', userId).single();
    const d = await sb.from('partner_documents').select('*').eq('user_id', userId);
    return { profile: p.data, documents: d.data || [] };
};

export const adminUpdatePartnerStatus = async (userId: string, status: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('partner_profiles').update({ verification_status: status }).eq('user_id', userId);
};

export const adminUpdateDocumentStatus = async (docId: string, status: string, notes?: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('partner_documents').update({ status, admin_notes: notes }).eq('id', docId);
};

// --- CITIES ---

export const adminGetCities = async (): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('cities').select('*');
    return data || [];
};

export const adminGetCityRequests = async (): Promise<CityRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('city_requests').select('*');
    return data || [];
};

export const adminAddCity = async (name: string, state: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('cities').insert({ name, state, is_active: true });
};

export const adminUpdateCityStatus = async (id: number, isActive: boolean) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('cities').update({ is_active: isActive }).eq('id', id);
};

export const adminEditCity = async (id: number, name: string, state: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('cities').update({ name, state }).eq('id', id);
};

export const adminProcessCityRequest = async (id: string, status: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('city_requests').update({ status }).eq('id', id);
};

export const getAvailableCities = async (term?: string): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('cities').select('*').eq('is_active', true);
    if (term) query = query.ilike('name', `%${term}%`);
    const { data } = await query;
    return data || [];
};

export const requestNewCity = async (name: string, state: string, email?: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('city_requests').insert({ city_name: name, state, user_email: email });
};

// --- PAYOUTS & FEES ---

export const adminGetPayoutSettings = async (): Promise<PayoutSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('payout_settings').select('*').single();
    return data;
};

export const adminUpdatePayoutSettings = async (settings: Partial<PayoutSettings>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('payout_settings').update(settings).eq('id', true); // Assuming singleton
};

export const adminGetPayoutHistory = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('payouts').select('*');
    return data || [];
};

export const adminGetFeeSettings = async (): Promise<PartnerFeeSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('fee_settings').select('*').single();
    return data;
};

export const adminUpdateFeeSettings = async (settings: Partial<PartnerFeeSettings>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('fee_settings').update(settings).eq('id', true);
};

// --- LEVELS ---

export const adminGetPartnerLevels = async (): Promise<PartnerLevelBenefit[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_levels').select('*');
    return data || [];
};

export const adminUpdatePartnerLevel = async (level: PartnerLevelBenefit) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('partner_levels').update(level).eq('level', level.level);
};

// --- BLACKLIST & FRAUD ---

export const adminGetBlacklist = async (): Promise<BlacklistEntry[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('blacklist').select('*');
    return data || [];
};

export const adminAddToBlacklist = async (email: string, phone: string, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('blacklist').insert({ email, phone_number: phone, reason });
};

export const adminRemoveFromBlacklist = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('blacklist').delete().eq('id', id);
};

export const adminGetFraudAlerts = async (): Promise<FraudAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('fraud_alerts').select('*');
    return data || [];
};

// --- RATINGS & CLAIMS ---

export const adminGetAllRatings = async (): Promise<PartnerRating[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('ratings').select('*');
    return data || [];
};

export const adminGetClaims = async (): Promise<Claim[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('claims').select('*');
    return data || [];
};

export const adminResolveClaim = async (id: string, response: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('claims').update({ status: 'resolved', admin_response: response }).eq('id', id);
};

export const getMyClaims = async (): Promise<Claim[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('claims').select('*').eq('user_id', user.id);
    return data || [];
};

export const createClaim = async (type: string, description: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('claims').insert({ user_id: user.id, type, description, status: 'open', user_email: user.email });
};

// --- NEWS ---

export const adminGetPlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('platform_news').select('*');
    return data || [];
};

export const getActivePlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('platform_news').select('*').eq('is_active', true);
    return data || [];
};

export const adminUpsertPlatformNews = async (news: Partial<PlatformNews>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('platform_news').upsert(news);
};

export const adminDeletePlatformNews = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('platform_news').delete().eq('id', id);
};

// --- PWA ---

export const adminGetPWASettings = async (): Promise<PWASettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('pwa_settings').select('*').single();
    return data;
};

export const adminUpdatePWASettings = async (settings: Partial<PWASettings>) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('pwa_settings').upsert(settings); // Usually one row
};

// --- SUPPORT CHAT ---

export const adminGetSupportThreads = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    // Mock logic: group messages by sender where receiver is null (support)
    const { data } = await sb.from('chat_messages').select('*').eq('type', 'SUPPORT');
    // Grouping would happen here logic wise
    return [];
};

// --- SHOP DATA & ORDERS ---

export const getShopData = async () => {
    const sb = getClient();
    if (!sb) return { products: [], categories: [], settings: null };
    const [p, c, s] = await Promise.all([
        sb.from('products').select('*').eq('is_active', true),
        sb.from('categories').select('*'),
        sb.from('shop_settings').select('*').single()
    ]);
    return { products: p.data || [], categories: c.data || [], settings: s.data };
};

export const createOrder = async (order: Partial<Order>) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Login required");
    
    const newOrder = {
        ...order,
        user_id: user.id,
        status: 'pending_payment',
        created_at: new Date().toISOString()
    };
    
    const { data, error } = await sb.from('orders').insert(newOrder).select().single();
    if (error) throw error;
    return data;
};

export const getMyOrders = async (): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('orders').select('*').eq('user_id', user.id);
    return data || [];
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
    const { data } = await sb.from('wallet_transactions').select('*').eq('store_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const getFinancialStatement = async (role: UserRole, start: string, end: string): Promise<{ items: FinancialStatementItem[], summary: any }> => {
    const sb = getClient();
    if (!sb) return { items: [], summary: { balance: 0, in: 0, out: 0 } };
    
    // Fetch transactions based on role (store wallet or driver earnings)
    // Simplified: fetching from wallet_transactions for stores, or payouts/earnings for drivers
    // Returning mock structure for interface compliance
    return { items: [], summary: { balance: 0, in: 0, out: 0 } };
};

export const adminGetAllWallets = async (): Promise<AdminWalletUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles').select('id, name, email, role');
    // Join with wallets would be needed here
    return [];
};

export const adminAdjustBalance = async (userId: string, amount: number, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    // RPC call to adjust balance
    await sb.rpc('adjust_wallet_balance', { user_id: userId, amount, reason });
};

// --- PARTNER REQUESTS ---

export const getStoreRequests = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('partner_requests').select('*').eq('store_id', user.id).neq('status', 'COMPLETED');
    return data || [];
};

export const getPartnerRequestsAvailable = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_requests').select('*').eq('status', 'PENDING');
    return data || [];
};

export const createPartnerRequest = async (pickup: string, delivery: string, km: number, charged: number, net: number, fees: PartnerFeeSettings) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    await sb.from('partner_requests').insert({
        store_id: user.id,
        pickup_address: pickup,
        delivery_address: delivery,
        distance_km: km,
        total_charged_store: charged,
        net_value_partner: net,
        status: 'PENDING',
        fee_fixed: fees.global_tax_fixed,
        fee_percent_value: (charged - net) - fees.global_tax_fixed // approx
    });
};

export const acceptPartnerRequest = async (requestId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    const { error } = await sb.from('partner_requests').update({
        partner_id: user.id,
        status: 'ACCEPTED',
        updated_at: new Date().toISOString()
    }).eq('id', requestId);
    if (error) throw error;
};

export const partnerConfirmPickup = async (requestId: string) => {
    const sb = getClient();
    if (sb) await sb.from('partner_requests').update({ status: 'IN_TRANSIT' }).eq('id', requestId);
};

export const partnerConfirmDelivery = async (requestId: string) => {
    const sb = getClient();
    if (sb) {
        // Should trigger payout logic on backend
        await sb.from('partner_requests').update({ status: 'COMPLETED' }).eq('id', requestId);
    }
};

export const partnerReportDeliveryFailure = async (requestId: string, reason: string) => {
    const sb = getClient();
    if (sb) await sb.from('partner_requests').update({ status: 'AWAITING_STORE_DECISION', failure_reason: reason }).eq('id', requestId);
};

export const partnerConfirmReturn = async (requestId: string) => {
    const sb = getClient();
    if (sb) await sb.from('partner_requests').update({ status: 'RETURNING' }).eq('id', requestId);
};

export const storeDecideFailedDelivery = async (requestId: string, decision: 'RETURN' | 'DISCARD') => {
    const sb = getClient();
    if (sb) {
        const status = decision === 'RETURN' ? 'RETURNING' : 'COMPLETED'; // If discard, it's done?
        await sb.from('partner_requests').update({ status }).eq('id', requestId);
    }
};

export const fetchPartnerRequestHistory = async (role: 'store_partner' | 'delivery_partner', filters: any, page: number) => {
    const sb = getClient();
    if (!sb) return { data: [], stats: null };
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { data: [], stats: null };
    
    let query = sb.from('partner_requests').select('*').eq(role === 'store_partner' ? 'store_id' : 'partner_id', user.id);
    
    if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
    // Add date filters...
    
    const { data } = await query.range(page * 20, (page + 1) * 20 - 1);
    
    // Mock stats
    return { data: data || [], stats: { total_items: 10, loaded_value: 100 } };
};

// --- MISC ---

export const getOfflineDriversForContact = async (city: string): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    // Join user_profiles and partner_profiles where share_phone_offline is true
    // Mock return
    return [];
};

export const getStoreAssociatedPartners = async (): Promise<StoreDeliveryPartner[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('store_partners').select('*').eq('store_id', user.id);
    return data || [];
};

export const associatePartnerToStore = async (partnerId: string, fee: number) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    // Charge wallet
    // Insert association
    await sb.from('store_partners').insert({ store_id: user.id, partner_id: partnerId });
};

export const removePartnerAssociation = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('store_partners').delete().eq('id', id);
};

export const findPartnerByCode = async (code: string): Promise<ManagedUser | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('partner_profiles').select('user_id').eq('association_code', code).single();
    if (!data) return null;
    const user = await sb.from('user_profiles').select('*').eq('id', data.user_id).single();
    return user.data;
};

// --- ASAAS ---

export const createRechargeCharge = async (amount: number, method: string) => {
    // Call backend function to create Asaas charge
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data, error } = await sb.functions.invoke('create-asaas-charge', { body: { amount, method } });
    if (error) throw error;
    return data;
};

export const requestEmergencyPayoutAsaas = async () => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    await sb.functions.invoke('request-emergency-payout');
};

export const getWebhookUrl = () => {
    return 'https://your-project.functions.supabase.co/asaas-webhook';
};

export const adminGetAsaasWebhookSettings = async () => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('webhook_settings').select('*').single();
    return data;
};

export const adminUpdateAsaasWebhookSettings = async (events: string[]) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('webhook_settings').upsert({ active_events: events });
};

export const adminGetAsaasWebhookLogs = async () => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('webhook_logs').select('*').order('created_at', { ascending: false });
    return data || [];
};

// --- NOTIFICATIONS & PREFS ---

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

// --- REALTIME ---

export const subscribeToTracking = (requestId: string, callback: (payload: LiveLocationPayload) => void) => {
    const sb = getClient();
    if (!sb) return null;
    return sb.channel(`tracking:${requestId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, (payload) => {
            // Logic to match request driver...
            // Simplified:
            callback(payload.new as LiveLocationPayload);
        })
        .subscribe();
};

export const subscribeToChat = (orderId: string | undefined, type: string, callback: (msg: ChatMessageData) => void, targetUser?: string) => {
    const sb = getClient();
    if (!sb) return null;
    // Filter by order or users
    return sb.channel('chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => callback(payload.new as ChatMessageData))
        .subscribe();
};

export const getChatMessages = async (orderId: string | undefined, type: string, targetUser?: string): Promise<ChatMessageData[]> => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('chat_messages').select('*').eq('type', type);
    if (orderId) query = query.eq('order_id', orderId);
    const { data } = await query.order('created_at');
    return data || [];
};

export const sendChatMessage = async (msg: string, orderId: string | undefined, type: string, receiverId?: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    const { data, error } = await sb.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: receiverId, // logic to determine receiver
        message: msg,
        order_id: orderId,
        type
    }).select().single();
    if (error) throw error;
    return data;
};

// --- MISC EXPORTS ---

export const getPartnerDocuments = async (): Promise<PartnerDocument[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('partner_documents').select('*').eq('user_id', user.id);
    return data || [];
};

export const uploadPartnerDocument = async (file: File, type: string) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Login");
    
    const path = `documents/${user.id}/${type}_${Date.now()}`;
    await sb.storage.from('documents').upload(path, file);
    const url = sb.storage.from('documents').getPublicUrl(path).data.publicUrl;
    
    await sb.from('partner_documents').upsert({
        user_id: user.id,
        document_type: type,
        file_url: url,
        status: 'PENDING'
    });
};

export const requestPartnerReview = async () => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('partner_profiles').update({ verification_status: 'PENDING_REVIEW' }).eq('user_id', user.id);
};

export const getPartnerFinancialSummary = async (): Promise<PayoutSummary | null> => {
    const sb = getClient();
    if (!sb) return null;
    // Mock logic
    const settings = await adminGetFeeSettings();
    return {
        settings: settings!,
        max_emergency_value: 50,
        can_request_emergency: true
    };
};

export const getCurrentShift = async () => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('work_shifts').select('*').eq('user_id', user.id).eq('status', 'ACTIVE').single();
    return data;
};

export const startWorkShift = async () => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from('work_shifts').insert({ user_id: user.id, start_time: new Date().toISOString(), status: 'ACTIVE' }).select().single();
    return data;
};

export const pauseWorkShift = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('work_shifts').update({ status: 'PAUSED' }).eq('id', id);
};

export const resumeWorkShift = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('work_shifts').update({ status: 'ACTIVE' }).eq('id', id);
};

export const endWorkShift = async (id: string) => {
    const sb = getClient();
    if (sb) await sb.from('work_shifts').update({ status: 'COMPLETED', end_time: new Date().toISOString() }).eq('id', id);
};

export const uploadIdentityVerification = async (file: File, location: any) => {
    // similar to doc upload
    const sb = getClient();
    if (!sb) return;
    // logic...
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats | null> => {
    // Aggregation logic
    return {
        orders: { today: 10, week: 50, month: 200, total: 1000, graphData: [] },
        finance: { gmv: 5000, platformRevenue: 500, averageTicket: 25 },
        users: { stores: { active: 5, total: 10 }, drivers: { online: 3, total: 15 } }
    };
};

export const getReferralData = async (): Promise<ReferralData | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    // fetch from referrals table
    return { my_code: 'CODE123', total_referrals: 0, is_reward_active: false };
};

export const getReferralHistory = async (): Promise<ReferralHistoryItem[]> => {
    return [];
};

export const redeemReferralCode = async (code: string) => {
    const sb = getClient();
    if (!sb) return;
    // logic
};

export const adminGetReferrals = async () => {
    return [];
};

export const getStoreReportsData = async (): Promise<StoreReportData | null> => {
    return { totalRequests: 0, totalValue: 0, peakHours: [], driverPerformance: [] };
};

export const getStoreShippingRules = async (): Promise<StoreShippingRule[]> => {
    return [];
};

export const createStoreShippingRule = async (rule: Partial<StoreShippingRule>) => {
    // logic
};

export const deleteStoreShippingRule = async (id: string) => {
    // logic
};

export const getZebankDashboardData = async () => {
    return { balance: 0, nextPayoutDate: null, history: [] };
};

export const getPartnerAssociatedStores = async () => {
    return [];
};

export const submitRating = async (id: string, rating: number, comment: string, type: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('ratings').insert({ request_id: id, rating, comment, direction: type });
};

export const broadcastLocation = (id: string, payload: LiveLocationPayload) => {
    const sb = getClient();
    if (!sb) return;
    sb.channel(`tracking:${id}`).send({
        type: 'broadcast',
        event: 'location',
        payload
    });
};

export const subscribeToSuperStore = async (fee: number) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");
    
    // In real app, create charge here. For now, just update profile.
    const { error } = await sb.from('user_profiles').update({ is_super_store: true }).eq('id', user.id);
    if (error) throw new Error(error.message);
};

export const becomeDeliveryPartner = async () => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    
    const { error } = await sb.rpc('become_delivery_partner');
    if (error) throw new Error(error.message);
};
