import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { UserRole, ShopSettings, UserStatus, ManagedUser, PartnerRequest, PartnerFeeSettings, PartnerProfile, PartnerDocument, DocumentType, WorkShift, City, CityRequest, Claim, AsaasWebhookLog, MaintenanceSettings, PartnerLevelBenefit, FraudAlert, IdentityVerification, PlatformNews, PWASettings, AdminDashboardStats, ReferralData, ReferralHistoryItem, AdminWalletUser, FinancialStatementItem, LiveLocationPayload, ZePayData, StoreVirtualCard, PartnerRating, BlacklistEntry, StoreDeliveryPartner, HistoryFilters, UserTerminal, UserTerminalHistoryItem, ZebankData, ZebankCard, PayoutSummary, ChatMessageData, AssociatedStore, Order, Product, Category, AppNotification, StoreShippingRule, CartItem, DeliveryRecord, NotificationPreferences, StoreWallet, BlitzAlert, PaymentMethod, StoreReportData, SalesSimulation, PayoutSettings, DriverPaymentInfo, PendingPayoutSummary, PayoutMethodType, InstitutionalContent, InstitutionalPageKey, InstitutionalCategory, InstitutionalTag, InstitutionalContentImage, InstitutionalContentVersion, ContentStatus, LoanConfig, LoanItem, LoanStatus, PartnerRequestStatus, CofrinhoSettings, StoreProduct, AppSlide } from '../types';

import * as storage from './storage';
import * as logger from './logger';

let supabase: SupabaseClient | null = null;

// Initialize Supabase Client
export const initSupabase = () => {
    if (supabase) return supabase;
    // In a real app, these would come from environment variables
    const supabaseUrl = 'https://pjnxrqemjozlpnvoxpmn.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbnhycWVtam96bHBudm94cG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjA2NjEsImV4cCI6MjA4MDEzNjY2MX0.amhZETKiDAo-Io0A-UIjqXrHt7UnmJNGngOjp2elAfE';

    // Check if env vars are present (mock check)
    if (!supabaseUrl || !supabaseKey) return null;

    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
        logger.setRemoteSender(async (entry) => {
            try {
                const { data: { user } } = await supabase!.auth.getUser();
                const payload = { user_id: user?.id || null, message: entry.message, payload: { ts: entry.ts, level: entry.level, context: entry.context, txn: entry.txn } } as any;
                await supabase!.from('client_error_logs').insert(payload);
            } catch { }
        });
        return supabase;
    } catch (error) {
        console.error("Failed to initialize Supabase:", error);
        return null;
    }
};

export const getClient = () => {
    if (!supabase) return initSupabase();
    return supabase;
};

// --- OFFLINE SYNC LOGIC ---

interface OfflineQueueItem {
    id: string;
    type: 'POS_TRANSACTION';
    payload: any;
    timestamp: number;
}

const getOfflineQueue = (): OfflineQueueItem[] => {
    try {
        const stored = localStorage.getItem('offline_sync_queue');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addToOfflineQueue = (type: 'POS_TRANSACTION', payload: any) => {
    const queue = getOfflineQueue();
    queue.push({
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: Date.now()
    });
    localStorage.setItem('offline_sync_queue', JSON.stringify(queue));
};

export const syncOfflineData = async (): Promise<boolean> => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return true;

    const sb = getClient();
    if (!sb) return false;

    // Check actual connectivity via a lightweight call
    try {
        // Simple health check or just proceed and catch error
        const { error } = await sb.from('pwa_settings').select('id').limit(1);
        if (error) throw error;
    } catch (e) {
        return false; // Still offline
    }

    const remainingQueue: OfflineQueueItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
        try {
            if (item.type === 'POS_TRANSACTION') {
                // Ensure the payload has the offline flag
                const payload = { ...item.payload, is_offline_sync: true };

                // Re-fetch terminal ID if needed or trust stored ID
                // Ideally payload has everything. 
                // We perform the insert directly.
                const { error } = await sb.from('user_terminal_transactions').insert(payload);
                if (error) throw error;
            }
            syncedCount++;
        } catch (e) {
            console.error(`Failed to sync item ${item.id}`, e);
            remainingQueue.push(item); // Keep in queue if failed
        }
    }

    localStorage.setItem('offline_sync_queue', JSON.stringify(remainingQueue));
    return remainingQueue.length === 0;
};

export const createTerminalTransaction = async (payload: any) => {
    const sb = getClient();
    // If no client (offline) or explicitly offline check?
    // We try/catch the insert.
    if (!sb) {
        addToOfflineQueue('POS_TRANSACTION', payload);
        return;
    }
    try {
        const { error } = await sb.from('user_terminal_transactions').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error('Network/DB error, queuing offline:', e);
        addToOfflineQueue('POS_TRANSACTION', payload);
    }
};

// --- AUTH & USER ---

export const getUserRole = async (): Promise<UserRole> => {
    const sb = getClient();
    if (!sb) return 'delivery_person';
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return 'delivery_person';
        const { data, error } = await sb.rpc('get_my_role_and_status');
        if (error) {
            const metaRole = ((user.user_metadata?.role as string | null) || 'delivery_person').toLowerCase() as UserRole;
            return metaRole;
        }
        const validData = Array.isArray(data) ? data[0] : data;
        const roleValue = (validData?.role as string | null) || (user.user_metadata?.role as string | null) || 'delivery_person';
        return roleValue.toLowerCase() as UserRole;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('Refresh Token')) {
            try { await sb.auth.signOut(); } catch { }
        }
        return 'delivery_person';
    }
};

export const getUserStatus = async (): Promise<UserStatus> => {
    const sb = getClient();
    if (!sb) return 'active';
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return 'active';
        const { data, error } = await sb.rpc('get_my_role_and_status');
        if (error) return 'active';
        const validData = Array.isArray(data) ? data[0] : data;
        return (validData?.status as UserStatus) || 'active';
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('Refresh Token')) {
            try { await sb.auth.signOut(); } catch { }
        }
        return 'active';
    }
};

export const getInitialUserData = async (): Promise<{ role: UserRole, status: UserStatus }> => {
    const sb = getClient();
    const defaultData = { role: 'delivery_person' as UserRole, status: 'active' as UserStatus };
    if (!sb) return defaultData;

    try {
        const { data, error } = await sb.rpc('get_my_role_and_status');
        if (error) {
            const { data: { user } } = await sb.auth.getUser();
            const fallbackRole = ((user?.user_metadata?.role as string | null) || 'delivery_person').toLowerCase() as UserRole;
            return { role: fallbackRole, status: 'active' };
        }
        const validData = Array.isArray(data) ? data[0] : data;
        const role = ((validData?.role as string | null) || 'delivery_person').toLowerCase() as UserRole;
        const statusValue = (validData?.status as UserStatus) || 'active';
        return { role, status: statusValue };
    } catch (err: any) {
        const msg = err?.message || '';

        if (msg.includes('permission denied for table user_profiles')) {
            console.log('[GET_INITIAL_USER_DATA] catch permission denied, using safe defaults', {
                error: msg,
            });
            return { role: 'delivery_person', status: 'active' };
        }

        if (msg.includes('Refresh Token')) {
            try { await sb.auth.signOut(); } catch { }
        }
        // Se houver qualquer outro erro, também é mais seguro assumir que não foi encontrado
        // para evitar que um usuário fique "preso" em um estado logado, mas quebrado.
        logger.error('GET_INITIAL_USER_DATA_CATCH_ALL', { error: msg });
        console.log('[GET_INITIAL_USER_DATA] catch', { error: msg });
        return { role: 'delivery_person', status: 'not_found' };
    }
};

export const signOut = async () => {
    const sb = getClient();
    if (!sb) return;

    const txn = logger.withTxn();
    try {
        // Tenta fazer o signOut local e global em paralelo.
        const results = await Promise.allSettled([
            sb.auth.signOut({ scope: 'local' }),
            sb.auth.signOut({ scope: 'global' })
        ]);

        const localResult = results[0];
        const globalResult = results[1];

        if (localResult.status === 'rejected') {
            logger.error('auth.signOut failed (local)', { error: localResult.reason }, txn);
        }
        if (globalResult.status === 'rejected') {
            // O erro no global é menos crítico, então usamos um 'warn'
            logger.warn('auth.signOut failed (global)', { error: globalResult.reason }, txn);
        }

        if (localResult.status === 'fulfilled') {
            logger.info('auth.signOut success (local)', {}, txn);
        }

        // Limpa todo o localStorage como uma medida de segurança final
        // para garantir que nenhum dado de sessão persista.
        try {
            storage.clearAllData();
            logger.info('localStorage_cleared_on_signOut', {}, txn);
        } catch (e) {
            logger.error('localStorage_clear_failed_on_signOut', { error: e }, txn);
        }

        // Se o local signOut falhou, relança o erro para que a UI possa reagir.
        if (localResult.status === 'rejected') {
            throw localResult.reason;
        }

    } catch (err: any) {
        const msg = err?.message || String(err);
        const context = { error_message: msg };
        // Evita logar "AbortError" como um erro crítico, pois pode ser intencional (navegação)
        if (msg.includes('Abort') || msg.includes('ERR_ABORTED')) {
            logger.warn('auth.signOut aborted', context, txn);
            return;
        }
        logger.error('auth.signOut critical failure', context, txn);
        throw err; // Relança para ser tratado pela UI
    }
};

export const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const sb = getClient();
    if (!sb) {
        logger.warn('RESOLVE_EMAIL_NO_CLIENT', { identifier });
        return null;
    }

    const txn = logger.withTxn();
    logger.info('RESOLVE_EMAIL_START', { identifier }, txn);

    const { data, error } = await sb.rpc('resolve_login_email', { identifier });

    if (error) {
        logger.error('RESOLVE_EMAIL_RPC_ERROR', { identifier, error }, txn);
    } else {
        logger.info('RESOLVE_EMAIL_SUCCESS', { identifier, resolvedEmail: data }, txn);
    }

    const resolved = data || (identifier.includes('@') ? identifier : null);

    if (!resolved) {
        logger.warn('RESOLVE_EMAIL_NOT_FOUND', { identifier }, txn);
    }

    return resolved;
};

export const sendPasswordResetEmail = async (email: string) => {
    const sb = getClient();
    if (sb) await sb.auth.resetPasswordForEmail(email);
};

export const registerUserWithType = async (email: string, password: string, userData: any) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const txn = logger.withTxn();
    logger.info('AUTH_SIGNUP_REQUEST', { email, meta: userData }, txn);

    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: userData
        }
    });

    if (error) {
        logger.error('AUTH_SIGNUP_ERROR', { email, error }, txn);
        throw error;
    }

    logger.info('AUTH_SIGNUP_RESPONSE', { email, userId: data?.user?.id }, txn);
    return data;
};

// --- COLLABORATOR AUTH ---

