import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AssistantResources } from '../assistant/AssistantResources';

describe('AssistantResources', () => {
  it('exibe recursos de admin', () => {
    render(<AssistantResources userRole="admin" />);
    expect(screen.getByText(/Relat/i)).toBeInTheDocument();
    expect(screen.getByText(/Alertas/i)).toBeInTheDocument();
  });

  it('exibe recursos da cozinha para colaborador', () => {
    render(<AssistantResources userRole="collaborator" collaboratorFunction="kitchen" />);
    expect(screen.getByText(/Fila de preparo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Novo pedido/i)).not.toBeInTheDocument();
  });

  it('exibe recursos do atendimento para colaborador', () => {
    render(<AssistantResources userRole="collaborator" collaboratorFunction="waiter" />);
    expect(screen.getByText(/Novo pedido/i)).toBeInTheDocument();
  });

  it('inicia fechado e expande apenas um recurso por vez', () => {
    render(<AssistantResources userRole="store_partner" />);

    expect(screen.queryByText(/Confira fila e priorize/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Atualize produtos/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pedidos pendentes/i }));
    expect(screen.getByText(/Confira fila e priorize/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Catálogo & preços/i }));
    expect(screen.queryByText(/Confira fila e priorize/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Atualize produtos/i)).toBeInTheDocument();
  });
});
