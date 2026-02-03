import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MapPin, Check, X, Map as MapIcon, Loader2, Search, Filter,
    Calendar, User, Info, AlertTriangle, Plus, Navigation,
    Target, Send, Search as SearchIcon
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import * as cloud from '../../services/cloud';
import { StreetRequest, ApprovedStreet } from '../../types';
import { useDialog } from '../../utils/dialogService';
import { BaseModal } from '../../components/BaseModal';
import { CustomInput } from '../../components/CustomInput';
import { CustomSelect } from '../../components/CustomSelect';
import { useGeocoding } from '../../hooks/useGeocoding';

declare const L: any;

const ManualStreetModal: React.FC<{ isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ isOpen, onClose, onSaved }) => {
    const { toast } = useDialog();
    const { reverseGeocode, geocodeCity, loading: geocodingLoading } = useGeocoding();

    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [url, setUrl] = useState('');
    const [formData, setFormData] = useState({ name: '', neighborhood: '', city: '', state: '' });
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const initializeMap = useCallback(() => {
        if (typeof L === 'undefined' || !mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        map.on('click', (e: any) => updateMarker(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;

        setTimeout(() => map.invalidateSize(), 150);
    }, []);

    const updateMarker = useCallback(async (lat: number, lng: number, autoFill = true) => {
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
            const address = await reverseGeocode(lat, lng);
            if (address && isMounted.current) {
                setFormData(prev => ({
                    ...prev,
                    name: address.street || prev.name,
                    neighborhood: address.neighborhood || prev.neighborhood,
                    city: address.city || prev.city,
                    state: address.state || prev.state
                }));
            }
        }
    }, [reverseGeocode]);

    useEffect(() => {
        if (isOpen) {
            cloud.adminGetCities().then(data => { if (isMounted.current) setCities(data); });
            const timer = setTimeout(initializeMap, 400);
            return () => clearTimeout(timer);
        } else {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
            setFormData({ name: '', neighborhood: '', city: '', state: '' });
            setCoords(null);
            setUrl('');
        }
    }, [isOpen, initializeMap]);

    const handleCitySearch = async () => {
        if (!formData.city) return;
        const result = await geocodeCity(formData.city);
        if (result) updateMarker(result.lat, result.lng, false);
        else toast({ message: 'Cidade não encontrada.', type: 'error' });
    };

    const handleSave = async () => {
        if (loading || !formData.name || !formData.city || !coords) return;
        setLoading(true);
        try {
            const res = await cloud.adminAddManualStreet({
                ...formData,
                latitude: coords.lat,
                longitude: coords.lng
            });
            if (res.success) {
                toast({ message: 'Rua adicionada com sucesso!', type: 'success' });
                onSaved();
            } else throw new Error(res.error);
        } catch (err: any) {
            toast({ message: 'Erro: ' + err.message, type: 'error' });
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Adicionar Rua" icon={<MapPin className="w-6 h-6" />} maxWidth="3xl">
            <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <CustomSelect label="Cidade" value={formData.city} options={cities.map(c => ({ label: `${c.name} (${c.state})`, value: c.name }))} onChange={val => setFormData(prev => ({ ...prev, city: val }))} />
                        <CustomInput label="Rua" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                        <Button onClick={handleCitySearch} variant="outline" size="sm" fullWidth disabled={!formData.city}>Localizar Cidade</Button>
                    </div>
                    <div className="h-[250px] bg-gray-100 rounded-2xl relative overflow-hidden">
                        <div ref={mapContainerRef} className="absolute inset-0" />
                    </div>
                </div>
                <Button fullWidth onClick={handleSave} loading={loading}>Salvar</Button>
            </div>
        </BaseModal>
    );
};

export const StreetRequestsAdmin: React.FC = () => {
    const { toast, confirm } = useDialog();
    const [requests, setRequests] = useState<StreetRequest[]>([]);
    const [approvedStreets, setApprovedStreets] = useState<ApprovedStreet[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'REQUESTS' | 'CATALOG'>('REQUESTS');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const isMounted = useRef(true);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const [reqs, apps] = await Promise.all([cloud.adminGetStreetRequests(), cloud.adminGetAllApprovedStreets()]);
            if (isMounted.current) {
                setRequests(reqs);
                setApprovedStreets(apps);
            }
        } catch (err) {
            toast({ message: 'Erro ao carregar dados.', type: 'error' });
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        isMounted.current = true;
        fetchRequests();
        return () => { isMounted.current = false; };
    }, [fetchRequests]);

    const handleAction = async (request: StreetRequest, status: 'APPROVED' | 'REJECTED') => {
        const isApprove = status === 'APPROVED';
        const confirmed = await confirm({
            title: isApprove ? 'Aprovar?' : 'Rejeitar?',
            message: isApprove ? `Aprovar rua "${request.street_name}"?` : `Rejeitar "${request.street_name}"?`
        });
        if (!confirmed) return;

        try {
            const res = await cloud.adminProcessStreetRequest(request.id, status);
            if (res.success) {
                toast({ message: isApprove ? 'Aprovada!' : 'Rejeitada.', type: 'success' });
                fetchRequests();
            } else throw new Error(res.error);
        } catch (err: any) {
            toast({ message: 'Erro: ' + err.message, type: 'error' });
        }
    };

    const filteredRequests = requests.filter(req => (filter === 'ALL' || req.status === filter) && (req.street_name.toLowerCase().includes(searchTerm.toLowerCase()) || req.city.toLowerCase().includes(searchTerm.toLowerCase())));
    const filteredApproved = approvedStreets.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.city.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h1 className="text-2xl font-black">Solicitações de Ruas</h1>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button onClick={() => setIsManualModalOpen(true)} size="sm" className="w-full sm:w-auto">Adicionar Manual</Button>
                    <Button onClick={fetchRequests} variant="outline" size="sm" className="w-full sm:w-auto">Atualizar</Button>
                </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-2xl w-full overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('REQUESTS')} className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'REQUESTS' ? 'bg-white text-brand-600 shadow' : 'text-gray-500'}`}>Solicitações</button>
                <button onClick={() => setActiveTab('CATALOG')} className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'CATALOG' ? 'bg-white text-brand-600 shadow' : 'text-gray-500'}`}>Catálogo</button>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded-xl outline-none" />
            </div>

            <div className="grid gap-4">
                {loading ? <Skeleton className="h-32 w-full rounded-3xl" /> : activeTab === 'REQUESTS' ? (
                    filteredRequests.map(req => (
                        <div key={req.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="font-bold">{req.street_name}</h3>
                                <p className="text-xs text-brand-500 font-bold">{req.city}</p>
                            </div>
                            {req.status === 'PENDING' && (
                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <button onClick={() => handleAction(req, 'APPROVED')} className="p-3 bg-green-500 text-white rounded-2xl"><Check className="w-5 h-5" /></button>
                                    <button onClick={() => handleAction(req, 'REJECTED')} className="p-3 bg-red-500 text-white rounded-2xl"><X className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    filteredApproved.map(street => (
                        <div key={street.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="font-bold">{street.name}</h3>
                                <p className="text-xs text-brand-500 font-bold">{street.city}</p>
                            </div>
                            <button onClick={() => cloud.adminDeleteApprovedStreet(street.id).then(fetchRequests)} className="p-2 text-red-500 self-end sm:self-auto"><X /></button>
                        </div>
                    ))
                )}
            </div>

            <ManualStreetModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSaved={() => { setIsManualModalOpen(false); fetchRequests(); }} />
        </div>
    );
};

