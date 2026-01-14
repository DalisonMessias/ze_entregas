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

        // Verificar cache
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

            // Step 1: Get city info from Nominatim
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(city)}`;
            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'ZeEntregas-App/1.0' }
            });

            if (!nominatimRes.ok) throw new Error('Falha ao buscar cidade');
            const nominatimData = await nominatimRes.json();

            if (!nominatimData || nominatimData.length === 0) {
                throw new Error('Cidade não encontrada');
            }

            const cityInfo = nominatimData[0];
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

            if (!overpassRes.ok) throw new Error('Falha ao buscar ruas');
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

            // Salvar no cache
            streetsCache[city] = { ruas, bairros: [] };

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
