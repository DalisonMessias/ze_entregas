import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Target, Check, AlertCircle, Loader2, ArrowLeft, Send } from 'lucide-react';
import { Button } from '../../components/Button';
import { CustomInput } from '../../components/CustomInput';
import * as cloud from '../../services/cloud';
import { useGeocoding } from '../../hooks/useGeocoding';
import { useDialog } from '../../utils/dialogService';
import { useUserData } from '../../contexts/UserDataContext';

declare const L: any;

export const StreetRequestPage: React.FC = () => {
    const { profile } = useUserData();
    const { alert, toast } = useDialog();
    const { reverseGeocode, loading: geocodingLoading } = useGeocoding();

    const [loading, setLoading] = useState(false);
    const [streetName, setStreetName] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState(profile?.city || '');
    const [reference, setReference] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (profile?.city) setCity(profile.city);
    }, [profile]);

    useEffect(() => {
        initializeMap();
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const initializeMap = () => {
        if (typeof L === 'undefined' || !mapContainerRef.current) return;

        if (mapRef.current) return;

        const defaultCoords = { lat: -15.7801, lng: -47.9292 };
        const map = L.map(mapContainerRef.current).setView([defaultCoords.lat, defaultCoords.lng], 4);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            handleMapInteraction(lat, lng);
        });

        mapRef.current = map;

        // Tentar capturar localização atual automaticamente ao carregar
        captureLocation();
    };

    const handleMapInteraction = async (lat: number, lng: number) => {
        setCoords({ lat, lng });

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

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 16);
        }

        // Tentar preencher dados automaticamente via geocodificação reversa
        const addressData = await reverseGeocode(lat, lng);
        if (addressData) {
            if (addressData.street && !streetName) setStreetName(addressData.street);
            if (addressData.neighborhood && !neighborhood) setNeighborhood(addressData.neighborhood);
            if (addressData.city && !city) setCity(addressData.city);
        }
    };

    const captureLocation = () => {
        if (!navigator.geolocation) {
            setGpsError('GPS não suportado');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                handleMapInteraction(latitude, longitude);
                setGpsError(null);
            },
            (error) => {
                setGpsError('Não foi possível obter sua localização atual.');
                console.error(error);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const handleSubmit = async () => {
        if (!streetName || !city) {
            toast({ message: 'Preencha o nome da rua e a cidade.', type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await cloud.requestNewStreet({
                street_name: streetName,
                neighborhood,
                city,
                reference,
                latitude: coords?.lat,
                longitude: coords?.lng,
                state: (profile as any)?.address_state || ''
            });

            if (error) throw error;

            await alert({
                title: 'Solicitação Enviada!',
                message: 'Sua solicitação de nova rua foi enviada para análise administrativa. Você será notificado assim que for aprovada.'
            });

            // Redirecionar de volta
            window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'addresses' } }));
        } catch (err: any) {
            toast({ message: 'Erro ao enviar solicitação: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'addresses' } }))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Solicitar Nova Rua</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ajude-nos a mapear novas áreas do sistema</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Form Side */}
                <div className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <CustomInput
                        label="Nome da Rua"
                        placeholder="Ex: Rua das Flores"
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        icon={MapPin}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <CustomInput
                            label="Bairro"
                            placeholder="Ex: Centro"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                        />
                        <CustomInput
                            label="Cidade"
                            placeholder="Cidade"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                        />
                    </div>

                    <CustomInput
                        label="Ponto de Referência"
                        placeholder="Ex: Próximo ao mercado X"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                    />

                    {coords && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <Target className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-[10px] font-mono text-green-700 dark:text-green-400">
                                Coordenadas capturadas: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        fullWidth
                        size="lg"
                        className="mt-6"
                    >
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Solicitação
                    </Button>
                </div>

                {/* Map Side */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-brand-500" />
                                Marcar no Mapa
                            </h3>
                            <button
                                onClick={captureLocation}
                                className="text-xs font-bold text-brand-500 hover:underline flex items-center gap-1"
                            >
                                <Target className="w-3 h-3" />
                                Re-capturar GPS
                            </button>
                        </div>

                        <div className="relative flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                            <div ref={mapContainerRef} className="absolute inset-0 z-10" />
                            {geocodingLoading && (
                                <div className="absolute inset-0 z-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[2px] flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                </div>
                            )}
                        </div>

                        {gpsError && (
                            <p className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {gpsError}
                            </p>
                        )}
                        <p className="mt-3 text-[10px] text-gray-400 leading-relaxed italic">
                            * Clique no mapa para ajustar a localização exata da rua. Isso ajuda nossos entregadores a encontrar o destino com precisão.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
