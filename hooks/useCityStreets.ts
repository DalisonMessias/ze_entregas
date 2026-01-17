import { useState, useEffect, useCallback } from 'react';

interface CityStreetsData {
    ruas: string[];
    bairros: string[];
    loading: boolean;
    error: string | null;
}

// Cache simples em memória para evitar chamadas repetidas na mesma sessão
const streetsCache: Record<string, { ruas: string[], bairros: string[] }> = {};

export function useCityStreets(city: string) {
    const [data, setData] = useState<CityStreetsData>({
        ruas: [],
        bairros: [],
        loading: false,
        error: null
    });

    const fetchStreets = useCallback(async () => {
        if (!city) return;

        // Check localStorage cache first
        const cacheKey = `streets_cache_${city}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Optional: Check expiration (e.g. 7 days). For now, simple cache.
                setData({
                    ruas: parsed.ruas || [],
                    bairros: parsed.bairros || [],
                    loading: false,
                    error: null
                });
                return;
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        // Check in-memory cache (fallback)
        if (streetsCache[city]) {
            setData({
                ruas: streetsCache[city].ruas,
                bairros: streetsCache[city].bairros,
                loading: false,
                error: null
            });
            return;
        }

        setData(prev => ({ ...prev, loading: true, error: null }));

        try {
            console.log('[useCityStreets] Fetching data for city:', city);
            const searchTarget = city.includes('Brazil') ? city : `${city}, Brazil`;

            // Step 1: Get city info from Nominatim
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(searchTarget)}`;
            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'ZeEntregas-App/1.0' }
            });

            if (!nominatimRes.ok) throw new Error(`Falha ao buscar cidade (Status: ${nominatimRes.status})`);
            const nominatimData = await nominatimRes.json();

            if (!nominatimData || nominatimData.length === 0) {
                console.warn('[useCityStreets] City not found by Nominatim:', searchTarget);
                throw new Error('Cidade não encontrada para busca de ruas');
            }

            const cityInfo = nominatimData[0];
            console.log('[useCityStreets] City info found:', cityInfo.display_name);

            const bbox = {
                south: parseFloat(cityInfo.boundingbox[0]),
                north: parseFloat(cityInfo.boundingbox[1]),
                west: parseFloat(cityInfo.boundingbox[2]),
                east: parseFloat(cityInfo.boundingbox[3])
            };

            // Step 2: Get streets from Overpass
            const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out tags;`;

            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(overpassQuery)
            });

            if (!overpassRes.ok) throw new Error(`Falha ao buscar ruas (Status: ${overpassRes.status})`);
            const overpassData = await overpassRes.json();

            // Extract unique street names
            const ruasSet = new Set<string>();
            if (overpassData.elements) {
                for (const elem of overpassData.elements) {
                    if (elem.tags?.name) {
                        ruasSet.add(elem.tags.name);
                    }
                }
            }

            const ruas = Array.from(ruasSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            console.log(`[useCityStreets] Found ${ruas.length} streets for ${city}`);

            // Salvar no cache APENAS se houver resultados
            if (ruas.length > 0) {
                streetsCache[city] = { ruas, bairros: [] };
                try {
                    localStorage.setItem(`streets_cache_${city}`, JSON.stringify({ ruas, bairros: [] }));
                } catch (e) {
                    console.warn('Falha ao salvar cache de ruas:', e);
                }
            }

            setData({
                ruas,
                bairros: [],
                loading: false,
                error: null
            });

        } catch (err: any) {
            console.error('[useCityStreets] Error:', err);
            setData(prev => ({ ...prev, loading: false, error: err.message || 'Erro ao carregar ruas' }));
        }
    }, [city]);

    useEffect(() => {
        fetchStreets();
    }, [fetchStreets]);

    return { ...data, reload: fetchStreets };
}
