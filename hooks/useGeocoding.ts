import { useState } from 'react';
import { getApiKey as fetchGlobalApiKey } from '../services/cloud';

interface GeocodingResult {
    lat: number;
    lng: number;
    display_name: string;
}

interface AddressComponents {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
}

/**
 * Hook customizado para geocoding e reverse geocoding usando OpenRouteService
 * Busca a API key configurada no admin automaticamente
 */
export const useGeocoding = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Busca a API key do OpenRouteService configurada no admin
     */
    const getApiKey = async (): Promise<string | null> => {
        return fetchGlobalApiKey('open_route_service_api_key');
    };

    /**
     * Converte nome da cidade em coordenadas (lat, lng) usando OpenRouteService
     */
    const geocodeCity = async (cityName: string, state?: string): Promise<GeocodingResult | null> => {
        setLoading(true);
        setError(null);

        try {
            const apiKey = await getApiKey();

            if (!apiKey) {
                setError('API key do OpenRouteService não configurada. Configure em Admin > API Keys.');
                return null;
            }

            const query = state ? `${cityName}, ${state}, Brasil` : `${cityName}, Brasil`;
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&boundary.country=BR&size=1`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                setError('Cidade não encontrada');
                return null;
            }

            const feature = data.features[0];
            return {
                lat: feature.geometry.coordinates[1], // OpenRouteService retorna [lng, lat]
                lng: feature.geometry.coordinates[0],
                display_name: feature.properties.label || query
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao buscar coordenadas';
            setError(message);
            console.error('Geocoding error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Converte coordenadas (lat, lng) em endereço usando OpenRouteService
     */
    const reverseGeocode = async (lat: number, lng: number): Promise<AddressComponents | null> => {
        setLoading(true);
        setError(null);

        try {
            const apiKey = await getApiKey();

            if (!apiKey) {
                setError('API key do OpenRouteService não configurada');
                return null;
            }

            const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lon=${lng}&point.lat=${lat}&size=1`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                setError('Endereço não encontrado');
                return null;
            }

            const props = data.features[0].properties;

            return {
                street: props.street || props.name || '',
                neighborhood: props.neighbourhood || props.locality || '',
                city: props.locality || props.county || '',
                state: props.region || props.region_a || '',
                country: props.country || 'Brasil'
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao buscar endereço';
            setError(message);
            console.error('Reverse geocoding error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        geocodeCity,
        reverseGeocode,
        loading,
        error
    };
};
