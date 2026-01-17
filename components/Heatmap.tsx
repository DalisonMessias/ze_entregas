
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Flame } from 'lucide-react';
import * as storage from '../services/storage';
import { SavedAddress, UserRole } from '../types';
import { ExclusiveLock } from './ExclusiveLock';

declare const L: any;

// Cache de geocodificação para evitar chamadas repetidas à API
const geocodeCache: { [key: string]: { lat: number, lng: number } } = {};

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    const cached = geocodeCache[address];
    if (cached) return cached;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            geocodeCache[address] = result;
            return result;
        }
        return null;
    } catch (e) {
        // console.error("Geocoding error:", e);
        return null;
    }
};

interface HeatmapProps {
    userRole?: UserRole;
}

// Componente de Mapa de Calor - Versão com Geocodificação e Leaflet
export const Heatmap: React.FC<HeatmapProps> = ({ userRole }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('Carregando dados de endereço...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userRole && userRole !== 'delivery_partner') return;

        if (!mapContainerRef.current || typeof L === 'undefined' || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [-23.5505, -46.6333], // Centro de São Paulo
            zoom: 12,
            zoomControl: false,
            attributionControl: false
        });
        mapInstanceRef.current = map;

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        L.tileLayer(isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        processDataForHeatmap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [userRole]);

    const processDataForHeatmap = async () => {
        const addresses = storage.getAddresses().filter(a => a.visitCount && a.visitCount > 0);
        if (addresses.length === 0) {
            setMessage("Nenhum dado de visita encontrado para gerar o mapa.");
            setLoading(false);
            return;
        }

        const heatData: [number, number, number][] = [];
        const bounds: [number, number][] = [];

        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            setMessage(`Processando endereço ${i + 1} de ${addresses.length}...`);
            const coords = await geocodeAddress(address.fullAddress);
            if (coords) {
                heatData.push([coords.lat, coords.lng, address.visitCount || 1]);
                bounds.push([coords.lat, coords.lng]);
            }
        }

        if (heatData.length > 0) {
            L.heatLayer(heatData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(mapInstanceRef.current);

            if (bounds.length > 1) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
            } else if (bounds.length === 1) {
                mapInstanceRef.current.setView(bounds[0], 15);
            }
        } else {
            setError("Não foi possível geocodificar nenhum endereço com visitas.");
        }

        setLoading(false);
    };

    if (userRole && userRole !== 'delivery_partner') {
        return (
            <ExclusiveLock
                title="Mapa de Calor"
                description="Visualize as zonas mais quentes da sua cidade e posicione-se estrategicamente para receber mais entregas."
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <Flame className="w-6 h-6 text-brand-500" />
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Mapa de Calor</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Visualize as áreas com maior concentração de entregas com base no seu histórico de endereços visitados.
                </p>
            </div>
            <div className="relative h-[600px] rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div ref={mapContainerRef} className="w-full h-full" />
                {loading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex flex-col items-center justify-center gap-4 z-20">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                        <p className="font-bold text-gray-600 dark:text-gray-300">{message}</p>
                    </div>
                )}
                {!loading && error && (
                    <div className="absolute inset-0 bg-red-50/70 dark:bg-red-900/70 flex flex-col items-center justify-center gap-4 z-20">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                        <p className="font-bold text-red-700 dark:text-red-300 text-center max-w-sm">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
