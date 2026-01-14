import React, { useState, useEffect } from 'react';
import { baseURL } from '../utils/baseURL';
import { useUserCity } from '../hooks/useUserCity';
import { Copy, Download, MapPin, Route, RefreshCw, AlertCircle, Edit3, List } from 'lucide-react';
import { CitySearchSelect } from '../../components/CitySearchSelect';
import { CustomInput } from '../../components/CustomInput';

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
    const [data, setData] = useState<StreetsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [copyingAll, setCopyingAll] = useState(false);
    const [copyingItem, setCopyingItem] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { city, displayName, loading: cityLoading, error: cityError } = useUserCity();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Estados para controle de cidade
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isManualMode, setIsManualMode] = useState(false);

    console.log('[StreetsList] Component mounted. baseURL:', baseURL, 'city:', city);

    // Inicializa a cidade selecionada com a cidade do usuário
    useEffect(() => {
        if (!selectedCity && (displayName || city)) {
            setSelectedCity(displayName || city || '');
        }
    }, [displayName, city]);

    const fetchData = async (retriesOrEvent?: number | React.MouseEvent<HTMLButtonElement>) => {
        const retries = typeof retriesOrEvent === 'number' ? retriesOrEvent : 3;
        setLoading(true);
        setError(null);

        try {
            // Usa a cidade selecionada ou a do perfil como fallback
            const searchTarget = selectedCity || city;

            if (!searchTarget) {
                setError('Selecione uma cidade ou digite manualmente.');
                setLoading(false);
                return;
            }

            console.log('[StreetsList] Fetching data for city:', searchTarget);

            // Step 1: Get city info from Nominatim
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(searchTarget)}`;
            console.log('[StreetsList] Calling Nominatim:', nominatimUrl);

            const nominatimRes = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'OSM-Ruas-V2/1.0 (educativo)' }
            });

            if (!nominatimRes.ok) {
                throw new Error(`Nominatim HTTP ${nominatimRes.status}`);
            }

            const nominatimData = await nominatimRes.json();
            console.log('[StreetsList] Nominatim response:', nominatimData);

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

            // Step 2: Get streets from Overpass (REMOVIDO BAIRROS DA QUERY)
            // Query otimizada para buscar APENAS ruas (way["highway"]["name"])
            const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out tags;`;

            console.log('[StreetsList] Calling Overpass API');

            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'OSM-Ruas-V2/1.0 (educativo)'
                },
                body: 'data=' + encodeURIComponent(overpassQuery)
            });

            if (!overpassRes.ok) {
                throw new Error(`Overpass HTTP ${overpassRes.status}`);
            }

            const responseText = await overpassRes.text();
            console.log('[StreetsList] Overpass raw response starts with:', responseText.substring(0, 50));

            const overpassData = JSON.parse(responseText);
            console.log('[StreetsList] Overpass response elements:', overpassData.elements?.length);

            // Extract unique street names
            const ruasSet = new Set<string>();

            if (overpassData.elements) {
                for (const elem of overpassData.elements) {
                    if (elem.tags?.name) {
                        if (elem.type === 'way' && elem.tags.highway) {
                            ruasSet.add(elem.tags.name);
                        }
                    }
                }
            }

            const ruas = Array.from(ruasSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

            console.log('[StreetsList] Extracted', ruas.length, 'streets');

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
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error('[StreetsList] Error:', errMsg, 'Retries remaining:', retries - 1);

            if (retries > 0) {
                const delay = Math.pow(2, 3 - retries) * 1000;
                console.log('[StreetsList] Retrying in', delay, 'ms');
                setTimeout(() => fetchData(retries - 1), delay);
            } else {
                setError(`Erro: ${errMsg}`);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (cityLoading) {
            setLoading(true);
            return;
        }
        // Nota: Não disparamos erro imediatamente se !city, pois usuário pode selecionar manualmente agora
        if (selectedCity) {
            void fetchData();
        }
    }, [cityLoading, selectedCity]); // Dispara quando selectedCity mudar e estiver pronto

    useEffect(() => {
        if (!data?.ruas) { setSuggestions([]); return; }
        const src = data.ruas;
        const q = query.trim().toLowerCase();
        if (!q) { setSuggestions([]); return; }
        const scored = src.map(r => {
            const rl = r.toLowerCase();
            let score = 0;
            if (rl.startsWith(q)) score = 3;
            else if (rl.includes(q)) score = 2 - rl.indexOf(q) * 0.001;
            else {
                const a = rl; const b = q;
                const m = a.length; const n = b.length;
                const dp = Array(n + 1).fill(0);
                for (let i = 0; i <= n; i++) dp[i] = i;
                for (let i = 1; i <= m; i++) {
                    let prev = dp[0]; dp[0] = i;
                    for (let j = 1; j <= n; j++) {
                        const temp = dp[j];
                        dp[j] = Math.min(
                            dp[j] + 1,
                            dp[j - 1] + 1,
                            prev + (a[i - 1] === b[j - 1] ? 0 : 1)
                        );
                        prev = temp;
                    }
                }
                const dist = dp[n];
                score = 1 / (1 + dist);
            }
            return { r, score };
        })
            .sort((x, y) => y.score - x.score)
            .slice(0, 12)
            .map(x => x.r);
        setSuggestions(scored);
    }, [query, data]);

    const copyToClipboard = async (text: string, itemId?: string) => {
        try {
            if (itemId) {
                setCopyingItem(itemId);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback para navegadores antigos
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            // Mostrar feedback visual
            setTimeout(() => {
                if (itemId) {
                    setCopyingItem(null);
                }
            }, 1000);

        } catch (err) {
            console.error('Erro ao copiar:', err);
            alert('Erro ao copiar para a área de transferência');
        }
    };

    const copyAllStreets = async () => {
        if (!data?.ruas.length) return;

        setCopyingAll(true);
        const allStreets = data.ruas.join('\n');
        await copyToClipboard(allStreets);
        setCopyingAll(false);
    };

    const downloadCSV = () => {
        if (!data) return;

        const items = data.ruas;
        const headers = 'Rua';
        const csvContent = [headers, ...items].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ruas-${data.cidade.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 animate-pulse" aria-label="Carregando dados de ruas">
                <div className="max-w-6xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <div className="h-6 w-6 bg-gray-200 rounded mr-2"></div>
                                <div className="h-7 w-48 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-100 rounded-lg p-4">
                                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-4">
                                <div className="h-5 w-2/4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 w-1/3 bg-gray-300 rounded"></div>
                            </div>
                        </div>

                        <div className="mt-4 h-3 w-1/3 bg-gray-200 rounded"></div>
                    </div>

                    {/* Search Bar Skeleton */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="h-10 flex-1 min-w-[240px] bg-gray-200 rounded-lg"></div>
                            <div className="h-10 w-44 bg-gray-200 rounded-lg"></div>
                            <div className="h-10 w-44 bg-gray-200 rounded-lg"></div>
                        </div>
                    </div>

                    {/* List Skeleton */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center mb-4">
                            <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
                            <div className="h-6 w-20 bg-gray-200 rounded"></div>
                            <div className="ml-2 h-5 w-12 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                            {[...Array(8)].map((_, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="h-4 w-3/5 bg-gray-200 rounded"></div>
                                    <div className="h-7 w-11 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                            <h2 className="text-lg font-semibold text-red-800">Erro ao carregar dados</h2>
                        </div>
                        <p className="text-red-700 mb-4">{error}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchData()}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Tentar novamente
                            </button>
                            <button
                                onClick={() => { setError(null); setIsManualMode(true); }}
                                className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <Edit3 className="h-4 w-4 mr-2" />
                                Mudar Cidade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <p className="text-yellow-800">Nenhum dado disponível.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center">
                            <MapPin className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Ruas por Cidade</h1>
                                <p className="text-sm text-gray-500">Busque todas as ruas de qualquer cidade</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {!data && (
                                <button
                                    onClick={() => fetchData()}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Carregar Ruas
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Área de Seleção de Cidade */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Cidade Selecionada
                            </label>
                            <button
                                onClick={() => setIsManualMode(!isManualMode)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                            >
                                {isManualMode ? (
                                    <> <List className="w-3 h-3" /> Buscar na Lista </>
                                ) : (
                                    <> <Edit3 className="w-3 h-3" /> Não encontrei, digitar manualmente </>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                {isManualMode ? (
                                    <CustomInput
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        placeholder="Digite: Nome da Cidade - UF (Ex: Santo Antônio do Amparo - MG)"
                                        className="bg-white"
                                    />
                                ) : (
                                    <CitySearchSelect
                                        value={selectedCity}
                                        onSelect={(c) => setSelectedCity(`${c.name} - ${c.state}`)}
                                        placeholder="Pesquise sua cidade..."
                                        className="bg-white"
                                    />
                                )}
                            </div>
                            <button
                                onClick={() => fetchData()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors h-[42px] mt-[1px]"
                                title="Atualizar dados da cidade"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                        {isManualMode && (
                            <p className="text-[10px] text-gray-500 mt-1 ml-1">
                                * Digite a cidade e a UF corretamente para garantir que o sistema encontre.
                            </p>
                        )}
                    </div>

                    {data && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-blue-900 text-lg mb-1 leading-tight">{data.cidade}</h3>
                                        <p className="text-xs text-blue-700 font-medium bg-blue-100 inline-block px-2 py-0.5 rounded">Cidade Atual</p>
                                    </div>
                                    <MapPin className="text-blue-200 w-8 h-8" />
                                </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-green-900 text-lg mb-1 leading-tight">{data.contagens.ruas.toLocaleString()}</h3>
                                        <p className="text-xs text-green-700 font-medium bg-green-100 inline-block px-2 py-0.5 rounded">Ruas Mapeadas</p>
                                    </div>
                                    <Route className="text-green-200 w-8 h-8" />
                                </div>
                            </div>
                        </div>
                    )}

                    {data && (
                        <div className="mt-4 text-[10px] text-gray-400 text-right">
                            Atualizado em: {new Date(data.fetchedAt).toLocaleString('pt-BR')}
                        </div>
                    )}
                </div>

                {/* Busca inteligente */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Rua</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Digite o nome da rua"
                            className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={copyAllStreets}
                            disabled={copyingAll || !data.ruas.length}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            {copyingAll ? 'Copiando...' : 'Copiar Todas'}
                        </button>
                        <button
                            onClick={downloadCSV}
                            disabled={!data.ruas.length}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar CSV
                        </button>
                    </div>
                    {query && (
                        <div className="mt-4">
                            <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-gray-200">
                                {suggestions.length === 0 && (
                                    <p className="text-sm text-gray-500 px-2 py-3">Nenhuma sugestão encontrada</p>
                                )}
                                {suggestions.map((rua, index) => (
                                    <button
                                        key={`${rua}-${index}`}
                                        onClick={() => copyToClipboard(rua, `sug-${index}`)}
                                        className="w-full text-left px-3 py-2 rounded-md hover:bg-white flex items-center justify-between"
                                    >
                                        <span className="text-gray-800 text-sm mr-2">{rua}</span>
                                        {copyingItem === `sug-${index}` ? (
                                            <span className="text-xs">✓</span>
                                        ) : (
                                            <Copy className="h-3 w-3 text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Listas */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center mb-4">
                        <Route className="h-5 w-5 text-blue-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">Lista de Ruas</h2>
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {data.ruas.length}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {data.ruas.map((rua, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <span className="text-gray-800 text-sm flex-1 mr-2">{rua}</span>
                                <button
                                    onClick={() => copyToClipboard(rua, `rua-${index}`)}
                                    className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors min-w-[44px] h-[30px] flex items-center justify-center"
                                    title="Copiar nome da rua"
                                >
                                    {copyingItem === `rua-${index}` ? (
                                        <span className="text-xs">✓</span>
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </button>
                            </div>
                        ))}
                        {data.ruas.length === 0 && (
                            <p className="text-gray-500 text-center py-4">Nenhuma rua encontrada</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
