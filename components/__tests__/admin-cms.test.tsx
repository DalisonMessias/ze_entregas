import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import * as cloud from '../../services/cloud';
import { AdminInstitutionalContent } from '../AdminInstitutionalContent';
import { FaqPage } from '../FaqPage';

describe('AdminInstitutionalContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('cria novo conteúdo com validação básica', async () => {
    vi.spyOn(cloud, 'adminListInstitutionalCategories').mockResolvedValue([]);
    vi.spyOn(cloud, 'adminListInstitutionalTags').mockResolvedValue([]);
    vi.spyOn(cloud, 'adminListInstitutionalContents').mockResolvedValue([]);
    const createSpy = vi.spyOn(cloud, 'adminCreateInstitutionalContent').mockResolvedValue({ id: '1', page_key: 'faq', title: 'T1', slug: 't1', status: 'draft', is_active: true } as any);
    render(<AdminInstitutionalContent />);
    await screen.findByText('Novo conteúdo');
    fireEvent.click(screen.getByText('Novo conteúdo'));
    const inputTitle = await screen.findByPlaceholderText('Título');
    fireEvent.change(inputTitle, { target: { value: 'T1' } });
    const inputSlug = await screen.findByPlaceholderText('slug-exemplo');
    fireEvent.change(inputSlug, { target: { value: 't1' } });
    fireEvent.click(screen.getByText('Criar'));
    await waitFor(() => expect(createSpy).toHaveBeenCalled());
  });
});

describe('FaqPage', () => {
  afterEach(() => {
    cleanup();
  });
  it('renderiza conteúdo dinâmico', async () => {
    vi.spyOn(cloud, 'getInstitutionalPublic').mockResolvedValue([{ id: '1', page_key: 'faq', title: 'Pergunta', description: 'Resposta', status: 'published', is_active: true }] as any);
    vi.spyOn(cloud, 'subscribeInstitutionalChanges').mockReturnValue({ unsubscribe: vi.fn() } as any);
    render(<FaqPage />);
    expect(await screen.findByText('Perguntas Frequentes')).toBeTruthy();
    expect(await screen.findByText('Pergunta')).toBeTruthy();
    expect(await screen.findByText('Resposta')).toBeTruthy();
  });
});
