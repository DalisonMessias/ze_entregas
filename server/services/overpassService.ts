import axios from 'axios';

export interface OverpassStreet {
  type: 'way';
  id: number;
  tags: {
    name: string;
    highway: string;
  };
}

export interface OverpassNeighborhood {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags: {
    name: string;
    place?: string;
    admin_level?: string;
  };
}

export interface OverpassResponse {
  elements: (OverpassStreet | OverpassNeighborhood)[];
}

export interface StreetsAndNeighborhoods {
  streets: string[];
  neighborhoods: string[];
}

const OVERPASS_BASE_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'Zé Entregas App - Streets Module (https://ze-entregas.com)';

export class OverpassService {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isValidName(name: string): boolean {
    if (!name || name.trim().length === 0) return false;
    if (/^\d+$/.test(name.trim())) return false; // Apenas números
    if (name.trim().length < 2) return false; // Muito curto
    return true;
  }

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  async getStreetsAndNeighborhoods(bbox: { south: number; west: number; north: number; east: number }): Promise<StreetsAndNeighborhoods> {
    try {
      // Delay para respeitar rate limit (aproximadamente 1 request por segundo)
      await this.delay(1000);

      const overpassQuery = `
        [out:json][timeout:60];
        (
          // Ruas com nomes
          way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          
          // Bairros e regiões
          node["place"~"^(suburb|neighbourhood|quarter|hamlet)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          way["place"~"^(suburb|neighbourhood|quarter|hamlet)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          relation["place"~"^(suburb|neighbourhood|quarter|hamlet)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          
          // Administração local (níveis 9-10)
          relation["admin_level"~"^[910]$"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        );
        out body qt;
      `;

      const response = await axios.post(OVERPASS_BASE_URL, overpassQuery, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': USER_AGENT
        },
        timeout: 60000 // 60 segundos para queries complexas
      });

      const data = response.data as OverpassResponse;

      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Resposta inválida da Overpass API');
      }

      const streets: Set<string> = new Set();
      const neighborhoods: Set<string> = new Set();

      data.elements.forEach(element => {
        const tags = element.tags as any;
        if (tags && tags.name && this.isValidName(tags.name)) {
          const normalizedName = this.normalizeName(tags.name);

          if (element.type === 'way' && tags.highway) {
            // É uma rua
            streets.add(normalizedName);
          } else if (tags.place || tags.admin_level) {
            // É um bairro/região
            neighborhoods.add(normalizedName);
          }
        }
      });

      return {
        streets: Array.from(streets).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        neighborhoods: Array.from(neighborhoods).sort((a, b) => a.localeCompare(b, 'pt-BR'))
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Timeout ao buscar dados. A área pode ser muito grande.');
        }
        if (error.response?.status === 429) {
          throw new Error('Muitas requisições. Aguarde e tente novamente.');
        }
        if (error.response?.status === 504) {
          throw new Error('Overpass API sobrecarregada. Tente novamente em alguns minutos.');
        }
      }
      throw new Error(`Erro ao buscar ruas e bairros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}