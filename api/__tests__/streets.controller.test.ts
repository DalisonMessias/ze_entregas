import { describe, test, expect, vi } from 'vitest';
import { StreetsNeighborhoodsController } from '../controllers/streetsNeighborhoodsController';

vi.mock('../services/nominatimService.js', () => {
  return {
    NominatimService: class {
      async searchCity(city: string) {
        return {
          cidade: `Display ${city}`,
          bbox: { south: -1, west: -1, north: 1, east: 1 },
          nominatimData: { place_id: 1, display_name: city, boundingbox: ['-1','1','-1','1'], lat: '0', lon: '0', type: 'city', class: 'place' }
        };
      }
    }
  };
});

vi.mock('../services/overpassService.js', () => {
  return {
    OverpassService: class {
      async getStreetsAndNeighborhoods() {
        return { streets: ['Rua A','Rua B'], neighborhoods: ['Bairro X'] };
      }
    }
  };
});

vi.mock('@supabase/supabase-js', () => {
  return { createClient: () => ({ from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })) })) })) })), }) };
});

describe('StreetsNeighborhoodsController', () => {
  test('returns data using city query param without auth', async () => {
    const controller = new StreetsNeighborhoodsController('http://local', 'key');
    const req: any = { query: { city: 'Fortaleza' } };
    const res: any = { statusCode: 200, json: vi.fn(), status: vi.fn(function(this: any, code: number){ this.statusCode = code; return this; }) };
    await controller.getStreetsAndNeighborhoods(req, res);
    expect(res.statusCode).toBe(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.cidade).toContain('Display');
    expect(Array.isArray(payload.ruas)).toBe(true);
    expect(Array.isArray(payload.bairros)).toBe(true);
    expect(payload.error).toBeNull();
  });
});