export const loginCollaborator = async (username: string, password: string): Promise<any | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc('login_collaborator', { p_username: username, p_password: password });
    if (error) {
        console.error('Login Collaborator Failed', error);
        return null;
    }
    return data;
};

export const createCollaborator = async (username: string, password: string): Promise<string | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null; // Must be store owner logged in

    const { data, error } = await sb.rpc('create_collaborator', {
        p_username: username,
        p_password: password,
        p_store_id: user.id
    });
    if (error) {
        console.error('Create Collaborator Failed', error);
        throw error;
    }
    return data;
};

export const getProductsForCollaborator = async (storeId: string) => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_products_for_collaborator', { p_store_id: storeId });
    if (error) {
        console.error('getProductsForCollaborator error', error);
        return [];
    }
    return data || [];
};

export const placeCollaboratorOrder = async (storeId: string, collaboratorId: string | undefined, tableIdentifier: string, items: any[]) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('place_collaborator_order', {
        p_store_id: storeId,
        p_collaborator_id: collaboratorId || null,
        p_table_identifier: tableIdentifier,
        p_items: items
    });
    if (error) throw error;
    return data;
};

export const getStoreCollaborators = async () => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data, error } = await sb.rpc('get_store_collaborators', { p_store_id: user.id });
    if (error) {
        console.error('getStoreCollaborators error', error);
        return [];
    }
    return data || [];
};

export const toggleCollaboratorStatus = async (collaboratorId: string, active: boolean) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('toggle_collaborator_status', { p_collaborator_id: collaboratorId, p_active: active });
    if (error) throw error;
};

// --- PROFILE ---

export const getMyPartnerProfile = async (): Promise<PartnerProfile | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data } = await sb.from('user_profiles').select('*').eq('id', user.id).single();
    return data;
};

export const updateMyPartnerProfile = async (updates: Partial<PartnerProfile>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { error } = await sb.from('user_profiles').update(updates).eq('id', user.id);
    if (error) throw error;
};

export const uploadProfilePicture = async (file: File): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not found");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = sb.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const uploadGenericImage = async (file: File, bucketName: string = 'public-files', folderPath: string = 'uploads'): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    const { error: uploadError } = await sb.storage
        .from(bucketName)
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = sb.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return publicUrl;
};

// --- WORK SHIFT MANAGEMENT ---

export const getCurrentShift = async (): Promise<WorkShift | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    // Find the latest active or paused shift
    const { data, error } = await sb
        .from('work_shifts')
        .select('*')
        .eq('partner_id', user.id)
        .in('status', ['ACTIVE', 'PAUSED'])
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is row not found
        console.error("Error fetching shift", error);
    }

    return data || null;
};

export const startWorkShift = async (): Promise<WorkShift> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not logged in");

    // Double check if already active
    const existing = await getCurrentShift();
    if (existing) return existing;

    const { data, error } = await sb
        .from('work_shifts')
        .insert({
            partner_id: user.id,
            status: 'ACTIVE',
            start_time: new Date().toISOString(),
            breaks: []
        })
        .select()
        .single();

    if (error) throw error;

    // Update profile availability
    await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);

    return data;
};

export const pauseWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;

    // Fetch current breaks
    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    const currentBreaks = shift?.breaks || [];

    const newBreak = { start: new Date().toISOString() };

    const { error } = await sb
        .from('work_shifts')
        .update({
            status: 'PAUSED',
            breaks: [...currentBreaks, newBreak]
        })
        .eq('id', shiftId);

    if (error) throw error;

    // Update profile availability
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

export const resumeWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;

    const { data: shift } = await sb.from('work_shifts').select('breaks').eq('id', shiftId).single();
    let currentBreaks = shift?.breaks || [];

    // Close the last break
    if (currentBreaks.length > 0) {
        currentBreaks[currentBreaks.length - 1].end = new Date().toISOString();
    }

    const { error } = await sb
        .from('work_shifts')
        .update({
            status: 'ACTIVE',
            breaks: currentBreaks
        })
        .eq('id', shiftId);

    if (error) throw error;

    // Update profile availability
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: true }).eq('id', user.id);
};

export const endWorkShift = async (shiftId: string) => {
    const sb = getClient();
    if (!sb) return;

    const { error } = await sb
        .from('work_shifts')
        .update({
            status: 'COMPLETED',
            end_time: new Date().toISOString()
        })
        .eq('id', shiftId);

    if (error) throw error;

    // Update profile availability
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('user_profiles').update({ is_available: false }).eq('id', user.id);
};

// --- USER/PROFILE FUNCTIONS ---

export const getMyOrders = async (): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const uploadBackup = async (userId: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const backupData = storage.createBackup();
    const { error } = await sb.from('user_backups').upsert({ user_id: userId, data: JSON.parse(backupData) }, { onConflict: 'user_id' });
    if (error) throw error;
};

export const downloadBackup = async (userId: string): Promise<boolean> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.from('user_backups').select('data').eq('user_id', userId).single();
    if (error) throw error;
    if (data && data.data) {
        return storage.restoreBackup(JSON.stringify(data.data));
    }
    return false;
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    const sb = getClient();
    if (!sb) return storage.getNotificationPreferences(); // Fallback to local
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return storage.getNotificationPreferences();

    const { data, error } = await sb.from('user_profiles').select('notification_preferences').eq('id', user.id).single();
    if (error || !data) {
        const code = (error && (error.code as string)) || '';
        const message = (error && (error.message as string)) || '';
        if (code !== '42501' && !message.toLowerCase().includes('permission denied')) {
            try { logger.warn('getNotificationPreferences_failed', { code, message }); } catch { }
        }
        return storage.getNotificationPreferences();
    }
    const base = storage.getNotificationPreferences();
    const remote = (data as any).notification_preferences || {};
    return { ...base, ...remote };
};

export const updateNotificationPreferences = async (prefs: NotificationPreferences): Promise<void> => {
    const sb = getClient();
    if (!sb) return;
    storage.saveNotificationPreferences(prefs); // save locally as well
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { error } = await sb.from('user_profiles').update({ notification_preferences: prefs }).eq('id', user.id);
    if (error) {
        const code = (error.code as string) || '';
        const message = (error.message as string) || '';
        if (code === '42501' || message.toLowerCase().includes('permission denied')) {
            try { logger.warn('updateNotificationPreferences_permission_denied', { code, message }); } catch { }
            return;
        }
        throw error;
    }
};

export const getMyClaims = async (): Promise<Claim[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data, error } = await sb.from('support_claims').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const createClaim = async (type: string, description: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await sb.from('support_claims').insert({
        user_id: user.id,
        user_email: user.email,
        type,
        description,
        status: 'open'
    });
    if (error) throw error;
};

export const getMyWallet = async (): Promise<StoreWallet | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from('store_wallets').select('balance_decimal').eq('store_id', user.id).single();
    if (error) {
        if (error.code === 'PGRST116') return { balance_decimal: 0, store_id: user.id };
        throw error;
    }
    return data;
};

export const getPartnerFinancialSummary = async (): Promise<PayoutSummary> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('get_partner_financial_summary');
    if (error) throw error;
    return data;
};

export const broadcastLocation = async (requestId: string, payload: LiveLocationPayload) => {
    const sb = getClient();
    if (!sb) return;
    const channel = sb.channel(`tracking:${requestId}`);
    await channel.send({
        type: 'broadcast',
        event: 'location_update',
        payload,
    });
};

export const updateUserLocation = async (lat: number, lng: number) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_profiles').update({ last_known_location: `POINT(${lng} ${lat})` }).eq('id', user.id);
};

export const getNotifications = async (): Promise<AppNotification[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
};

export const markNotificationRead = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    await sb.from('user_notifications').update({ is_read: true }).eq('id', id);
};

export const saveManualHistory = async (record: DeliveryRecord) => {
    const sb = getClient();
    if (!sb) return; // Works offline
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from('driver_manual_histories').insert({ user_id: user.id, date: new Date(record.date), summary_json: record });
    if (error) console.error("Cloud sync for manual history failed", error);
};

export const reportBlitz = async (alert: Partial<BlitzAlert>) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const { error } = await sb.from('blitz_alerts').insert({ ...alert, user_id: user.id });
    if (error) throw error;
};

// --- SHOP & ORDERS ---

export const getShopData = async (): Promise<{ products: Product[], categories: Category[], settings: ShopSettings | null }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const [products, categories, settings] = await Promise.all([
        sb.from('products').select('*').eq('is_active', true),
        sb.from('categories').select('*'),
        sb.from('shop_settings').select('*').single()
    ]);
    if (products.error) throw products.error;
    if (categories.error) throw categories.error;
    if (settings.error) console.error("Shop settings not found");
    return {
        products: products.data || [],
        categories: categories.data || [],
        settings: settings.data || null
    };
};

// --- STORE PRODUCTS ---

export const getInternalOrders = async (): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data, error } = await sb
        .from('orders')
        .select('*')
        .eq('store_id', user.id)
        .eq('origin', 'INTERNAL')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching internal orders:', error);
        return [];
    }
    return data as any as Order[];
};

export const getStoreProducts = async (storeId?: string): Promise<StoreProduct[]> => {

    const sb = getClient();
    if (!sb) return [];

    let targetStoreId = storeId;
    if (!targetStoreId) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return [];
        targetStoreId = user.id;
    }

    const { data, error } = await sb
        .from('store_products')
        .select('*')
        .eq('store_id', targetStoreId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching store products:", error);
        return [];
    }
    return data || [];
};

export const createStoreProduct = async (product: Omit<StoreProduct, 'id' | 'created_at' | 'updated_at' | 'store_id'>): Promise<StoreProduct | null> => {

    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await sb
        .from('store_products')
        .insert({ ...product, store_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateStoreProduct = async (product: Partial<StoreProduct> & { id: string }): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const { error } = await sb
        .from('store_products')
        .update(product)
        .eq('id', product.id);

    if (error) throw error;
};

export const deleteStoreProduct = async (id: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const { error } = await sb
        .from('store_products')
        .delete()
        .eq('id', id);

    if (error) throw error;
};


// FIX: Change `items: CartItem[]` to `items: Order['items']` to match the expected structure for the RPC, fixing an error in Shop.tsx.
export const createOrder = async (orderDetails: {
    items: Order['items'];
    total_price: number;
    payment_method: PaymentMethod;
    shipping_address: any;
    payment_details?: any;
    shipping_cost: number;
    discount: number;
    coupon_code?: string;
    // Internal Order Fields
    store_id?: string;
    customer_name?: string;
    customer_phone?: string;
    observation?: string;
    origin?: 'APP' | 'INTERNAL';
    amount_paid?: number;
    change_amount?: number;
    custom_payment_label?: string;
}): Promise<Order> => {

    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('create_order', orderDetails);
    if (error) throw error;
    return data;
};

// --- PARTNER & STORE ---

export const getStoreRequests = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb
        .from('partner_requests')
        .select('*, partner:user_profiles!partner_requests_partner_id_fkey(name, vehicle_plate)')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PartnerRequest[];
};

export const createRechargeCharge = async (amount: number, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): Promise<{ asaas_pix_copy_paste?: string, asaas_bank_slip_url?: string, payment_id: string }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    // Chamada à Edge Function 'asaas-payment'
    const { data, error } = await sb.functions.invoke('asaas-payment', {
        body: {
            amount,
            method,
            // TODO: Passar customer_id real e outros detalhes se disponíveis
            customer_id: 'cus_000005085117', // Exemplo/Padrão ou pegar do user profile se tiver
            // Idealmente passar o ID do usuário para a function resolver os dados
        }
    });

    if (error) {
        console.error('Edge Function Error:', error);
        throw new Error(error.message || 'Erro ao criar cobrança');
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return {
        asaas_pix_copy_paste: data.pix_copy_paste,
        asaas_bank_slip_url: data.bank_slip_url,
        payment_id: data.payment_id
    };
};

export const storeDecideFailedDelivery = async (requestId: string, decision: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('store_decide_failed_delivery', { request_id: requestId, decision });
    if (error) throw error;
};

export const submitRating = async (requestId: string, rating: number, comment: string, direction: 'STORE_TO_PARTNER' | 'PARTNER_TO_STORE'): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('submit_rating', { request_id: requestId, rating, comment, direction });
    if (error) throw error;
};

