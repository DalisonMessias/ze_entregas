import React, { useState, useEffect, useRef } from 'react';
import { ListPlus, MapPin, Search, Plus, Trash2, Navigation, Loader2, Edit2, Check, X, Lock, AlertTriangle, CheckCircle, Mic, Info } from 'lucide-react';
import { RouteListItem, UserRole } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { ExclusiveLock } from './ExclusiveLock';
import { BaseModal } from './BaseModal';
import { openNavigation } from '../utils/mapHelpers';
import { useDialog } from '../utils/dialogService';

interface RouteListProps {
    userRole: UserRole;
    onNavigate?: (destination: { lat: number, lng: number, name: string, fullAddress: string }) => void;
}

interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

export const RouteList: React.FC<RouteListProps> = ({ userRole, onNavigate }) => {
    const [items, setItems] = useState<RouteListItem[]>([]);

    // Form States
    const [search, setSearch] = useState(''); // Street
    const [newItemName, setNewItemName] = useState('');
    const [newItemNumber, setNewItemNumber] = useState('');
    const [newItemNeighborhood, setNewItemNeighborhood] = useState('');

    const [isSearching, setIsSearching] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // New state for city and feedback
    const [userCity, setUserCity] = useState<string>('');
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);

    // Info Modal State
    const [infoItem, setInfoItem] = useState<RouteListItem | null>(null);

    // Voice Input State
    const [listeningField, setListeningField] = useState<'name' | 'search' | null>(null);

    const handleVoiceInput = async (field: 'name' | 'search') => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setFeedback({ type: 'error', message: 'Seu navegador não suporta reconhecimento de voz.' });
            return;
        }

        if (listeningField === field) {
            setListeningField(null);
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        setListeningField(field);

        recognition.onstart = () => {
            setListeningField(field);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (field === 'name') {
                setNewItemName(transcript);
            } else {
                setSearch(transcript);
            }
            setListeningField(null);
        };

        recognition.onerror = (event: any) => {
            setListeningField(null);
            if (event.error !== 'no-speech') {
                setFeedback({ type: 'error', message: 'Erro no microfone ou permissão negada.' });
            }
        };

        recognition.onend = () => {
            setListeningField(null);
        };

        try {
            recognition.start();
        } catch (e) {
            // console.error(e);
        }
    };


    useEffect(() => {
        setItems(storage.getRouteListItems());
        const fetchProfile = async () => {
            setIsProfileLoading(true);
            if (userRole !== 'delivery_partner' && userRole !== 'delivery_person') {
                setIsProfileLoading(false);
                return;
            }
            try {
                const profile = await cloud.getMyPartnerProfile();
                if (profile?.city) {
                    setUserCity(profile.city.trim());
                } else {
                    setFeedback({ type: 'error', message: 'Sua cidade de atuação não está configurada no perfil.' });
                }
            } catch (e) {
                // console.error("Failed to fetch profile for city", e);
                setFeedback({ type: 'error', message: 'Erro ao carregar dados do seu perfil.' });
            } finally {
                setIsProfileLoading(false);
            }
        };
        fetchProfile();
    }, [userRole]);

    const saveAndSetItems = (newItems: RouteListItem[]) => {
        setItems(newItems);
        storage.saveRouteListItems(newItems);
    };

    const handleAddAddress = async () => {
        // search is street, number and neighborhood are also required. Name is optional.
        if (!search.trim() || !newItemNumber.trim() || !newItemNeighborhood.trim()) {
            setFeedback({ type: 'error', message: 'Preencha a rua, número e bairro para adicionar um endereço.' });
            return;
        }
        if (!userCity) {
            setFeedback({ type: 'error', message: 'Sua cidade não está configurada no perfil. Não é possível adicionar endereços.' });
            return;
        }

        setIsSearching(true);
        setFeedback(null);

        // Helper to perform search
        const performSearch = async (term: string): Promise<any> => {
            const query = `${term.trim()} ${userCity}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("Falha na comunicação com a API de endereços.");
            const data = await response.json();
            return data && data.length > 0 ? data[0] : null;
        };

        try {
            // 1. Try exact search
            let result = await performSearch(search);

            // 2. If valid result not found, try relaxed search (remove "Rua", "Av", etc.)
            if (!result) {
                const cleanedSearch = search.replace(/^(Rua|Avenida|Av\.|Travessa|Al\.|Alameda)\s+/i, '').trim();
                const cleanedSearchDe = cleanedSearch.replace(/\s+(de|da|do|dos|das)\s+/gi, ' ').trim();

                // Only retry if the cleaned term is significantly different
                if (cleanedSearchDe !== search.trim()) {
                    result = await performSearch(cleanedSearchDe);
                }
            }

            if (result) {
                const resultCity = result.address.city || result.address.town || result.address.village || result.address.suburb;

                // Fuzzy city check (contains is safer than exact match case)
                if (!resultCity || !userCity.toLowerCase().includes(resultCity.toLowerCase()) && !resultCity.toLowerCase().includes(userCity.toLowerCase())) {
                    // Even if strict city check fails, let's look if result address contains the city string anywhere in display_name
                    if (!result.display_name.toLowerCase().includes(userCity.toLowerCase())) {
                        setFeedback({ type: 'error', message: `Endereço encontrado em outra cidade (${resultCity || 'Desconhecida'}). O endereço deve ser em ${userCity}.` });
                        setIsSearching(false);
                        return;
                    }
                }

                // Construct the address as requested
                const formattedAddress = `${search.trim()}, ${newItemNumber.trim()}, ${newItemNeighborhood.trim()}, ${userCity}`;

                const newItem: RouteListItem = {
                    id: crypto.randomUUID(),
                    address: formattedAddress,
                    name: newItemName.trim() || search.trim(), // Use provided name or fallback to street name
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    completed: false
                };

                saveAndSetItems([newItem, ...items]);
                // Clear all inputs
                setSearch('');
                setNewItemName('');
                setNewItemNumber('');
                setNewItemNeighborhood('');
                setFeedback({ type: 'success', message: 'Endereço adicionado com sucesso!' });
                setTimeout(() => setFeedback(null), 4000);

            } else {
                setFeedback({ type: 'error', message: `Endereço não encontrado em ${userCity}. Tente remover "Rua" ou simplificar o nome.` });
            }
        } catch (e: any) {
            setFeedback({ type: 'error', message: e.message || 'Erro ao buscar endereço. Verifique sua conexão.' });
        } finally {
            setIsSearching(false);
        }
    };


    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'Remover endereço', message: 'Remover este endereço da lista?' });
        if (!ok) return;
        const newItems = items.filter(i => i.id !== id);
        saveAndSetItems(newItems);
    };

    const handleNavigate = (item: RouteListItem) => {
        // User requested Waze navigation specifically
        openNavigation(item.lat, item.lng, item.address);

        if (onNavigate) {
            onNavigate({ lat: item.lat, lng: item.lng, name: item.name, fullAddress: item.address });
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

    const { confirm } = useDialog();
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

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="relative flex-grow max-w-[180px]">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="Nome (Opcional)"
                            className="w-full p-3 pr-8 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white text-sm transition-all disabled:opacity-50"
                            disabled={isProfileLoading || isSearching}
                        />
                        <button
                            onClick={() => handleVoiceInput('name')}
                            className={`absolute right-2 top-2.5 p-1 rounded-full ${listeningField === 'name' ? 'bg-red-100 text-red-500' : 'text-gray-400 hover:text-purple-500'}`}
                            disabled={isProfileLoading || isSearching}
                        >
                            <Mic className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="relative flex-grow min-w-[180px]">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Endereço (Rua)"
                            className="w-full p-3 pr-8 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white text-sm transition-all disabled:opacity-50"
                            disabled={isProfileLoading || isSearching}
                        />
                        <button
                            onClick={() => handleVoiceInput('search')}
                            className={`absolute right-2 top-2.5 p-1 rounded-full ${listeningField === 'search' ? 'bg-red-100 text-red-500' : 'text-gray-400 hover:text-purple-500'}`}
                            disabled={isProfileLoading || isSearching}
                        >
                            <Mic className="w-3 h-3" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={newItemNumber}
                        onChange={e => setNewItemNumber(e.target.value)}
                        placeholder="N°"
                        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white text-sm transition-all disabled:opacity-50 w-[80px]"
                        disabled={isProfileLoading || isSearching}
                    />
                    <input
                        type="text"
                        value={newItemNeighborhood}
                        onChange={e => setNewItemNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white text-sm transition-all disabled:opacity-50 flex-grow max-w-[200px]"
                        disabled={isProfileLoading || isSearching}
                    />

                    <Button
                        onClick={handleAddAddress}
                        disabled={isProfileLoading || isSearching}
                        className="h-[50px] w-[100px] bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-sm"
                    >
                        {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Adicionar"}
                    </Button>
                </div>

                {feedback && (
                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in ${feedback.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300'}`}>
                        {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {feedback.message}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-12 border-t border-gray-100 dark:border-gray-800 mt-4">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-400 font-medium">Sua lista está vazia.</p>
                        <p className="text-xs text-gray-400 mt-1">Adicione endereços para agilizar seu dia.</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.id} className="flex flex-row items-center bg-white dark:bg-gray-800 p-4 rounded-xl border-b border-gray-100 dark:border-gray-700 gap-4">

                            {/* Content Section */}
                            <div className="flex-1 flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1">
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
                                            <button onClick={() => saveEdit(item.id)} className="text-green-500"><Check className="w-4 h-4" /></button>
                                            <button onClick={cancelEdit} className="text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 dark:text-white text-base truncate">{item.name}</p>
                                            <button onClick={() => startEditing(item)} className="text-gray-300 hover:text-purple-500 transition-colors">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{item.address}</p>
                                </div>
                            </div>

                            {/* Actions Section */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    onClick={() => handleNavigate(item)}
                                    className="px-4 py-2 h-auto text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm whitespace-nowrap"
                                >
                                    <Navigation className="w-3 h-3 mr-1.5" /> Abrir no Waze
                                </Button>

                                <button
                                    onClick={() => setInfoItem(item)}
                                    className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                    title="Detalhes"
                                >
                                    <Info className="w-4 h-4" />
                                </button>

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

            {/* Info Modal */}
            <BaseModal
                isOpen={!!infoItem}
                onClose={() => setInfoItem(null)}
                title="Detalhes do Endereço"
                icon={<Info className="w-6 h-6 text-blue-500" />}
            >
                {infoItem && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Nome / Identificador</h4>
                                <p className="text-gray-900 dark:text-white font-medium">{infoItem.name}</p>
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-gray-700" />

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Endereço Completo</h4>
                                <p className="text-gray-900 dark:text-white text-sm leading-relaxed">{infoItem.address}</p>
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-gray-700" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Latitude</h4>
                                    <p className="text-gray-700 dark:text-gray-300 text-xs font-mono">{infoItem.lat}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Longitude</h4>
                                    <p className="text-gray-700 dark:text-gray-300 text-xs font-mono">{infoItem.lng}</p>
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-gray-700" />

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Status</h4>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${infoItem.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {infoItem.completed ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {infoItem.completed ? 'Concluído' : 'Pendente'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setInfoItem(null)} variant="outline">
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </BaseModal>
        </div>
    );
};