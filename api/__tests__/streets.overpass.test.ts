import { describe, test, expect, vi } from 'vitest';
import axios from 'axios';
import { OverpassService } from '../services/overpassService';

vi.mock('axios');

describe('OverpassService', () => {
  test('filters and normalizes names', async () => {
    (axios.post as any).mockResolvedValue({ data: { elements: [
      { type: 'way', id: 1, tags: { name: '  Rua  A  ', highway: 'residential' } },
      { type: 'node', id: 2, tags: { name: 'Bairro 1', place: 'neighbourhood' } },
      { type: 'way', id: 3, tags: { name: '', highway: 'residential' } },
      { type: 'way', id: 4, tags: { name: '12345', highway: 'residential' } }
    ] } });
    const svc = new OverpassService();
    const res = await svc.getStreetsAndNeighborhoods({ south: -1, west: -1, north: 1, east: 1 });
    expect(res.streets).toContain('Rua A');
    expect(res.neighborhoods).toContain('Bairro 1');
    expect(res.streets.find(s => s === '' || /^\d+$/.test(s))).toBeUndefined();
  });
});