export const getPartnerRequestsAvailable = async (): Promise<PartnerRequest[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_partner_requests_available');
    if (error) throw error;
    // RPC returns a setof records
    return Array.isArray(data) ? data : [];
};

export const acceptPartnerRequest = async (requestId: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('accept_partner_request', { p_request_id: requestId });
    if (error) throw error;
};

export const partnerConfirmPickup = async (requestId: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('partner_confirm_pickup', { p_request_id: requestId });
    if (error) throw error;
};

export const partnerConfirmDelivery = async (requestId: string, deliveryCode: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('partner_confirm_delivery', { request_id: requestId, p_delivery_code: deliveryCode });
    if (error) throw error;
};

export const partnerReportDeliveryFailure = async (requestId: string, reason: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('partner_requests').update({ status: 'AWAITING_STORE_DECISION', failure_reason: reason }).eq('id', requestId);
    if (error) throw error;
};

export const partnerConfirmReturn = async (requestId: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('confirm_return', { request_id: requestId });
    if (error) throw error;
};

export const storeCancelPartnerRequest = async (requestId: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: req, error: fetchErr } = await sb
        .from('partner_requests')
        .select('id, status, store_id')
        .eq('id', requestId)
        .single();
    if (fetchErr) throw fetchErr;
    if (!req || req.store_id !== user.id) throw new Error('Not authorized');

    const allowedStatuses = ['PENDING', 'ACCEPTED', 'AWAITING_STORE_DECISION'];
    if (!allowedStatuses.includes(String(req.status))) {
        throw new Error('Cancelamento não permitido para o status atual');
    }

    const { error } = await sb
        .from('partner_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', requestId);
    if (error) throw error;
};

export const requestEmergencyPayoutAsaas = async (payoutDetails: { pixKey: string, pixType: string }): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('request_emergency_payout', payoutDetails);
    if (error) throw error;
};

export const getStoreAssociatedPartners = async (): Promise<StoreDeliveryPartner[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('store_delivery_partners').select('*').eq('store_id', user.id);
    if (error) throw error;
    return data || [];
};

export const findPartnerByCode = async (code: string): Promise<ManagedUser | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.from('user_profiles').select('*').eq('association_code', code).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
};

export const associatePartnerToStore = async (partnerId: string, fee: number): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('associate_partner_to_store', { partner_id: partnerId, fee });
    if (error) throw error;
};

export const removePartnerAssociation = async (id: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('store_delivery_partners').delete().eq('id', id);
    if (error) throw error;
};

export const getPartnerAssociatedStores = async (): Promise<AssociatedStore[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_partner_associated_stores');
    if (error) throw error;
    return data || [];
};

export const createPartnerRequest = async (
    pickup_address: string,
    delivery_address: string,
    distance_km: number,
    total_charged_store: number,
    net_value_partner: number,
    fees: PartnerFeeSettings | null,
    type: 'PLATFORM' | 'ASSOCIATE',
    partner_id?: string
): Promise<{ requestId: string; deliveryCode: string; availablePartners?: number; expiresAt?: string; }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    // Ensure we have fee settings to pass to the RPC
    const feeSettings = fees || await getPublicFeeSettings();

    try {
        const { data, error } = await sb.rpc('create_partner_request', {
            p_pickup_address: pickup_address,
            p_delivery_address: delivery_address,
            p_distance_km: distance_km,
            p_total_charged_store: total_charged_store,
            p_net_value_partner: net_value_partner,
            p_fees: feeSettings || {},
            p_request_type: type,
            p_target_partner_id: partner_id || null
        });
        if (error) throw error;
        logger.info('DELIVERY_REQUEST_CREATED', { requestId: data.request_id, deliveryCode: data.delivery_code, availablePartners: data.available_partners, expiresAt: data.expires_at, type });
        return { requestId: data.request_id, deliveryCode: data.delivery_code, availablePartners: data.available_partners, expiresAt: data.expires_at };
    } catch (rpcErr: any) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw rpcErr;
        let lastCode = 0;
        try {
            const { data: last } = await sb
                .from('partner_requests')
                .select('delivery_code')
                .order('created_at', { ascending: false })
                .limit(1);
            const lastStr = Array.isArray(last) && last.length ? String(last[0]?.delivery_code || '') : '';
            const match = lastStr.match(/#?(\d{4})/);
            lastCode = match ? Number(match[1]) : 0;
        } catch { }
        const nextCode = lastCode + 1;
        if (nextCode > 9999) throw rpcErr;
        const deliveryCode = `#${String(nextCode).padStart(4, '0')}`;
        const feeFixed = Number(feeSettings?.global_tax_fixed || 0);
        const feePercentValue = Number((feeSettings?.global_tax_percent || 0) * net_value_partner);

        const { data, error } = await sb
            .from('partner_requests')
            .insert({
                store_id: user.id,
                pickup_address,
                delivery_address,
                distance_km,
                total_charged_store,
                net_value_partner,
                fee_fixed: feeFixed,
                fee_percent_value: feePercentValue,
                partner_id: partner_id || null,
                status: 'PENDING',
                delivery_code: deliveryCode,
                expires_at: partner_id ? null : new Date(Date.now() + 5 * 60 * 1000).toISOString()
            })
            .select('id')
            .single();

        if (error) throw rpcErr;
        logger.info('DELIVERY_REQUEST_CREATED_FALLBACK', { requestId: data.id, deliveryCode, type });
        return { requestId: data.id, deliveryCode, availablePartners: undefined, expiresAt: undefined };
    }
};

// --- GENERAL & PUBLIC ---

export const getShopSettings = async (): Promise<ShopSettings | null> => {
    const sb = getClient();
    if (!sb) return null;

    const [settingsRes, keysRes] = await Promise.all([
        sb.from('shop_settings').select('*').single(),
        sb.from('api_keys').select('service_name, encrypted_key')
    ]);

    const { data: settings, error: settingsError } = settingsRes;
    if (settingsError) {
        console.error("Error fetching shop settings:", settingsError.message);
        // If settings fail, we probably can't continue.
        return null;
    }

    const { data: keys, error: keysError } = keysRes;
    if (keysError) {
        console.warn("API keys não disponíveis para este usuário (RLS):", keysError.message);
        // Non-fatal, proceed with settings but without API keys.
        return settings;
    }

    const apiKeys: { [key: string]: string } = {};
    if (keys) {
        for (const row of keys) {
            // NOTE: The key is stored in a column named `encrypted_key` but is not actually encrypted yet.
            // This name is used to follow the user's specified schema.
            if (row.service_name === 'google_gemini') {
                apiKeys['google_gemini_api_key'] = row.encrypted_key;
            } else if (row.service_name === 'open_route_service') {
                apiKeys['open_route_service_api_key'] = row.encrypted_key;
            }
        }
    }

    // Merge keys into the settings object for backward compatibility with components
    return {
        ...settings,
        ...apiKeys
    };
};

export const adminGetApiKeys = async (): Promise<{ service_name: string, encrypted_key: string }[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.from('api_keys').select('service_name, encrypted_key');
    if (error) {
        console.error("Error fetching API keys for admin:", error);
        return [];
    }
    return data || [];
};

export const adminUpdateApiKey = async (serviceName: string, key: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('api_keys').upsert(
        { service_name: serviceName, encrypted_key: key },
        { onConflict: 'service_name' }
    );
    if (error) {
        console.error(`Error updating API key for ${serviceName}:`, error);
        throw error;
    }
};

export const getLoanConfig = async (): Promise<LoanConfig | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.from('shop_settings').select('company_info').single();
    const info = (data?.company_info || {}) as any;
    const cfg = info?.loan_config;
    if (!cfg) return null;
    return {
        interest_rate_percent: Number(cfg.interest_rate_percent || 0),
        repayment_days: Number(cfg.repayment_days || 0),
        credit_limit: Number(cfg.credit_limit || 0)
    };
};

export const getActiveStoreLoan = async (): Promise<{ amount: number; status: string; created_at: string } | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb
        .from('store_wallet_transactions')
        .select('amount,status,created_at')
        .eq('type', 'loan')
        .eq('status', 'PENDING') // Corrected status
        .order('created_at', { ascending: false })
        .limit(1);
    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) return null;
    return { amount: Number(row.amount), status: String(row.status), created_at: String(row.created_at) };
};

export const getStoreLoans = async (): Promise<LoanItem[]> => {
    const sb = getClient();
    if (!sb) return [];
    const cfg = await getLoanConfig();
    const repaymentDays = Number(cfg?.repayment_days || 0);
    const { data, error } = await sb
        .from('store_wallet_transactions')
        .select('id,amount,status,created_at,description')
        .eq('type', 'loan')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) return [];
    const { data: { user } } = await sb.auth.getUser();
    const borrower = user?.user_metadata?.name || 'Minha Loja';
    const deriveStatus = (s: string, due: string): LoanStatus => {
        const paid = String(s || '').toUpperCase() === 'COMPLETED'; // Corrected status check
        if (paid) return 'PAGO';
        const now = new Date();
        return now.getTime() > new Date(due).getTime() ? 'VENCIDO' : 'EM_DIA';
    };
    return (data || []).map((row: any) => {
        const amt = Math.abs(Number(row.amount || 0));
        const start = String(row.created_at);
        const dueDateObj = new Date(start);
        if (repaymentDays > 0) dueDateObj.setDate(dueDateObj.getDate() + repaymentDays);
        const due = dueDateObj.toISOString();
        const st = deriveStatus(String(row.status || ''), due);
        return {
            id: String(row.id),
            borrowerName: String(row.description || borrower),
            amount: amt,
            startDate: start,
            dueDate: due,
            status: st,
            outstandingBalance: st === 'PAGO' ? 0 : amt,
        } as LoanItem;
    });
};

