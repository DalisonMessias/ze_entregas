import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Copy, Link2, Loader2, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { useGeocoding } from '../../hooks/useGeocoding';
import { getClient } from '../../services/cloud';

// Declaração de tipos para Leaflet (já carregado via CDN)
declare const L: any;

interface Coordinates {
    lat: number;
    lng: number;
}

export const MapaLocalizacao: React.FC = () => {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [address, setAddress] = useState<string>('');
    const [userCity, setUserCity] = useState<string>('');
    const [copied, setCopied] = useState<'coords' | 'link' | null>(null);
    const [initializing, setInitializing] = useState(true);

    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const { geocodeCity, reverseGeocode, loading, error } = useGeocoding();

    // Inicializar: buscar cidade do usuário e centralizar mapa
    useEffect(() => {
        const initializeMap = async () => {
            try {
                // Buscar dados do usuário
                const supabase = getClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setUserCity('São Paulo, SP');
                    await setupMap('São Paulo', 'SP');
                    return;
                }

                // Buscar cidade do perfil do usuário
                const { data: profile } = await supabase
                    .from('users')
                    .select('city')
                    .eq('id', user.id)
                    .single();

                if (profile?.city) {
                    setUserCity(profile.city);
                    // Extrair cidade e estado do formato "Cidade - UF"
                    const parts = profile.city.split(' - ');
                    const cityName = parts[0];
                    const state = parts[1] || '';
                    await setupMap(cityName, state);
                } else {
                    setUserCity('São Paulo, SP');
                    await setupMap('São Paulo', 'SP');
                }
            } catch (err) {
                console.error('Erro ao inicializar mapa:', err);
                setUserCity('São Paulo, SP');
                await setupMap('São Paulo', 'SP');
            } finally {
                setInitializing(false);
            }
        };

        initializeMap();

        // Cleanup
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const setupMap = async (cityName: string, state: string) => {
        // Buscar coordenadas da cidade
        const result = await geocodeCity(cityName, state);

        if (!result || !mapContainerRef.current) {
            console.error('Erro ao buscar coordenadas ou container não disponível');
            return;
        }

        // Criar mapa Leaflet
        if (mapRef.current) {
            mapRef.current.remove();
        }

        const map = L.map(mapContainerRef.current).setView([result.lat, result.lng], 13);

        // Adicionar camada de tiles do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        // Adicionar evento de clique no mapa
        map.on('click', async (e: any) => {
            const { lat, lng } = e.latlng;
            handleMapClick(lat, lng);
        });

        mapRef.current = map;
    };

    const handleMapClick = async (lat: number, lng: number) => {
        setCoordinates({ lat, lng });

        // Adicionar ou mover marker
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else if (mapRef.current) {
            markerRef.current = L.marker([lat, lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(mapRef.current);
        }

        // Buscar endereço via reverse geocoding
        const addressData = await reverseGeocode(lat, lng);
        if (addressData) {
            const parts = [
                addressData.street,
                addressData.neighborhood,
                addressData.city,
                addressData.state
            ].filter(Boolean);
            setAddress(parts.join(', '));
        } else {
            setAddress('Endereço não encontrado');
        }
    };

    const copyToClipboard = async (text: string, type: 'coords' | 'link') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    const googleMapsLink = coordinates
        ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
        : '';

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa de Localização</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {userCity ? `Centralizado em: ${userCity}` : 'Validação de captura de localização'}
                    </p>
                </div>
            </div>

            {initializing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">Carregando mapa da sua cidade...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Layout Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mapa */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Navigation className="w-5 h-5 text-green-600" />
                                Mapa Interativo
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Clique no mapa para selecionar uma localização</p>
                        </div>
                        <div
                            ref={mapContainerRef}
                            className="w-full h-[500px] lg:h-[600px] bg-gray-100 dark:bg-gray-700"
                        />
                    </div>
                </div>

                {/* Painel de Informações */}
                <div className="space-y-4">
                    {/* Coordenadas */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-600" />
                            Dados Capturados
                        </h3>

                        {coordinates ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Latitude</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                                            {coordinates.lat.toFixed(6)}
                                        </code>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Longitude</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                                            {coordinates.lng.toFixed(6)}
                                        </code>
                                    </div>
                                </div>

                                <button
                                    onClick={() => copyToClipboard(`${coordinates.lat},${coordinates.lng}`, 'coords')}
                                    className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    {copied === 'coords' ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copiar Coordenadas
                                        </>
                                    )}
                                </button>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Link Google Maps</label>
                                    <a
                                        href={googleMapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:underline break-all mb-2"
                                    >
                                        {googleMapsLink}
                                    </a>
                                    <button
                                        onClick={() => copyToClipboard(googleMapsLink, 'link')}
                                        className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        {copied === 'link' ? (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-4 h-4" />
                                                Copiar Link
                                            </>
                                        )}
                                    </button>
                                </div>

                                {loading && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Buscando endereço...
                                    </div>
                                )}

                                {address && !loading && (
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Endereço Aproximado</label>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                            {address}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Clique no mapa para selecionar uma localização</p>
                            </div>
                        )}
                    </div>

                    {/* Preview de Uso */}
                    {coordinates && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-5 shadow-sm">
                            <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Preview de Uso
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <strong className="text-purple-900 dark:text-purple-300">Cadastro de Loja:</strong>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">Localização: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
                                </div>
                                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <strong className="text-purple-900 dark:text-purple-300">Pedido:</strong>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">Destino: {address || 'Carregando...'}</p>
                                </div>
                                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <strong className="text-purple-900 dark:text-purple-300">Entrega:</strong>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                        <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            Abrir no Google Maps →
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                        <strong className="font-bold">Informação:</strong> Esta página é exclusiva para validação pelo admin.
                        Nenhuma informação é salva no banco de dados. Use para testar a captura de localização antes de implementar
                        a funcionalidade para lojistas.
                    </div>
                </div>
            </div>
        </div>
    );
};
