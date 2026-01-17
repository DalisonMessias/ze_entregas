import axios from 'axios';

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export interface NominatimResponse {
  cidade: string;
  bbox: BoundingBox;
  nominatimData: NominatimResult;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Zé Entregas App - Streets Module (https://ze-entregas.com)';

export class NominatimService {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchCity(cityName: string): Promise<NominatimResponse> {
    try {
      // Adicionar delay para respeitar rate limit (1 request por segundo)
      await this.delay(1000);

      const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: cityName,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          extratags: 1
        },
        headers: {
          'User-Agent': USER_AGENT
        },
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        throw new Error(`Cidade não encontrada: ${cityName}`);
      }

      const result = response.data[0] as NominatimResult;
      const [south, north, west, east] = result.boundingbox;

      return {
        cidade: result.display_name,
        bbox: {
          south: parseFloat(south),
          west: parseFloat(west),
          north: parseFloat(north),
          east: parseFloat(east)
        },
        nominatimData: result
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Timeout ao buscar cidade. Tente novamente.');
        }
        if (error.response?.status === 429) {
          throw new Error('Muitas requisições. Aguarde e tente novamente.');
        }
      }
      throw new Error(`Erro ao buscar cidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}