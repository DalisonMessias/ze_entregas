import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteOptimizer from '../RouteOptimizer';
import * as cloud from '../../services/cloud';
import * as dialog from '../../utils/dialogService';

// Mocking cloud services
vi.mock('../../services/cloud', () => ({
  getShopSettings: vi.fn(),
  saveRoute: vi.fn(),
}));

// Mocking dialog service
vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    prompt: vi.fn(),
    alert: vi.fn(),
  }),
}));

// Mocking fetch
global.fetch = vi.fn() as any;

describe('RouteOptimizer', () => {
  const mockCloud = cloud as any;
  const mockDialog = dialog as any;
  const mockFetch = fetch as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloud.getShopSettings.mockResolvedValue({ open_route_service_api_key: 'test-key' });
    mockFetch.mockClear();
  });

  it('should render the component', async () => {
    render(<RouteOptimizer />);
    await waitFor(() => {
      expect(screen.getByText('Otimizador de Rotas Inteligente')).toBeInTheDocument();
    });
  });

  it('should show an error if API key is not configured', async () => {
    mockCloud.getShopSettings.mockResolvedValueOnce({ open_route_service_api_key: null });
    render(<RouteOptimizer />);
    await waitFor(() => {
      expect(screen.getByText(/A chave da API de roteamento não está configurada/)).toBeInTheDocument();
    });
  });

  it('should optimize a route and display metrics', async () => {
    // Mock geocoding
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ lat: '10', lon: '20' }]),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ lat: '11', lon: '21' }]),
      });

    // Mock optimization
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
            routes: [{
                summary: { distance: 10000, duration: 3600 },
                steps: [{ type: 'job', id: 0 }]
            }]
        }),
    });

    render(<RouteOptimizer />);
    
    await waitFor(() => expect(mockCloud.getShopSettings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/Endereço de Partida/), { target: { value: 'Start Address' } });
    fireEvent.change(screen.getAllByPlaceholderText('Parada 1')[0], { target: { value: 'Stop 1' } });
    fireEvent.click(screen.getAllByText('Otimizar Rota')[0]);

    await waitFor(() => {
      expect(screen.getByText('10.00 km')).toBeInTheDocument();
      expect(screen.getByText('1h 0min')).toBeInTheDocument();
    });
  });
  
  it('should handle navigation button click', async () => {
    // Mock geocoding for optimization
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve([{ lat: '10', lon: '20' }]) })
      .mockResolvedValueOnce({ json: () => Promise.resolve([{ lat: '11', lon: '21' }]) });

    // Mock optimization
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
            routes: [{
                summary: { distance: 10000, duration: 3600 },
                steps: [{ type: 'job', id: 0 }]
            }]
        }),
    });
    
    // Mock geocoding for navigation
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve([{ lat: '11', lon: '21' }]) });

    window.open = vi.fn() as any;

    render(<RouteOptimizer />);
    
    await waitFor(() => expect(mockCloud.getShopSettings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/Endereço de Partida/), { target: { value: 'Start Address' } });
    fireEvent.change(screen.getAllByPlaceholderText('Parada 1')[0], { target: { value: 'Stop 1' } });
    fireEvent.click(screen.getAllByText('Otimizar Rota')[0]);

    await waitFor(() => {
        fireEvent.click(screen.getByText('Navegar'));
    });
    
    await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=11,21', '_blank', 'noopener,noreferrer');
    });

  });

  it('should handle saving a route', async () => {
    const mockPrompt = vi.fn().mockResolvedValue('My Saved Route');
    (dialog as any).useDialog = vi.fn(() => ({ prompt: mockPrompt, alert: vi.fn() }));
    
    mockCloud.saveRoute.mockResolvedValue('some-route-id');
    
    // Mock geocoding for optimization
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve([{ lat: '10', lon: '20' }]) })
      .mockResolvedValueOnce({ json: () => Promise.resolve([{ lat: '11', lon: '21' }]) });

    // Mock optimization
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
            routes: [{
                summary: { distance: 10000, duration: 3600 },
                steps: [{ type: 'job', id: 0 }]
            }]
        }),
    });

    render(<RouteOptimizer />);
    
    await waitFor(() => expect(mockCloud.getShopSettings).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/Endereço de Partida/), { target: { value: 'Start Address' } });
    fireEvent.change(screen.getAllByPlaceholderText('Parada 1')[0], { target: { value: 'Stop 1' } });
    fireEvent.click(screen.getAllByText('Otimizar Rota')[0]);

    await waitFor(() => {
        fireEvent.click(screen.getByText('Salvar Rota'));
    });

    await waitFor(() => {
        expect(mockPrompt).toHaveBeenCalled();
        expect(mockCloud.saveRoute).toHaveBeenCalledWith('My Saved Route', expect.any(Array), 10000, 3600);
    });
  });

});
