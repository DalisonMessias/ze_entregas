import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { Zebank } from '../../components/Zebank';
import { DialogProvider } from '../../utils/dialogService';

vi.mock('../../services/cloud', async () => {
  return {
    getZebankDashboardData: vi.fn(async () => ({
      balance: 100,
      savings_balance: 0,
      my_code: 'ABC123',
      partner_level: 'GOLD',
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
      recent_transactions: [],
    })),
    generateCardQRToken: vi.fn(async () => 'FAKE_TOKEN')
  };
});

// mockar QRious global para validar chamada
// @ts-ignore
global.QRious = vi.fn();

describe('CardQROverlay rendering and layout', () => {
  test('shows QR overlay with canvas and invokes QRious', async () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function() {
      return { width: 320, height: 320, top: 0, left: 0, right: 320, bottom: 320 } as any;
    };
    render(
      <DialogProvider>
        <Zebank userRole={'delivery_partner'} />
      </DialogProvider>
    );

    const payButtons = await screen.findAllByRole('button', { name: 'Pagar' });
    expect(payButtons.length).toBeGreaterThan(0);
    fireEvent.click(payButtons[0]);

    // aguardar título do overlay
    expect(await screen.findByText('QR Code Seguro')).toBeTruthy();

    // canvas presente com atributos dimensionados (JSDOM não atribui role)
    const canvasEl = document.querySelector('canvas');
    expect(canvasEl).toBeTruthy();
    expect(Number(canvasEl?.getAttribute('width'))).toBeLessThan(320);
    expect(Number(canvasEl?.getAttribute('height'))).toBeLessThan(320);

    // QRious chamado com token
    await act(async () => {});
    expect((global as any).QRious).toHaveBeenCalled();
    const call = (global as any).QRious.mock.calls.at(-1)?.[0];
    expect(call?.value).toBe('FAKE_TOKEN');
    expect(call?.size).toBeLessThan(320);
    Element.prototype.getBoundingClientRect = original;
  });

  test('responsive classes applied', async () => {
    render(
      <DialogProvider>
        <Zebank userRole={'delivery_partner'} />
      </DialogProvider>
    );
    const payButtons = await screen.findAllByRole('button', { name: 'Pagar' });
    fireEvent.click(payButtons[0]);
    await screen.findByText('QR Code Seguro');
    const canvasEl = document.querySelector('canvas');
    expect(canvasEl?.className).toContain('w-44');
    expect(canvasEl?.className).toContain('md:w-56');
  });
});
