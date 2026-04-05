import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../../services/cloud', () => ({
    getUserRole: vi.fn().mockResolvedValue('store_partner'),
    getClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'store-test' } } })
        },
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
        })),
        removeChannel: vi.fn()
    })),
    getMyPartnerProfile: vi.fn(),
    getSystemPulse: vi.fn().mockResolvedValue({
        notifications: [],
        maintenance: { is_active: false },
        role: 'store_partner',
        pendingTicketsCount: 0
    }),
    getInitialUserData: vi.fn().mockResolvedValue({ role: 'store_partner', status: 'active' }),
    getPendingTicketsCount: vi.fn().mockResolvedValue(0),
    getBlockingDetails: vi.fn().mockResolvedValue(null),
    markNotificationRead: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../utils/dialogService', () => ({
    useDialog: () => ({
        alert: async () => { },
        confirm: async () => true,
        prompt: async () => '',
        toast: vi.fn()
    })
}));

vi.mock('@list-labs/react-joyride', () => ({ default: () => null }));
vi.mock('../../services/notificationService', () => ({
    initNotificationService: vi.fn(),
    stopNotificationService: vi.fn()
}));
vi.mock('../Tour/TourContext', () => ({
    useTour: () => ({
        steps: [],
        run: false,
        stepIndex: 0,
        startTour: () => { },
        stopTour: () => { },
        handleJoyrideCallback: () => { },
        isTourRunning: false
    })
}));
vi.mock('../Tour/Tour', () => ({ default: () => null }));
vi.mock('../../services/chatOfflineService', () => ({
    chatOfflineService: {
        getUnreadCount: vi.fn().mockResolvedValue(0)
    }
}));

import * as cloud from '../../services/cloud';
import { App } from '../App';

describe('WhatsBot navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.pushState({}, '', '/loja/dashboard');
        Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
        });
    });

    it('mostra item WhatsBot apenas para super lojista', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValue({ is_super_store: true });

        const view = render(<App userId="store-1" userRole="store_partner" />);

        expect(await screen.findByTitle('WhatsBot')).toBeInTheDocument();
        view.unmount();
        await Promise.resolve();
    });

    it('oculta item WhatsBot para lojista comum', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValue({ is_super_store: false });

        const view = render(<App userId="store-2" userRole="store_partner" />);

        expect((await screen.findAllByTitle('Dashboard')).length).toBeGreaterThan(0);
        expect(screen.queryByTitle('WhatsBot')).not.toBeInTheDocument();
        view.unmount();
        await Promise.resolve();
    });
});
