import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';

export interface SupabaseRequestUser {
    id: string;
    email: string | null;
    role: string | null;
    is_super_store: boolean;
    city_slug: string | null;
    store_slug: string | null;
    store_name: string | null;
}

export interface AuthenticatedRequest extends Request {
    user?: SupabaseRequestUser;
}

const getBearerToken = (req: Request): string | null => {
    // 1. Tenta obter o cabeçalho Authorization padrão
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (authHeader) {
        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() === 'bearer' && token) {
            return token.trim();
        }
        // Se o cabeçalho contiver apenas o token bruto
        if (authHeader.trim() && !authHeader.includes(' ')) {
            return authHeader.trim();
        }
    }

    // 2. Tenta cabeçalhos alternativos
    const xApiKey = req.header('x-api-key') || req.header('X-Api-Key');
    if (xApiKey) return xApiKey.trim();

    const accessTokenHeader = req.header('access_token') || req.header('access-token') || req.header('Access-Token');
    if (accessTokenHeader) return accessTokenHeader.trim();

    const tokenHeader = req.header('token') || req.header('Token');
    if (tokenHeader) return tokenHeader.trim();

    // 3. Tenta parâmetros de URL (query string)
    const tokenQuery = req.query.token || req.query.access_token || req.query.apiKey;
    if (typeof tokenQuery === 'string') {
        return tokenQuery.trim();
    }

    return null;
};

const getImpersonationStoreId = (req: Request): string | null => {
    const rawValue = req.header('x-impersonation-store-id') || req.header('X-Impersonation-Store-Id');
    if (!rawValue) return null;

    const value = rawValue.trim();
    return value || null;
};

const normalizeRole = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    const role = value.trim().toLowerCase();
    return role || null;
};

export const authenticateSupabaseRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token de autenticacao ausente.' });
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user) {
            return res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
        }

        const requestedStoreId = getImpersonationStoreId(req);

        const { data: authenticatedProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, role')
            .eq('id', authData.user.id)
            .maybeSingle();

        const authenticatedRole =
            normalizeRole(authenticatedProfile?.role) ||
            normalizeRole(authData.user.app_metadata?.role) ||
            normalizeRole(authData.user.user_metadata?.role);

        const isImpersonating = !!requestedStoreId && requestedStoreId !== authData.user.id;

        if (isImpersonating && authenticatedRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Impersonacao permitida apenas para administradores.'
            });
        }

        const targetUserId = requestedStoreId || authData.user.id;
        console.log(`[SupabaseAuth] Autenticando... targetUserId: ${targetUserId}, isImpersonating: ${isImpersonating}`);

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, role, is_super_store, city_slug, store_slug, store_name, super_store_plan_type, super_store_expiration')
            .eq('id', targetUserId)
            .single();

        if (profileError || !profile) {
            console.error(`[SupabaseAuth] Erro ao buscar perfil:`, profileError || 'Perfil vazio');
            return res.status(403).json({
                success: false,
                message: isImpersonating ? 'Perfil da loja impersonada nao encontrado.' : 'Perfil do usuario nao encontrado.'
            });
        }

        let isSuperStore = !!profile.is_super_store;

        // Validação robusta de expiração do plano Super Lojista em tempo real no backend
        if (isSuperStore && profile.super_store_plan_type === 'MENSALIDADE' && profile.super_store_expiration) {
            const expirationDate = new Date(profile.super_store_expiration);
            if (expirationDate < new Date()) {
                console.log(`[SupabaseAuth] Plano Super Lojista do usuario ${profile.id} expirou em tempo real (${expirationDate.toISOString()}). Forcando downgrade...`);
                isSuperStore = false;

                // Efetuar a persistencia da reclassificacao de plano em tempo real no banco de dados de forma nao-bloqueante
                supabaseAdmin
                    .from('user_profiles')
                    .update({ 
                       is_super_store: false, 
                        plan_level: 'GRATUITO' 
                    })
                    .eq('id', profile.id)
                    .then(({ error }) => {
                        if (error) {
                            console.error(`[SupabaseAuth] Erro ao aplicar downgrade no banco de dados para o usuario ${profile.id}:`, error);
                        } else {
                            console.log(`[SupabaseAuth] Downgrade de plano aplicado e persistido com sucesso no Supabase para o usuario ${profile.id}.`);
                        }
                    });
            }
        }

        req.user = {
            id: profile.id,
            email: profile.email || authData.user.email || null,
            role: normalizeRole(profile.role),
            is_super_store: isSuperStore,
            city_slug: profile.city_slug || null,
            store_slug: profile.store_slug || null,
            store_name: profile.store_name || null
        };

        next();
    } catch (error: any) {
        console.error('[SupabaseAuth] Erro ao autenticar requisicao:', error);
        return res.status(500).json({ success: false, message: 'Erro interno na autenticacao.' });
    }
};

export const requireSuperStoreAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await authenticateSupabaseRequest(req, res, async () => {
        const isSuperStorePartner = req.user?.role === 'store_partner' && req.user.is_super_store;
        const isAdmin = req.user?.role === 'admin';

        if (!isSuperStorePartner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Acesso permitido apenas para super lojistas ou administradores.'
            });
        }

        next();
    });
};
