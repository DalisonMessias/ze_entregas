import { Request, Response } from 'express';
import { NominatimService } from '../services/nominatimService.js';
import { OverpassService } from '../services/overpassService.js';
import { StreetsCacheService } from '../services/streetsCacheService.js';

export interface StreetsNeighborhoodsResponse {
  cidade: string;
  bbox: { south: number; west: number; north: number; east: number };
  ruas: string[];
  bairros: string[];
  contagens: { ruas: number; bairros: number };
  meta: {
    nominatim: {
      query: string;
      result_count: number;
    };
    overpass: {
      query_summary: string;
      elements_returned: number;
    };
  };
  fetchedAt: string;
  source: string;
  error: string | null;
}

export class StreetsNeighborhoodsController {
  private nominatimService: NominatimService;
  private overpassService: OverpassService;
  private cacheService: StreetsCacheService;

  constructor() {
    this.nominatimService = new NominatimService();
    this.overpassService = new OverpassService();
    this.cacheService = new StreetsCacheService();
  }

  async getStreetsAndNeighborhoods(req: Request, res: Response): Promise<void> {
    try {
      // Param city tem prioridade; se informado, permite acesso sem autenticação
      const overrideCity = typeof req.query.city === 'string' ? req.query.city : null;
      const userId = (req as any).user?.id;
      const profileCity = overrideCity || (userId ? await this.cacheService.getUserProfileCity(userId) : null);
      if (!profileCity) {
        res.status(422).json({
          cidade: '',
          bbox: { south: 0, west: 0, north: 0, east: 0 },
          ruas: [],
          bairros: [],
          contagens: { ruas: 0, bairros: 0 },
          meta: { nominatim: { query: '', result_count: 0 }, overpass: { query_summary: '', elements_returned: 0 } },
          fetchedAt: new Date().toISOString(),
          source: 'OpenStreetMap (Nominatim + Overpass)',
          error: 'Cidade do usuário não definida'
        } as StreetsNeighborhoodsResponse)
        return
      }
      const userCity = await this.nominatimService.searchCity(profileCity)

      // userCity sempre definido aqui após searchCity

      // Verificar cache primeiro
      const cachedData = await this.cacheService.getCachedData(userCity.cidade);
      if (cachedData) {
        res.json({
          cidade: userCity.cidade,
          bbox: userCity.bbox,
          ruas: cachedData.streets_list,
          bairros: cachedData.neighborhoods_list,
          contagens: {
            ruas: cachedData.streets_list.length,
            bairros: cachedData.neighborhoods_list.length
          },
          meta: cachedData.metadata,
          fetchedAt: cachedData.fetched_at,
          source: 'OpenStreetMap (Nominatim + Overpass)',
          error: null
        } as StreetsNeighborhoodsResponse);
        return;
      }

      // Definir dados da cidade diretamente da busca Nominatim
      const cityData = userCity

      // Buscar ruas e bairros na Overpass
      const streetsData = await this.overpassService.getStreetsAndNeighborhoods(cityData.bbox);

      // Criar metadados
      const metadata = {
        nominatim: {
          query: profileCity,
          result_count: cityData.nominatimData ? 1 : 0
        },
        overpass: {
          query_summary: 'highway with name + place tags',
          elements_returned: streetsData.streets.length + streetsData.neighborhoods.length
        }
      };

      // Salvar no cache
      await this.cacheService.saveCache(
        cityData.cidade,
        streetsData.streets,
        streetsData.neighborhoods,
        metadata
      );

      // Retornar resposta
      res.json({
        cidade: cityData.cidade,
        bbox: cityData.bbox,
        ruas: streetsData.streets,
        bairros: streetsData.neighborhoods,
        contagens: {
          ruas: streetsData.streets.length,
          bairros: streetsData.neighborhoods.length
        },
        meta: metadata,
        fetchedAt: new Date().toISOString(),
        source: 'OpenStreetMap (Nominatim + Overpass)',
        error: null
      } as StreetsNeighborhoodsResponse);

    } catch (error) {
      console.error('Erro em getStreetsAndNeighborhoods:', error);

      res.status(500).json({
        cidade: '',
        bbox: { south: 0, west: 0, north: 0, east: 0 },
        ruas: [],
        bairros: [],
        contagens: { ruas: 0, bairros: 0 },
        meta: {
          nominatim: { query: '', result_count: 0 },
          overpass: { query_summary: '', elements_returned: 0 }
        },
        fetchedAt: new Date().toISOString(),
        source: 'OpenStreetMap (Nominatim + Overpass)',
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      } as StreetsNeighborhoodsResponse);
    }
  }
}
