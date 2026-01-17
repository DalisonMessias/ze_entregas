import { createClient } from '@supabase/supabase-js';
import { StreetsAndNeighborhoods } from './overpassService.js';

export interface StreetsCache {
  id: string;
  city_display_name: string;
  streets_list: string[];
  neighborhoods_list: string[];
  metadata: any;
  fetched_at: string;
  expires_at: string;
}

export interface CacheMetadata {
  nominatim: {
    query: string;
    result_count: number;
  };
  overpass: {
    query_summary: string;
    elements_returned: number;
  };
}

export class StreetsCacheService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getCachedData(cityDisplayName: string): Promise<StreetsCache | null> {
    try {
      const { data, error } = await this.supabase
        .from('streets_cache')
        .select('*')
        .eq('city_display_name', cityDisplayName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        throw error;
      }

      // Verificar se o cache expirou
      if (data && new Date(data.expires_at) < new Date()) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  async saveCache(
    cityDisplayName: string,
    streets: string[],
    neighborhoods: string[],
    metadata: CacheMetadata
  ): Promise<void> {
    try {
      if (!cityDisplayName || cityDisplayName.trim().length === 0) {
        console.warn('Skip cache save: empty city_display_name')
        return
      }
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      const { error } = await this.supabase
        .from('streets_cache')
        .upsert({
          city_display_name: cityDisplayName,
          streets_list: streets,
          neighborhoods_list: neighborhoods,
          metadata: metadata,
          fetched_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'city_display_name'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }

  async getUserProfileCity(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('city')
        .eq('id', userId)
        .single()

      if (error) {
        if ((error as any).code === 'PGRST116') return null
        throw error
      }

      return (data?.city as string) || null
    } catch (e) {
      return null
    }
  }
}
