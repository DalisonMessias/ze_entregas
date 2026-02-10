
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, ChevronDown, Check, X, AlertCircle, Navigation, Target } from 'lucide-react';
import { Loading } from './Loading';
import { useGeocoding } from '../hooks/useGeocoding';
import { useDebounce } from '../hooks/useDebounce';

// Declaração de tipos para Leaflet (carregado via CDN)
declare const L: any;

interface StreetSearchSelectProps {
    city: string; // Cidade para restringir a busca ou usar como contexto
    value: string;
    onSelect: (street: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    enableCurrentLocation?: boolean;
}

export const StreetSearchSelect: React.FC<StreetSearchSelectProps> = ({
    city,
    value,
    onSelect,
    label,
    placeholder = "Busque sua rua...",
    className = "",
    enableCurrentLocation = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Estados para modal de localização GPS
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [detectedAddress, setDetectedAddress] = useState<string>('');

    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const { reverseGeocode, loading: geocodingLoading } = useGeocoding();

    // Initial load and search logic could be here if we wanted to preload, 
    // but for streets it's better to search as we type or on focus if we had a local DB.
    // For OSM Overpass, we should be careful with rate limits, so maybe debounce search or search 
    // only when user stops typing significantly or explicitly asks.
    // Given the requirement "load streets using the same system existing in /streets", 
    // which fetches ALL streets for a city first and then filters locally.

    // However, fetching ALL streets for a big city might be heavy for a checkout dropdown.
    // Let's check `StreetsList` logic again. It fetches ALL streets for the city once.
    // We should probably try to replicate that behavior efficiently or adapt.
    // If exact same system is required: fetch all streets for the city once, then filter.

    const [allStreets, setAllStreets] = useState<string[]>([]);
    const [streetsLoaded, setStreetsLoaded] = useState(false);

    useEffect(() => {
        if (isOpen && !streetsLoaded && city) {
            fetchAllStreetsForCity(city);
        }
    }, [isOpen, city]);

    const fetchAllStreetsForCity = async (cityName: string) => {
        const controller = new AbortController();
        const signal = controller.signal;

        setLoading(true);
        setError(null);
        try {
            // Step 1: Get city info from Nominatim to get BBox
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(cityName)}`;
            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'ZeEntregas-App/1.0' },
                signal
            });

            if (!nominatimRes.ok) throw new Error('Erro ao buscar cidade');
            const nominatimData = await nominatimRes.json();

            if (!nominatimData || nominatimData.length === 0) {
                if (!signal.aborted) {
                    setLoading(false);
                    setStreetsLoaded(true);
                }
                return;
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
                body: 'data=' + encodeURIComponent(overpassQuery),
                signal
            });

            if (!overpassRes.ok) throw new Error('Erro ao buscar ruas');
            const overpassData = await overpassRes.json();

            const streetsSet = new Set<string>();
            if (overpassData.elements) {
                for (const elem of overpassData.elements) {
                    if (elem.tags?.name && elem.tags.highway) {
                        streetsSet.add(elem.tags.name);
                    }
                }
            }

            if (!signal.aborted) {
                setAllStreets(Array.from(streetsSet).sort((a, b) => a.localeCompare(b, 'pt-BR')));
                setStreetsLoaded(true);
            }

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error(err);
            setError('Não foi possível carregar as ruas automaticamente. Digite manualmente.');
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    };

    const debouncedSearch = useDebounce(searchTerm, 300);

    // Filter suggestions based on search term
    const suggestions = useMemo(() => {
        if (!debouncedSearch) return [];

        const q = debouncedSearch.toLowerCase().trim();
        // Simple filter limit to 50
        return allStreets.filter(s => s.toLowerCase().includes(q)).slice(0, 50);
    }, [debouncedSearch, allStreets]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (street: string) => {
        onSelect(street);
        setIsOpen(false);
        setSearchTerm(''); // Reset search term or keep it? existing logic in CitySearchSelect clears it.
    };

    // === FUNÇÕES PARA MODAL DE LOCALIZAÇÃO GPS ===

    // Inicializar modal com mapa
    const openLocationModal = () => {
        setIsMapModalOpen(true);
        setGpsError(null);
        setSelectedCoords(null);
        setDetectedAddress('');

        // Aguardar modal renderizar antes de criar mapa
        setTimeout(() => {
            initializeMap();
        }, 100);
    };


    // Configurar mapa Leaflet
    const initializeMap = () => {
        if (typeof L === 'undefined') {
            setGpsError('Sistema de mapas não disponível');
            return;
        }

        if (!mapContainerRef.current) return;

        // Limpar mapa anterior se existir
        if (mapRef.current) {
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
        }

        try {
            // Coordenadas padrão (Brasil centro) - só se não conseguir localização
            const defaultCoords = { lat: -15.7801, lng: -47.9292 };

            const map = L.map(mapContainerRef.current);
            map.setView([defaultCoords.lat, defaultCoords.lng], 4); // Zoom menor inicialmente

            // Adicionar camada de tiles mais clean (CartoDB Positron - estilo minimalista)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Evento de clique no mapa
            map.on('click', async (e: any) => {
                const { lat, lng } = e.latlng;
                handleMapClick(lat, lng);
            });

            mapRef.current = map;

            // Tentar capturar localização atual automaticamente
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        if (map) {
                            // Centralizar com zoom maior
                            map.setView([latitude, longitude], 17);

                            // Adicionar marker na posição atual
                            if (markerRef.current) {
                                markerRef.current.setLatLng([latitude, longitude]);
                            } else {
                                markerRef.current = L.marker([latitude, longitude], {
                                    icon: L.icon({
                                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41],
                                        popupAnchor: [1, -34],
                                        shadowSize: [41, 41]
                                    })
                                }).addTo(map);
                            }

                            // Buscar endereço automaticamente
                            handleMapClick(latitude, longitude);
                        }
                    },
                    (error) => {
                        // Se falhar, manter visão padrão
                        console.log('Não foi possível obter localização inicial:', error);
                    },
                    {
                        timeout: 5000,
                        maximumAge: 60000
                    }
                );
            }

            // Forçar invalidação do tamanho
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 250);

        } catch (error) {
            console.error('Erro ao criar mapa:', error);
            setGpsError('Erro ao inicializar mapa');
        }
    };


    // Capturar localização GPS do dispositivo
    const captureCurrentLocation = () => {
        if (!navigator.geolocation) {
            setGpsError('Seu dispositivo não suporta GPS');
            return;
        }

        setCapturing(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                handleMapClick(latitude, longitude);
                setCapturing(false);
            },
            (error) => {
                setCapturing(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setGpsError('Permissão de localização negada. Por favor, ative o GPS e permita o acesso.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setGpsError('Localização não disponível. Tente novamente.');
                        break;
                    case error.TIMEOUT:
                        setGpsError('Tempo esgotado ao buscar localização. Tente novamente.');
                        break;
                    default:
                        setGpsError('Erro ao capturar localização.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Lidar com clique no mapa
    const handleMapClick = async (lat: number, lng: number) => {
        setSelectedCoords({ lat, lng });

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

        // Centralizar mapa
        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 16);
        }

        // Buscar endereço via geocodificação reversa
        const addressData = await reverseGeocode(lat, lng);
        if (addressData && addressData.street) {
            const addressParts = [
                addressData.street,
                addressData.neighborhood,
                addressData.city
            ].filter(Boolean);
            setDetectedAddress(addressParts.join(', '));
        } else {
            setDetectedAddress('Endereço não encontrado');
        }
    };

    // Confirmar seleção de localização
    const confirmLocation = () => {
        if (detectedAddress && detectedAddress !== 'Endereço não encontrado') {
            // Extrair apenas o nome da rua
            const streetName = detectedAddress.split(',')[0].trim();
            onSelect(streetName);
            setIsMapModalOpen(false);
            setIsOpen(false);
        }
    };

    // Fechar modal de localização
    const closeLocationModal = () => {
        setIsMapModalOpen(false);
        if (mapRef.current) {
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
        }
        if (markerRef.current) {
            markerRef.current = null;
        }
    };

    // === FIM DAS FUNÇÕES DE LOCALIZAÇÃO GPS ===


    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold font-sans text-gray-500 dark:text-gray-400 mb-1">{label}</label>}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        // If opening and we have value, maybe set search term to refine? 
                        // Or just focus search input inside.
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-base text-left focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all hover:border-gray-200 dark:hover:border-gray-600 group"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin className={`w-4 h-4 flex-shrink-0 ${value ? 'text-brand-500' : 'text-gray-400'}`} />
                        <span className={`font-bold truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                            {value || placeholder}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-[60] mt-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* Search Field */}
                    <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        {enableCurrentLocation && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    openLocationModal();
                                }}
                                className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            >
                                <Navigation className="w-4 h-4" />
                                Usar localizacao atual
                            </button>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                placeholder="Digite o nome da rua..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                        {/* Manual entry fallback hint */}
                        <div className="mt-2 px-1">
                            <p className="text-[10px] text-gray-400">
                                Não encontrou na lista? <button className="text-brand-500 font-bold hover:underline" onClick={() => {
                                    handleSelect(searchTerm);
                                }}>Usar o texto digitado</button>
                            </p>
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar overscroll-contain">
                        {loading && (
                            <div className="p-8 text-center">
                                <Loading variant="container" size="md" message={`Carregando ruas de ${city}...`} />
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-center">
                                <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">{error}</p>
                            </div>
                        )}

                        {!loading && suggestions.length > 0 && (
                            <div className="p-1">
                                {suggestions.map((street, idx) => {
                                    const isSelected = value === street;
                                    return (
                                        <button
                                            key={`${street}-${idx}`}
                                            type="button"
                                            onClick={() => handleSelect(street)}
                                            className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all text-left mb-0.5 ${isSelected
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span>{street}</span>
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && streetsLoaded && suggestions.length === 0 && searchTerm && (
                            <div className="px-3 py-6 text-center space-y-3">
                                <p className="text-sm text-gray-400 font-medium mb-3">Nenhuma rua encontrada na lista oficial.</p>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleSelect(searchTerm)}
                                        className="w-full px-4 py-2 bg-brand-50 text-brand-600 rounded-lg text-sm font-bold hover:bg-brand-100 transition-colors"
                                    >
                                        Usar "{searchTerm}"
                                    </button>

                                    <button
                                        onClick={() => {
                                            const event = new CustomEvent('navigateToTab', { detail: { tab: 'street_request' } });
                                            window.dispatchEvent(event);
                                            setIsOpen(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Não encontrou? Solicite esta rua
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && streetsLoaded && suggestions.length === 0 && !searchTerm && (
                            <div className="px-3 py-6 text-center text-gray-400 text-xs">
                                Digite para buscar...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === MODAL DE LOCALIZAÇÃO GPS === */}
            {isMapModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeLocationModal} />
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-600 rounded-xl">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Localização Atual</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Use seu GPS ou clique no mapa</p>
                                </div>
                            </div>
                            <button onClick={closeLocationModal} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Botão de captura de GPS */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <button
                                onClick={captureCurrentLocation}
                                disabled={capturing}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg"
                            >
                                {capturing ? (
                                    <>
                                        <Loading variant="inline" size="sm" />
                                        Capturando localização...
                                    </>
                                ) : (
                                    <>
                                        <Target className="w-5 h-5" />
                                        Capturar Minha Localização
                                    </>
                                )}
                            </button>

                            {gpsError && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 dark:text-red-300">{gpsError}</p>
                                </div>
                            )}
                        </div>

                        {/* Mapa */}
                        <div className="relative">
                            <div
                                ref={mapContainerRef}
                                className="w-full h-[400px] bg-gray-100 dark:bg-gray-700"
                                style={{
                                    position: 'relative',
                                    cursor: 'crosshair',
                                    touchAction: 'none'
                                }}
                            />
                            {geocodingLoading && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center">
                                    <Loading variant="container" size="md" message="Buscando endereço..." />
                                </div>
                            )}
                        </div>

                        {/* Informações do endereço detectado */}
                        {selectedCoords && (
                            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Endereço Detectado</label>
                                        <div className="mt-1 p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            {detectedAddress ? (
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{detectedAddress}</p>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">Buscando endereço...</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Latitude</label>
                                            <code className="block mt-1 p-2 bg-white dark:bg-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white">
                                                {selectedCoords.lat.toFixed(6)}
                                            </code>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Longitude</label>
                                            <code className="block mt-1 p-2 bg-white dark:bg-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white">
                                                {selectedCoords.lng.toFixed(6)}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer com botões */}
                        <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <button
                                onClick={closeLocationModal}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmLocation}
                                disabled={!detectedAddress || detectedAddress === 'Endereço não encontrado'}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                Confirmar Localização
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* === FIM DO MODAL DE LOCALIZAÇÃO GPS === */}
        </div>
    );
};
