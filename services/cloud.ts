
// ... keep imports ...
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import * as storage from './storage';
import { AppNotification, GlobalNotification, ManagedUser, UserRole, UserStatus, Product, ShopSettings, Order, AdminOrder, PaymentMethod, Category, Claim, StoreWallet, WalletTransaction, PartnerRequest, PartnerFeeSettings, PWASettings, PWAIcon, PayoutSummary, PayoutSettings, City, CityRequest, AsaasWebhookLog, PartnerProfile, PartnerDocument, DocumentType, PartnerLevelBenefit, PartnerRequestLog, PartnerPayment, PunishmentType, BlacklistEntry, OfflineDriver, StoreDeliveryPartner, HistoryFilters, LiveLocationPayload, PartnerRequestStatus, NotificationPreferences, PartnerRating, RatingDirection, WorkShift, WorkShiftBreak, FinancialStatementItem, IdentityVerification, FraudAlert, ChatMessageData, AdminDashboardStats, ReferralData, ReferralHistoryItem, StoreReportData, PlatformNews, StoreShippingRule, AdminWalletUser, BlitzAlert } from '../types';

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

// ... (keep existing functions until getUserRole) ...

export const reportBlitz = async (lat: number, lng: number, type: 'BLITZ' | 'ACCIDENT' | 'TRAFFIC' | 'DANGER', address: string, city: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await sb.from('blitz_alerts').insert({
        user_id: user.id,
        lat,
        lng,
        type,
        address,
        city
    });

    if (error) throw new Error(error.message);
};

export const getActiveBlitzes = async (city?: string): Promise<BlitzAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    
    // Get alerts from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    let query = sb.from('blitz_alerts')
        .select('*, user:user_profiles!user_id(name)')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });

    if (city) {
        query = query.ilike('city', `%${city}%`);
    }

    const { data } = await query;
    return (data || []).map((b: any) => ({
        ...b,
        user_name: b.user?.name || 'Anônimo'
    }));
};

export const getStoreShippingRules = async (): Promise<StoreShippingRule[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data, error } = await sb
        .from('store_shipping_rules')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false }); 

    if (error) {
        console.error("Error fetching shipping rules", error);
        return [];
    }
    return data || [];
};

export const createStoreShippingRule = async (rule: Partial<StoreShippingRule>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { error } = await sb.from('store_shipping_rules').insert({
        store_id: user.id,
        rule_type: rule.rule_type,
        threshold: rule.threshold,
        value: rule.value,
        is_active: true
    });

    if (error) throw new Error(error.message);
};

export const deleteStoreShippingRule = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('store_shipping_rules').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getActivePlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb
        .from('platform_news')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error("Error fetching platform news:", error.message);
        return [];
    }
    return data || [];
};

export const adminGetPlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb
        .from('platform_news')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
};

export const adminUpsertPlatformNews = async (newsItem: Partial<PlatformNews>) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not initialized");
    const { error } = await sb.from('platform_news').upsert(newsItem);
    if (error) throw new Error(error.message);
};

export const adminDeletePlatformNews = async (id: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not initialized");
    const { error } = await sb.from('platform_news').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getReferralData = async (): Promise<ReferralData | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data: profile } = await sb.from('user_profiles').select('referral_code, referral_reward_expires_at').eq('id', user.id).single();
    if (!profile) return null;

    const { count } = await sb.from('referral_logs').select('*', { count: 'exact' }).eq('referrer_id', user.id);

    const isRewardActive = profile.referral_reward_expires_at ? new Date(profile.referral_reward_expires_at) > new Date() : false;

    return {
        my_code: profile.referral_code || '---',
        total_referrals: count || 0,
        reward_active_until: profile.referral_reward_expires_at,
        is_reward_active: isRewardActive
    };
};

export const redeemReferralCode = async (code: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('redeem_referral_code', { p_code: code });
    if (error) throw new Error(error.message);
};

