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

export const authenticateSupabaseRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token de autenticação ausente.' });
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user) {
            return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, role, is_super_store, city_slug, store_slug, store_name')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            return res.status(403).json({ success: false, message: 'Perfil do usuário não encontrado.' });
        }

        req.user = {
            id: profile.id,
            email: authData.user.email || profile.email || null,
            role: profile.role || null,
            is_super_store: !!profile.is_super_store,
            city_slug: profile.city_slug || null,
            store_slug: profile.store_slug || null,
            store_name: profile.store_name || null
        };

        next();
    } catch (error: any) {
        console.error('[SupabaseAuth] Erro ao autenticar requisição:', error);
        return res.status(500).json({ success: false, message: 'Erro interno na autenticação.' });
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
