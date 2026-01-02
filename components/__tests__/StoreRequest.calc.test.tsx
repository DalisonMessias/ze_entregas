import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import * as cloud from '../../services/cloud';
import { StoreRequest } from '../StoreRequest';

describe('StoreRequest cálculo de valores', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calcula distância, líquido e total para a loja após validação', async () => {
    vi.spyOn(cloud, 'getPublicFeeSettings').mockResolvedValue({
      base_delivery_value: 10,
      base_delivery_km: 3,
      extra_km_value: 2,
      additional_stop_fee: 3,
      global_tax_fixed: 1,
      global_tax_percent: 0.1,
    } as any);
    vi.spyOn(cloud, 'getMyWallet').mockResolvedValue({ balance_decimal: 100 });
    vi.spyOn(cloud.getClient()!.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { address: '' } } } } as any);
    vi.spyOn(cloud.getClient()!, 'from').mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { city: 'TestCity', is_super_store: true, address: '' } } ) }) }) } as any);

    const pickupResponse = {
      json: async () => [{
        lat: '-20.0000', lon: '-44.0000', address: { city: 'TestCity', road: 'Rua A', house_number: '1', suburb: 'Centro', postcode: '00000-000', state: 'MG' }
      }], ok: true
    } as any;
    const deliveryResponse = {
      json: async () => [{
        lat: '-20.0100', lon: '-44.0100', address: { city: 'TestCity', road: 'Rua B', house_number: '2', suburb: 'Bairro', postcode: '00000-000', state: 'MG' }
      }], ok: true
    } as any;
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (++call === 1 ? pickupResponse : deliveryResponse)) as any);

    render(<StoreRequest onNavigate={() => {}} />);

    const ruaInputs = await screen.findAllByPlaceholderText('Rua / Avenida');
    const numInputs = await screen.findAllByPlaceholderText('Número');
    const bairroInputs = await screen.findAllByPlaceholderText('Bairro');

    fireEvent.change(ruaInputs[0], { target: { value: 'Rua A' } });
    fireEvent.change(numInputs[0], { target: { value: '1' } });
    fireEvent.change(bairroInputs[0], { target: { value: 'Centro' } });
    const validarBtns1 = await screen.findAllByRole('button', { name: 'Validar' });
    fireEvent.click(validarBtns1[0]);

    fireEvent.change(ruaInputs[1], { target: { value: 'Rua B' } });
    fireEvent.change(numInputs[1], { target: { value: '2' } });
    fireEvent.change(bairroInputs[1], { target: { value: 'Bairro' } });
    const entregaLabel = await screen.findByText('Endereço de Entrega');
    const entregaContainer = entregaLabel.closest('div')!;
    const allButtons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    const validarEntrega = allButtons.find(b => /Validar/i.test(b.textContent || '') && entregaContainer.contains(b))!;
    fireEvent.click(validarEntrega);

    await waitFor(() => expect(screen.getAllByText('Endereço válido').length).toBeGreaterThanOrEqual(2));

    fireEvent.click(screen.getByText('Calcular'));

    await waitFor(() => {
      expect(screen.getByText(/Distância Total/i)).toBeTruthy();
      expect(screen.getByText(/Valor Base/i)).toBeTruthy();
      expect(screen.getByText(/Total para a Loja/i)).toBeTruthy();
    });

    const confirmBtn = screen.getByText('Chamar Entregador Zé');
    expect(confirmBtn).not.toHaveAttribute('disabled');
  });
});