export const getReferralHistory = async (): Promise<ReferralHistoryItem[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data } = await sb.from('referral_logs')
        .select(`
            id,
            status,
            created_at,
            referred:user_profiles!referred_id(name)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

    return (data || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        referred_user_name: r.referred?.name || 'Usuário'
    }));
};

export const adminGetReferrals = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    
    const { data } = await sb.from('referral_logs')
        .select(`
            id,
            created_at,
            status,
            referrer:user_profiles!referrer_id(name, email, role),
            referred:user_profiles!referred_id(name, email, role)
        `)
        .order('created_at', { ascending: false });
        
    return data || [];
};

export const createPartnerRequest = async (pickup: string, delivery: string, distance: number, totalCost: number, partnerNetValue: number, settings: PartnerFeeSettings) => { 
    const sb = getClient(); 
    if (!sb) return; 
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: profile } = await sb.from('user_profiles').select('referral_reward_expires_at').eq('id', user.id).single();
    const hasDiscount = profile?.referral_reward_expires_at && new Date(profile.referral_reward_expires_at) > new Date();

    let finalCost = totalCost;
    if (hasDiscount) {
        const originalFee = settings.global_tax_fixed + (partnerNetValue * settings.global_tax_percent);
        const discountedFee = originalFee * 0.5;
        finalCost = partnerNetValue + discountedFee;
        console.log("Aplicando desconto de indicação!");
    }

    const { error } = await sb.rpc('create_partner_request', { p_pickup: pickup, p_delivery: delivery, p_distance: distance, p_final_cost_override: hasDiscount ? finalCost : null }); 
    
    if (error) throw new Error(error.message); 
};

export const getOnlineDrivers = async (lat: number, lng: number, radiusKm: number = 10) => {
    const sb = getClient();
    if (!sb) return [];
    
    const { data } = await sb.rpc('get_active_drivers_nearby', { p_lat: lat, p_lng: lng, p_radius_km: radiusKm });
    
    if (!data) return [];

    const driverIds = data.map((d: any) => d.id);
    const { data: profiles } = await sb.from('user_profiles').select('id, referral_reward_expires_at').in('id', driverIds);
    
    const priorityMap = new Map();
    profiles?.forEach((p: any) => {
        const isActive = p.referral_reward_expires_at && new Date(p.referral_reward_expires_at) > new Date();
        priorityMap.set(p.id, isActive);
    });

    const sortedData = data.sort((a: any, b: any) => {
        const aHasPriority = priorityMap.get(a.id) || false;
        const bHasPriority = priorityMap.get(b.id) || false;
        if (aHasPriority && !bHasPriority) return -1;
        if (!aHasPriority && bHasPriority) return 1;
        return 0;
    });

    return sortedData;
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not initialized");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: users } = await sb.from('user_profiles').select('role, status, is_available');
    
    const storeStats = {
        active: users?.filter(u => u.role === 'STORE_PARTNER' && u.status === 'active').length || 0,
        total: users?.filter(u => u.role === 'STORE_PARTNER').length || 0
    };

    const driverStats = {
        online: users?.filter(u => u.role === 'DELIVERY_PARTNER' && u.is_available).length || 0,
        total: users?.filter(u => u.role === 'DELIVERY_PARTNER').length || 0
    };

    const { data: recentOrders } = await sb
        .from('partner_requests')
        .select('created_at, total_charged_store, fee_fixed, fee_percent_value')
        .gte('created_at', monthStart);

    const orders = recentOrders || [];

    const ordersToday = orders.filter(o => o.created_at >= todayStart).length;
    const ordersWeek = orders.filter(o => o.created_at >= weekStart).length;
    const ordersMonth = orders.length;

    const gmv = orders.reduce((acc, curr) => acc + (curr.total_charged_store || 0), 0);
    const platformRevenue = orders.reduce((acc, curr) => acc + (curr.fee_fixed || 0) + (curr.fee_percent_value || 0), 0);
    const averageTicket = ordersMonth > 0 ? gmv / ordersMonth : 0;

    const graphData: { date: string, count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const count = orders.filter(o => o.created_at.startsWith(dateStr)).length;
        graphData.push({ date: d.toLocaleDateString('pt-BR', { weekday: 'short' }), count });
    }

    return {
        orders: {
            today: ordersToday,
            week: ordersWeek,
            month: ordersMonth,
            total: ordersMonth,
            graphData
        },
        finance: {
            gmv,
            platformRevenue,
            averageTicket
        },
        users: {
            stores: storeStats,
            drivers: driverStats
        }
    };
};

export const sendChatMessage = async (
    message: string, 
    orderId?: string, 
    type: 'ORDER' | 'SUPPORT' = 'ORDER',
    receiverIdOverride?: string
): Promise<ChatMessageData | null> => {
    const sb = getClient();
    if (!sb) return null;
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    let receiverId = receiverIdOverride || null;

    if (type === 'ORDER' && orderId) {
        const { data: order } = await sb.from('partner_requests').select('store_id, partner_id').eq('id', orderId).single();
        if (order) {
            if (user.id === order.store_id) receiverId = order.partner_id;
            else if (user.id === order.partner_id) receiverId = order.store_id;
        }
    }

    const { data, error } = await sb.from('chat_messages').insert({
        order_id: orderId || null,
        sender_id: user.id,
        receiver_id: receiverId,
        message,
        type,
        is_read: false
    }).select().single();

    if (error) throw new Error(error.message);
    return data as ChatMessageData;
};

export const getChatMessages = async (
    orderId?: string, 
    type: 'ORDER' | 'SUPPORT' = 'ORDER', 
    targetUserId?: string
): Promise<ChatMessageData[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    let query = sb.from('chat_messages').select('*').eq('type', type).order('created_at', { ascending: true });

    if (type === 'ORDER' && orderId) {
        query = query.eq('order_id', orderId);
    } else if (type === 'SUPPORT') {
        if (targetUserId) {
            query = query.or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);
        } else {
            query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as ChatMessageData[];
};

export const adminGetSupportThreads = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    
    const { data, error } = await sb
        .from('chat_messages')
        .select(`
            sender_id, 
            message, 
            created_at, 
            sender:user_profiles!sender_id(name, email, role)
        `)
        .eq('type', 'SUPPORT')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw new Error(error.message);

    const threadsMap = new Map();
    data.forEach((msg: any) => {
        if (msg.sender_id && !threadsMap.has(msg.sender_id)) {
            threadsMap.set(msg.sender_id, {
                userId: msg.sender_id,
                userName: msg.sender?.name || msg.sender?.email || 'Usuário',
                userRole: msg.sender?.role,
                lastMessage: msg.message,
                lastDate: msg.created_at
            });
        }
    });

    return Array.from(threadsMap.values());
};

export const subscribeToChat = (
    orderId: string | undefined, 
    type: 'ORDER' | 'SUPPORT', 
    onMessage: (msg: ChatMessageData) => void,
    targetUserId?: string
): RealtimeChannel | null => {
    const sb = getClient();
    if (!sb) return null;

    let filter = `type=eq.${type}`;
    if (type === 'ORDER' && orderId) {
        filter += `&order_id=eq.${orderId}`;
    }
    
    const channel = sb.channel(`chat:${type}:${orderId || targetUserId || 'general'}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: filter
            },
            async (payload) => {
                const newMsg = payload.new as ChatMessageData;
                const { data: { user } } = await sb.auth.getUser();
                
                if (type === 'SUPPORT') {
                    if (targetUserId) {
                        if (newMsg.sender_id === targetUserId || newMsg.receiver_id === targetUserId) {
                            onMessage(newMsg);
                        }
                    } else {
                        if (newMsg.sender_id === user?.id || newMsg.receiver_id === user?.id) {
                            onMessage(newMsg);
                        }
                    }
                } else {
                    onMessage(newMsg);
                }
            }
        )
        .subscribe();

    return channel;
};

