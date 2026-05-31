import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Request, Response } from 'express';
import { authenticateSupabaseRequest, requireSuperStoreAuth, AuthenticatedRequest } from '../supabaseAuth';

// Mock do supabaseAdmin do modulo correspondente
const authGetUser = vi.fn();
const singleMock = vi.fn();
const updateMock = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null })
}));
const eqMock = vi.fn(() => ({
    single: singleMock
}));
const selectMock = vi.fn(() => ({
    eq: eqMock
}));
const fromMock = vi.fn(() => ({
    select: selectMock,
    update: updateMock
}));

vi.mock('../../services/supabaseClient.js', () => {
    return {
        supabaseAdmin: {
            auth: {
                getUser: authGetUser
            },
            from: fromMock
        }
    };
});

describe('Supabase Authentication Middleware - Real-time Plan Control', () => {
    let req: Partial<AuthenticatedRequest>;
    let res: Partial<Response>;
    let next: any;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            header: vi.fn((name: string) => {
                if (name.toLowerCase() === 'authorization') return 'Bearer valid-token';
                return undefined;
            }) as any
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    test('Lojista com plano Super Lojista ativo e válido deve passar sem downgrade', async () => {
        authGetUser.mockResolvedValueOnce({
            data: { user: { id: 'user-active-1', email: 'active@lojista.com' } },
            error: null
        });

        // Plano COMISSAO ou plano MENSALIDADE futuro
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 15); // +15 dias

        singleMock.mockResolvedValueOnce({
            data: {
                id: 'user-active-1',
                email: 'active@lojista.com',
                role: 'store_partner',
                is_super_store: true,
                super_store_plan_type: 'MENSALIDADE',
                super_store_expiration: futureDate.toISOString(),
                city_slug: 'sp',
                store_slug: 'loja-sp',
                store_name: 'Super Loja SP'
            },
            error: null
        });

        await authenticateSupabaseRequest(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.is_super_store).toBe(true);
        expect(updateMock).not.toHaveBeenCalled(); // Não deve fazer downgrade
    });

    test('Lojista com plano MENSALIDADE expirado deve sofrer downgrade em tempo real', async () => {
        authGetUser.mockResolvedValueOnce({
            data: { user: { id: 'user-expired-1', email: 'expired@lojista.com' } },
            error: null
        });

        // Expiração no passado
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2); // -2 dias

        singleMock.mockResolvedValueOnce({
            data: {
                id: 'user-expired-1',
                email: 'expired@lojista.com',
                role: 'store_partner',
                is_super_store: true,
                super_store_plan_type: 'MENSALIDADE',
                super_store_expiration: pastDate.toISOString(),
                city_slug: 'sp',
                store_slug: 'loja-expirada',
                store_name: 'Loja Expirada'
            },
            error: null
        });

        await authenticateSupabaseRequest(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.is_super_store).toBe(false); // is_super_store forçado para false
        expect(fromMock).toHaveBeenCalledWith('user_profiles');
        expect(updateMock).toHaveBeenCalledWith({
            is_super_store: false,
            plan_level: 'GRATUITO'
        }); // Deve persistir downgrade no banco
    });

    test('Rota que exige Super Lojista (requireSuperStoreAuth) deve bloquear lojista com plano expirado', async () => {
        authGetUser.mockResolvedValueOnce({
            data: { user: { id: 'user-expired-2', email: 'expired2@lojista.com' } },
            error: null
        });

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);

        singleMock.mockResolvedValueOnce({
            data: {
                id: 'user-expired-2',
                email: 'expired2@lojista.com',
                role: 'store_partner',
                is_super_store: true,
                super_store_plan_type: 'MENSALIDADE',
                super_store_expiration: pastDate.toISOString(),
                city_slug: 'sp',
                store_slug: 'loja-expirada-2',
                store_name: 'Loja Expirada 2'
            },
            error: null
        });

        // Executar o middleware requireSuperStoreAuth
        await requireSuperStoreAuth(req as AuthenticatedRequest, res as Response, next);

        // Não deve deixar prosseguir (next não chamado)
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('apenas para super lojistas')
        }));
    });
});
