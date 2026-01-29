import React, { useState, useEffect, useRef } from 'react';
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

// --- MANUAL STREET MODAL COMPONENT ---
const ManualStreetModal: React.FC<{ isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ isOpen, onClose, onSaved }) => {
    const { toast } = useDialog();
    const { reverseGeocode, geocodeCity, loading: geocodingLoading } = useGeocoding();

    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [url, setUrl] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        neighborhood: '',
        city: '',
        state: ''
    });
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            loadCities();
        } else {
            // Cleanup map when closed
            if (mapRef.current) {
                console.log('Cleaning up map...');
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
            setFormData({ name: '', neighborhood: '', city: '', state: '' });
            setCoords(null);
            setUrl('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && mapContainerRef.current && !mapRef.current) {
            const timer = setTimeout(initializeMap, 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const loadCities = async () => {
        try {
            const data = await cloud.adminGetCities();
            setCities(data);
        } catch (err) {
            console.error(err);
        }
    };

    const initializeMap = () => {
        if (typeof L === 'undefined' || !mapContainerRef.current) return;

        const defaultCoords = { lat: -15.7801, lng: -47.9292 };
        const map = L.map(mapContainerRef.current, {
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true
        }).setView([defaultCoords.lat, defaultCoords.lng], 4);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            updateMarker(lat, lng);
        });

        // Forçar correção de tamanho múltiplas vezes para garantir ativação do motor de interação
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 600);

        mapRef.current = map;
    };

    const updateMarker = async (lat: number, lng: number, autoFill = true) => {
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

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 16);
        }

        if (autoFill) {
            const address = await reverseGeocode(lat, lng);
            if (address) {
                setFormData(prev => ({
                    ...prev,
                    name: address.street || prev.name,
                    neighborhood: address.neighborhood || prev.neighborhood,
                    city: address.city || prev.city,
                    state: address.state || prev.state
                }));
            }
        }
    };

    const handleCitySearch = async () => {
        if (!formData.city) return;
        const result = await geocodeCity(formData.city);
        if (result) {
            updateMarker(result.lat, result.lng, false);
        } else {
            toast({ message: 'Cidade não encontrada no mapa.', type: 'error' });
        }
    };

    const handleUrlPaste = async (inputUrl: string) => {
        setUrl(inputUrl);
        if (!inputUrl) return;

        try {
            // Padrão 1: @-23.55052,-46.633309
            const atMatch = inputUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            // Padrão 2: !3d-23.55052!4d-46.633309
            const bangMatch = inputUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

            let lat, lng;

            if (atMatch) {
                lat = parseFloat(atMatch[1]);
                lng = parseFloat(atMatch[2]);
            } else if (bangMatch) {
                lat = parseFloat(bangMatch[1]);
                lng = parseFloat(bangMatch[2]);
            }

            if (lat && lng) {
                updateMarker(lat, lng, true);
                toast({ message: 'Coordenadas extraídas da URL com sucesso!', type: 'success' });
            } else if (inputUrl.includes('google.com/maps')) {
                toast({ message: 'URL do Google Maps detectada, mas não conseguimos extrair as coordenadas automaticamente.', type: 'warning' });
            }
        } catch (err) {
            console.error('Erro ao processar URL:', err);
        }
    };

    const handleSave = async () => {
        if (loading) return; // Trava contra múltiplos cliques

        console.log('handleSave called', { formData, coords });
        if (!formData.name || !formData.city || !coords) {
            toast({ message: 'Preencha o nome da rua, cidade e marque no mapa.', type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            console.log('Sending to cloud.adminAddManualStreet...');
            const res = await cloud.adminAddManualStreet({
                name: formData.name,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                latitude: coords.lat,
                longitude: coords.lng
            });

            console.log('Result from cloud:', res);
            if (res.success) {
                toast({ message: 'Rua adicionada manualmente com sucesso!', type: 'success' });
                onSaved();
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            console.error('Error in handleSave:', err);
            toast({ message: 'Erro ao salvar: ' + err.message, type: 'error' });
            setLoading(false); // Só destrava se der erro
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Adicionar Rua Manualmente"
            icon={<MapPin className="w-6 h-6 text-brand-600" />}
            maxWidth="3xl"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <CustomSelect
                            label="Cidade do Sistema"
                            value={formData.city}
                            onChange={(val) => {
                                const city = cities.find(c => c.name === val);
                                setFormData(prev => ({ ...prev, city: val, state: city?.state || prev.state }));
                            }}
                            options={cities.map(c => ({ label: `${c.name} (${c.state})`, value: c.name }))}
                            placeholder="Selecione a cidade..."
                        />

                        <CustomInput
                            label="Nome da Rua"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Rua das Flores"
                            icon={<SearchIcon className="w-4 h-4" />}
                        />

                        <CustomInput
                            label="Bairro (Opcional)"
                            value={formData.neighborhood}
                            onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                            placeholder="Ex: Centro"
                        />

                        <div className="flex gap-2">
                            <Button onClick={handleCitySearch} variant="outline" size="sm" fullWidth disabled={!formData.city}>
                                <Navigation className="w-4 h-4 mr-2" />
                                Buscar Cidade
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <CustomInput
                                label="URL do Google Maps (Opcional)"
                                value={url}
                                onChange={e => handleUrlPaste(e.target.value)}
                                placeholder="Cole a URL do Google Maps aqui..."
                                icon={<MapIcon className="w-4 h-4" />}
                                helperText="Extrai coordenadas automaticamente da URL colada."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Localização no Mapa</label>
                        <div className="h-[250px] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative border border-gray-100 dark:border-gray-700">
                            <div ref={mapContainerRef} className="absolute inset-0 z-[100] pointer-events-auto" />
                            {geocodingLoading && (
                                <div className="absolute inset-0 z-20 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 italic">
                            * Clique no mapa para definir as coordenadas exatas.
                        </p>
                    </div>
                </div>

                {coords && (
                    <div className="p-3 bg-brand-50 dark:bg-brand-900/10 rounded-xl flex items-center gap-3">
                        <Target className="w-4 h-4 text-brand-500" />
                        <span className="text-[11px] font-mono text-brand-700 dark:text-brand-300">
                            Lat: {coords.lat.toFixed(6)} | Lng: {coords.lng.toFixed(6)}
                        </span>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button
                        fullWidth
                        size="lg"
                        onClick={handleSave}
                        loading={loading}
                    >
                        <Send className="w-5 h-5 mr-2" />
                        Salvar Rua no Sistema
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export const StreetRequestsAdmin: React.FC = () => {
    const { alert, toast, confirm } = useDialog();
    const [requests, setRequests] = useState<StreetRequest[]>([]);
    const [approvedStreets, setApprovedStreets] = useState<ApprovedStreet[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'REQUESTS' | 'CATALOG'>('REQUESTS');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [requestsData, approvedData] = await Promise.all([
                cloud.adminGetStreetRequests(),
                cloud.adminGetAllApprovedStreets()
            ]);
            setRequests(requestsData);
            setApprovedStreets(approvedData);
        } catch (err) {
            console.error(err);
            toast({ message: 'Erro ao carregar dados.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request: StreetRequest, status: 'APPROVED' | 'REJECTED') => {
        const isApprove = status === 'APPROVED';

        const confirmed = await confirm({
            title: isApprove ? 'Aprovar Rua?' : 'Rejeitar Solicitação?',
            message: isApprove
                ? `Ao aprovar, a rua "${request.street_name}" ficará disponível globalmente para todos os usuários em ${request.city}. Confirmar?`
                : `Tem certeza que deseja rejeitar o cadastro da rua "${request.street_name}"?`,
            confirmButtonText: isApprove ? 'Aprovar Agora' : 'Rejeitar',
            cancelButtonText: 'Voltar'
        });

        if (!confirmed) return;

        try {
            const res = await cloud.adminProcessStreetRequest(request.id, status);
            if (res.success) {
                toast({
                    message: isApprove ? 'Rua aprovada e cadastrada com sucesso!' : 'Solicitação rejeitada.',
                    type: 'success'
                });
                fetchRequests();
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            toast({ message: 'Erro ao processar: ' + err.message, type: 'error' });
        }
    };

    const handleDeleteApproved = async (street: ApprovedStreet) => {
        const confirmed = await confirm({
            title: 'Excluir Rua do Catálogo?',
            message: `Tem certeza que deseja excluir a rua "${street.name}"? Isso pode afetar usuários que já utilizam esse endereço.`,
            confirmButtonText: 'Excluir'
        });

        if (!confirmed) return;

        try {
            const res = await cloud.adminDeleteApprovedStreet(street.id);
            if (res.success) {
                toast({ message: 'Rua removida do catálogo.', type: 'success' });
                fetchRequests();
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            toast({ message: 'Erro ao excluir: ' + err.message, type: 'error' });
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'ALL' || req.status === filter;
        const matchesSearch = req.street_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.city.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const filteredApproved = approvedStreets.filter(street => {
        return street.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            street.city.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Solicitações de Ruas</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie a expansão do catálogo de endereços</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsManualModalOpen(true)} variant="primary" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar rua manualmente
                    </Button>
                    <Button onClick={fetchRequests} variant="outline" size="sm">
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('REQUESTS')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'REQUESTS'
                        ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Solicitações ({requests.length})
                </button>
                <button
                    onClick={() => setActiveTab('CATALOG')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'CATALOG'
                        ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Catálogo Ativo ({approvedStreets.length})
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por rua ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                    />
                </div>
                {activeTab === 'REQUESTS' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-brand-500 text-white shadow-lg'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {f === 'PENDING' ? 'Pendentes' : f === 'APPROVED' ? 'Aprovadas' : f === 'REJECTED' ? 'Rejeitadas' : 'Todas'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)
                ) : activeTab === 'REQUESTS' ? (
                    filteredRequests.length > 0 ? (
                        filteredRequests.map((req) => (
                            <div key={req.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 transition-all group">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Info Box */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-2xl ${req.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                        'bg-brand-100 text-brand-600'
                                                    }`}>
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{req.street_name}</h3>
                                                    <p className="text-xs text-brand-500 font-black">{req.city} - {req.neighborhood || 'Bairro ñ inf.'}</p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${req.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                                req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                    'bg-brand-100 text-brand-600'
                                                }`}>
                                                {req.status}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[11px] text-gray-500 font-medium">{new Date(req.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[11px] text-gray-500 font-medium font-bold">{(req as any).user?.name || 'Sistema'}</span>
                                            </div>
                                            {req.reference && (
                                                <div className="flex items-center gap-2 col-span-2">
                                                    <Info className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-[11px] text-gray-500 font-medium italic truncate">"{req.reference}"</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Map/Coords Box */}
                                    <div className="md:w-64 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-2 border border-dashed border-gray-200 dark:border-gray-700">
                                        {req.latitude && req.longitude ? (
                                            <>
                                                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
                                                    <MapIcon className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <p className="text-[10px] font-mono text-gray-500">
                                                    {req.latitude.toFixed(6)}, {req.longitude.toFixed(6)}
                                                </p>
                                                <a
                                                    href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`}
                                                    target="_blank"
                                                    className="text-[10px] font-bold text-brand-500 hover:underline"
                                                >
                                                    Ver no Google Maps
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                                <p className="text-[10px] text-gray-400">Coordenadas não fornecidas</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {req.status === 'PENDING' && (
                                        <div className="flex md:flex-col gap-2 justify-center">
                                            <button
                                                onClick={() => handleAction(req, 'APPROVED')}
                                                className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg transition-transform hover:scale-105"
                                                title="Aprovar Rua"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleAction(req, 'REJECTED')}
                                                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-lg transition-transform hover:scale-105"
                                                title="Rejeitar Solicitação"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <MapPin className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                            <h3 className="font-bold text-gray-500 dark:text-gray-400">Nenhuma solicitação encontrada</h3>
                            <p className="text-xs text-gray-400">As solicitações serão exibidas aqui para sua análise.</p>
                        </div>
                    )
                ) : (
                    filteredApproved.length > 0 ? (
                        filteredApproved.map((street) => (
                            <div key={street.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 transition-all group">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-2xl bg-brand-100 text-brand-600">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{street.name}</h3>
                                                    <p className="text-xs text-brand-500 font-black">{street.city} - {street.neighborhood || 'Bairro ñ inf.'}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-wider">
                                                ATIVA
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[11px] text-gray-500 font-medium">Cadastrada em {street.created_at ? new Date(street.created_at).toLocaleDateString() : 'ñ inf.'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:w-64 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-2 border border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-[10px] font-mono text-gray-500">
                                            {street.latitude?.toFixed(6)}, {street.longitude?.toFixed(6)}
                                        </p>
                                        <a
                                            href={`https://www.google.com/maps?q=${street.latitude},${street.longitude}`}
                                            target="_blank"
                                            className="text-[10px] font-bold text-brand-500 hover:underline"
                                        >
                                            Ver no Google Maps
                                        </a>
                                    </div>

                                    <div className="flex md:flex-col gap-2 justify-center">
                                        <button
                                            onClick={() => handleDeleteApproved(street)}
                                            className="p-3 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 rounded-2xl transition-all"
                                            title="Remover do Catálogo"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <MapPin className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                            <h3 className="font-bold text-gray-500 dark:text-gray-400">Catálogo Vazio</h3>
                            <p className="text-xs text-gray-400">Não há ruas aprovadas cadastradas no banco de dados.</p>
                        </div>
                    )
                )}
            </div>

            {/* Manual Addition Modal */}
            <ManualStreetModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSaved={() => {
                    setIsManualModalOpen(false);
                    fetchRequests();
                }}
            />
        </div>
    );
};