export const uploadIdentityVerification = async (file: File, location: { lat: number, lng: number, accuracy: number }) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");

    const fileExt = file.name.split('.').pop();
    const fileName = `verifications/${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await sb.storage.from('partner-documents').upload(fileName, file);
    if (uploadError) throw new Error(uploadError.message);
    
    const { data: { publicUrl } } = sb.storage.from('partner-documents').getPublicUrl(fileName);

    const confidence = 0.95; 
    
    await sb.from('identity_verifications').insert({
        user_id: user.id,
        photo_url: publicUrl,
        location_data: location,
        confidence_score: confidence,
        status: 'APPROVED'
    });

    if (location.accuracy > 1000) {
        await logFraudAlert('FAKE_GPS', `Precisão do GPS suspeita: ${location.accuracy}m`, 'MEDIUM');
    }
};

export const logFraudAlert = async (type: string, description: string, severity: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    await sb.from('fraud_alerts').insert({
        user_id: user.id,
        type,
        description,
        severity
    });
};

export const adminGetFraudAlerts = async (): Promise<FraudAlert[]> => {
    const sb = getClient();
    if (!sb) return [];
    
    const { data, error } = await sb
        .from('fraud_alerts')
        .select('*, user:user_profiles!user_id(email)')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    return data.map((d: any) => ({
        ...d,
        user_email: d.user?.email || 'N/A'
    }));
};

export const adminGetVerifications = async (): Promise<IdentityVerification[]> => {
    const sb = getClient();
    if (!sb) return [];

    const { data, error } = await sb
        .from('identity_verifications')
        .select('*, user:user_profiles!user_id(email)')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw new Error(error.message);

    return data.map((d: any) => ({
        ...d,
        user_email: d.user?.email || 'N/A'
    }));
};

export const adminResolveAlert = async (alertId: string, status: 'RESOLVED' | 'FALSE_POSITIVE') => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('fraud_alerts').update({ status }).eq('id', alertId);
};

export const broadcastLocation = (requestId: string, payload: LiveLocationPayload) => {
    const sb = getClient();
    if (!sb) return;

    const channel = sb.channel(`tracking:${requestId}`);
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            channel.send({
                type: 'broadcast',
                event: 'location',
                payload: payload
            });
        }
    });
};

export const subscribeToTracking = (requestId: string, onUpdate: (payload: LiveLocationPayload) => void): RealtimeChannel | null => {
    const sb = getClient();
    if (!sb) return null;

    const channel = sb.channel(`tracking:${requestId}`)
        .on(
            'broadcast',
            { event: 'location' },
            (payload) => onUpdate(payload.payload as LiveLocationPayload)
        )
        .subscribe();

    return channel;
};

export const fetchPartnerRequestHistory = async (
    role: 'store_partner' | 'delivery_partner',
    filters: HistoryFilters,
    page: number = 0,
    pageSize: number = 20
): Promise<{ data: PartnerRequest[], count: number, stats: any }> => {
    const sb = getClient();
    if (!sb) return { data: [], count: 0, stats: null };
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    let query = sb
        .from('partner_requests')
        .select(`
            *,
            store:user_profiles!store_id(name, phone_number),
            partner:user_profiles!partner_id(name, phone_number, vehicle_type, vehicle_plate)
        `, { count: 'exact' });

    if (role === 'store_partner') {
        query = query.eq('store_id', user.id);
    } else {
        query = query.eq('partner_id', user.id);
    }

    if (filters.startDate) query = query.gte('created_at', `${filters.startDate}T00:00:00`);
    if (filters.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59`);
    if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
    if (filters.minPrice) query = query.gte(role === 'store_partner' ? 'total_charged_store' : 'net_value_partner', filters.minPrice);
    if (filters.maxPrice) query = query.lte(role === 'store_partner' ? 'total_charged_store' : 'net_value_partner', filters.maxPrice);

    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    let stats = null;
    if (page === 0) {
        stats = {
            total_items: count || 0,
            loaded_value: data?.reduce((acc, curr) => acc + (role === 'store_partner' ? curr.total_charged_store : curr.net_value_partner), 0)
        };
    }

    return { 
        data: data as PartnerRequest[] || [], 
        count: count || 0,
        stats 
    };
};

// --- REVISED USER ROLE IDENTIFICATION ---
export const getUserRole = async (): Promise<UserRole> => {
    const sb = getClient();
    if (!sb) return 'user';
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'user';

    // 1. Try to fetch strictly from user_profiles table (Source of Truth)
    const { data: profile, error } = await sb
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile && profile.role) {
        // Normalize role string to match application types
        const normalizedRole = profile.role.toLowerCase();
        
        if (normalizedRole === 'admin') return 'admin';
        if (normalizedRole === 'store_partner') return 'store_partner';
        if (normalizedRole === 'delivery_partner') return 'delivery_partner';
        return 'user';
    }

    // 2. Fallback: Check metadata if profile fetch failed or returned null (e.g. race condition on creation)
    if (user.user_metadata?.role) {
        const metaRole = user.user_metadata.role.toLowerCase();
        if (metaRole === 'admin') return 'admin';
        if (metaRole === 'store_partner') return 'store_partner';
        if (metaRole === 'delivery_partner') return 'delivery_partner';
    }

    return 'user';
};

