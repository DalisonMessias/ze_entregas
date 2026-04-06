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
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token.trim();
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
            .select('id, email, role, is_super_store, city_slug, store_slug, store_name')
            .eq('id', targetUserId)
            .single();

        if (profileError || !profile) {
            console.error(`[SupabaseAuth] Erro ao buscar perfil:`, profileError || 'Perfil vazio');
            return res.status(403).json({
                success: false,
                message: isImpersonating ? 'Perfil da loja impersonada nao encontrado.' : 'Perfil do usuario nao encontrado.'
            });
        }

        req.user = {
            id: profile.id,
            email: profile.email || authData.user.email || null,
            role: normalizeRole(profile.role),
            is_super_store: !!profile.is_super_store,
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
        if (req.user?.role !== 'store_partner' || !req.user.is_super_store) {
            return res.status(403).json({
                success: false,
                message: 'Acesso permitido apenas para super lojistas.'
            });
        }

        next();
    });
};
