import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as cloud from '../../services/cloud';
import { StoreRequest } from '../StoreRequest';

describe('StoreRequest - Empréstimo e bloqueios', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cloud, 'getPublicFeeSettings').mockResolvedValue({
      global_tax_fixed: 0,
      global_tax_percent: 0.1,
      base_delivery_value: 10,
      base_delivery_km: 2,
      extra_km_value: 2,
      additional_stop_fee: 0,
    } as any);
    vi.spyOn(cloud, 'getMyWallet').mockResolvedValue({ balance_decimal: 5 } as any);
    vi.spyOn(cloud, 'getClient').mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', user_metadata: {} } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { city: 'Cidade', is_super_store: true, address: '' } } as any) }) }) })
    } as any);
    vi.spyOn(cloud, 'getLoanConfig').mockResolvedValue({ interest_rate_percent: 2, repayment_days: 7, credit_limit: 50 });
    vi.spyOn(cloud, 'getActiveStoreLoan').mockResolvedValue(null);
  });

  it('exibe modal de empréstimo quando saldo < custo e limite cobre diferença', async () => {
    render(<StoreRequest onNavigate={() => {}} />);
    await screen.findByText('Solicitar Entrega');

    // Preenche pickup e entrega com dados mínimos
    const ruaInputs = screen.getAllByPlaceholderText('Rua / Avenida');
    fireEvent.change(ruaInputs[0], { target: { value: 'Rua A' } });
    const numInputs = screen.getAllByPlaceholderText('Número');
    fireEvent.change(numInputs[0], { target: { value: '10' } });
    const bairroInputs = screen.getAllByPlaceholderText('Bairro');
    fireEvent.change(bairroInputs[0], { target: { value: 'Centro' } });

    // Marcar estado calculado manualmente
    // Nota: como a validação externa exige fetch, simulamos cálculo setando localStorage e re-render
    const persisted = {
      requestType: 'PLATFORM',
      pickup: { id: 'pickup', street: 'Rua A', number: '10', neighborhood: 'Centro', validated: true, lat: -20, lng: -44 },
      deliveries: [{ id: 'd1', street: 'Rua B', number: '20', neighborhood: 'Bairro', validated: true, lat: -20.1, lng: -44.1 }],
      distanceKm: 10,
      partnerNet: 20,
      cost: 25,
      selectedAssociateIds: []
    };
    localStorage.setItem('store_request_state', JSON.stringify(persisted));

    cleanup();
    render(<StoreRequest onNavigate={() => {}} />);
    await screen.findByText('Solicitar Entrega');

    const callBtn = screen.getAllByText(/Chamar Entregador Zé/)[0];
    fireEvent.click(callBtn);

    await waitFor(() => {
      expect(screen.getByText('Empréstimo para Solicitação')).toBeTruthy();
    });
  });

  it('bloqueia quando há empréstimo ativo e saldo insuficiente para próxima corrida', async () => {
    vi.spyOn(cloud, 'getActiveStoreLoan').mockResolvedValue({ amount: 30, status: 'active', created_at: new Date().toISOString() });
    cleanup();
    render(<StoreRequest onNavigate={() => {}} />);
    await screen.findByText('Solicitar Entrega');

    const persisted = {
      requestType: 'PLATFORM',
      pickup: { id: 'pickup', street: 'Rua A', number: '10', neighborhood: 'Centro', validated: true, lat: -20, lng: -44 },
      deliveries: [{ id: 'd1', street: 'Rua B', number: '20', neighborhood: 'Bairro', validated: true, lat: -20.1, lng: -44.1 }],
      distanceKm: 10,
      partnerNet: 20,
      cost: 100,
      selectedAssociateIds: []
    };
    localStorage.setItem('store_request_state', JSON.stringify(persisted));

    render(<StoreRequest onNavigate={() => {}} />);
    await screen.findByText('Solicitar Entrega');

    const callBtn = screen.getAllByText(/Chamar Entregador Zé/)[0];
    fireEvent.click(callBtn);

    await waitFor(() => {
      expect(screen.getByText(/Empréstimo ativo detectado/)).toBeTruthy();
    });
  });
});