export const getUserStatus = async (): Promise<UserStatus> => {
    const sb = getClient();
    if (!sb) return 'active';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'active';
    const { data: profile } = await sb.from('user_profiles').select('status').eq('id', user.id).single();
    if (profile && profile.status) return profile.status as UserStatus;
    return user.user_metadata?.status || 'active';
};

export const updateCurrentUser = async (data: any) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { error } = await sb.auth.updateUser({ data });
    if (error) throw error;
};

export const updateCurrentPassword = async (password: string) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
    const sb = getClient();
    if (!sb) return false;
    const { data, error } = await sb.rpc('check_email_exists', { email_input: email });
    if (error) return false;
    return !!data;
};

export const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc('resolve_login_email', { identifier });
    if (error) return null;
    return data;
};

export const sendPasswordResetEmail = async (email: string) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
};

export const registerUserWithType = async (email: string, pass: string, name: string, phone: string, cpf: string, type: string, city: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: blacklisted } = await sb.from('blacklisted_users').select('*').or(`email.eq.${email},phone_number.eq.${phone}`).eq('status', 'active').single();
    if (blacklisted) throw new Error("Cadastro bloqueado: Seus dados constam na lista de restrição.");
    
    // Updated with emailRedirectTo
    const { data, error } = await sb.auth.signUp({ 
        email, 
        password: pass, 
        options: { 
            data: { name, phone, cpf, city, role: type },
            emailRedirectTo: window.location.origin
        } 
    });
    
    if (error) throw error;
    return data;
};

// ... keep rest of exports ...
export const uploadProfilePicture = async (file: File): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Falha na conexão.");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Auth error");
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await sb.storage.from('partner-documents').upload(fileName, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: { publicUrl } } = sb.storage.from('partner-documents').getPublicUrl(fileName);
    return publicUrl;
};

export const upgradeToPartner = async (cpf: string, rg: string) => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not found");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error: dbError } = await sb.from('user_profiles').update({ role: 'DELIVERY_PARTNER', verification_status: 'NOT_SUBMITTED', association_code: code }).eq('id', user.id);
    if (dbError) throw new Error(dbError.message);
    const { error: authError } = await sb.auth.updateUser({ data: { role: 'DELIVERY_PARTNER', cpf: cpf, rg: rg } });
    if (authError) throw new Error(authError.message);
    const { data: wallet } = await sb.from('partner_wallets').select('id').eq('partner_id', user.id).single();
    if (!wallet) await sb.from('partner_wallets').insert({ partner_id: user.id });
};

export const signOut = async () => {
    const sb = getClient();
    if (sb) {
        await sb.auth.signOut();
        Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key); });
        sessionStorage.clear();
    }
};

export const updateUserLocation = async (lat: number, lng: number) => {
    const sb = getClient();
    if (!sb) return;
    await sb.rpc('update_user_location', { p_lat: lat, p_lng: lng });
};

export const getOfflineDriversForContact = async (city: string): Promise<OfflineDriver[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('get_offline_drivers_contact', { p_city: city });
    return data || [];
};

export const getNotifications = async (): Promise<AppNotification[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('user_notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false });
    return data || [];
};

export const markNotificationAsRead = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('user_notifications').update({ is_read: true }).eq('id', id);
};

export const adminSendGlobalNotification = async (title: string, message: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('global_notifications').insert({ title, message });
    if (error) throw new Error(error.message);
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    const sb = getClient();
    if (!sb) return storage.getNotificationPreferences();
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return storage.getNotificationPreferences();

    const { data } = await sb.from('notification_settings').select('*').eq('user_id', user.id).single();
    if (!data) {
        const defaults = { user_id: user.id, new_orders: true, order_updates: true, system_alerts: true, marketing: true, sound_enabled: true };
        await sb.from('notification_settings').insert(defaults);
        return defaults as NotificationPreferences;
    }
    return data as NotificationPreferences;
};

export const updateNotificationPreferences = async (prefs: NotificationPreferences) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    const { error } = await sb.from('notification_settings').upsert({ user_id: user.id, ...prefs });
    if (error) throw new Error(error.message);
};

export const getMyOrders = async (): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
};

export const createOrder = async (orderData: any): Promise<Order> => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not logged in");
    const { data, error } = await sb.from('orders').insert({ ...orderData, user_id: user.id, status: 'pending_payment' }).select().single();
    if (error) throw error;
    return data;
};

export const uploadBackup = async (userId: string) => { console.log("Uploading backup", userId); };
export const downloadBackup = async (userId: string): Promise<boolean> => { console.log("Downloading backup", userId); return true; };

export const adminGetBlacklist = async (): Promise<BlacklistEntry[]> => {
    const sb = getClient();
    if (!sb) throw new Error("Supabase not init");
    const { data, error } = await sb.from('blacklisted_users').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as BlacklistEntry[];
};

