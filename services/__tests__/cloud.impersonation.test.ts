import { beforeEach, describe, expect, test, vi } from 'vitest';

const authGetUser = vi.fn(async () => ({
    data: {
        user: {
            id: 'admin-1'
        }
    },
    error: null
}));

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({
    single: singleMock
}));
const selectMock = vi.fn(() => ({
    eq: eqMock
}));
const fromMock = vi.fn(() => ({
    select: selectMock
}));

vi.mock('@supabase/supabase-js', () => {
    const createClient = vi.fn(() => ({
        auth: {
            getUser: authGetUser
        },
        from: fromMock
    }));

    return { createClient };
});

vi.mock('../impersonation', () => ({
    getImpersonationStoreId: vi.fn()
}));

import * as cloud from '../cloud';
import { getImpersonationStoreId } from '../impersonation';

describe('cloud impersonation resolution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getImpersonationStoreId as any).mockReturnValue('store-123');
    });

    test('getMyPartnerProfile resolves the impersonated store id', async () => {
        singleMock.mockResolvedValueOnce({
            data: {
                id: 'store-123',
                name: 'Loja Teste',
                email: 'loja@teste.com',
                is_super_store: true,
                city_slug: 'cidade',
                store_slug: 'loja-teste'
            },
            error: null
        });

        const profile = await cloud.getMyPartnerProfile();

        expect(fromMock).toHaveBeenCalledWith('user_profiles');
        expect(eqMock).toHaveBeenCalledWith('id', 'store-123');
        expect(profile?.id).toBe('store-123');
        expect(profile?.is_super_store).toBe(true);
    });

    test('getInitialUserData uses the impersonated store context', async () => {
        singleMock.mockResolvedValueOnce({
            data: {
                role: 'delivery_person',
                status: 'pending'
            },
            error: null
        });

        const result = await cloud.getInitialUserData();

        expect(fromMock).toHaveBeenCalledWith('user_profiles');
        expect(selectMock).toHaveBeenCalledWith('role, status');
        expect(eqMock).toHaveBeenCalledWith('id', 'store-123');
        expect(result).toEqual({
            role: 'store_partner',
            status: 'pending'
        });
    });
});