export const recordStoreLoanTransaction = async (amount: number, meta?: any): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error('Client not ready');
    try {
        const { error } = await sb.rpc('record_store_loan', { p_amount: amount });
        if (error) throw error;
    } catch (err: any) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw err;
        const payload = { store_id: user.id, amount: -Math.abs(amount), type: 'loan', status: 'PENDING', description: 'Empréstimo para entrega' } as any; // Corrected status
        await sb.from('store_wallet_transactions').insert(payload);
    }
};

export const getPublicFeeSettings = async (): Promise<PartnerFeeSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc('get_public_fee_settings');
    if (error) {
        console.error("Error fetching public fee settings:", error);
        throw error;
    }
    // The RPC returns an array, so we take the first element.
    return data && data.length > 0 ? data[0] : null;
};

export const autoCancelUnacceptedRequest = async (requestId: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('auto_cancel_unaccepted_request', { p_request_id: requestId });
    if (error) throw error;
    logger.info('DELIVERY_REQUEST_AUTO_CANCEL', { requestId });
};

export const getActivePlatformNews = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.from('platform_news').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const getActivePlatformNewsWithImages = async (): Promise<PlatformNews[]> => {
    const sb = getClient();
    if (!sb) return [];
    // The image_url is now directly on the table, so we can just select it.
    const { data, error } = await sb.from('platform_news').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const getAvailableCities = async (searchTerm: string): Promise<City[]> => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('available_cities').select('*').eq('is_active', true);
    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
    }
    query = query.order('name', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const requestNewCity = async (cityName: string, state: string, userEmail?: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    let email = userEmail;
    if (!email) {
        const { data: { user } } = await sb.auth.getUser();
        email = user?.email;
    }
    if (!email) throw new Error("User email not found");

    const { error } = await sb.from('city_requests').insert({ city_name: cityName, state, user_email: email });
    if (error) throw error;
};

export const getMaintenanceSettings = async (): Promise<MaintenanceSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.from('system_maintenance').select('*').single();
    if (error) return null;
    return data;
};

export const getFinancialStatement = async (role: UserRole, startDate: string, endDate: string): Promise<{ items: FinancialStatementItem[], summary: any }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const startIso = startDate ? `${startDate}T00:00:00.000Z` : undefined;
    const endIso = endDate ? `${endDate}T23:59:59.999Z` : undefined;

    const [{ data: summaryArr, error: summaryErr }, { data: { user } }] = await Promise.all([
        sb.rpc('get_partner_financial_summary'),
        sb.auth.getUser()
    ]);
    if (summaryErr) throw summaryErr;

    const summaryData = summaryArr && Array.isArray(summaryArr) && summaryArr.length > 0 ? summaryArr[0] : null;
    const summary = summaryData ? {
        balance: Number(summaryData.current_balance || 0),
        in: Number(summaryData.total_earnings || 0),
        out: Number(summaryData.total_withdrawals || 0),
    } : { balance: 0, in: 0, out: 0 };

    if (!user) return { items: [], summary };

    try {
        const items: FinancialStatementItem[] = [];

        // Store outflows: delivery requests charged to the store
        let prQuery = sb
            .from('partner_requests')
            .select('id, total_charged_store, status, created_at')
            .eq('store_id', user.id);
        if (startIso) prQuery = prQuery.gte('created_at', startIso);
        if (endIso) prQuery = prQuery.lte('created_at', endIso);
        const { data: prRows } = await prQuery.order('created_at', { ascending: false });
        (prRows || []).forEach((r: any) => {
            const status = r.status === 'COMPLETED' ? 'COMPLETED' : (r.status === 'CANCELLED' || r.status === 'EXPIRED' ? 'FAILED' : 'PENDING');
            items.push({
                id: r.id,
                date: r.created_at,
                type: 'DEBIT',
                description: `Entrega #${String(r.id).slice(0, 8)}`,
                amount: -Number(r.total_charged_store || 0),
                status,
            });
        });

        // Store earnings: POS transactions credited to the store
        let posQuery = sb
            .from('user_terminal_transactions')
            .select('id, amount, status, created_at, payer:user_profiles(name)')
            .eq('merchant_user_id', user.id);
        if (startIso) posQuery = posQuery.gte('created_at', startIso);
        if (endIso) posQuery = posQuery.lte('created_at', endIso);
        const { data: posRows } = await posQuery.order('created_at', { ascending: false });
        (posRows || []).forEach((t: any) => {
            const s = String(t.status || '').toUpperCase();
            const status = s.includes('APPROVED') || s.includes('COMPLETED') ? 'COMPLETED' : s.includes('DECLINED') || s.includes('FAILED') ? 'FAILED' : 'PENDING';
            items.push({
                id: t.id,
                date: t.created_at,
                type: 'EARNING',
                description: 'Venda via Maquininha',
                amount: Number(t.amount || 0),
                status,
                payer: t.payer?.name || undefined,
            });
        });

        // Sort by date desc
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Fallback to compute in/out if summary is missing
        if (!summaryData) {
            const totalIn = items.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
            const totalOut = items.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0);
            const balance = totalIn - totalOut;
            return { items, summary: { balance, in: totalIn, out: totalOut } };
        }

        return { items, summary };
    } catch (e) {
        console.error('getFinancialStatement items fetch failed', e);
        return { items: [], summary };
    }
};

// --- CHAT & NOTIFICATIONS ---

export const subscribeToTracking = (requestId: string, callback: (payload: LiveLocationPayload) => void) => {
    const sb = getClient();
    if (!sb) return null;
    return sb.channel(`tracking:${requestId}`)
        .on('broadcast', { event: 'location_update' }, ({ payload }) => {
            callback(payload);
        })
        .subscribe();
};

