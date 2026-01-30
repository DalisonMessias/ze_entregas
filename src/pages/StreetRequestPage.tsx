import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Target, AlertCircle, Loader2, ArrowLeft, Send } from 'lucide-react';
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
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (profile?.city) setCity(profile.city);
    }, [profile]);

    const handleMapInteraction = useCallback(async (lat: number, lng: number, autoFill = true) => {
        if (!isMounted.current) return;
        setCoords({ lat, lng });

        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else if (mapRef.current) {
            markerRef.current = L.marker([lat, lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(mapRef.current);
        }

        if (mapRef.current) mapRef.current.setView([lat, lng], 16);

        if (autoFill) {
            const addressData = await reverseGeocode(lat, lng);
            if (addressData && isMounted.current) {
                if (addressData.street && !streetName) setStreetName(addressData.street);
                if (addressData.neighborhood && !neighborhood) setNeighborhood(addressData.neighborhood);
                if (addressData.city && !city) setCity(addressData.city);
            }
        }
    }, [reverseGeocode, streetName, neighborhood, city]);

    const captureLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError('GPS não suportado');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (isMounted.current) {
                    handleMapInteraction(pos.coords.latitude, pos.coords.longitude);
                    setGpsError(null);
                }
            },
            () => { if (isMounted.current) setGpsError('Erro ao obter localização.'); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }, [handleMapInteraction]);

    useEffect(() => {
        if (typeof L === 'undefined' || !mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        map.on('click', (e: any) => handleMapInteraction(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
        captureLocation();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [handleMapInteraction, captureLocation]);

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
                title: 'Enviado!',
                message: 'Sua solicitação foi enviada para análise.'
            });

            window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'addresses' } }));
        } catch (err: any) {
            toast({ message: 'Erro: ' + err.message, type: 'error' });
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'addresses' } }))} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-black">Solicitar Nova Rua</h1>
                    <p className="text-sm text-gray-500">Ajude-nos a mapear novas áreas</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <CustomInput label="Nome da Rua" placeholder="Ex: Rua das Flores" value={streetName} onChange={e => setStreetName(e.target.value)} icon={MapPin} required />
                    <div className="grid grid-cols-2 gap-4">
                        <CustomInput label="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                        <CustomInput label="Cidade" value={city} onChange={e => setCity(e.target.value)} required />
                    </div>
                    <CustomInput label="Referência" value={reference} onChange={e => setReference(e.target.value)} />
                    <Button onClick={handleSubmit} loading={loading} fullWidth size="lg">Enviar Solicitação</Button>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold flex items-center gap-2"><Navigation className="w-4 h-4 text-brand-500" /> Mapa</h3>
                        <button onClick={captureLocation} className="text-xs font-bold text-brand-500">Recapturar GPS</button>
                    </div>
                    <div className="relative flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-gray-100">
                        <div ref={mapContainerRef} className="absolute inset-0" />
                        {geocodingLoading && <div className="absolute inset-0 z-20 bg-white/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}
                    </div>
                    {gpsError && <p className="mt-2 text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {gpsError}</p>}
                </div>
            </div>
        </div>
    );
};
