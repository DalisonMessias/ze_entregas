import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../../services/cloud', () => ({
    getUserRole: vi.fn().mockResolvedValue('store_partner'),
    getClient: vi.fn(() => null),
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

import * as cloud from '../../services/cloud';
import { App } from '../App';

describe('WhatsBot navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('mostra item WhatsBot apenas para super lojista', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValueOnce({ is_super_store: true });

        render(<App userId="store-1" userRole="store_partner" />);
        fireEvent.click(document.getElementById('header-menu-button')!);

        expect(await screen.findByText('WhatsBot')).toBeInTheDocument();
    });

    it('oculta item WhatsBot para lojista comum', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValueOnce({ is_super_store: false });

        render(<App userId="store-2" userRole="store_partner" />);
        fireEvent.click(document.getElementById('header-menu-button')!);

        expect(await screen.findByText('Painel')).toBeInTheDocument();
        expect(screen.queryByText('WhatsBot')).not.toBeInTheDocument();
    });
});
