import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../../services/cloud', () => ({
    getMyPartnerProfile: vi.fn()
}));

vi.mock('../../services/whatsbot', () => ({
    getWhatsBotStatus: vi.fn(),
    updateWhatsBotConfig: vi.fn(),
    startWhatsBot: vi.fn(),
    stopWhatsBot: vi.fn()
}));

vi.mock('../../utils/dialogService', () => ({
    useDialog: () => ({
        alert: async () => { },
        confirm: async () => true,
        prompt: async () => '',
        toast: vi.fn()
    })
}));

import * as cloud from '../../services/cloud';
import * as whatsbot from '../../services/whatsbot';
import { WhatsBot } from '../WhatsBot';

describe('WhatsBot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('bloqueia acesso para lojista que nao e super lojista', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValueOnce({ is_super_store: false });

        render(<WhatsBot />);

        expect(await screen.findByText('Acesso Restrito')).toBeInTheDocument();
        expect(screen.getByText(/WhatsBot e um recurso exclusivo/i)).toBeInTheDocument();
    });

    it('carrega status e salva mensagem personalizada', async () => {
        (cloud.getMyPartnerProfile as any).mockResolvedValueOnce({ is_super_store: true });
        (whatsbot.getWhatsBotStatus as any).mockResolvedValueOnce({
            enabled: true,
            connectionStatus: 'CONNECTED',
            connectedPhone: '5511999999999',
            customMessage: 'Ola! Confira {{catalog_url}}',
            catalogUrl: 'https://app.exemplo.com/cidade/loja/produtos',
            lastError: null
        });
        (whatsbot.updateWhatsBotConfig as any).mockResolvedValueOnce({
            enabled: true,
            connectionStatus: 'CONNECTED',
            connectedPhone: '5511999999999',
            customMessage: 'Nova mensagem',
            catalogUrl: 'https://app.exemplo.com/cidade/loja/produtos',
            lastError: null
        });

        render(<WhatsBot />);

        expect(await screen.findByText('WhatsBot')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Ola! Confira {{catalog_url}}')).toBeInTheDocument();
        expect(screen.getByText('Conectado')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Nosso catalogo esta aqui/i), {
            target: { value: 'Nova mensagem' }
        });

        fireEvent.click(screen.getByText('Salvar mensagem'));

        await waitFor(() => {
            expect(whatsbot.updateWhatsBotConfig).toHaveBeenCalledWith({ customMessage: 'Nova mensagem' });
        });

        expect(await screen.findByDisplayValue('Nova mensagem')).toBeInTheDocument();
    });
});
