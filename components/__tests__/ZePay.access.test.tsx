import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, vi, describe, test } from 'vitest';
import { ZePayStore } from '../../components/ZePayStore';

vi.mock('../../services/cloud', async () => {
  return {
    getMyPartnerProfile: vi.fn(async () => ({ is_super_store: false })),
    getZePayDashboardData: vi.fn(async () => ({ balance: 1000, my_code: 'STORE01', cards: [], recent_transactions: [] })),
    logClientError: vi.fn(async () => {}),
  };
});

describe('ZePay access control and tabs', () => {
  test('store_partner não-super vê bloqueios e aba Extrato', async () => {
    render(<ZePayStore />);

    // Tabs presentes
    expect(await screen.findByText('Visão Geral')).toBeTruthy();
    expect(screen.getByText('Extrato')).toBeTruthy();
    expect(screen.getByText('Maquininha')).toBeTruthy();

    // Bloqueio visual para recursos corporativos
    expect(await screen.findByText('Recursos Corporativos')).toBeTruthy();
    expect(screen.getByText('Transferências e cartões corporativos são exclusivos de Super Lojistas.')).toBeTruthy();

    // Extrato renderiza ao clicar na tab
    fireEvent.click(screen.getByText('Extrato'));
    expect(await screen.findByText('Extrato Detalhado')).toBeTruthy();

    // Maquininha bloqueada para não-super
    fireEvent.click(screen.getByText('Maquininha'));
    expect(await screen.findByText('Maquininha do Zé')).toBeTruthy();
    expect(screen.getByText('A maquininha está disponível apenas para Super Lojistas.')).toBeTruthy();
  });

  test('superlojista vê ações corporativas e pode acessar Maquininha', async () => {
    const cloud = await import('../../services/cloud');
    (cloud.getMyPartnerProfile as any).mockResolvedValueOnce({ is_super_store: true });
    (cloud.getZePayDashboardData as any).mockResolvedValueOnce({ balance: 2000, my_code: 'SUPER01', cards: [], recent_transactions: [] });

    render(<ZePayStore />);

    // Ações corporativas disponíveis
    expect(await screen.findByText('Transferir')).toBeTruthy();
    expect(screen.getByText('Novo Cartão')).toBeTruthy();

    // Maquininha acessível
    fireEvent.click(screen.getByText('Maquininha'));
    expect(await screen.findByText('Enviar via WhatsApp')).toBeTruthy(); // modal/flow do POS deve exibir UI
  });
});
