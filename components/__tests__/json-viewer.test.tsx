import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DialogProvider } from '../../utils/dialogService';
import { JsonViewer } from '../assistant/JsonViewer';


describe('JsonViewer', () => {
  it('renderiza viewer para JSON valido', () => {
    render(
      <DialogProvider>
        <JsonViewer jsonText='{"id": 1, "status": "ok"}' />
      </DialogProvider>
    );

    expect(screen.getByText('JSON Viewer')).toBeInTheDocument();
    expect(screen.getByText('Visual')).toBeInTheDocument();
    expect(screen.getByText(/C[oó]d/i)).toBeInTheDocument();
  });

  it('exibe fallback para JSON invalido', () => {
    render(
      <DialogProvider>
        <JsonViewer jsonText='{"id":' />
      </DialogProvider>
    );

    expect(screen.getByText(/JSON inv/i)).toBeInTheDocument();
  });
});
