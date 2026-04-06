import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getImpersonationState, getImpersonationStoreId, isImpersonating } from '../impersonation';

const IMPERSONATION_KEY = 'ze_impersonation_mode';

describe('impersonation state normalization', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-06T18:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('normalizes legacy state without isActive and persists the normalized shape', () => {
        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
            storeId: 'store-123',
            storeName: 'Loja Teste',
            adminId: 'admin-1',
            reason: 'Suporte',
            startedAt: Date.now()
        }));

        const state = getImpersonationState();
        const persisted = JSON.parse(localStorage.getItem(IMPERSONATION_KEY) || '{}');

        expect(state).toEqual({
            isActive: true,
            storeId: 'store-123',
            storeName: 'Loja Teste',
            adminId: 'admin-1',
            reason: 'Suporte',
            startedAt: Date.now()
        });
        expect(persisted.isActive).toBe(true);
        expect(getImpersonationStoreId()).toBe('store-123');
        expect(isImpersonating()).toBe(true);
    });

    test('clears expired state', () => {
        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
            storeId: 'store-123',
            startedAt: Date.now() - (31 * 60 * 1000)
        }));

        expect(getImpersonationState()).toBeNull();
        expect(localStorage.getItem(IMPERSONATION_KEY)).toBeNull();
    });

    test('clears invalid json', () => {
        localStorage.setItem(IMPERSONATION_KEY, '{invalid');

        expect(getImpersonationState()).toBeNull();
        expect(localStorage.getItem(IMPERSONATION_KEY)).toBeNull();
    });

    test('treats explicit inactive state as invalid', () => {
        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
            isActive: false,
            storeId: 'store-123',
            startedAt: Date.now()
        }));

        expect(getImpersonationState()).toBeNull();
        expect(localStorage.getItem(IMPERSONATION_KEY)).toBeNull();
        expect(isImpersonating()).toBe(false);
    });
});
