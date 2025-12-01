
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Navigation, AlertTriangle, Truck, MapPin, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { LiveLocationPayload } from '../types';

declare const L: any;

interface LiveTrackingMapProps {
    requestId: string;
    onClose: () => void;
    driverName?: string;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ requestId, onClose, driverName = 'Entregador' }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const driverMarkerRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('Aguardando localização...');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || typeof L === 'undefined' || mapInstanceRef.current) return;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            center: [-15.7801, -47.9292], // Default center
            zoom: 5,
            zoomControl: false,
            attributionControl: false
        });
        mapInstanceRef.current = map;

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        L.tileLayer(isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        setLoading(false);

        // Subscribe to Realtime Updates
        const subscription = cloud.subscribeToTracking(requestId, (payload: LiveLocationPayload) => {
            const { lat, lng, heading, status: deliveryStatus } = payload;
            
            // Create custom icon
            const driverIcon = L.divIcon({
                className: 'driver-live-marker',
                html: `<div class="bg-brand-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck" style="transform: rotate(${heading || 0}deg)"><path d="M10 17h4V5H2v12h3"/><path d="M2 17a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3.34a4 4 0 0 1 1.17-2.83L11 5h10v12h-3"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>
                       </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            if (driverMarkerRef.current) {
                // Update position smoothly
                driverMarkerRef.current.setLatLng([lat, lng]);
                driverMarkerRef.current.setIcon(driverIcon);
            } else {
                // Create marker
                driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon }).addTo(mapInstanceRef.current);
            }

            // Center map on first update or if user hasn't moved it much (simplified: always center for now)
            mapInstanceRef.current.setView([lat, lng], 16, { animate: true });

            // Update UI
            if (deliveryStatus) {
                const statusText = deliveryStatus === 'IN_TRANSIT' ? 'Em deslocamento' : 
                                   deliveryStatus === 'ACCEPTED' ? 'A caminho da coleta' : 
                                   deliveryStatus === 'COMPLETED' ? 'Entrega Finalizada' : deliveryStatus;
                setStatus(statusText);
            }
            setLastUpdate(new Date());
        });

        return () => {
            if (subscription) subscription.unsubscribe();
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [requestId]);

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex justify-between items-start">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg backdrop-blur-md border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{driverName}</h3>
                        </div>
                        <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">{status}</p>
                        {lastUpdate && <p className="text-[10px] text-gray-400 mt-1">Atualizado às {lastUpdate.toLocaleTimeString()}</p>}
                    </div>
                    <button onClick={onClose} className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Map */}
            <div ref={mapContainerRef} className="w-full h-full bg-gray-200 dark:bg-gray-800" />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-0">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Conectando ao satélite...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
