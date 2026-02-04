import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DialogProvider } from '../../utils/dialogService';
import { SupportPage } from '../SupportPage';
import { PublicSupportPage } from '../PublicSupportPage';

vi.mock('../../services/cloud', () => {
  return {
    getShopSettings: vi.fn(async () => ({
      support_phone: '5511999999999',
      support_hours_start: '09:00',
      support_hours_end: '18:00',
      support_status_override: 'AUTO',
    })),
    getMyClaims: vi.fn(async () => []),
    createClaim: vi.fn(async () => ({})),
    getClient: vi.fn(() => null),
  };
});

describe('Support pages layout', () => {
  it('SupportPage default (embedded) does not add min-h-screen or px-4', () => {
    render(
      <DialogProvider>
        <SupportPage />
      </DialogProvider>
    );

    const root = screen.getByTestId('support-root');
    const container = screen.getByTestId('support-container');

    expect(root).not.toHaveClass('min-h-screen');
    expect(container).not.toHaveClass('px-4');
  });

  it('SupportPage standalone adds min-h-screen and px-4', () => {
    render(
      <DialogProvider>
        <SupportPage layout="standalone" />
      </DialogProvider>
    );

    const root = screen.getByTestId('support-root');
    const container = screen.getByTestId('support-container');

    expect(root).toHaveClass('min-h-screen');
    expect(container).toHaveClass('px-4');
  });

  it('PublicSupportPage uses max-w-5xl for topbar and container', async () => {
    render(<PublicSupportPage />);

    await waitFor(() => expect(screen.getByTestId('public-support-container')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('public-support-topbar')).toBeInTheDocument());

    expect(screen.getByTestId('public-support-container')).toHaveClass('max-w-5xl');
    expect(screen.getByTestId('public-support-topbar')).toHaveClass('max-w-5xl');
  });

  afterEach(() => cleanup());
});