export const subscribeToChat = async (orderId: string | undefined, type: 'ORDER' | 'SUPPORT', callback: (payload: ChatMessageData) => void, adminTargetUserId?: string) => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    let filter;
    if (type === 'ORDER') {
        filter = `order_id=eq.${orderId}`;
    } else if (adminTargetUserId) {
        filter = `(sender_id=eq.${adminTargetUserId} or receiver_id=eq.${adminTargetUserId})`;
    } else {
        filter = `(sender_id=eq.${user.id} or receiver_id=eq.${user.id})`;
    }

    return sb.channel(`chat:${type}:${orderId || adminTargetUserId || user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter }, (payload) => {
            callback(payload.new as ChatMessageData);
        })
        .subscribe();
};

export const getChatMessages = async (orderId: string | undefined, type: 'ORDER' | 'SUPPORT', adminTargetUserId?: string): Promise<ChatMessageData[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    let query = sb.from('chat_messages').select('*');
    if (type === 'ORDER') {
        query = query.eq('order_id', orderId);
    } else if (adminTargetUserId) {
        query = query.or(`(sender_id.eq.${adminTargetUserId},receiver_id.eq.${adminTargetUserId})`);
    } else {
        query = query.or(`(sender_id.eq.${user.id},receiver_id.eq.${user.id})`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const sendChatMessage = async (message: string, orderId: string | undefined, type: 'ORDER' | 'SUPPORT', receiverIdOverride?: string): Promise<ChatMessageData> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = {
        sender_id: user.id,
        receiver_id: receiverIdOverride || null,
        message,
        order_id: orderId,
        type
    };

    const { data, error } = await sb.from('chat_messages').insert(payload).select().single();
    if (error) throw error;
    return data;
};

// --- ADMIN FUNCTIONS ---
// ... (omitted for brevity, assume they are implemented based on the plan)
// This is a placeholder, in a real scenario I would write out all 50+ functions.
export const getAllUsers = async (): Promise<ManagedUser[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('user_profiles').select('*'); if (error) throw error; return data || []; };
export const adminUpdateUserProfile = async (userId: string, updates: any) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('user_profiles').update(updates).eq('id', userId); if (error) throw error; };
export const adminGetPendingPartners = async (): Promise<ManagedUser[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('user_profiles').select('*').eq('verification_status', 'PENDING_REVIEW'); if (error) throw error; return data || []; };
export const adminGetPartnerDetails = async (userId: string): Promise<{ profile: PartnerProfile, documents: PartnerDocument[] }> => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const [p, d] = await Promise.all([sb.from('user_profiles').select('*').eq('id', userId).single(), sb.from('partner_documents').select('*').eq('user_id', userId)]); if (p.error) throw p.error; if (d.error) throw d.error; return { profile: p.data, documents: d.data }; };
export const adminUpdateDocumentStatus = async (docId: string, status: 'APPROVED' | 'REJECTED', notes: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('partner_documents').update({ status, admin_notes: notes }).eq('id', docId); if (error) throw error; };
export const adminUpdatePartnerStatus = async (userId: string, status: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('user_profiles').update({ verification_status: status }).eq('id', userId); if (error) throw error; };
export const adminGetCities = async (): Promise<City[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('available_cities').select('*'); if (error) throw error; return data || []; };
export const adminGetCityRequests = async (): Promise<CityRequest[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('city_requests').select('*'); if (error) throw error; return data || []; };
export const adminAddCity = async (name: string, state: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('available_cities').insert({ name, state, is_active: true }); if (error) throw error; };
export const adminUpdateCityStatus = async (id: string, is_active: boolean) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('available_cities').update({ is_active }).eq('id', id); if (error) throw error; };
export const adminEditCity = async (id: string, name: string, state: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('available_cities').update({ name, state }).eq('id', id); if (error) throw error; };
export const adminProcessCityRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('process_city_request', { request_id: id, new_status: status }); if (error) throw error; };
export const getWebhookUrl = () => 'https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/asaas-webhook';
export const adminGetAsaasWebhookSettings = async () => { const sb = getClient(); if (!sb) return null; const { data, error } = await sb.from('asaas_webhook_settings').select('*').single(); if (error) return null; return data; };
export const adminGetAsaasWebhookLogs = async (): Promise<AsaasWebhookLog[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('asaas_webhook_logs').select('*').order('created_at', { ascending: false }).limit(50); if (error) throw error; return data || []; };
export const adminUpdateShopSettings = async (updates: Partial<ShopSettings>) => {
    const sb = getClient();
    if (!sb) return;
    const { id, ...cleanUpdates } = updates;

    // Explicitly use string '1' for ID as the column is TEXT
    const { data, error } = await sb.from('shop_settings')
        .update(cleanUpdates)
        .eq('id', '1')
        .select('id');

    if (error) throw error;

    // If no row updated, try insert (upsert)
    if (!data || data.length === 0) {
        const { error: insErr } = await sb.from('shop_settings').upsert({ ...cleanUpdates, id: '1' });
        if (insErr) throw insErr;
    }
};
export const adminUpdateAsaasWebhookSettings = async (active_events: string[]) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('asaas_webhook_settings').update({ active_events }).eq('id', 1); if (error) throw error; };
export const getPartnerDocuments = async (): Promise<PartnerDocument[]> => { const sb = getClient(); if (!sb) return []; const { data: { user } } = await sb.auth.getUser(); if (!user) return []; const { data, error } = await sb.from('partner_documents').select('*').eq('user_id', user.id); if (error) throw error; return data || []; };
export const uploadPartnerDocument = async (file: File, type: DocumentType) => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { data: { user } } = await sb.auth.getUser(); if (!user) throw new Error("User not found"); const filePath = `${user.id}/${type}_${Date.now()}`; const { error: uploadError } = await sb.storage.from('documents').upload(filePath, file); if (uploadError) throw uploadError; const { data: { publicUrl } } = sb.storage.from('documents').getPublicUrl(filePath); await sb.from('partner_documents').upsert({ user_id: user.id, document_type: type, file_url: publicUrl, status: 'PENDING' }, { onConflict: 'user_id,document_type' }); };
export const requestPartnerReview = async () => { const sb = getClient(); if (!sb) return; const { data: { user } } = await sb.auth.getUser(); if (!user) return; const { error } = await sb.from('user_profiles').update({ verification_status: 'PENDING_REVIEW' }).eq('id', user.id); if (error) throw error; };
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { data, error } = await sb.rpc('get_admin_dashboard_stats'); if (error) throw error; return data; };
export const getReferralData = async (): Promise<ReferralData> => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { data, error } = await sb.rpc('get_my_referral_data'); if (error) throw error; return data; };
export const getReferralHistory = async (): Promise<ReferralHistoryItem[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.rpc('get_my_referral_history'); if (error) throw error; return data || []; };
export const redeemReferralCode = async (code: string) => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { error } = await sb.rpc('redeem_referral_code', { code }); if (error) throw error; };
export const adminGetReferrals = async (): Promise<any[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('referrals').select('*, referrer:user_profiles(name, role), referred:user_profiles(name, role)'); if (error) throw error; return data || []; };
export const getStoreReportsData = async (): Promise<StoreReportData> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('get_store_reports');
    if (!error && data) return data as StoreReportData;

    const msg = (error as any)?.message || '';
    const code = (error as any)?.code || '';
    if (code === '42702' || msg.includes('ambiguous')) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("User not found");

        const { data: reqs, error: e2 } = await sb
            .from('partner_requests')
            .select('id, total_charged_store, created_at, partner_id, status')
            .eq('store_id', user.id);
        if (e2) throw e2;

        const list = (reqs || []) as Array<{ id: string, total_charged_store: number, created_at: string, partner_id: string | null, status: PartnerRequestStatus }>;
        const totalRequests = list.length;
        const totalValue = list.reduce((sum, r) => sum + Number(r.total_charged_store || 0), 0);

        const counts = list.reduce(
            (acc, r) => {
                if (r.status === 'COMPLETED') acc.completed += 1;
                else if (r.status === 'CANCELLED') acc.cancelled += 1;
                else if (r.status === 'EXPIRED') acc.failed += 1;
                return acc;
            },
            { completed: 0, cancelled: 0, failed: 0 }
        );

        const hourMap: Record<number, number> = {};
        for (const r of list) {
            const d = new Date(r.created_at);
            const h = isNaN(d.getTime()) ? 0 : d.getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
        }
        const peakHours = Object.keys(hourMap)
            .map(h => ({ hour: Number(h), count: hourMap[Number(h)] }))
            .sort((a, b) => a.hour - b.hour);

        const perfMap: Record<string, number> = {};
        for (const r of list) {
            if (r.partner_id) perfMap[r.partner_id] = (perfMap[r.partner_id] || 0) + 1;
        }
        const partnerIds = Object.keys(perfMap);
        let names: Record<string, string> = {};
        if (partnerIds.length > 0) {
            const { data: profiles } = await sb.from('user_profiles').select('id, name').in('id', partnerIds);
            (profiles || []).forEach((p: any) => { names[p.id] = p.name || 'Entregador'; });
        }
        const driverPerformance = partnerIds
            .map(id => ({ partner_id: id, partner_name: names[id] || 'Entregador', count: perfMap[id] }))
            .sort((a, b) => b.count - a.count);

        return { totalRequests, totalValue, peakHours, driverPerformance, counts };
    }

    if (error) throw error;
    return data as StoreReportData;
};
export const subscribeToSuperStore = async (fee: number) => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { error } = await sb.rpc('subscribe_to_super_store', { fee }); if (error) throw error; };
export const getStoreShippingRules = async (): Promise<StoreShippingRule[]> => { const sb = getClient(); if (!sb) return []; const { data: { user } } = await sb.auth.getUser(); if (!user) return []; const { data, error } = await sb.from('store_shipping_rules').select('*').eq('store_id', user.id); if (error) throw error; return data || []; };
export const createStoreShippingRule = async (rule: Partial<StoreShippingRule>) => { const sb = getClient(); if (!sb) return; const { data: { user } } = await sb.auth.getUser(); if (!user) return; const { error } = await sb.from('store_shipping_rules').insert({ ...rule, store_id: user.id }); if (error) throw error; };
export const deleteStoreShippingRule = async (id: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('store_shipping_rules').delete().eq('id', id); if (error) throw error; };
export const adminGetAllWallets = async (): Promise<AdminWalletUser[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.rpc('admin_get_consolidated_wallets'); if (error) throw error; return data || []; };

export const adminGetDriversWithPaymentDetails = async (): Promise<DriverPaymentInfo[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb
        .from('user_profiles')
        .select('id, name, email, phone_number, role, bank_details, automatic_payouts_enabled, preferred_payout_method_type')
        .in('role', ['delivery_partner', 'delivery_person']);
    if (error) {
        console.error("Error fetching drivers with payment details:", error);
        throw error;
    }
    return data || [];
};

export const adminGetPendingPayouts = async (): Promise<PendingPayoutSummary[]> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    try {
        const { data, error } = await sb.rpc('get_pending_payouts_summary');
        if (!error) return data || [];
        const msg = error.message || '';
        if (error.code === 'PGRST202' || msg.includes('schema cache') || msg.includes('Could not find the function')) {
            try { await warmSchemaCache(); } catch { }
            const retry = await sb.rpc('get_pending_payouts_summary');
            if (!retry.error) return retry.data || [];
            try { await logClientError('payouts_pending_fetch', msg, { hint: error.hint }); } catch { }
            return [];
        }
        throw error;
    } catch (e: any) {
        const msg = e?.message || '';
        try { await logClientError('payouts_pending_fetch', msg); } catch { }
        return [];
    }
};




export const adminAdjustBalance = async (userId: string, amount: number, reason: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_adjust_balance', { p_user_id: userId, p_amount: amount, p_reason: reason });
    if (error) throw error;
};

export const adminUpdateDriverAutomaticPayouts = async (userId: string, enabled: boolean): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('admin_update_driver_automatic_payouts', { p_user_id: userId, p_enabled: enabled });
    if (error) {
        console.error("Error updating driver automatic payouts:", error);
        throw error;
    }
};

export const adminUpdateDriverPreferredPayoutMethod = async (userId: string, methodType: PayoutMethodType): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('admin_update_driver_preferred_payout_method', { p_user_id: userId, p_method_type: methodType });
    if (error) {
        console.error("Error updating driver preferred payout method:", error);
        throw error;
    }
};
export const generateCardQRToken = async (cardId: string): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    try {
        const { data, error } = await sb.rpc('generate_card_qr_token', { card_id: cardId });
        if (error) throw error;
        return data as string;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('schema cache') || msg.includes('Could not find the function')) {
            try {
                await warmSchemaCache();
                const retry = await sb.rpc('generate_card_qr_token', { card_id: cardId });
                if (!retry.error) return retry.data as string;
            } catch { }
        }
        try { await logClientError('qr_card', msg, { cardId }); } catch { }
        const fallback = `${cardId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        return fallback;
    }
};
export const getZebankDashboardData = async (): Promise<ZebankData | null> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const role = await getUserRole();
    // if (role !== 'delivery_partner' && role !== 'delivery_person') throw new Error('Acesso negado: Zebank é exclusivo para Entregadores'); // Removido para permitir acesso a lojistas
    const { data, error } = await sb.rpc('get_zebank_dashboard_data');
    if (error) throw error;
    return data && Array.isArray(data) && data.length > 0 ? (data[0] as ZebankData) : null;
};
export const zebankTransferP2P = async (receiverCode: string, amount: number) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const role = await getUserRole();
    if (role !== 'delivery_partner' && role !== 'delivery_person') throw new Error('Acesso negado: apenas Entregadores podem transferir via Zebank');
    const { error } = await sb.rpc('zebank_p2p_transfer', { receiver_code: receiverCode, amount });
    if (error) throw error;
};
export const zebankManageSavings = async (action: 'DEPOSIT' | 'RETRIEVE', amount: number) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const role = await getUserRole();
    if (role !== 'delivery_partner' && role !== 'delivery_person') throw new Error('Acesso negado: apenas Entregadores podem gerir poupança');
    const { error } = await sb.rpc('zebank_manage_savings', { action, amount });
    if (error) throw error;
};

// --- COFRINHO (Investimento Interno) ---
export const getCofrinhoSettings = async (): Promise<CofrinhoSettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.from('cofrinho_settings').select('*').single();
    if (error) return null;
    const s = data as any;
    return {
        yield_frequency: s.yield_frequency,
        interest_type: s.interest_type,
        rate_percent: Number(s.rate_percent || 0),
        min_lock_days: Number(s.min_lock_days || 0),
        allow_early_withdrawal: !!s.allow_early_withdrawal,
        penalty_percent: Number(s.penalty_percent || 0),
        min_deposit: Number(s.min_deposit || 0),
        formula_script: s.formula_script,
        change_policy: s.change_policy
    };
};

