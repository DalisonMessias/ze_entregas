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
  const registerSpy = vi.fn(async () => ({ user: { id: 'u-1' } }));
  return {
    ...actual,
    initSupabase: () => fakeSb,
    getClient: () => fakeSb,
    getInitialUserData: async () => ({ role: 'delivery_person', status: 'active' }),
    getAvailableCities: vi.fn(async () => ([{ id: '1', name: 'Belo Horizonte', state: 'MG', is_active: true }])),
    registerUserWithType: registerSpy,
  };
});

describe('AuthWrapper cadastro por tipo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => cleanup());

  it('cadastra lojista com role e campos corretos', async () => {
    render(<DialogProvider><AuthWrapper /></DialogProvider>);

    fireEvent.click(await screen.findByText('Quero ser parceiro'));

    await waitFor(() => expect(screen.getByText(/Cidade de Atuação/i)).toBeInTheDocument());
    fireEvent.click(await screen.findByText(/Belo Horizonte/i));

    await waitFor(() => expect(screen.getByText(/Cadastro Lojista/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Nome Completo'), { target: { value: 'Alice Lojista' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'alice@exemplo.com' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '(31) 99999-0000' } });
    fireEvent.change(screen.getByPlaceholderText('CPF (Opcional)'), { target: { value: '111.222.333-44' } });
    fireEvent.change(screen.getByPlaceholderText('Nome da Loja'), { target: { value: 'Loja Teste' } });
    fireEvent.change(screen.getByPlaceholderText('CPF/CNPJ da Loja'), { target: { value: '12.345.678/0001-99' } });
    fireEvent.change(screen.getByPlaceholderText('Rua'), { target: { value: 'Rua A' } });
    fireEvent.change(screen.getByPlaceholderText('Nº'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('Bairro'), { target: { value: 'Centro' } });
    fireEvent.change(screen.getByPlaceholderText('Senha (mín. 6 caracteres)'), { target: { value: 'segredo' } });

    fireEvent.click(screen.getByText('Finalizar Cadastro'));

    const cloud = await import('../../services/cloud');
    await waitFor(() => {
      expect((cloud as any).registerUserWithType).toHaveBeenCalled();
      const args = (cloud as any).registerUserWithType.mock.calls[0];
      expect(args[0]).toBe('alice@exemplo.com');
      const meta = args[2];
      expect(meta.role).toBe('store_partner');
      expect(meta.store_name).toBe('Loja Teste');
      expect(meta.phone_number).toBe('31999990000');
      expect(meta.cpf).toBe('11122233344');
      expect(meta.store_document).toBe('12345678000199');
      expect(meta.address_zip).toBe('');
    });
  });

  it('cadastra entregador com role correto e sem campos de loja', async () => {
    render(<DialogProvider><AuthWrapper /></DialogProvider>);

    fireEvent.click(await screen.findByText('Quero ser entregador'));

    await waitFor(() => expect(screen.getByText(/Cidade de Atuação/i)).toBeInTheDocument());
    fireEvent.click(await screen.findByText(/Belo Horizonte/i));

    await waitFor(() => expect(screen.getByText(/Cadastro Entregador/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Nome Completo'), { target: { value: 'Bruno Entregador' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bruno@exemplo.com' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '(31) 98888-0000' } });
    fireEvent.change(screen.getByPlaceholderText('CPF (Opcional)'), { target: { value: '555.666.777-88' } });
    fireEvent.change(screen.getByPlaceholderText('Senha (mín. 6 caracteres)'), { target: { value: 'segredo' } });

    const lojaCampos = screen.queryByPlaceholderText('Nome da Loja');
    expect(lojaCampos).toBeNull();

    fireEvent.click(screen.getByText('Finalizar Cadastro'));

    const cloud = await import('../../services/cloud');
    await waitFor(() => {
      expect((cloud as any).registerUserWithType).toHaveBeenCalled();
      const args = (cloud as any).registerUserWithType.mock.calls[0];
      expect(args[0]).toBe('bruno@exemplo.com');
      const meta = args[2];
      expect(meta.role).toBe('delivery_partner');
      expect(meta.store_name).toBeUndefined();
      expect(meta.phone_number).toBe('31988880000');
      expect(meta.cpf).toBe('55566677788');
    });
  });
});
