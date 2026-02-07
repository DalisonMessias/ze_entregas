import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUserCity } from '../hooks/useUserCity';
import { Copy, Download, MapPin, Route, RefreshCw, AlertCircle, Edit3, List, Navigation } from 'lucide-react';
import { CitySearchSelect } from '../../components/CitySearchSelect';
import { CustomInput } from '../../components/CustomInput';
import { useDialog } from '../../utils/dialogService';
import * as cloud from '../../services/cloud';
import { saveNavigationState } from '../../utils/mapHelpers';
import { UserRole } from '../../types';

interface BoundingBox {
    south: number;
    west: number;
    north: number;
    east: number;
}

interface StreetsData {
    cidade: string;
    bbox: BoundingBox;
    ruas: string[];
    contagens: { ruas: number };
    meta: {
        nominatim: {
            query: string;
            result_count: number;
        };
        overpass: {
            query_summary: string;
            elements_returned: number;
        };
    };
    fetchedAt: string;
    source: string;
    error: string | null;
}

export default function StreetsList() {
    const { toast } = useDialog();
    const [data, setData] = useState<StreetsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [copyingAll, setCopyingAll] = useState(false);
    const [copyingItem, setCopyingItem] = useState<string | null>(null);
    const [openingMap, setOpeningMap] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { city, displayName, loading: cityLoading } = useUserCity();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isManualMode, setIsManualMode] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const loadUserRole = async () => {
            const userData = await cloud.getInitialUserData();
            if (userData?.role) setUserRole(userData.role);
        };
        loadUserRole();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (!selectedCity && (displayName || city)) {
            setSelectedCity(displayName || city || '');
        }
    }, [displayName, city, selectedCity]);

    const fetchData = useCallback(async (retries = 3) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const searchTarget = selectedCity || city;

            if (!searchTarget) {
                setError('Selecione uma cidade ou digite manualmente.');
                setLoading(false);
                return;
            }

            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(searchTarget)}`;

            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'OSM-Ruas-V2/1.0 (educativo)' },
                signal: controller.signal
            });

            if (!nominatimRes.ok) throw new Error(`Nominatim HTTP ${nominatimRes.status}`);

            const nominatimData = await nominatimRes.json();

            if (!nominatimData || nominatimData.length === 0) {
                throw new Error('Cidade não encontrada. Tente "Cidade, Estado".');
            }

            const cityInfo = nominatimData[0];
            const bbox = {
                south: parseFloat(cityInfo.boundingbox[0]),
                north: parseFloat(cityInfo.boundingbox[1]),
                west: parseFloat(cityInfo.boundingbox[2]),
                east: parseFloat(cityInfo.boundingbox[1])
            };

            const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${cityInfo.boundingbox[0]},${cityInfo.boundingbox[2]},${cityInfo.boundingbox[1]},${cityInfo.boundingbox[3]}););out tags;`;

            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'OSM-Ruas-V2/1.0 (educativo)'
                },
                body: 'data=' + encodeURIComponent(overpassQuery),
                signal: controller.signal
            });

            if (!overpassRes.ok) throw new Error(`Overpass HTTP ${overpassRes.status}`);

            const overpassData = await overpassRes.json();
            const ruasSet = new Set<string>();

            if (overpassData.elements) {
                for (const elem of overpassData.elements) {
                    if (elem.tags?.name && elem.type === 'way' && elem.tags.highway) {
                        ruasSet.add(elem.tags.name);
                    }
                }
            }

            const ruas = Array.from(ruasSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

            setData({
                cidade: cityInfo.name || searchTarget,
                bbox,
                ruas,
                contagens: { ruas: ruas.length },
                meta: {
                    nominatim: {
                        query: nominatimUrl,
                        result_count: nominatimData.length
                    },
                    overpass: {
                        query_summary: `BBox: ${cityInfo.boundingbox[0]},${cityInfo.boundingbox[2]},${cityInfo.boundingbox[1]},${cityInfo.boundingbox[3]}`,
                        elements_returned: overpassData.elements?.length || 0
                    }
                },
                fetchedAt: new Date().toISOString(),
                source: 'openstreetmap',
                error: null
            });
            setQuery('');
            setLoading(false);
            setError(null);
        } catch (err: any) {
            if (err.name === 'AbortError') return;

            if (retries > 0) {
                const delay = Math.pow(2, 3 - retries) * 1000;
                setTimeout(() => fetchData(retries - 1), delay);
            } else {
                setError(`Erro: ${err.message}`);
                setLoading(false);
            }
        }
    }, [selectedCity, city]);

    useEffect(() => {
        if (cityLoading) {
            setLoading(true);
            return;
        }
        if (selectedCity) {
            fetchData();
        }
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [cityLoading, selectedCity, fetchData]);

    useEffect(() => {
        if (!data?.ruas || !debouncedQuery.trim()) {
            setSuggestions([]);
            return;
        }

        const src = data.ruas;
        const q = debouncedQuery.trim().toLowerCase();

        const scored = src.map(r => {
            const rl = r.toLowerCase();
            let score = 0;
            if (rl.startsWith(q)) score = 3;
            else if (rl.includes(q)) score = 2 - rl.indexOf(q) * 0.001;
            else score = 0;
            return { r, score };
        })
            .filter(x => x.score > 0)
            .sort((x, y) => y.score - x.score)
            .slice(0, 12)
            .map(x => x.r);

        setSuggestions(scored);
    }, [debouncedQuery, data]);

    const copyToClipboard = async (text: string, itemId?: string) => {
        try {
            if (itemId) setCopyingItem(itemId);
            await navigator.clipboard.writeText(text);
            toast({ message: 'Copiado!', type: 'success' });
            setTimeout(() => { if (itemId) setCopyingItem(null); }, 1000);
        } catch (err) {
            toast({ message: 'Erro ao copiar', type: 'error' });
        }
    };

    const handleOpenMap = async (rua: string) => {
        setOpeningMap(rua);
        try {
            const query = `${rua}, ${data?.cidade || ''}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await response.json();

            if (results && results.length > 0) {
                const { lat, lon } = results[0];
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);

                if (userRole === 'delivery_person' || userRole === 'delivery_partner') {
                    // Abrir no GPS Interno
                    saveNavigationState({
                        active: true,
                        destination: {
                            lat: latitude,
                            lng: longitude,
                            address: results[0].display_name,
                            label: rua
                        },
                        vehicle_type: 'moto',
                        return_tab: 'streets_list'
                    });
                    const event = new CustomEvent('navigateToTab', { detail: { tab: 'delivery_navigation' } });
                    window.dispatchEvent(event);
                } else {
                    // Abrir no Google Maps
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
                }
            } else {
                toast({ message: 'Não foi possível encontrar as coordenadas desta rua.', type: 'error' });
            }
        } catch (err) {
            toast({ message: 'Erro ao buscar localização da rua.', type: 'error' });
        } finally {
            setOpeningMap(null);
        }
    };

    const copyAllStreets = async () => {
        if (!data?.ruas.length) return;
        setCopyingAll(true);
        await copyToClipboard(data.ruas.join('\n'));
        setCopyingAll(false);
    };

    const downloadCSV = () => {
        if (!data) return;
        const csvContent = ['Rua', ...data.ruas].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ruas-${data.cidade.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 animate-pulse">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="h-40 bg-white dark:bg-gray-900 rounded-[32px] shadow-sm"></div>
                    <div className="h-64 bg-white dark:bg-gray-900 rounded-[32px] shadow-sm"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-xl text-center border border-gray-100 dark:border-gray-800">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ops! Ocorreu um erro</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{error}</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => fetchData()} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:scale-95 transition-all">
                            <RefreshCw className="w-5 h-5" /> Tentar Novamente
                        </button>
                        <button onClick={() => { setError(null); setIsManualMode(true); }} className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold active:scale-95 transition-all">
                            Selecionar Outra Cidade
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                        <MapPin className="w-40 h-40" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-3xl flex items-center justify-center text-brand-600">
                                <MapPin className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Ruas por Cidade</h1>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Explore o mapeamento completo de ruas da sua região</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <div className="px-5 py-3 bg-brand-50 dark:bg-brand-900/30 rounded-2xl border border-brand-100 dark:border-brand-800">
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Cidade Atual</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{data.cidade}</p>
                            </div>
                            <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ruas Mapeadas</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{data.contagens.ruas.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[28px] p-5 border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    Localização de Busca
                                </label>
                                <button onClick={() => setIsManualMode(!isManualMode)} className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                                    {isManualMode ? <><List className="w-3 h-3" /> Usar Lista</> : <><Edit3 className="w-3 h-3" /> Digitar Manual</>}
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    {isManualMode ? (
                                        <CustomInput value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="Ex: São Paulo - SP" />
                                    ) : (
                                        <CitySearchSelect value={selectedCity} onSelect={(c) => setSelectedCity(`${c.name} - ${c.state}`)} placeholder="Selecione uma cidade..." />
                                    )}
                                </div>
                                <button onClick={() => fetchData()} className="px-6 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-600/20 active:scale-95 transition-all">
                                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 w-full relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <Route className="w-5 h-5" />
                            </div>
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Filtrar por nome da rua..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none font-medium text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={copyAllStreets} disabled={copyingAll || !data.ruas.length} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-all">
                                <Copy className="w-4 h-4" /> Copiar Tudo
                            </button>
                            <button onClick={downloadCSV} disabled={!data.ruas.length} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50">
                                <Download className="w-4 h-4" /> CSV
                            </button>
                        </div>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-gray-100 dark:border-gray-800/50 space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Sugestões de busca</p>
                            {suggestions.map((rua, index) => (
                                <button key={index} onClick={() => copyToClipboard(rua, `sug-${index}`)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 flex items-center justify-between group transition-all">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-brand-600 transition-colors">{rua}</span>
                                    <div className="flex items-center gap-2">
                                        <Copy className="w-4 h-4 text-gray-300 group-hover:text-brand-600" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* List Container */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center text-brand-600">
                                <List className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Listagem Completa</h2>
                        </div>
                        <span className="px-4 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 text-xs font-black rounded-full border border-brand-100 dark:border-brand-800">{data.ruas.length} Ruas</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.ruas.map((rua, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-brand-100 dark:hover:border-brand-900 hover:bg-white dark:hover:bg-gray-800 transition-all group">
                                <span className="text-gray-700 dark:text-gray-300 font-bold text-sm truncate mr-4">{rua}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleOpenMap(rua)}
                                        disabled={openingMap === rua}
                                        title="Abrir no Mapa"
                                        className="p-3 bg-white dark:bg-gray-700 text-brand-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 hover:bg-brand-600 hover:text-white active:scale-95 transition-all"
                                    >
                                        {openingMap === rua ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(rua, `rua-${index}`)}
                                        className="p-3 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-600/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
                                    >
                                        {copyingItem === `rua-${index}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
