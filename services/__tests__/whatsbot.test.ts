import { beforeEach, describe, expect, test, vi } from 'vitest';

const authGetSession = vi.fn(async () => ({
    data: {
        session: {
            access_token: 'token-123'
        }
    }
}));

vi.mock('axios', () => {
    const get = vi.fn(async () => ({ data: { enabled: false, connectionStatus: 'DISCONNECTED', customMessage: '', catalogUrl: '' } }));
    const put = vi.fn(async () => ({ data: {} }));
    const post = vi.fn(async () => ({ data: {} }));

    return {
        default: { get, put, post },
        get,
        put,
        post
    };
});

vi.mock('../cloud', () => ({
    getClient: vi.fn(() => ({
        auth: {
            getSession: authGetSession
        }
    }))
}));

vi.mock('../../utils/apiConfig', () => ({
    getWhatsBotApiBaseUrl: vi.fn(() => 'http://127.0.0.1:4000/api/whatsbot')
}));

import axios from 'axios';
import { getWhatsBotStatus } from '../whatsbot';

const IMPERSONATION_KEY = 'ze_impersonation_mode';

describe('whatsbot impersonation headers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    test('includes x-impersonation-store-id for normalized legacy impersonation state', async () => {
        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
            storeId: 'store-legacy',
            storeName: 'Loja Legacy',
            adminId: 'admin-1',
            reason: 'Suporte',
            startedAt: Date.now()
        }));

        await getWhatsBotStatus();

        expect((axios as any).get).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/api/whatsbot/status',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-123',
                    'x-impersonation-store-id': 'store-legacy'
                })
            })
        );
    });

    test('does not include impersonation header when there is no valid impersonation state', async () => {
        await getWhatsBotStatus();

        expect((axios as any).get).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/api/whatsbot/status',
            expect.objectContaining({
                headers: {
                    Authorization: 'Bearer token-123'
                }
            })
        );
    });

    test('uses explicit storeId when provided by the page context', async () => {
        await getWhatsBotStatus({ storeId: 'store-page-context' });

        expect((axios as any).get).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/api/whatsbot/status',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-123',
                    'x-impersonation-store-id': 'store-page-context'
                })
            })
        );
    });
});
