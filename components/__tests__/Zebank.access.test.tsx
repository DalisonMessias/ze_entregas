import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from 'vitest';
import { Zebank } from '../../components/Zebank';
import { vi, describe, test } from 'vitest';
import { DialogProvider } from '../../utils/dialogService';

vi.mock('../../services/cloud', async () => {
  return {
    getZebankDashboardData: vi.fn(async () => ({
      balance: 79.55,
      savings_balance: 0,
      my_code: 'OCYCTT',
      partner_level: 'BRONZE',
      cards: [
        {
          id: 'card-1',
          name: 'Principal',
          card_number: '1111222233334444',
          card_last_four: '4444',
          expiration_date: '12/28',
          cvv: '123',
          card_holder: 'ZE ENTREGAS',
          status: 'ACTIVE',
          spending_limit_percent: 100,
        },
      ],
      recent_transactions: [
        {
          id: 'tx-1',
          amount: 0.5,
          description: 'SIMULAÇÃO: Teste de Validação',
          direction: 'OUT',
          created_at: new Date().toISOString(),
          status: 'COMPLETED',
        },
      ],
    })),
  };
});

describe('Zebank access control', () => {
  test('delivery_person sees only invite, balance, Transferir, Guardar and Atividade Recente', async () => {
    render(
      <DialogProvider>
        <Zebank userRole={'delivery_person'} />
      </DialogProvider>
    );

    // Invite card
    expect(await screen.findByText('Torne-se um Parceiro Verificado')).toBeTruthy();

    // Balance card
    expect(screen.getByText('Saldo em Conta')).toBeTruthy();
    expect(screen.getByText('Guardado:')).toBeTruthy();

    // Allowed actions
    const transferButtons = screen.getAllByRole('button', { name: 'Transferir' });
    expect(transferButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();

    // Recent activity
    expect(screen.getByText('Atividade Recente')).toBeTruthy();

    // Blocked elements
    expect(screen.queryByText('Novo Cartão')).toBeNull();
    expect(screen.queryByText('Meus Cartões')).toBeNull();
    expect(screen.queryByText('Maquininha')).toBeNull();
  });

  test('delivery_partner sees full functionality including cards and extra actions', async () => {
    render(
      <DialogProvider>
        <Zebank userRole={'delivery_partner'} />
      </DialogProvider>
    );

    // No invite card button
    expect(await screen.findByText('Saldo em Conta')).toBeTruthy();

    // Full actions
    const partnerTransferButtons = screen.getAllByRole('button', { name: 'Transferir' });
    expect(partnerTransferButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Guardar' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Novo Cartão' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Maquininha' }).length).toBeGreaterThanOrEqual(1);

    // Cards section
    expect(screen.getByText('Meus Cartões')).toBeTruthy();
  });
});
