import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StructuredResponse } from '../assistant/StructuredResponse';

vi.mock('../assistant/JsonViewer', () => ({
  JsonViewer: ({ jsonText }: { jsonText: string }) => (
    <div data-testid="json-viewer">{jsonText}</div>
  )
}));

const renderText = (text: string) => <span>{text}</span>;

describe('StructuredResponse', () => {
  it('oculta detalhes por padrao e alterna ao clicar', () => {
    render(
      <StructuredResponse
        text="RESUMO: ok\nDETALHES: detalhe aqui"
        renderText={renderText}
      />
    );

    expect(screen.getByText('Ver detalhes')).toBeInTheDocument();
    expect(screen.queryByText('detalhe aqui')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Ver detalhes'));
    expect(screen.getByText('detalhe aqui')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ocultar detalhes'));
    expect(screen.queryByText('detalhe aqui')).not.toBeInTheDocument();
  });

  it('renderiza JSON quando presente em bloco', async () => {
    const jsonBlock = '```json\n{"ok": true}\n```';
    render(
      <StructuredResponse
        text={`RESUMO: ${jsonBlock}`}
        renderText={renderText}
      />
    );

    const viewer = await screen.findByTestId('json-viewer');
    expect(viewer).toHaveTextContent('{"ok": true}');
  });
});