export const adminAddToBlacklist = async (email: string, phone: string, reason: string, type: PunishmentType = 'BAN', expiresAt?: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Supabase not init");
    const { error } = await sb.from('blacklisted_users').insert({ email: email || null, phone_number: phone || null, reason, punishment_type: type, expires_at: expiresAt || null, status: 'active', created_by: (await sb.auth.getUser()).data.user?.id });
    if (error) throw new Error(error.message);
};

export const adminRemoveFromBlacklist = async (id: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Supabase not init");
    const { error } = await sb.from('blacklisted_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const adminRevokePunishment = async (id: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Supabase not init");
    const { error } = await sb.from('blacklisted_users').update({ status: 'revoked' }).eq('id', id);
    if (error && error.code === '42703') await adminRemoveFromBlacklist(id);
    else if (error) throw new Error(error.message);
};

export const adminBlacklistUser = async (userId: string, email: string | undefined, phone: string | undefined, reason: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Supabase not init");
    await adminAddToBlacklist(email || '', phone || '', reason, 'BAN');
    await updateUserStatus(userId, 'banned');
};

export const getAllUsers = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.from('user_profiles').select('*');
    if (error) return [];
    return (data || []).map((u: any) => ({ id: u.id, email: u.email || 'N/A', created_at: u.created_at || new Date().toISOString(), role: u.role, status: u.status, name: u.name, phone_number: u.phone_number, cpf: u.cpf, city: u.city, user_type: u.role as any, verification_status: u.verification_status }));
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('user_profiles').update({ status }).eq('id', userId);
    if (error) throw new Error(error.message);
};

export const updateUserRole = async (userId: string, role: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('user_profiles').update({ role: role.toUpperCase() }).eq('id', userId);
    if (error) throw new Error(error.message);
};

export const getAvailableCities = async (term?: string): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('available_cities').select('*').eq('is_active', true);
    if (term) query = query.ilike('name', `%${term}%`);
    const { data } = await query;
    return data || [];
};

export const requestNewCity = async (name: string, state: string, email?: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('city_requests').insert({ city_name: name, state, user_email: email });
};

export const adminGetCities = async (): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('available_cities').select('*');
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
    if (!sb) return;
    await sb.from('available_cities').insert({ name, state, is_active: true });
};

export const adminUpdateCityStatus = async (id: number, isActive: boolean) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_update_city_status', { p_id: id, p_is_active: isActive });
    if (error) throw error;
};

export const adminEditCity = async (id: number, name: string, state: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_edit_city', { p_id: id, p_name: name, p_state: state });
    if (error) throw error;
};

export const adminProcessCityRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('city_requests').update({ status }).eq('id', id);
    if (status === 'APPROVED') {
        const { data } = await sb.from('city_requests').select('*').eq('id', id).single();
        if (data) await adminAddCity(data.city_name, data.state);
    }
};

export const getShopData = async () => {
    const sb = getClient();
    if (!sb) return { products: [], categories: [], settings: null };
    const [p, c, s] = await Promise.all([sb.from('products').select('*').eq('is_active', true), sb.from('categories').select('*'), getShopSettings()]);
    return { products: p.data || [], categories: c.data || [], settings: s };
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
    const payload = { ...settings, id: true };
    await sb.from('shop_settings').upsert(payload);
};

export const adminGetCategories = async (): Promise<Category[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('categories').select('*');
    return data || [];
};

export const adminAddCategory = async (name: string) => { const sb = getClient(); if (!sb) return; await sb.from('categories').insert({ name }); };
export const adminDeleteCategory = async (id: string) => { const sb = getClient(); if (!sb) return; await sb.from('categories').delete().eq('id', id); };
export const adminGetProducts = async (): Promise<Product[]> => { const sb = getClient(); if (!sb) return []; const { data } = await sb.from('products').select('*').order('created_at', { ascending: false }); return data || []; };
export const adminAddProduct = async (product: Partial<Product>) => { const sb = getClient(); if (!sb) return; await sb.from('products').insert(product); };
export const adminUpdateProduct = async (id: string, updates: Partial<Product>) => { const sb = getClient(); if (!sb) return; await sb.from('products').update(updates).eq('id', id); };
export const adminDeleteProduct = async (id: string) => { const sb = getClient(); if (!sb) return; await sb.from('products').delete().eq('id', id); };

export const getMyWallet = async (): Promise<StoreWallet | null> => { const sb = getClient(); if (!sb) return null; const { data } = await sb.rpc('get_my_wallet'); return (data && data.length > 0) ? data[0] : null; };
export const getWalletTransactions = async (): Promise<WalletTransaction[]> => { const sb = getClient(); if (!sb) return []; const { data: { user } } = await sb.auth.getUser(); if (!user) return []; const { data } = await sb.from('store_wallet_transactions').select('*').eq('store_id', user.id).order('created_at', { ascending: false }); return data || []; };
export const createRechargeCharge = async (amount: number, method: 'PIX' | 'BOLETO') => { console.log("Creating recharge", amount, method); return { asaas_pix_copy_paste: 'mock-pix-code-123', asaas_bank_slip_url: '#' }; };
export const getStoreRequests = async (): Promise<PartnerRequest[]> => { const sb = getClient(); if (!sb) return []; const { data } = await sb.rpc('get_store_requests'); return data || []; };
export const storeSubmitRating = async (requestId: string, rating: number) => { const sb = getClient(); if (!sb) return; await sb.from('partner_ratings').insert({ request_id: requestId, rating }); };
export const storeDecideFailedDelivery = async (requestId: string, decision: 'RETURN' | 'DISCARD') => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('store_decide_failed_delivery', { p_request_id: requestId, p_decision: decision }); if (error) throw error; };
export const adminGetFeeSettings = async (): Promise<PartnerFeeSettings | null> => { const sb = getClient(); if (!sb) return null; const { data } = await sb.rpc('admin_get_fee_settings'); return data && data.length > 0 ? data[0] : null; };
export const adminUpdateFeeSettings = async (settings: any) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('admin_update_fee_settings', { p_settings: settings }); if (error) throw new Error(error.message); };