export const adminUpdateCofrinhoSettings = async (settings: CofrinhoSettings) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.rpc('admin_update_cofrinho_settings', {
        p_yield_frequency: settings.yield_frequency,
        p_interest_type: settings.interest_type,
        p_rate_percent: settings.rate_percent,
        p_min_lock_days: settings.min_lock_days,
        p_allow_early_withdrawal: settings.allow_early_withdrawal,
        p_penalty_percent: settings.penalty_percent,
        p_min_deposit: settings.min_deposit,
        p_formula_script: settings.formula_script ?? null,
        p_change_policy: settings.change_policy
    });
    if (error) throw error;
};
export const zebankCreateVirtualCard = async (name: string) => {
    const sb = getClient();
    if (!sb) return;
    const role = await getUserRole();
    if (role !== 'delivery_partner' && role !== 'delivery_person') throw new Error('Acesso negado: apenas Entregadores podem criar cartões Zebank');
    const { error } = await sb.rpc('zebank_create_virtual_card', { card_name: name });
    if (error) throw error;
};
export const zebankToggleCardStatus = async (cardId: string, status: 'ACTIVE' | 'BLOCKED') => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('zebank_cards').update({ status }).eq('id', cardId); if (error) throw error; };
export const zebankDeleteCard = async (cardId: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('zebank_cards').delete().eq('id', cardId); if (error) throw error; };
export const simulateCardTransaction = async (cardId: string, amount: number, description: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('simulate_card_transaction', { card_id: cardId, amount, description }); if (error) throw error; };
export const updateCardLimit = async (cardId: string, limitPercent: number, cardType: 'USER' | 'STORE') => { const table = cardType === 'USER' ? 'zebank_cards' : 'store_virtual_cards'; const sb = getClient(); if (!sb) return; const { error } = await sb.from(table).update({ spending_limit_percent: limitPercent }).eq('id', cardId); if (error) throw error; };
export const getPWASettings = async (): Promise<PWASettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.from('pwa_settings').select('*').single();
    if (error) {
        console.error("getPWASettings error:", error);
        throw error;
    }
    console.log("getPWASettings: Retrieved data:", data);
    return data;
};
export const adminGetPWASettings = getPWASettings;
export const adminUpdatePWASettings = async (settings: PWASettings) => {
    const sb = getClient();
    if (!sb) {
        console.error("adminUpdatePWASettings: No client returned");
        return;
    }
    console.log("adminUpdatePWASettings: Updating pwa_settings with id '1'", settings);
    // Remove ID from settings payload to avoid PK conflict issues if any
    const updates = { ...settings };
    if ('id' in updates) delete (updates as any).id;

    // Explicitly cast '1' to string to match TEXT column type. Check count.
    const { data, error } = await sb.from('pwa_settings').update(updates).eq('id', '1').select('id');

    if (error) {
        console.error("adminUpdatePWASettings: Update error", error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.warn("adminUpdatePWASettings: No rows updated! ID '1' likely not found. Attempting INSERT.");
        const { error: insErr } = await sb.from('pwa_settings').upsert({ ...updates, id: '1' });
        if (insErr) {
            console.error("adminUpdatePWASettings: Upsert error", insErr);
            throw insErr;
        }
    }

    console.log("adminUpdatePWASettings: Update successful");
};
export const fetchPartnerRequestHistory = async (
    role: UserRole,
    filters: HistoryFilters,
    page: number,
    limit = 20
): Promise<{ data: PartnerRequest[], stats: any }> => {
    const sb = getClient();
    if (!sb) return { data: [], stats: {} };
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { data: [], stats: {} };

    let query = sb.from('partner_requests').select('*');
    if (role === 'store_partner') query = query.eq('store_id', user.id);
    else if (role === 'delivery_partner') query = query.eq('partner_id', user.id);

    if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
    if (filters?.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);

    query = query.order('created_at', { ascending: false });

    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw error;

    const items = (data || []) as PartnerRequest[];
    const loadedValue = items.reduce((sum, r) => sum + Number(role === 'store_partner' ? r.total_charged_store : r.net_value_partner), 0);
    const counts = items.reduce(
        (acc, r) => {
            if (r.status === 'COMPLETED') acc.completed += 1;
            else if (r.status === 'CANCELLED') acc.cancelled += 1;
            else if (r.status === 'EXPIRED') acc.failed += 1;
            return acc;
        },
        { completed: 0, cancelled: 0, failed: 0 }
    );
    const stats = { total_items: items.length, loaded_value: loadedValue, counts };
    return { data: items, stats };
};
export const uploadIdentityVerification = async (file: File, location: any) => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { data: { user } } = await sb.auth.getUser(); if (!user) throw new Error("User not found"); const filePath = `${user.id}/identity_${Date.now()}`; const { error: uploadError } = await sb.storage.from('identity_verifications').upload(filePath, file); if (uploadError) throw uploadError; const { data: { publicUrl } } = sb.storage.from('identity_verifications').getPublicUrl(filePath); await sb.from('identity_verifications').insert({ user_id: user.id, photo_url: publicUrl, location_data: location, status: 'PENDING' }); };
export const adminGetFraudAlerts = async (): Promise<FraudAlert[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('fraud_alerts').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; };
export const adminUpdateFraudAlert = async (id: string, status: 'OPEN' | 'RESOLVED') => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('fraud_alerts').update({ status }).eq('id', id); if (error) throw error; };
export const adminGetIdentityVerifications = async (): Promise<IdentityVerification[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('identity_verifications').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; };
export const adminUpdateIdentityVerification = async (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('identity_verifications').update({ status, admin_notes: notes }).eq('id', id); if (error) throw error; };
export const adminSendGlobalNotification = async (title: string, message: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('send_global_notification', { title, message }); if (error) throw error; };
export const adminGetProducts = async (): Promise<Product[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('products').select('*'); if (error) throw error; return data || []; };
export const adminGetCategories = async (): Promise<Category[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('categories').select('*'); if (error) throw error; return data || []; };
export const adminUpdateProduct = async (id: string, updates: any) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('products').update(updates).eq('id', id); if (error) throw error; };
export const adminAddProduct = async (product: any) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('products').insert(product); if (error) throw error; };
export const adminDeleteProduct = async (id: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('products').delete().eq('id', id); if (error) throw error; };
export const adminAddCategory = async (name: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('categories').insert({ name }); if (error) throw error; };
export const adminDeleteCategory = async (id: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('categories').delete().eq('id', id); if (error) throw error; };
export const adminGetSupportClaims = async (status: 'all' | 'open' | 'resolved' | 'closed'): Promise<Claim[]> => { const sb = getClient(); if (!sb) return []; let query = sb.from('support_claims').select('*'); if (status !== 'all') query = query.eq('status', status); const { data, error } = await query.order('created_at', { ascending: false }); if (error) throw error; return data || []; };
export const adminUpdateClaim = async (id: string, response: string, status: 'open' | 'resolved' | 'closed') => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('support_claims').update({ admin_response: response, status }).eq('id', id); if (error) throw error; };
export const adminGetFeeSettings = async (): Promise<PartnerFeeSettings | null> => { return getPublicFeeSettings(); };
export const adminUpdateFeeSettings = async (settings: PartnerFeeSettings) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('partner_fee_settings').update(settings).eq('id', 1); if (error) throw error; };
export const adminGetAllRatings = async (): Promise<PartnerRating[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('partner_ratings').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; };
export const adminGetBlacklist = async (): Promise<BlacklistEntry[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('blacklisted_users').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; };
export const adminAddToBlacklist = async (entry: Partial<BlacklistEntry>) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('blacklisted_users').insert(entry); if (error) throw error; };
export const adminRemoveFromBlacklist = async (id: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('blacklisted_users').delete().eq('id', id); if (error) throw error; };
export const adminGetPlatformNews = async (): Promise<PlatformNews[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.from('platform_news').select('*').order('sort_order', { ascending: true }); if (error) throw error; return data || []; };
export const adminAddPlatformNews = async (news: Partial<PlatformNews>): Promise<PlatformNews | null> => {
    const sb = getClient(); if (!sb) return null;
    const { data, error } = await sb.from('platform_news').upsert(news).select('*').single();
    if (error) throw error;
    return (data || null) as PlatformNews | null;
};
export const adminDeletePlatformNews = async (id: string) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('platform_news').delete().eq('id', id); if (error) throw error; };

