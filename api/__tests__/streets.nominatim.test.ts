import { describe, test, expect, vi } from 'vitest';
import axios from 'axios';
import { NominatimService } from '../services/nominatimService';

vi.mock('axios');

describe('NominatimService', () => {
  test('parses bounding box and returns display fields', async () => {
    (axios.get as any).mockResolvedValue({ data: [{ display_name: 'City X', boundingbox: ['-3','3','-4','4'], place_id: 2, lat: '0', lon: '0', type: 'city', class: 'place' }] });
    const svc = new NominatimService();
    const res = await svc.searchCity('City X');
    expect(res.cidade).toBe('City X');
    expect(res.bbox.south).toBe(-3);
    expect(res.bbox.north).toBe(3);
    expect(res.bbox.west).toBe(-4);
    expect(res.bbox.east).toBe(4);
  });
});

