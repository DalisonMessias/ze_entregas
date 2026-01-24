
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { CustomInput } from './CustomInput';

interface StreetSearchSelectProps {
    city: string; // Cidade para restringir a busca ou usar como contexto
    value: string;
    onSelect: (street: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export const StreetSearchSelect: React.FC<StreetSearchSelectProps> = ({
    city,
    value,
    onSelect,
    label,
    placeholder = "Busque sua rua...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial load and search logic could be here if we wanted to preload, 
    // but for streets it's better to search as we type or on focus if we had a local DB.
    // For OSM Overpass, we should be careful with rate limits, so maybe debounce search or search 
    // only when user stops typing significantly or explicitly asks.
    // Given the requirement "load streets using the same system existing in /streets", 
    // which fetches ALL streets for a city first and then filters locally.

    // However, fetching ALL streets for a big city might be heavy for a checkout dropdown.
    // Let's check `StreetsList` logic again. It fetches ALL streets for the city once.
    // We should probably try to replicate that behavior efficiently or adapt.
    // If exact same system is required: fetch all streets for the city once, then filter.

    const [allStreets, setAllStreets] = useState<string[]>([]);
    const [streetsLoaded, setStreetsLoaded] = useState(false);

    useEffect(() => {
        if (isOpen && !streetsLoaded && city) {
            fetchAllStreetsForCity(city);
        }
    }, [isOpen, city]);

    const fetchAllStreetsForCity = async (cityName: string) => {
        setLoading(true);
        setError(null);
        try {
            // Step 1: Get city info from Nominatim to get BBox
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(cityName)}`;
            const nominatimRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ZeEntregas-App/1.0' } });

            if (!nominatimRes.ok) throw new Error('Erro ao buscar cidade');
            const nominatimData = await nominatimRes.json();

            if (!nominatimData || nominatimData.length === 0) {
                // If city not found, we can't autocomplete, but user can still type manually
                setLoading(false);
                setStreetsLoaded(true);
                return;
            }

            const cityInfo = nominatimData[0];
            const bbox = {
                south: parseFloat(cityInfo.boundingbox[0]),
                north: parseFloat(cityInfo.boundingbox[1]),
                west: parseFloat(cityInfo.boundingbox[2]),
                east: parseFloat(cityInfo.boundingbox[3])
            };

            // Step 2: Get streets from Overpass
            const overpassQuery = `[out:json][timeout:90];(way["highway"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out tags;`;
            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(overpassQuery)
            });

            if (!overpassRes.ok) throw new Error('Erro ao buscar ruas');
            const overpassData = await overpassRes.json();

            const streetsSet = new Set<string>();
            if (overpassData.elements) {
                for (const elem of overpassData.elements) {
                    if (elem.tags?.name && elem.tags.highway) {
                        streetsSet.add(elem.tags.name);
                    }
                }
            }

            setAllStreets(Array.from(streetsSet).sort((a, b) => a.localeCompare(b, 'pt-BR')));
            setStreetsLoaded(true);

        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar as ruas automaticamente. Digite manualmente.');
        } finally {
            setLoading(false);
        }
    };

    // Filter suggestions based on search term
    useEffect(() => {
        if (!searchTerm) {
            setSuggestions([]); // Or show top streets? Better not show thousands.
            return;
        }

        const q = searchTerm.toLowerCase();
        // Simple filter limit to 50
        const filtered = allStreets.filter(s => s.toLowerCase().includes(q)).slice(0, 50);
        setSuggestions(filtered);
    }, [searchTerm, allStreets]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (street: string) => {
        onSelect(street);
        setIsOpen(false);
        setSearchTerm(''); // Reset search term or keep it? existing logic in CitySearchSelect clears it.
    };

    const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onSelect(val); // Update parent value directly allowing custom input
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold font-sans text-gray-500 dark:text-gray-400 mb-1">{label}</label>}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        // If opening and we have value, maybe set search term to refine? 
                        // Or just focus search input inside.
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-base text-left focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all hover:border-gray-200 dark:hover:border-gray-600 group"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin className={`w-4 h-4 flex-shrink-0 ${value ? 'text-brand-500' : 'text-gray-400'}`} />
                        <span className={`font-bold truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                            {value || placeholder}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-[60] mt-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* Search Field */}
                    <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                placeholder="Digite o nome da rua..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                        {/* Manual entry fallback hint */}
                        <div className="mt-2 px-1">
                            <p className="text-[10px] text-gray-400">
                                Não encontrou na lista? <button className="text-brand-500 font-bold hover:underline" onClick={() => {
                                    handleSelect(searchTerm);
                                }}>Usar o texto digitado</button>
                            </p>
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar overscroll-contain">
                        {loading && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
                                <p className="text-xs text-gray-500 mt-2 font-medium">Carregando ruas de {city}...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-center">
                                <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">{error}</p>
                            </div>
                        )}

                        {!loading && suggestions.length > 0 && (
                            <div className="p-1">
                                {suggestions.map((street, idx) => {
                                    const isSelected = value === street;
                                    return (
                                        <button
                                            key={`${street}-${idx}`}
                                            type="button"
                                            onClick={() => handleSelect(street)}
                                            className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all text-left mb-0.5 ${isSelected
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span>{street}</span>
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && streetsLoaded && suggestions.length === 0 && searchTerm && (
                            <div className="px-3 py-6 text-center">
                                <p className="text-sm text-gray-400 font-medium mb-2">Nenhuma rua encontrada na lista oficial.</p>
                                <button
                                    onClick={() => handleSelect(searchTerm)}
                                    className="px-4 py-2 bg-brand-50 text-brand-600 rounded-lg text-sm font-bold hover:bg-brand-100 transition-colors"
                                >
                                    Usar "{searchTerm}"
                                </button>
                            </div>
                        )}

                        {!loading && streetsLoaded && suggestions.length === 0 && !searchTerm && (
                            <div className="px-3 py-6 text-center text-gray-400 text-xs">
                                Digite para buscar...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
