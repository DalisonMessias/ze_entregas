import React, { useState, useEffect, useRef } from 'react';
import { ListPlus, MapPin, Search, Plus, Trash2, Navigation, Loader2, Edit2, Check, X, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { RouteListItem, UserRole } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { ExclusiveLock } from './ExclusiveLock';
import { openNavigation } from '../utils/mapHelpers';

interface RouteListProps {
    userRole: UserRole;
    onNavigate?: (destination: {lat: number, lng: number, name: string, fullAddress: string}) => void;
}

export const RouteList: React.FC<RouteListProps> = ({ userRole, onNavigate }) => {
    const [items, setItems] = useState<RouteListItem[]>([]);
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // New state for city and feedback
    const [userCity, setUserCity] = useState<string>('');
    const [feedback, setFeedback] = useState<{type: 'error' | 'success', message: string} | null>(null);


    useEffect(() => {
        setItems(storage.getRouteListItems());
        const fetchProfile = async () => {
            if (userRole !== 'delivery_partner' && userRole !== 'delivery_person') return;
            try {
                const profile = await cloud.getMyPartnerProfile();
                if (profile?.city) {
                    // Extrai apenas o nome da cidade, ex: "São Paulo - SP" -> "São Paulo"
                    setUserCity(profile.city.split(' - ')[0].trim());
                } else {
                    setFeedback({ type: 'error', message: 'Sua cidade de atuação não está configurada no perfil.' });
                }
            } catch (e) {
                console.error("Failed to fetch profile for city", e);
                setFeedback({ type: 'error', message: 'Erro ao carregar dados do seu perfil.' });
            }
        };
        fetchProfile();
    }, [userRole]);

    const saveAndSetItems = (newItems: RouteListItem[]) => {
        setItems(newItems);
        storage.saveRouteListItems(newItems);
    };

    const handleAddAddress = async () => {
        if (!search.trim()) return;
        if (!userCity) {
            setFeedback({ type: 'error', message: 'Sua cidade não está configurada no perfil. Não é possível adicionar endereços.' });
            return;
        }

        setIsSearching(true);
        setFeedback(null);

        try {
            const response = await fetch(`https://api.geocode.br/search?q=${encodeURIComponent(search)}&municipio=${encodeURIComponent(userCity)}`);
            if (!response.ok) throw new Error("Falha na comunicação com a API de endereços.");
            
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const result = data.features[0];
                const properties = result.properties;
                
                // Validação estrita da cidade
                if (properties.city.toLowerCase() !== userCity.toLowerCase()) {
                    setFeedback({ type: 'error', message: "Endereço inválido. O endereço informado não pertence à sua cidade cadastrada." });
                    setIsSearching(false);
                    return;
                }
                
                const newItem: RouteListItem = {
                    id: crypto.randomUUID(),
                    address: properties.label, // Endereço completo retornado pela API
                    name: search.split(',')[0].trim(), // Nome curto baseado na busca
                    lat: result.geometry.coordinates[1], // Latitude
                    lng: result.geometry.coordinates[0], // Longitude
                    completed: false
                };
                
                saveAndSetItems([newItem, ...items]);
                setSearch('');
                setFeedback({ type: 'success', message: 'Endereço adicionado com sucesso!' });
                setTimeout(() => setFeedback(null), 4000);

            } else {
                setFeedback({ type: 'error', message: `Endereço não encontrado em ${userCity}. Tente ser mais específico.` });
            }
        } catch (e: any) {
            setFeedback({ type: 'error', message: e.message || 'Erro ao buscar endereço. Verifique sua conexão.' });
        } finally {
            setIsSearching(false);
        }
    };


    const handleDelete = (id: string) => {
        if (!confirm("Remover este endereço da lista?")) return;
        const newItems = items.filter(i => i.id !== id);
        saveAndSetItems(newItems);
    };

    const handleNavigate = (item: RouteListItem) => {
        if (onNavigate) {
            onNavigate({ lat: item.lat, lng: item.lng, name: item.name, fullAddress: item.address });
        } else {
            openNavigation(item.lat, item.lng, item.address);
        }
    };

    const startEditing = (item: RouteListItem) => {
        setEditingId(item.id);
        setEditName(item.name);
    };

    const saveEdit = (id: string) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                return { ...item, name: editName };
            }
            return item;
        });
        saveAndSetItems(newItems);
        setEditingId(null);
        setEditName('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    // Access Control for Non-Partners
    if (userRole !== 'delivery_partner' && userRole !== 'delivery_person') {
        return (
            <ExclusiveLock 
                title="Lista de Rotas"
                description="Organize suas entregas em sequência e otimize seu tempo na rua. Exclusivo para parceiros."
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-24 px-2">
            {/* Header Clean */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <ListPlus className="w-6 h-6 text-purple-600" />
                    <h1 className="text-xl font-black text-gray-900 dark:text-white">Minhas Listas</h1>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAddAddress()}
                            placeholder="Adicionar: Rua, Número, Bairro..."
                            className="w-full pl-9 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white text-sm transition-all"
                        />
                    </div>
                    <Button onClick={handleAddAddress} disabled={isSearching} className="px-4 bg-purple-600 hover:bg-purple-700">
                        {isSearching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
                    </Button>
                </div>
                
                {feedback && (
                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in ${feedback.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300'}`}>
                        {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                        {feedback.message}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-12 border-t border-gray-100 dark:border-gray-800 mt-4">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                        <p className="text-gray-400 font-medium">Sua lista está vazia.</p>
                        <p className="text-xs text-gray-400 mt-1">Adicione endereços para agilizar seu dia.</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.id} className="flex flex-col bg-white dark:bg-gray-800 p-4 rounded-xl border-b border-gray-100 dark:border-gray-700">
                            
                            {/* Content Row */}
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                                    {index + 1}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    {editingId === item.id ? (
                                        <div className="flex items-center gap-2 mb-1">
                                            <input 
                                                type="text" 
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full p-1 bg-gray-50 dark:bg-gray-700 border-b border-purple-500 outline-none text-sm font-bold dark:text-white"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit(item.id)} className="text-green-500"><Check className="w-4 h-4"/></button>
                                            <button onClick={cancelEdit} className="text-red-500"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 dark:text-white text-base truncate">{item.name}</p>
                                            <button onClick={() => startEditing(item)} className="text-gray-300 hover:text-purple-500 transition-colors">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.address}</p>
                                </div>
                            </div>

                            {/* Actions Row */}
                            <div className="flex gap-2 pl-11">
                                <Button 
                                    onClick={() => handleNavigate(item)} 
                                    className="flex-1 py-2 h-auto text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                                >
                                    <Navigation className="w-3 h-3 mr-1.5" /> {onNavigate ? 'Navegação Interna' : 'Abrir no Waze'}
                                </Button>
                                
                                <button 
                                    onClick={() => handleDelete(item.id)} 
                                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    title="Deletar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};