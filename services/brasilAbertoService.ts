
import { getClient } from './cloud';
import { City, CityRequest } from '../types';
import { BrasilAbertoResponse, BrasilAbertoDistrict, CityDistrict } from '../types/brasilAberto';

const API_BASE_URL = 'https://api.brasilaberto.com/v1';

const STATES_MAP: Record<string, string> = {
    'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amapá': 'AP', 'amazonas': 'AM',
    'bahia': 'BA', 'ceara': 'CE', 'ceará': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', 'espírito santo': 'ES',
    'goias': 'GO', 'goiás': 'GO', 'maranhao': 'MA', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
    'minas gerais': 'MG', 'para': 'PA', 'pará': 'PA', 'paraiba': 'PB', 'paraíba': 'PB', 'parana': 'PR', 'paraná': 'PR',
    'pernambuco': 'PE', 'piaui': 'PI', 'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
    'rio grande do sul': 'RS', 'rondonia': 'RO', 'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
    'sao paulo': 'SP', 'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO'
};

function getStateSigla(input: string): string {
    if (!input) return '';
    const cleaned = input.trim();
    if (cleaned.length === 2) return cleaned.toUpperCase();

    const normalized = cleaned.toLowerCase();
    return STATES_MAP[normalized] || cleaned.slice(0, 2).toUpperCase();
}

