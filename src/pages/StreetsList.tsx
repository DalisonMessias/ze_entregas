import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { baseURL } from '../utils/baseURL';
import { useUserCity } from '../hooks/useUserCity';
import { Copy, Download, MapPin, Route, RefreshCw, AlertCircle, Edit3, List } from 'lucide-react';
import { CitySearchSelect } from '../../components/CitySearchSelect';
import { CustomInput } from '../../components/CustomInput';
import { useDialog } from '../../utils/dialogService';

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
    const [error, setError] = useState<string | null>(null);
    const { city, displayName, loading: cityLoading } = useUserCity();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isManualMode, setIsManualMode] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

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
                east: parseFloat(cityInfo.boundingbox[3])
            };

            const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out tags;`;

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
                        query_summary: `BBox: ${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
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
            else {
                const m = rl.length; const n = q.length;
                if (n > 20) return { r, score: 0 };
                const dp = Array(n + 1).fill(0).map((_, i) => i);
                for (let i = 1; i <= m; i++) {
                    let prev = dp[0]; dp[0] = i;
                    for (let j = 1; j <= n; j++) {
                        const temp = dp[j];
                        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (rl[i - 1] === q[j - 1] ? 0 : 1));
                        prev = temp;
                    }
                }
                score = 1 / (1 + dp[n]);
            }
            return { r, score };
        })
            .filter(x => x.score > 0.2)
            .sort((x, y) => y.score - x.score)
            .slice(0, 12)
            .map(x => x.r);

        setSuggestions(scored);
    }, [debouncedQuery, data]);

    const copyToClipboard = async (text: string, itemId?: string) => {
        try {
            if (itemId) setCopyingItem(itemId);
            await navigator.clipboard.writeText(text);
            setTimeout(() => { if (itemId) setCopyingItem(null); }, 1000);
        } catch (err) {
            toast({ message: 'Erro ao copiar para a área de transferência', type: 'error' });
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
            <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-7 w-48 bg-gray-200 rounded"></div>
                            <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-20 bg-gray-100 rounded-lg"></div>
                            <div className="h-20 bg-gray-100 rounded-lg"></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 h-32"></div>
                    <div className="bg-white rounded-lg shadow-sm p-6 h-64"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center mb-4 text-red-800">
                            <AlertCircle className="h-6 w-6 mr-2" />
                            <h2 className="text-lg font-semibold">Erro ao carregar dados</h2>
                        </div>
                        <p className="text-red-700 mb-4">{error}</p>
                        <div className="flex gap-2">
                            <button onClick={() => fetchData()} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg">
                                <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                            </button>
                            <button onClick={() => { setError(null); setIsManualMode(true); }} className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg">
                                <Edit3 className="h-4 w-4 mr-2" /> Mudar Cidade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center">
                            <MapPin className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Ruas por Cidade</h1>
                                <p className="text-sm text-gray-500">Busque todas as ruas de qualquer cidade</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Cidade Selecionada
                            </label>
                            <button onClick={() => setIsManualMode(!isManualMode)} className="text-xs text-blue-600 underline flex items-center gap-1">
                                {isManualMode ? <><List className="w-3 h-3" /> Buscar na Lista</> : <><Edit3 className="w-3 h-3" /> Digitar manualmente</>}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                {isManualMode ? (
                                    <CustomInput value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="Cidade - UF" />
                                ) : (
                                    <CitySearchSelect value={selectedCity} onSelect={(c) => setSelectedCity(`${c.name} - ${c.state}`)} placeholder="Pesquise..." />
                                )}
                            </div>
                            <button onClick={() => fetchData()} className="px-4 py-2 bg-blue-600 text-white rounded-lg h-[42px] mt-[1px]">
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h3 className="font-bold text-blue-900 text-lg">{data.cidade}</h3>
                            <p className="text-xs text-blue-700">Cidade Atual</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <h3 className="font-bold text-green-900 text-lg">{data.contagens.ruas.toLocaleString()}</h3>
                            <p className="text-xs text-green-700">Ruas Mapeadas</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Rua</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite o nome da rua" className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        <button onClick={copyAllStreets} disabled={copyingAll || !data.ruas.length} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">
                            <Copy className="h-4 w-4 mr-2" /> {copyingAll ? 'Copiando...' : 'Copiar Todas'}
                        </button>
                        <button onClick={downloadCSV} disabled={!data.ruas.length} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400">
                            <Download className="h-4 w-4 mr-2" /> Baixar CSV
                        </button>
                    </div>
                    {suggestions.length > 0 && (
                        <div className="mt-4 max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-gray-200">
                            {suggestions.map((rua, index) => (
                                <button key={index} onClick={() => copyToClipboard(rua, `sug-${index}`)} className="w-full text-left px-3 py-2 rounded-md hover:bg-white flex items-center justify-between">
                                    <span className="text-gray-800 text-sm">{rua}</span>
                                    {copyingItem === `sug-${index}` ? <span>✓</span> : <Copy className="h-3 w-3 text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-4">
                        <Route className="h-5 w-5 text-blue-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">Lista de Ruas</h2>
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{data.ruas.length}</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {data.ruas.map((rua, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-800 text-sm flex-1">{rua}</span>
                                <button onClick={() => copyToClipboard(rua, `rua-${index}`)} className="p-2 bg-blue-600 text-white rounded">
                                    {copyingItem === `rua-${index}` ? '✓' : <Copy className="h-3 w-3" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