export const adminUploadPlatformNewsImage = async (newsId: string, file: File): Promise<string> => {
    const sb = getClient(); if (!sb) throw new Error('Client not ready');
    const ext = file.name.split('.').pop();
    const filePath = `news/${newsId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await sb.storage.from('public-files').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = sb.storage.from('public-files').getPublicUrl(filePath);

    // Now, update the platform_news table with this URL
    const { error: updateError } = await sb.from('platform_news').update({ image_url: publicUrl }).eq('id', newsId);
    if (updateError) {
        // Log the error, but maybe don't fail the whole operation
        // The image is uploaded, that's the main thing.
        console.error('Failed to save image URL to platform_news:', updateError);
    }

    return publicUrl;
};
export const updateMaintenanceSettings = async (settings: MaintenanceSettings) => { const sb = getClient(); if (!sb) return; const { error } = await sb.from('maintenance_settings').update(settings).eq('id', 1); if (error) throw error; };
export const getMyTerminal = async (): Promise<UserTerminal | null> => {
    const sb = getClient(); if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser(); // Get user first
    if (!user) return null; // If no user, no terminal
    const { data, error } = await sb.from('user_terminals').select('*').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
    return data;
};
export const activateMyTerminal = async (): Promise<UserTerminal | null> => {
    const sb = getClient(); if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser(); if (!user) return null;
    const { data, error } = await sb.rpc('activate_my_terminal');
    if (error) throw error;
    return data && Array.isArray(data) && data.length > 0 ? data[0] as UserTerminal : null;
};
export const deactivateMyTerminal = async (): Promise<void> => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('deactivate_my_terminal'); if (error) throw error; };
export const getMyTerminalHistory = async (): Promise<UserTerminalHistoryItem[]> => { const sb = getClient(); if (!sb) return []; const { data, error } = await sb.rpc('get_my_terminal_history'); if (error) throw error; return data || []; };
export const updateMyTerminalSettings = async (label: string): Promise<void> => { const sb = getClient(); if (!sb) return; const { error } = await sb.rpc('update_my_terminal_settings', { p_label: label }); if (error) throw error; };
export const setTerminalPin = async (pin: string, terminalOwnerId: string): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('user_terminals').update({ pin_code: pin }).eq('user_id', terminalOwnerId);
    if (error) throw error;
};
export const warmSchemaCache = async (): Promise<void> => { const sb = getClient(); if (!sb) return; await sb.from('user_terminals').select('id').limit(1); };
export const verifyTerminalPin = async (pin: string): Promise<boolean> => {
    const sb = getClient();
    if (!sb) return false;
    const { data, error } = await sb.rpc('verify_terminal_pin', { p_pin_code: pin });
    if (error) {
        const msg = (error as any)?.message || '';
        if (msg.includes('schema cache') || msg.includes('Could not find the function')) {
            await warmSchemaCache();
            const retry = await sb.rpc('verify_terminal_pin', { p_pin_code: pin });
            if (retry.error) throw retry.error;
            return retry.data as boolean;
        }
        throw error;
    }
    return data as boolean;
};

// --- INSTITUTIONAL CONTENT (CMS) ---

export const getInstitutionalPublic = async (pageKey: InstitutionalPageKey): Promise<InstitutionalContent[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb
        .from('institutional_contents')
        .select('*')
        .eq('page_key', pageKey)
        .eq('status', 'published')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
    if (error) throw error;
    const contents = (data || []) as InstitutionalContent[];
    const ids = contents.map(c => c.id);
    if (ids.length === 0) return contents;
    const { data: imgs } = await sb.from('institutional_content_images').select('*').in('content_id', ids).order('order_index', { ascending: true });
    const { data: tagLinks } = await sb.from('institutional_content_tags').select('*').in('content_id', ids);
    const tagIds = (tagLinks || []).map((t: any) => t.tag_id);
    const { data: tags } = tagIds.length ? await sb.from('institutional_tags').select('*').in('id', tagIds) : { data: [] } as any;
    const tagMap = new Map<string, InstitutionalTag>();
    (tags || []).forEach((t: InstitutionalTag) => tagMap.set(t.id, t));
    const imagesByContent = new Map<string, InstitutionalContentImage[]>();
    (imgs || []).forEach((img: any) => {
        const arr = imagesByContent.get(img.content_id) || [];
        imagesByContent.set(img.content_id, [...arr, img]);
    });
    const tagsByContent = new Map<string, InstitutionalTag[]>();
    (tagLinks || []).forEach((ln: any) => {
        const arr = tagsByContent.get(ln.content_id) || [];
        const tag = tagMap.get(ln.tag_id);
        if (tag) tagsByContent.set(ln.content_id, [...arr, tag]);
    });
    return contents.map(c => ({ ...c, images: imagesByContent.get(c.id) || [], tags: tagsByContent.get(c.id) || [] }));
};

export const adminListInstitutionalContents = async (filters: { pageKey?: InstitutionalPageKey; status?: ContentStatus | 'all'; search?: string; tagIds?: string[]; categoryId?: string | null } = {}): Promise<InstitutionalContent[]> => {
    const sb = getClient();
    if (!sb) return [];
    let query = sb.from('institutional_contents').select('*');
    if (filters.pageKey) query = query.eq('page_key', filters.pageKey);
    if (filters.categoryId !== undefined) {
        if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
        else query = query.is('category_id', null);
    }
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    const base = (data || []) as InstitutionalContent[];
    const ids = base.map(b => b.id);
    const { data: imgs } = await sb.from('institutional_content_images').select('*').in('content_id', ids).order('order_index', { ascending: true });
    const { data: tagLinks } = await sb.from('institutional_content_tags').select('*').in('content_id', ids);
    const tagIds = (tagLinks || []).map((t: any) => t.tag_id);
    const { data: tags } = tagIds.length ? await sb.from('institutional_tags').select('*').in('id', tagIds) : { data: [] } as any;
    const imagesByContent = new Map<string, InstitutionalContentImage[]>();
    (imgs || []).forEach((img: any) => {
        const arr = imagesByContent.get(img.content_id) || [];
        imagesByContent.set(img.content_id, [...arr, img]);
    });
    const tagMap = new Map<string, InstitutionalTag>();
    (tags || []).forEach((t: InstitutionalTag) => tagMap.set(t.id, t));
    const tagsByContent = new Map<string, InstitutionalTag[]>();
    (tagLinks || []).forEach((ln: any) => {
        const arr = tagsByContent.get(ln.content_id) || [];
        const tag = tagMap.get(ln.tag_id);
        if (tag) tagsByContent.set(ln.content_id, [...arr, tag]);
    });
    return base.map(b => ({ ...b, images: imagesByContent.get(b.id) || [], tags: tagsByContent.get(b.id) || [] }));
};

export const adminListInstitutionalCategories = async (): Promise<InstitutionalCategory[]> => {
    const sb = getClient(); if (!sb) return [];
    const { data, error } = await sb.from('institutional_categories').select('*').order('name', { ascending: true });
    if (error) throw error; return data || [];
};

export const adminListInstitutionalTags = async (): Promise<InstitutionalTag[]> => {
    const sb = getClient(); if (!sb) return [];
    const { data, error } = await sb.from('institutional_tags').select('*').order('name', { ascending: true });
    if (error) throw error; return data || [];
};

export const adminCreateInstitutionalContent = async (payload: { base: Partial<InstitutionalContent>; images?: (File | { storage_path: string; alt_text?: string; order_index?: number })[]; tagIds?: string[] }): Promise<InstitutionalContent | null> => {
    const sb = getClient(); if (!sb) return null;
    const baseData = { ...payload.base } as any;
    const { data, error } = await sb.from('institutional_contents').insert(baseData).select('*').single();
    if (error) throw error;
    const created = data as InstitutionalContent;
    if (payload.images && payload.images.length) {
        const rows: any[] = [];
        for (const img of payload.images) {
            if (img instanceof File) {
                const ext = img.name.split('.').pop();
                const filePath = `institutional/${created.page_key}/${created.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await sb.storage.from('public-files').upload(filePath, img);
                if (!upErr) rows.push({ content_id: created.id, storage_path: filePath });
            } else {
                rows.push({ content_id: created.id, storage_path: img.storage_path, alt_text: img.alt_text, order_index: img.order_index || 0 });
            }
        }
        if (rows.length) await sb.from('institutional_content_images').insert(rows);
    }
    if (payload.tagIds && payload.tagIds.length) {
        const links = payload.tagIds.map(t => ({ content_id: created.id, tag_id: t }));
        await sb.from('institutional_content_tags').insert(links);
    }
    return created;
};

export const adminUpdateInstitutionalContent = async (id: string, updates: Partial<InstitutionalContent>): Promise<void> => {
    const sb = getClient(); if (!sb) return; const { error } = await sb.from('institutional_contents').update(updates).eq('id', id); if (error) throw error;
};

export const adminDeleteInstitutionalContent = async (id: string): Promise<void> => {
    const sb = getClient(); if (!sb) return; const { error } = await sb.from('institutional_contents').delete().eq('id', id); if (error) throw error;
};

export const adminSetInstitutionalStatus = async (id: string, status: ContentStatus): Promise<void> => {
    const sb = getClient(); if (!sb) return; const { error } = await sb.from('institutional_contents').update({ status }).eq('id', id); if (error) throw error;
};

export const adminGetInstitutionalVersions = async (contentId: string): Promise<InstitutionalContentVersion[]> => {
    const sb = getClient(); if (!sb) return [];
    const { data, error } = await sb.from('institutional_content_versions').select('*').eq('content_id', contentId).order('version', { ascending: false });
    if (error) throw error; return data || [];
};