export const brasilAbertoService = {
    async getApiKey(): Promise<string | null> {
        const sb = getClient();
        if (!sb) return null;

        try {
            const { data, error } = await sb
                .from('api_keys')
                .select('key_token')
                .eq('service_name', 'brasil_aberto')
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching API Key:', error);
                return null;
            }

            if (data) {
                console.log('API Key retrieved successfully.');
                return data.key_token;
            }

            console.log('No API Key found for brasil_aberto.');
            return null;
        } catch (err) {
            console.error('Unexpected error in getApiKey:', err);
            return null;
        }
    },

    async saveApiKey(key: string): Promise<void> {
        const sb = getClient();
        if (!sb) return;

        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Check if key exists
        const { data: existing } = await sb
            .from('api_keys')
            .select('id')
            .eq('service_name', 'brasil_aberto')
            .single();

        if (existing) {
            // Update
            const { error } = await sb
                .from('api_keys')
                .update({
                    key_token: key,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) throw new Error('Falha ao atualizar API Key: ' + error.message);
        } else {
            // Insert
            const { error } = await sb
                .from('api_keys')
                .insert({
                    service_name: 'brasil_aberto',
                    key_token: key,
                    encrypted_key: 'encrypted_placeholder',
                    name: 'Brasil Aberto API',
                    user_id: user.id,
                    is_active: true
                });

            if (error) throw new Error('Falha ao criar API Key: ' + error.message);
        }
    },

    async fetchExternalCityId(state: string, cityName: string, apiKey: string): Promise<number | null> {
        try {
            const uf = getStateSigla(state);
            const url = `${API_BASE_URL}/cities/${uf}`;
            console.log(`[BrasilAberto] Fetching city ID for ${cityName} (Original State: ${state} -> UF: ${uf}) from: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                const text = await response.text();
                // Se der 500, pode ser estado invalido mesmo após mapping, ou erro interno da API
                console.error(`[BrasilAberto] Erro na API (Status ${response.status}):`, text);
                return null;
            }

            const data: BrasilAbertoResponse<{ id: number, name: string }[]> = await response.json();

            // Normalizar nomes para comparação (remover acentos, minúsculas)
            const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

            // Remove state suffix if present (e.g. " - MG" or "-MG")
            // A regex busca por um traço seguido opcionalmente de espaço e a sigla do estado no final
            const stateSuffixRegex = new RegExp(`\\s*-\\s*${state}$`, 'i');
            const cleanCityName = cityName.replace(stateSuffixRegex, '').trim();

            const target = normalize(cleanCityName);

            console.log(`[BrasilAberto] Comparando: "${cleanCityName}" (normalizado: "${target}") com lista da API...`);

            const city = data.result.find(c => normalize(c.name) === target);
            return city ? city.id : null;
        } catch (error) {
            console.error('Exceção ao buscar ID da cidade:', error);
            return null;
        }
    },

    async fetchDistricts(externalCityId: number, apiKey: string): Promise<BrasilAbertoDistrict[]> {
        try {
            // Paginação pode ser necessária, mas vamos tentar pegar um limit alto inicialmente ou iterar
            // Documentação diz "lista paginada". Vamos pedir limit=1000 para tentar pegar tudo.
            const response = await fetch(`${API_BASE_URL}/districts/${externalCityId}?limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro na API Brasil Aberto: ${response.statusText}`);
            }

            const data: BrasilAbertoResponse<{ id: number, name: string }[]> = await response.json();
            return data.result;
        } catch (error) {
            console.error('Erro ao buscar bairros:', error);
            throw error;
        }
    },

    async fetchDistrictsByIbge(ibgeCode: string, apiKey: string): Promise<BrasilAbertoDistrict[]> {
        // Remove non-numeric chars just in case
        const cleanCode = ibgeCode.replace(/\D/g, '');
        if (!cleanCode) throw new Error('Código IBGE inválido.');

        const url = `${API_BASE_URL}/districts-by-ibge-code/${cleanCode}`;
        console.log(`[BrasilAberto] Fetching districts by IBGE: ${cleanCode}`);

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Erro API (IBGE): ${response.statusText} - ${text}`);
            }

            const data: BrasilAbertoResponse<{ id: number, name: string }[]> = await response.json();
            return data.result;
        } catch (error) {
            console.error('Erro ao buscar bairros por IBGE:', error);
            throw error;
        }
    },

    async importDistricts(cityId: string, cityState: string, cityName: string, manualIbgeCode?: string): Promise<{ success: boolean, count: number, message?: string }> {
        const sb = getClient();
        if (!sb) return { success: false, count: 0, message: 'Supabase client not initialized' };

        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                return { success: false, count: 0, message: 'API Key não configurada.' };
            }

            let districtsSrc: BrasilAbertoDistrict[] = [];

            if (manualIbgeCode && manualIbgeCode.trim().length >= 7) {
                // Use IBGE flow
                console.log(`Usando fluxo direto por IBGE: ${manualIbgeCode}`);
                districtsSrc = await this.fetchDistrictsByIbge(manualIbgeCode, apiKey);
            } else {
                // Use standard Name/State flow
                const externalId = await this.fetchExternalCityId(cityState, cityName, apiKey);
                if (!externalId) {
                    return { success: false, count: 0, message: `Cidade não encontrada na API: ${cityName}-${cityState}` };
                }
                const districtsFromApi = await this.fetchDistricts(externalId, apiKey);
                districtsSrc = districtsFromApi;
            }

            if (!districtsSrc || districtsSrc.length === 0) {
                return { success: true, count: 0, message: 'Nenhum bairro encontrado na API.' };
            }

            // ... save to DB logic ...
            const districtsToInsert = districtsSrc.map(d => ({
                city_id: cityId,
                name: d.name,
                api_external_id: d.id,
                active: true
            }));

            // Using upsert with ignoreDuplicates: false (default) updates if conflict
            // But we need to be careful with conflict constraint. Assuming (city_id, name) or similar?
            // The supabase_global.sql usually sets constraints. Let's assume (city_id, name) or (city_id, api_external_id)
            // Let's use name as key for simplicity if external_id changes or is not unique globally?
            // Safer to insert loop or upsert. Let's try upsert.

            // Note: The previous code was not shown, assuming standard upsert.
            const { error } = await sb
                .from('neighborhoods')
                .upsert(districtsToInsert, { onConflict: 'city_id, name', ignoreDuplicates: true });

            if (error) {
                // Try individual inserts if bulk fails or just throw
                console.error('Erro ao salvar bairros:', error);
                throw new Error('Erro ao salvar no banco: ' + error.message);
            }

            return { success: true, count: districtsSrc.length };

        } catch (error: any) {
            console.error('Erro na importação de bairros:', error);
            return { success: false, count: 0, message: error.message };
        }
    },

    async getStoredDistricts(cityId: string): Promise<CityDistrict[]> {
        const sb = getClient();
        if (!sb) return [];

        const { data, error } = await sb
            .from('city_districts')
            .select('*')
            .eq('city_id', cityId)
            .order('name');

        if (error) {
            console.error('Erro ao listar bairros salvos:', error);
            return [];
        }
        return data as CityDistrict[];
    }
};
