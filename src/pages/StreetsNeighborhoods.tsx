import React, { useState, useEffect } from 'react';
import { baseURL } from '../utils/baseURL';
import { useUserCity } from '../hooks/useUserCity';
import { Copy, Download, MapPin, Route, RefreshCw, AlertCircle, Map as MapIcon } from 'lucide-react';

interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface StreetsNeighborhoodsData {
  cidade: string;
  bbox: BoundingBox;
  ruas: string[];
  bairros: string[];
  contagens: { ruas: number; bairros: number };
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

export default function StreetsNeighborhoods() {
  const [data, setData] = useState<StreetsNeighborhoodsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyingAll, setCopyingAll] = useState(false);
  const [copyingItem, setCopyingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { city, displayName, loading: cityLoading, error: cityError } = useUserCity();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // mapa removido conforme solicitado

  console.log('[StreetsNeighborhoods] Component mounted. baseURL:', baseURL, 'city:', city);

  const fetchData = async (retriesOrEvent?: number | React.MouseEvent<HTMLButtonElement>) => {
    const retries = typeof retriesOrEvent === 'number' ? retriesOrEvent : 3;
    setLoading(true);
    setError(null);
    
    try {
      const searchCity = city || query;
      if (!searchCity) {
        setError('Digite uma cidade ou verifique seu perfil.');
        setLoading(false);
        return;
      }
      
      console.log('[StreetsNeighborhoods] Fetching data for city:', searchCity);
      
      // Step 1: Get city info from Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(searchCity)}`;
      console.log('[StreetsNeighborhoods] Calling Nominatim:', nominatimUrl);
      
      const nominatimRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'OSM-RuasBairros-V2/1.0 (educativo)' }
      });
      
      if (!nominatimRes.ok) {
        throw new Error(`Nominatim HTTP ${nominatimRes.status}`);
      }
      
      const nominatimData = await nominatimRes.json();
      console.log('[StreetsNeighborhoods] Nominatim response:', nominatimData);
      
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
      
      // Step 2: Get streets and neighborhoods from Overpass
      // IMPORTANTE: [out:json] deve estar NO INÍCIO da query!
      const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});relation["place"~"suburb|neighbourhood|quarter|hamlet"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});relation["admin_level"~"9|10"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out tags;`;
      
      console.log('[StreetsNeighborhoods] Calling Overpass API');
      
      const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'OSM-RuasBairros-V2/1.0 (educativo)' 
        },
        body: 'data=' + encodeURIComponent(overpassQuery)
      });
      
      if (!overpassRes.ok) {
        throw new Error(`Overpass HTTP ${overpassRes.status}`);
      }
      
      const responseText = await overpassRes.text();
      console.log('[StreetsNeighborhoods] Overpass raw response starts with:', responseText.substring(0, 50));
      
      const overpassData = JSON.parse(responseText);
      console.log('[StreetsNeighborhoods] Overpass response elements:', overpassData.elements?.length);
      
      // Extract unique street names and neighborhoods
      const ruasSet = new Set<string>();
      const bairrosSet = new Set<string>();
      
      if (overpassData.elements) {
        for (const elem of overpassData.elements) {
          if (elem.tags?.name) {
            if (elem.type === 'way' && elem.tags.highway) {
              ruasSet.add(elem.tags.name);
            } else if (elem.type === 'relation' && (elem.tags.place || elem.tags.admin_level)) {
              bairrosSet.add(elem.tags.name);
            }
          }
        }
      }
      
      const ruas = Array.from(ruasSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const bairros = Array.from(bairrosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      console.log('[StreetsNeighborhoods] Extracted', ruas.length, 'streets and', bairros.length, 'neighborhoods');
      
      setData({
        cidade: cityInfo.name || searchCity,
        bbox,
        ruas,
        bairros,
        contagens: { ruas: ruas.length, bairros: bairros.length },
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
      console.error('[StreetsNeighborhoods] Error:', errMsg, 'Retries remaining:', retries - 1);
      
      if (retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        console.log('[StreetsNeighborhoods] Retrying in', delay, 'ms');
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
    if (!city) {
      setError('Cidade do usuário não definida');
      setLoading(false);
      return;
    }
    // City is ready, fetch data
    fetchData();
  }, [cityLoading, city]);

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

  // mapa removido

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

  const copyAllNeighborhoods = async () => {
    if (!data?.bairros.length) return;
    
    setCopyingAll(true);
    const allNeighborhoods = data.bairros.join('\n');
    await copyToClipboard(allNeighborhoods);
    setCopyingAll(false);
  };

  const downloadCSV = (type: 'ruas' | 'bairros') => {
    if (!data) return;
    
    const items = type === 'ruas' ? data.ruas : data.bairros;
    const headers = type === 'ruas' ? 'Rua' : 'Bairro';
    const csvContent = [headers, ...items].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}-${data.cidade.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 animate-pulse" aria-label="Carregando dados de ruas e bairros">
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="h-5 w-2/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-gray-300 rounded"></div>
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

          {/* Lists Skeleton */}
          <div className="grid grid-cols-1 gap-6">
            {/* Streets List Skeleton */}
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
            <button
              onClick={fetchData}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </button>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <MapPin className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Ruas e Bairros</h1>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </button>
            {/* mapa removido */}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">{displayName || data.cidade || 'Cidade não definida'}</h3>
              <p className="text-sm text-blue-700">Cidade</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-1">{data.contagens.ruas.toLocaleString()}</h3>
              <p className="text-sm text-green-700">Ruas encontradas</p>
            </div>
            {query && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-1">{suggestions.length.toLocaleString()}</h3>
                <p className="text-sm text-purple-700">Sugestões</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Dados obtidos em: {new Date(data.fetchedAt).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* mapa removido */}

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
              {copyingAll ? 'Copiando...' : 'Copiar Todas as Ruas'}
            </button>
            <button
              onClick={() => downloadCSV('ruas')}
              disabled={!data.ruas.length}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar CSV (Ruas)
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
        <div className="grid grid-cols-1 gap-6">
          {/* Ruas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Route className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Ruas</h2>
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
    </div>
  );
}
