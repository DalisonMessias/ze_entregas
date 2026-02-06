import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