export const getMyPartnerProfile = async (): Promise<PartnerProfile | null> => { const sb = getClient(); if (!sb) return null; const { data: { user } } = await sb.auth.getUser(); if (!user) return null; const { data } = await sb.from('user_profiles').select('*').eq('id', user.id).single(); if (!data) return null; let code = data.association_code; if (!code && data.role === 'DELIVERY_PARTNER') { code = Math.random().toString(36).substring(2, 8).toUpperCase(); await sb.from('user_profiles').update({ association_code: code }).eq('id', user.id); } return { user_id: data.id, is_active: data.status === 'active', is_available: data.is_available, city: data.city, verification_status: data.verification_status, vehicle_type: data.vehicle_type, vehicle_plate: data.vehicle_plate, vehicle_model: data.vehicle_model, vehicle_year: data.vehicle_year, asaas_wallet_id: data.asaas_wallet_id, partner_level: data.partner_level, average_rating: data.average_rating, completed_deliveries: data.completed_deliveries, share_phone_offline: data.share_phone_offline, association_code: code }; };
export const updateMyPartnerProfile = async (updates: Partial<PartnerProfile>) => { const sb = getClient(); if (!sb) return; const { data: { user } } = await sb.auth.getUser(); if (!user) return; const dbUpdates: any = {}; if (updates.vehicle_type) dbUpdates.vehicle_type = updates.vehicle_type; if (updates.vehicle_plate) dbUpdates.vehicle_plate = updates.vehicle_plate; if (updates.vehicle_model) dbUpdates.vehicle_model = updates.vehicle_model; if (updates.vehicle_year) dbUpdates.vehicle_year = updates.vehicle_year; if (updates.is_available !== undefined) dbUpdates.is_available = updates.is_available; if (updates.share_phone_offline !== undefined) dbUpdates.share_phone_offline = updates.share_phone_offline; await sb.from('user_profiles').update(dbUpdates).eq('id', user.id); };
export const getPartnerRequestsAvailable = async (): Promise<PartnerRequest[]> => { const sb = getClient(); if (!sb) return []; const { data } = await sb.rpc('get_partner_requests_available'); return data || []; };
export const acceptPartnerRequest = async (requestId: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('accept_partner_request', { p_request_id: requestId }); if (error) throw new Error(error.message); };
export const partnerConfirmPickup = async (requestId: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('partner_confirm_pickup', { p_request_id: requestId }); if (error) throw new Error(error.message); };
export const partnerConfirmDelivery = async (requestId: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('partner_confirm_delivery', { p_request_id: requestId }); if (error) throw new Error(error.message); };
export const partnerReportDeliveryFailure = async (requestId: string, reason: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('partner_report_delivery_failure', { p_request_id: requestId, p_reason: reason }); if (error) throw new Error(error.message); };
export const partnerConfirmReturn = async (requestId: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('partner_confirm_return', { p_request_id: requestId }); if (error) throw new Error(error.message); };
export const getPartnerFinancialSummary = async (): Promise<PayoutSummary> => { const sb = getClient(); if (!sb) throw new Error("Supabase not init"); const { data, error } = await sb.rpc('get_partner_financial_summary'); if (error) throw new Error(error.message); return data; };
export const getPartnerPaymentHistory = async (): Promise<PartnerPayment[]> => { const sb = getClient(); if (!sb) return []; const { data: { user } } = await sb.auth.getUser(); if (!user) return []; const { data } = await sb.from('partner_payments').select('*').eq('partner_id', user.id).order('created_at', { ascending: false }); return data || []; };
export const requestEmergencyPayoutAsaas = async () => { console.log("Requesting emergency payout..."); };
export const getPartnerDocuments = async (): Promise<PartnerDocument[]> => { const sb = getClient(); if (!sb) return []; const { data: { user } } = await sb.auth.getUser(); if (!user) return []; const { data } = await sb.from('partner_documents').select('*').eq('user_id', user.id); return data || []; };
export const uploadPartnerDocument = async (file: File, type: string) => { const sb = getClient(); if (!sb) throw new Error("Falha."); const { data: { user } } = await sb.auth.getUser(); if (!user) throw new Error("Sessão expirada."); const fileExt = file.name.split('.').pop(); const fileName = `${user.id}/${type}.${fileExt}`; const { error: uploadError } = await sb.storage.from('partner-documents').upload(fileName, file, { upsert: true }); if (uploadError) throw new Error(uploadError.message); const { data: { publicUrl } } = sb.storage.from('partner-documents').getPublicUrl(fileName); const { data: existing } = await sb.from('partner_documents').select('id').eq('user_id', user.id).eq('document_type', type).single(); if (existing) { await sb.from('partner_documents').update({ file_url: publicUrl, status: 'PENDING', admin_notes: null }).eq('id', existing.id); } else { await sb.from('partner_documents').insert({ user_id: user.id, document_type: type, file_url: publicUrl, status: 'PENDING' }); } };
export const requestPartnerReview = async () => { const sb = getClient(); if (!sb) return; const { data: { user } } = await sb.auth.getUser(); if (!user) return; const { error } = await sb.from('user_profiles').update({ verification_status: 'PENDING_REVIEW' }).eq('id', user.id); if (error) throw error; };