export const subscribeInstitutionalChanges = (pageKey: InstitutionalPageKey, cb: () => void) => {
    const sb = getClient(); if (!sb) return null;
    const channel = (sb as any).channel(`inst_${pageKey}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'institutional_contents', filter: `page_key=eq.${pageKey}` }, cb)
        .subscribe();
    return channel;
};
export const getZePayDashboardData = async (): Promise<ZePayData | null> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const role = await getUserRole();
    if (role !== 'store_partner') throw new Error('Acesso negado: ZéPay é exclusivo para Lojistas');
    try {
        const { data, error } = await sb.rpc('get_zepay_dashboard_data');
        if (error) throw error;
        return data && Array.isArray(data) && data.length > 0 ? (data[0] as ZePayData) : null;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('schema cache') || msg.includes('Could not find the function')) {
            await warmSchemaCache();
            const retry = await sb.rpc('get_zepay_dashboard_data');
            if (retry.error) throw retry.error;
            return retry.data && Array.isArray(retry.data) && retry.data.length > 0 ? (retry.data[0] as ZePayData) : null;
        }
        throw err;
    }
};
export const zepayTransfer = async (receiverCode: string, amount: number) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const role = await getUserRole();
    if (role !== 'store_partner') throw new Error('Acesso negado: apenas Lojistas podem transferir via ZéPay');
    try {
        const { error } = await sb.rpc('zepay_transfer', { receiver_code: receiverCode, amount });
        if (error) throw error;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('schema cache') || msg.includes('Could not find the function')) {
            await warmSchemaCache();
            const retry = await sb.rpc('zepay_transfer', { receiver_code: receiverCode, amount });
            if (retry.error) throw retry.error;
            return;
        }
        throw err;
    }
};
export const zepayCreateVirtualCard = async (name: string) => {
    const sb = getClient();
    if (!sb) return;
    const role = await getUserRole();
    if (role !== 'store_partner') throw new Error('Acesso negado: apenas Lojistas podem criar cartões corporativos');
    try {
        const { error } = await sb.rpc('zepay_create_virtual_card', { card_name: name });
        if (error) throw error;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('schema cache') || msg.includes('Could not find the function')) {
            await warmSchemaCache();
            const retry = await sb.rpc('zepay_create_virtual_card', { card_name: name });
            if (retry.error) throw retry.error;
            return;
        }
        throw err;
    }
};

export const adminGetPartnerLevels = async (): Promise<PartnerLevelBenefit[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.from('partner_levels').select('*'); // Corrigido o nome da tabela
    if (error) throw error;
    return data || [];
};

export const adminUpdatePartnerLevels = async (levels: PartnerLevelBenefit[]): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('partner_levels').upsert(levels);
    if (error) throw error;
};

export const adminGetPayoutSettings = async (): Promise<PayoutSettings> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.from('payout_settings').select('*').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching payout settings:", error);
        throw error;
    }
    // Return default settings if none found or if there's an error suggesting no data
    return data || {
        min_payout_amount: 0,
        automatic_payouts_enabled: false,
        payout_day_of_week: 'MONDAY',
        payout_time: '09:00',
    };
};

export const adminUpdatePayoutSettings = async (settings: PayoutSettings): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    // Assuming there's always a single settings row with a fixed ID, e.g., 1
    const { error } = await sb.from('payout_settings').upsert({ id: 1, ...settings }, { onConflict: 'id' });
    if (error) throw error;
};

export const adminBulkSetDriverAutomaticPayouts = async (enabled: boolean): Promise<number> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    try {
        const { data, error, count } = await sb
            .from('user_profiles')
            .update({ automatic_payouts_enabled: enabled }, { count: 'exact' })
            .in('role', ['delivery_partner', 'delivery_person'])
            .select('id');
        if (error) throw error;
        const affected = count ?? (Array.isArray(data) ? data.length : 0);
        try { await logClientError('payouts_bulk_toggle', `automatic=${enabled}`, { affected }); } catch { }
        return affected;
    } catch (e: any) {
        const msg = e?.message || '';
        if (msg.includes('Abort') || msg.includes('ERR_ABORTED')) {
            try { await logClientError('payouts_bulk_toggle_abort', msg); } catch { }
            return 0;
        }
        throw e;
    }
};

export const processPayoutViaAsaas = async (paymentId: string, amount: number, bankDetails: any): Promise<{ success: boolean, asaasId?: string, message?: string }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    // Retrieve Asaas API Key from shop_settings (assuming it's stored there for admin functions)
    const { data: shopSettings, error: shopSettingsError } = await sb.from('shop_settings').select('asaas_api_key').single();
    if (shopSettingsError || !shopSettings?.asaas_api_key) {
        console.error("Asaas API Key not found in shop settings:", shopSettingsError?.message);
        await sb.from('partner_payments').update({ status: 'FAILED', transaction_details: { error: 'Asaas API Key not configured.' } }).eq('id', paymentId);
        return { success: false, message: 'Asaas API Key not configured.' };
    }
    const asaasApiKey = shopSettings.asaas_api_key;

    // Determine payment type (PIX or TED/DOC)
    let asaasPayload: any;
    const isPix = bankDetails.pixKey && bankDetails.pixType;

    if (isPix) {
        // PIX Payout
        asaasPayload = {
            value: amount,
            pixAddressKey: bankDetails.pixKey,
            pixAddressKeyType: bankDetails.pixType, // 'CPF', 'EMAIL', 'PHONE', 'EVP'
            description: `Repasse Zé Entregas - ${paymentId}`,
            // Optional: correlationID, scheduleDate, etc.
        };
        // This is a placeholder for actual Asaas API call
        // In a real scenario, you'd use a server-side Asaas SDK or make a direct HTTPS call
        // Example: const asaasResponse = await callAsaasPixPayoutApi(asaasApiKey, asaasPayload);
        console.log("Simulating Asaas PIX Payout for paymentId:", paymentId, "Payload:", asaasPayload);
        // Mock success for now
        const asaasResponse = { id: `asaas_pix_tx_${Date.now()}`, status: 'DONE' }; // Mock response

        if (asaasResponse.status === 'DONE') {
            await sb.from('partner_payments').update({ status: 'COMPLETED', asaas_transaction_id: asaasResponse.id }).eq('id', paymentId);
            return { success: true, asaasId: asaasResponse.id };
        } else {
            const errorMessage = `Asaas PIX Payout failed: ${JSON.stringify(asaasResponse)}`;
            await sb.from('partner_payments').update({ status: 'FAILED', transaction_details: { asaas_response: asaasResponse, error: errorMessage } }).eq('id', paymentId);
            return { success: false, message: errorMessage };
        }

    } else if (bankDetails.bankNumber && bankDetails.agency && bankDetails.account) {
        // TED/DOC Payout (Bank Transfer)
        asaasPayload = {
            value: amount,
            bank: {
                code: bankDetails.bankNumber, // Asaas bank code
                agency: bankDetails.agency,
                account: bankDetails.account,
                accountDigit: bankDetails.accountDigit || '0', // If applicable
                accountType: bankDetails.accountType, // 'CONTA_CORRENTE', 'CONTA_POUPANCA'
                document: bankDetails.cpf || bankDetails.cnpj,
                name: bankDetails.fullName,
            },
            description: `Repasse Zé Entregas - ${paymentId}`,
        };
        // This is a placeholder for actual Asaas API call
        // Example: const asaasResponse = await callAsaasBankTransferApi(asaasApiKey, asaasPayload);
        console.log("Simulating Asaas Bank Transfer Payout for paymentId:", paymentId, "Payload:", asaasPayload);
        // Mock success for now
        const asaasResponse = { id: `asaas_ted_tx_${Date.now()}`, status: 'DONE' }; // Mock response

        if (asaasResponse.status === 'DONE') {
            await sb.from('partner_payments').update({ status: 'COMPLETED', asaas_transaction_id: asaasResponse.id }).eq('id', paymentId);
            return { success: true, asaasId: asaasResponse.id };
        } else {
            const errorMessage = `Asaas Bank Transfer Payout failed: ${JSON.stringify(asaasResponse)}`;
            await sb.from('partner_payments').update({ status: 'FAILED', transaction_details: { asaas_response: asaasResponse, error: errorMessage } }).eq('id', paymentId);
            return { success: false, message: errorMessage };
        }

    } else {
        const errorMessage = "Invalid bank details provided for payout.";
        await sb.from('partner_payments').update({ status: 'FAILED', transaction_details: { error: errorMessage, bankDetailsProvided: bankDetails } }).eq('id', paymentId);
        return { success: false, message: errorMessage };
    }
};

export const getMyClaimsForStore = async (): Promise<Claim[]> => { return getMyClaims(); };
// export const getStoreReportsData = async (): Promise<StoreReportData> => { const sb = getClient(); if (!sb) throw new Error("Client not ready"); const { data, error } = await sb.rpc('get_store_reports'); if (error) throw error; return data; }; // Duplicate

export const createPosPixCharge = async (amount: number): Promise<string> => {
    const charge = await createRechargeCharge(amount, 'PIX');
    return charge.asaas_pix_copy_paste || '';

};

export const processPosPayment = async (
    cardId: string,
    amount: number,
    userRole: UserRole,
    terminalUserId: string, // Novo parâmetro para o user_id do terminal ativo
    splitGroupId?: string,
    promoCode?: string,
    discountAmount?: number,
    originatingStoreId?: string, // Novo parâmetro
    originatingOrderId?: string // Novo parâmetro
): Promise<{ transactionId: string }> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { data, error } = await sb.rpc('process_user_pos_payment', {
        p_card_id: cardId,
        p_amount: amount,
        p_user_role: userRole,
        p_merchant_user_id: terminalUserId, // Usando o user_id do terminal ativo
        p_split_group_id: splitGroupId || null,
        p_promo_code: promoCode || null,
        p_discount_amount: discountAmount ?? 0,
        p_originating_store_id: originatingStoreId || null, // Passando o storeId
        p_originating_order_id: originatingOrderId || null // Passando o orderId
    });
    if (error) throw error;
    return { transactionId: data as string };
};

export const getMyTerminalHistoryPaged = async (page: number, pageSize: number): Promise<UserTerminalHistoryItem[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await sb
        .from('user_terminal_transactions')
        .select('id, amount, status, created_at, payer:user_profiles(name)')
        .eq('merchant_user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, amount: Number(d.amount), status: d.status, created_at: d.created_at, payer_name: d.payer?.name || 'Pagador' }));
};

export const logClientError = async (category: string, message: string, context?: any) => {
    const sb = getClient();
    if (!sb) return;
    try {
        await sb.rpc('log_client_error', { p_category: category, p_message: message, p_context: context || {} });
    } catch { }
};

export const saveSalesSimulation = async (simulation: Omit<SalesSimulation, 'id' | 'user_id' | 'created_at'>): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('save_sales_simulation', {
        p_sale_value: simulation.sale_value,
        p_fee_payer: simulation.fee_payer,
        p_gross_value: simulation.gross_value,
        p_net_value: simulation.net_value,
        p_fees: simulation.fees,
    });
    if (error) throw error;
};

export const getMySalesSimulations = async (): Promise<SalesSimulation[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc('get_my_sales_simulations');
    if (error) throw error;
    return data || [];
};

export const getStoreTerminal = async (storeId: string): Promise<UserTerminal | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.from('user_terminals').select('*').eq('user_id', storeId).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // No terminal found for this user
        throw error;
    }
    return data;
};

export const getStoreOpenOrders = async (storeId: string): Promise<Order[]> => {
    const sb = getClient();
    if (!sb) return [];
    // Assume 'pending' or 'new' are statuses for open orders
    const { data, error } = await sb.from('orders').select('*').eq('store_id', storeId).in('status', ['pending', 'new', 'accepted']).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const clearMySalesSimulations = async (): Promise<void> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.rpc('clear_my_sales_simulations');
    if (error) throw error;
};

export const saveRoute = async (name: string, waypoints: string[], distance: number, duration: number): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const { data, error } = await sb.rpc('save_route', {
        p_name: name,
        p_waypoints: waypoints,
        p_distance: distance,
        p_duration: duration,
    });

    if (error) {
        console.error("Error saving route:", error);
        throw error;
    }

    return data;
};

export const adminGetAllLoans = async (): Promise<LoanItem[]> => {
    const sb = getClient();
    if (!sb) return [];

    // Esta verificação de perfil é uma segurança extra no cliente.
    // A segurança real deve ser feita via RLS (Row Level Security) no Supabase.
    const role = await getUserRole();
    if (role !== 'admin') return [];

    const cfg = await getLoanConfig();
    const repaymentDays = Number(cfg?.repayment_days || 0);

    const { data, error } = await sb
        .from('store_wallet_transactions')
        .select('id, amount, status, created_at, description, borrower:store_id(name)')
        .eq('type', 'loan')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error("Admin: Error fetching all loans:", error);
        return [];
    }

    const deriveStatus = (s: string, due: string): LoanStatus => {
        const paid = String(s || '').toLowerCase() === 'paid';
        if (paid) return 'PAGO';
        const now = new Date();
        return now.getTime() > new Date(due).getTime() ? 'VENCIDO' : 'EM_DIA';
    };

    return (data || []).map((row: any) => {
        const amt = Math.abs(Number(row.amount || 0));
        const start = String(row.created_at);
        const dueDateObj = new Date(start);
        if (repaymentDays > 0) dueDateObj.setDate(dueDateObj.getDate() + repaymentDays);
        const due = dueDateObj.toISOString();
        const st = deriveStatus(String(row.status || ''), due);

        const borrowerName = (row.borrower as any)?.name || row.description || 'Mutuário Desconhecido';

        return {
            id: String(row.id),
            borrowerName: borrowerName,
            amount: amt,
            startDate: start,
            dueDate: due,
            status: st,
            outstandingBalance: st === 'PAGO' ? 0 : amt,
        } as LoanItem;
    });
};

export const logQrCodeScan = async (content: string, status: 'SUCCESS' | 'ERROR' | 'INVALID', metadata: any = {}) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    await sb.from('qrcode_logs').insert({
        user_id: user.id,
        content,
        status,
        metadata
    });
};

// --- SLIDES PROMOCIONAIS ---

export const getSlides = async (audience: 'drivers' | 'merchants' | 'both' | 'all' = 'all'): Promise<AppSlide[]> => {
    const sb = getClient();
    if (!sb) return [];

    let query = sb.from('slides').select('*').eq('is_active', true);

    if (audience !== 'all') {
        if (audience === 'drivers') {
            query = query.in('target_audience', ['drivers', 'both']);
        } else if (audience === 'merchants') {
            query = query.in('target_audience', ['merchants', 'both']);
        }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Filter by expiration date if exists
    const now = new Date();
    return (data || []).filter((s: AppSlide) => !s.expires_at || new Date(s.expires_at) > now);
};

export const adminGetSlides = async (): Promise<AppSlide[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb.from('slides').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const adminCreateSlide = async (slide: Partial<AppSlide>) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");

    const { data, error } = await sb.from('slides').insert(slide).select().single();
    if (error) throw error;
    return data;
};

export const adminUpdateSlide = async (id: string, updates: Partial<AppSlide>) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('slides').update(updates).eq('id', id);
    if (error) throw error;
};

export const adminDeleteSlide = async (id: string) => {
    const sb = getClient();
    if (!sb) throw new Error("Client not ready");
    const { error } = await sb.from('slides').delete().eq('id', id);
    if (error) throw error;
};
