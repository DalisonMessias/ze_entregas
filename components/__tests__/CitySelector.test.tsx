import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CitySelector } from '../CitySelector';
import { DialogProvider } from '../../utils/dialogService';
import * as cloud from '../../services/cloud';

describe('CitySelector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('carrega cidades no mount e permite seleção', async () => {
    vi.spyOn(cloud, 'getAvailableCities').mockResolvedValue([
      { id: '1', name: 'Belo Horizonte', state: 'MG', is_active: true },
      { id: '2', name: 'Contagem', state: 'MG', is_active: true }
    ] as any);
    const onSelect = vi.fn();
    render(<DialogProvider><CitySelector onSelect={onSelect} /></DialogProvider>);
    await waitFor(() => expect(screen.getByText(/Belo Horizonte/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Belo Horizonte/i));
    expect(onSelect).toHaveBeenCalledWith('Belo Horizonte', 'MG');
  });

  it('exibe mensagem quando tabela está vazia', async () => {
    vi.spyOn(cloud, 'getAvailableCities').mockResolvedValue([] as any);
    render(<DialogProvider><CitySelector onSelect={() => {}} /></DialogProvider>);
    await waitFor(() => expect(screen.getByText('Cidade não encontrada.')).toBeInTheDocument());
    expect(screen.getByText('Solicitar inclusão')).toBeInTheDocument();
  });

  it('trata erro na requisição e permite tentar novamente', async () => {
    const spy = vi.spyOn(cloud, 'getAvailableCities');
    spy.mockRejectedValueOnce(new Error('Network error'));
    spy.mockResolvedValueOnce([{ id: '3', name: 'São Paulo', state: 'SP', is_active: true }] as any);
    render(<DialogProvider><CitySelector onSelect={() => {}} /></DialogProvider>);
    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Tentar novamente'));
    await waitFor(() => expect(screen.getByText(/São Paulo/i)).toBeInTheDocument());
  });
});