export const findPartnerByCode = async (code: string): Promise<ManagedUser | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('user_profiles').select('*').eq('association_code', code).eq('role', 'DELIVERY_PARTNER').single();
    if (!data) return null;
    return {
        id: data.id,
        email: data.email || '',
        created_at: data.created_at,
        role: data.role,
        status: data.status,
        name: data.name,
        phone_number: data.phone_number,
        cpf: data.cpf,
        verification_status: data.verification_status,
        vehicle_type: data.vehicle_type,
        average_rating: data.average_rating
    };
};

export const adminGetAllStoreWallets = async (): Promise<StoreWallet[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('admin_get_all_store_wallets');
    return data || [];
};

export const adminToggleSuperStore = async (storeId: string, status: boolean) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('user_profiles').update({ is_super_store: status }).eq('id', storeId);
    if (error) throw new Error(error.message);
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
    if (!user) throw new Error("Not logged in");
    const { error } = await sb.from('support_claims').insert({
        user_id: user.id,
        user_email: user.email,
        type,
        description,
        status: 'open'
    });
    if (error) throw new Error(error.message);
};

export const adminGetClaims = async (): Promise<Claim[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('support_claims').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const adminResolveClaim = async (claimId: string, response: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('support_claims').update({ 
        status: 'resolved', 
        admin_response: response 
    }).eq('id', claimId);
    if (error) throw new Error(error.message);
};

export const adminGetPendingPartners = async (): Promise<ManagedUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('user_profiles')
        .select('*')
        .eq('role', 'DELIVERY_PARTNER')
        .in('verification_status', ['PENDING_REVIEW', 'NOT_SUBMITTED', 'REJECTED'])
        .order('created_at', { ascending: false });
    return (data || []).map((u: any) => ({ ...u, user_type: u.role }));
};

export const adminGetPartnerDetails = async (userId: string): Promise<{ profile: PartnerProfile, documents: PartnerDocument[] }> => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: profile } = await sb.from('user_profiles').select('*').eq('id', userId).single();
    const { data: documents } = await sb.from('partner_documents').select('*').eq('user_id', userId);
    return {
        profile: {
            user_id: profile.id,
            is_active: profile.status === 'active',
            is_available: profile.is_available,
            city: profile.city,
            verification_status: profile.verification_status,
            vehicle_type: profile.vehicle_type,
            vehicle_plate: profile.vehicle_plate,
            vehicle_model: profile.vehicle_model,
            vehicle_year: profile.vehicle_year,
            asaas_wallet_id: profile.asaas_wallet_id,
            average_rating: profile.average_rating,
            completed_deliveries: profile.completed_deliveries,
            association_code: profile.association_code
        },
        documents: documents || []
    };
};

export const adminUpdateDocumentStatus = async (docId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('partner_documents').update({ status, admin_notes: notes }).eq('id', docId);
    if (error) throw new Error(error.message);
};

export const adminUpdatePartnerStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
    const sb = getClient();
    if (!sb) return;
    const updates: any = {};
    if (status === 'APPROVED') {
        updates.verification_status = 'APPROVED';
        updates.status = 'active';
    } else if (status === 'REJECTED') {
        updates.verification_status = 'REJECTED';
    } else if (status === 'BLOCKED') {
        updates.status = 'banned';
    }
    const { error } = await sb.from('user_profiles').update(updates).eq('id', userId);
    if (error) throw new Error(error.message);
};

export const adminGetPayoutSettings = async (): Promise<PayoutSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('payout_settings').select('*').single();
    return data;
};

export const adminGetPayoutHistory = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('admin_get_payout_history');
    return data || [];
};

export const adminUpdatePayoutSettings = async (settings: PayoutSettings) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('payout_settings').upsert({ id: true, ...settings });
    if (error) throw new Error(error.message);
};

export const adminGetPartnerLevels = async (): Promise<PartnerLevelBenefit[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_levels').select('*').order('min_deliveries', { ascending: true });
    return data || [];
};

export const adminUpdatePartnerLevel = async (level: PartnerLevelBenefit) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('partner_levels').upsert(level);
    if (error) throw new Error(error.message);
};

export const adminGetAllRatings = async (): Promise<PartnerRating[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('partner_ratings')
        .select(`*, evaluator:user_profiles!evaluator_id(name), evaluated:user_profiles!evaluated_id(name)`)
        .order('created_at', { ascending: false });
    return (data || []).map((r: any) => ({
        ...r,
        evaluator_name: r.evaluator?.name || 'Desconhecido',
        evaluated_name: r.evaluated?.name || 'Desconhecido'
    }));
};

export const submitRating = async (requestId: string, rating: number, comment: string, direction: 'STORE_TO_PARTNER' | 'PARTNER_TO_STORE') => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");
    const { error } = await sb.rpc('submit_rating', { 
        p_request_id: requestId, 
        p_evaluator_id: user.id, 
        p_rating: rating, 
        p_comment: comment, 
        p_direction: direction 
    });
    if (error) throw new Error(error.message);
};

export const getCurrentShift = async (): Promise<WorkShift | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('work_shifts').select('*').eq('partner_id', user.id).is('end_time', null).order('start_time', { ascending: false }).limit(1).single();
    return data || null;
};

export const startWorkShift = async (): Promise<WorkShift> => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");
    const { data, error } = await sb.from('work_shifts').insert({
        partner_id: user.id,
        start_time: new Date().toISOString(),
        status: 'ACTIVE'
    }).select().single();
    if (error) throw new Error(error.message);
    await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);
    return data;
};

