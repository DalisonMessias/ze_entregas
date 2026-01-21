import { useState } from 'react';

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
 * Hook customizado para geocoding e reverse geocoding usando Nominatim (OpenStreetMap)
 */
export const useGeocoding = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Converte nome da cidade em coordenadas (lat, lng)
     */
    const geocodeCity = async (cityName: string, state?: string): Promise<GeocodingResult | null> => {
        setLoading(true);
        setError(null);

        try {
            const query = state ? `${cityName}, ${state}, Brasil` : `${cityName}, Brasil`;
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ZeEntregas/1.0'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar coordenadas');
            }

            const data = await response.json();

            if (data.length === 0) {
                setError('Cidade não encontrada');
                return null;
            }

            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                display_name: result.display_name
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(message);
            console.error('Geocoding error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Converte coordenadas (lat, lng) em endereço
     */
    const reverseGeocode = async (lat: number, lng: number): Promise<AddressComponents | null> => {
        setLoading(true);
        setError(null);

        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ZeEntregas/1.0'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar endereço');
            }

            const data = await response.json();

            if (!data.address) {
                setError('Endereço não encontrado');
                return null;
            }

            const addr = data.address;

            return {
                street: addr.road || addr.street || addr.pedestrian || '',
                neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || '',
                city: addr.city || addr.town || addr.village || addr.municipality || '',
                state: addr.state || '',
                country: addr.country || ''
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
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
