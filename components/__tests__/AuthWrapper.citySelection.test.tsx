import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthWrapper } from '../AuthWrapper';
import { DialogProvider } from '../../utils/dialogService';

vi.mock('../../services/cloud', async () => {
  const actual = await vi.importActual<any>('../../services/cloud');
  const fakeSb = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn()
    },
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({}) ) })), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({ select: vi.fn(() => ({ limit: vi.fn(async () => ({ data: null, error: null })) })) }))
  } as any;
  return {
    ...actual,
    initSupabase: () => fakeSb,
    getClient: () => fakeSb,
    getInitialUserData: async () => ({ role: 'delivery_person', status: 'active' }),
    getAvailableCities: vi.fn(async () => ([{ id: '1', name: 'Belo Horizonte', state: 'MG', is_active: true }])),
  };
});

describe('AuthWrapper seleção de cidade', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => cleanup());

  it('mantém a seleção de cidade ao navegar entre telas', async () => {
    render(<DialogProvider><AuthWrapper /></DialogProvider>);

    const lojistaBtn = await screen.findByText('Quero ser parceiro');
    fireEvent.click(lojistaBtn);

    await waitFor(() => expect(screen.getByText(/Cidade de Atuação/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Belo Horizonte/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Belo Horizonte/i));

    await waitFor(() => expect(screen.getByText(/Cidade:/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText('(Mudar)'));

    await waitFor(() => expect(screen.getByText(/Selecionado: Belo Horizonte - MG/i)).toBeInTheDocument());
  });
});