export const pauseWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    const breaks = shift?.breaks || [];
    breaks.push({ start: new Date().toISOString() });
    await sb.from('work_shifts').update({ status: 'PAUSED', breaks }).eq('id', shiftId);
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

export const resumeWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    const breaks = shift?.breaks || [];
    if (breaks.length > 0) breaks[breaks.length - 1].end = new Date().toISOString();
    await sb.from('work_shifts').update({ status: 'ACTIVE', breaks }).eq('id', shiftId);
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);
};

export const endWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('work_shifts').update({ status: 'COMPLETED', end_time: new Date().toISOString() }).eq('id', shiftId);
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

export const getPartnerAssociatedStores = async (): Promise<any[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('get_partner_associated_stores');
    return data || [];
};

export const getStoreAssociatedPartners = async (): Promise<StoreDeliveryPartner[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('get_store_associated_partners');
    return data || [];
};

export const associatePartnerToStore = async (partnerId: string, fee: number) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('associate_partner_to_store', { p_partner_id: partnerId, p_fee: fee });
    if (error) throw new Error(error.message);
};

export const removePartnerAssociation = async (associationId: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('store_delivery_partners').delete().eq('id', associationId);
    if (error) throw new Error(error.message);
};

export const getWebhookUrl = () => "https://ojintgpbmbfkgbssnchx.supabase.co/functions/v1/asaas-webhook";

export const adminGetAsaasWebhookSettings = async () => {
    const sb = getClient();
    if (!sb) return { webhook_secret: '', active_events: [] };
    const { data } = await sb.from('asaas_webhook_settings').select('*').single();
    return data || { webhook_secret: '', active_events: [] };
};

export const adminGetAsaasWebhookLogs = async (): Promise<AsaasWebhookLog[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.from('asaas_webhook_logs').select('*').order('created_at', { ascending: false }).limit(100);
    return data || [];
};

export const adminUpdateAsaasWebhookSettings = async (activeEvents: string[]) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('asaas_webhook_settings').upsert({ id: true, active_events: activeEvents });
    if (error) throw new Error(error.message);
};

export const getFinancialStatement = async (role: UserRole, startDate: string, endDate: string): Promise<{ items: FinancialStatementItem[], summary: any }> => {
    const sb = getClient();
    if (!sb) return { items: [], summary: { balance: 0, in: 0, out: 0 } };
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { items: [], summary: { balance: 0, in: 0, out: 0 } };

    let transactions: any[] = [];
    let currentBalance = 0;

    if (role === 'store_partner') {
        const { data } = await sb.from('store_wallet_transactions').select('*').eq('store_id', user.id).gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59').order('created_at', { ascending: false });
        transactions = (data || []).map((t: any) => ({
            id: t.id,
            date: t.created_at,
            type: t.amount >= 0 ? 'DEPOSIT' : 'EXPENSE',
            description: t.type,
            amount: t.amount,
            status: t.status === 'CONFIRMED' ? 'COMPLETED' : t.status,
            category: 'wallet'
        }));
        const { data: wallet } = await sb.from('store_wallets').select('balance_decimal').eq('store_id', user.id).single();
        currentBalance = wallet?.balance_decimal || 0;
    } else if (role === 'delivery_partner') {
        const { data } = await sb.from('partner_payments').select('*').eq('partner_id', user.id).gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59').order('created_at', { ascending: false });
        transactions = (data || []).map((t: any) => ({
            id: t.id,
            date: t.created_at,
            type: 'WITHDRAWAL',
            description: t.is_emergency ? 'Saque Emergencial' : 'Repasse Semanal',
            amount: -t.amount,
            status: t.status === 'DONE' ? 'COMPLETED' : t.status,
            category: 'payout'
        }));
        const { data: earnings } = await sb.from('partner_requests').select('*').eq('partner_id', user.id).eq('status', 'COMPLETED').gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59');
        const earningItems = (earnings || []).map((e: any) => ({
            id: e.id,
            date: e.created_at,
            type: 'EARNING',
            description: 'Entrega Realizada',
            amount: e.net_value_partner,
            status: 'COMPLETED',
            category: 'delivery'
        }));
        transactions = [...transactions, ...earningItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const { data: wallet } = await sb.from('partner_wallets').select('balance').eq('partner_id', user.id).single();
        currentBalance = wallet?.balance || 0;
    }

    const totalIn = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return { items: transactions, summary: { balance: currentBalance, in: totalIn, out: totalOut } };
};

export const getStoreReportsData = async (): Promise<StoreReportData> => {
    const sb = getClient();
    if (!sb) throw new Error("No client");
    const { data } = await sb.rpc('get_store_reports');
    return data || { totalRequests: 0, totalValue: 0, peakHours: [], driverPerformance: [] };
};

export const adminGetPWASettings = async (): Promise<PWASettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('pwa_settings').select('*').single();
    return data;
};

export const adminUpdatePWASettings = async (settings: PWASettings) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('pwa_settings').upsert({ id: true, ...settings });
    if (error) throw new Error(error.message);
};

export const adminGetAllWallets = async (): Promise<AdminWalletUser[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data } = await sb.rpc('admin_get_consolidated_wallets');
    return data || [];
};

export const adminAdjustBalance = async (userId: string, amount: number, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_adjust_balance', { 
        p_user_id: userId, 
        p_amount: amount, 
        p_reason: reason 
    });
    if (error) throw new Error(error.message);
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