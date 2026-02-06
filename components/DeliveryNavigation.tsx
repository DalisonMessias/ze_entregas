import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Navigation,
    MapPin,
    ArrowLeft,
    Navigation2,
    Compass,
    Maximize2,
    ZoomIn,
    ZoomOut,
    Flag,
    AlertTriangle,
    Eye,
    EyeOff,
    Save,
    Volume2,
    WifiOff,
    Crosshair,
    CheckCircle2,
    Settings,
    Loader2,
    ShieldAlert,
    Headphones,
    RotateCw,
    History,
    Search,
    X as CloseIcon,
    CheckCircle,
    Copy,
    Share2,
    ChevronDown,
    Map
} from 'lucide-react';
import { Button } from './Button';
import { ActiveTab } from '../types/navigation';
import { UserRole, VehicleType, NavigationState, NavigationRoute, NavigationStep, ShopSettings } from '../types';
import * as cloud from '../services/cloud';
import { clearNavigationState, saveNavigationState } from '../utils/mapHelpers';
import { CitySearchSelect } from './CitySearchSelect';
import { City } from '../types';
import { useUserCity } from '../src/hooks/useUserCity';
import { Switch } from './Switch';

interface DeliveryNavigationProps {
    userRole: UserRole;
}

// Perfil de rota por veículo
const VECHICLE_PROFILE_MAP: Record<string, string> = {
    'car': 'driving-car',
    'moto': 'driving-car',
    'bike': 'cycling-regular',
    'foot': 'foot-walking',
    'other': 'foot-walking'
};

const REROUTE_THRESHOLD_M = 40;
const REROUTE_COOLDOWN_MS = 15000;
const POSITION_THROTTLE_MS = 1000;
const ROUTE_CACHE_MS = 15000;
const DISPLACEMENT_CACHE_M = 15;

export const DeliveryNavigation: React.FC<DeliveryNavigationProps> = ({ userRole }) => {
    // Estados principais
    const [navState, setNavState] = useState<NavigationState | null>(null);
    const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [speed, setSpeed] = useState<number>(0); // em km/h
    const [accuracy, setAccuracy] = useState<number>(0);
    const [route, setRoute] = useState<NavigationRoute | null>(null);
    const [nextStep, setNextStep] = useState<NavigationStep | null>(null);
    const [navigationMode, setNavigationMode] = useState<'idle' | 'preview' | 'guided'>('idle');

    // Função de tradução de instruções
    const translateInstruction = (instruction: string) => {
        if (!instruction) return instruction;

        return instruction
            .replace(/Head (northeast|northwest|southeast|southwest|north|south|east|west) on/gi, 'Siga na')
            .replace(/Turn (left|right)/gi, (match, side) => `Vire à ${side.toLowerCase() === 'left' ? 'esquerda' : 'direita'}`)
            .replace(/Keep (left|right)/gi, (match, side) => `Mantenha-se à ${side.toLowerCase() === 'left' ? 'esquerda' : 'direita'}`)
            .replace(/At the roundabout, take the (\d+).. exit/gi, 'Na rotatória, pegue a $1ª saída')
            .replace(/Continue on/gi, 'Continue na')
            .replace(/Keep (straight|on)/gi, 'Siga em frente na')
            .replace(/Make a U-turn/gi, 'Faça o retorno')
            .replace(/Arrive at/gi, 'Chegada em')
            .replace(/Exit roundabout/gi, 'Saia da rotatória');
    };

    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [minLoadingDone, setMinLoadingDone] = useState(false);
    const [dataReady, setDataReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'weak' | 'denied'>('searching');
    const [mapMode, setMapMode] = useState<'north-up' | 'direction-up'>('direction-up');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [avoidTolls, setAvoidTolls] = useState(false);
    const [highSpeedAlert, setHighSpeedAlert] = useState(false);

    // Busca e Cidade
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [streetSearchTerm, setStreetSearchTerm] = useState('');
    const [streetResults, setStreetResults] = useState<any[]>([]);
    const [searchingStreets, setSearchingStreets] = useState(false);
    const [allStreets, setAllStreets] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingAllStreets, setLoadingAllStreets] = useState(false);
    const [navIcons, setNavIcons] = useState<Record<string, string>>({});
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const lastSpokenRef = useRef<string>('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Cidade do Usuário
    const { city: userCityName, loading: userCityLoading } = useUserCity();

    // Efeito para pré-selecionar cidade do usuário
    useEffect(() => {
        if (userCityName && !selectedCity && showSearchOverlay) {
            // Tenta converter o nome da cidade simples para o objeto City (mais rico)
            // Se não encontrar no banco, cria um objeto temporário
            const [name, state] = userCityName.split(' - ');
            setSelectedCity({
                id: '',
                name: name || userCityName,
                state: state || '',
                is_active: true
            });
        }
    }, [userCityName, showSearchOverlay, selectedCity]);

    // Carregar configurações iniciais
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [icons, settings, elevenKey] = await Promise.all([
                    cloud.getNavigationIcons(),
                    cloud.getShopSettings(),
                    cloud.getApiKey('eleven_labs_api_key')
                ]);

                const iconMap: Record<string, string> = {};
                icons.forEach(i => {
                    if (i.is_active) iconMap[i.vehicle_type] = i.icon_url;
                });
                setNavIcons(iconMap);
                setShopSettings({
                    ...settings,
                    eleven_labs_api_key: elevenKey || ''
                } as any);
            } catch (err) {
                console.error("Erro ao carregar configurações de navegação:", err);
            }
        };
        loadInitialData();

        // Garantir que o loading dure pelo menos 5 segundos
        const timer = setTimeout(() => {
            setMinLoadingDone(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Efeito para finalizar o loading quando ambos estiverem prontos
    useEffect(() => {
        if (minLoadingDone && dataReady) {
            setLoading(false);
        }
    }, [minLoadingDone, dataReady]);

    const audioEnabled = shopSettings?.navigation_voice_enabled || shopSettings?.navigation_sounds_enabled;

    // Função para falar instrução usando ElevenLabs
    const speak = useCallback(async (text: string) => {
        const elevenLabsApiKey = await cloud.getApiKey('eleven_labs_api_key');
        if (!elevenLabsApiKey || !shopSettings?.navigation_voice_enabled) return;
        if (lastSpokenRef.current === text) return;

        try {
            const voiceId = shopSettings.navigation_voice_id || '21m00Tcm4lfs74u9DeyB';
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': elevenLabsApiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) throw new Error('Falha ao gerar áudio');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = url;
            } else {
                audioRef.current = new Audio(url);
            }

            audioRef.current.play();
            lastSpokenRef.current = text;
        } catch (err) {
            console.error("Erro ao reproduzir áudio:", err);
        }
    }, [shopSettings]);

    // Monitorar mudança de instrução para falar
    useEffect(() => {
        if (navigationMode === 'guided' && nextStep?.instruction) {
            const translated = translateInstruction(nextStep.instruction);
            // Pequeno delay para não sobrepor se muitas mudanças rápidas
            const timer = setTimeout(() => {
                speak(translated);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [navigationMode, nextStep, speak]);

    // Efeito para carregar TODAS as ruas da cidade selecionada (Lógica /ruas)
    const loadCityStreets = useCallback(async (cityName: string, stateName: string) => {
        setLoadingAllStreets(true);
        try {
            const query = `${cityName}, ${stateName}`;
            const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(query)}`);
            const nominatimData = await nominatimRes.json();

            if (nominatimData && nominatimData.length > 0) {
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
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'data=' + encodeURIComponent(overpassQuery)
                });

                const overpassData = await overpassRes.json();
                const ruasSet = new Set<string>();
                if (overpassData.elements) {
                    for (const elem of overpassData.elements) {
                        if (elem.tags?.name && elem.tags.highway) {
                            ruasSet.add(elem.tags.name);
                        }
                    }
                }
                setAllStreets(Array.from(ruasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')));
            }
        } catch (err) {
            console.error('Erro ao carregar ruas da cidade:', err);
        } finally {
            setLoadingAllStreets(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCity?.name) {
            loadCityStreets(selectedCity.name, selectedCity.state);
        }
    }, [selectedCity?.name, selectedCity?.state, loadCityStreets]);

    // Carregar ícones dinâmicos
    useEffect(() => {
        const fetchIcons = async () => {
            const icons = await cloud.getNavigationIcons();
            const iconMap: Record<string, string> = {};
            icons.forEach((icon: any) => {
                iconMap[icon.vehicle_type] = icon.icon_url;
            });
            setNavIcons(iconMap);
        };
        fetchIcons();
    }, []);

    // Lógica de Filtragem Local (Sugestões)
    useEffect(() => {
        if (!streetSearchTerm.trim() || allStreets.length === 0) {
            setSuggestions([]);
            return;
        }

        const q = streetSearchTerm.trim().toLowerCase();
        const filtered = allStreets
            .filter(r => r.toLowerCase().includes(q))
            .sort((a, b) => {
                const aLow = a.toLowerCase();
                const bLow = b.toLowerCase();
                if (aLow.startsWith(q) && !bLow.startsWith(q)) return -1;
                if (!aLow.startsWith(q) && bLow.startsWith(q)) return 1;
                return a.localeCompare(b, 'pt-BR');
            })
            .slice(0, 10);

        setSuggestions(filtered);
    }, [streetSearchTerm, allStreets]);

    const handleSelectSuggestion = async (streetName: string) => {
        setStreetSearchTerm(streetName);
        setSearchingStreets(true);
        try {
            const query = `${streetName}, ${selectedCity?.name || ''}, ${selectedCity?.state || ''}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                handleSelectResult(data[0]);
            }
        } catch (err) {
            console.error('Error selecting suggestion:', err);
        } finally {
            setSearchingStreets(false);
        }
    };
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const routeLayerRef = useRef<any>(null);
    const watchlistRef = useRef<number | null>(null);
    const lastUpdateTime = useRef<number>(0);
    const lastRerouteTime = useRef<number>(0);
    const lastRoutePos = useRef<[number, number] | null>(null);
    const trailPoints = useRef<[number, number][]>([]);

    // 1. Inicializar NavState do LocalStorage
    useEffect(() => {
        const raw = localStorage.getItem('navigation_state');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                setNavState(parsed);
                if (parsed.active && parsed.destination) {
                    setNavigationMode('guided');
                }
            } catch (e) {
                console.error('Erro ao carregar estado de navegação:', e);
                setNavigationMode('idle');
                setShowSearchOverlay(true);
            }
        } else {
            // Em vez de erro, entra em modo explorador
            setNavigationMode('idle');
            setShowSearchOverlay(true);
            setDataReady(true);
        }
    }, []);

    // 2. Monitorar Online/Offline
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 3. Função para Buscar Rota ORS
    const fetchRoute = useCallback(async (start: [number, number], end: [number, number], profile: string) => {
        if (!navigator.onLine) return null;

        try {
            const apiKey = await cloud.getApiKey('open_route_service_api_key');

            if (!apiKey) {
                console.warn('ORS API Key not found in api_keys table');
                return null;
            }

            const options: any = {
                preference: 'fastest',
            };

            if (avoidTolls) {
                options.avoid_features = ['tolls', 'highways'];
            }

            const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`);

            if (!response.ok) throw new Error('Falha ao buscar rota');

            const data = await response.json();
            const feature = data.features[0];
            const geometry = feature.geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }));
            const summary = feature.properties.summary;
            const steps = feature.properties.segments[0].steps.map((s: any) => ({
                instruction: s.instruction,
                distance_m: s.distance,
                duration_s: s.duration,
                type: s.type,
                way_points: s.way_points
            }));

            return {
                geometry,
                distance_m: summary.distance,
                duration_s: summary.duration,
                steps,
                updated_at: new Date().toISOString()
            } as NavigationRoute;
        } catch (err) {
            console.error('ORS Error:', err);
            return null;
        }
    }, [avoidTolls]);

    // 4. Lógica de Geolocalização
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setError('Geolocalização não suportada no seu dispositivo.');
            return;
        }

        const onWatchSuccess = (pos: GeolocationPosition) => {
            const { latitude, longitude, heading: h, speed: s, accuracy: acc } = pos.coords;
            const now = Date.now();

            // Throttle UI Updates
            if (now - lastUpdateTime.current < POSITION_THROTTLE_MS) return;
            lastUpdateTime.current = now;

            const newPos: [number, number] = [latitude, longitude];
            setCurrentPos(newPos);
            setHeading(h || 0);
            setSpeed(s ? s * 3.6 : 0); // Convert m/s to km/h
            setAccuracy(acc);
            setGpsStatus(acc > 50 ? 'weak' : 'locked');

            // Alerta de velocidade (default 60km/h)
            if (s && s * 3.6 > 60 && userRole === 'delivery_partner') {
                setHighSpeedAlert(true);
                if (navigator.vibrate) navigator.vibrate(200);
            } else {
                setHighSpeedAlert(false);
            }

            // Adicionar à trilha
            trailPoints.current = [...trailPoints.current.slice(-500), newPos];

            setDataReady(true);
        };

        const onWatchError = (err: GeolocationPositionError) => {
            if (err.code === 1) setGpsStatus('denied');
            else setGpsStatus('searching');
            console.error('GPS Error:', err);
        };

        watchlistRef.current = navigator.geolocation.watchPosition(onWatchSuccess, onWatchError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        });

        return () => {
            if (watchlistRef.current !== null) navigator.geolocation.clearWatch(watchlistRef.current);
        };
    }, [userRole]);

    // 5. Lógica de Mapa e Roteamento
    useEffect(() => {
        if (!currentPos || !navState || !navState.destination) return;

        const start = currentPos;
        const end: [number, number] = [navState.destination.lat, navState.destination.lng];
        const profile = VECHICLE_PROFILE_MAP[navState.vehicle_type || 'car'];

        const updateRoute = async () => {
            const now = Date.now();

            // Cache Check
            if (lastRoutePos.current) {
                const distToLast = Math.hypot(start[0] - lastRoutePos.current[0], start[1] - lastRoutePos.current[1]) * 111000; // Approx meters
                if (distToLast < DISPLACEMENT_CACHE_M && now - lastRerouteTime.current < ROUTE_CACHE_MS) return;
            }

            // Re-route Check
            if (now - lastRerouteTime.current < REROUTE_COOLDOWN_MS) return;

            const newRoute = await fetchRoute(start, end, profile);
            if (newRoute) {
                setRoute(newRoute);
                lastRerouteTime.current = now;
                lastRoutePos.current = start;
            }
        };

        updateRoute();
    }, [currentPos, navState, fetchRoute, route]);

    // 6. Atualizar HUD / Próxima Manobra
    useEffect(() => {
        if (!route || !currentPos) return;

        // Simplificado: pega o próximo passo
        if (route.steps.length > 0) {
            setNextStep(route.steps[0]);
        }
    }, [route, currentPos]);

    // 7. Inicializar Leaflet
    useEffect(() => {
        if (loading || !navState || !(window as any).L) return;

        const initMap = () => {
            const L = (window as any).L;
            const mapContainer = document.getElementById('nav-map');
            if (!mapContainer || mapRef.current) return;

            const map = L.map('nav-map', {
                zoomControl: false,
                attributionControl: false,
                rotate: true,
                touchRotate: true
            }).setView(currentPos || [0, 0], 18);

            const themeMode = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
            const tiles = themeMode === 'dark'
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

            L.tileLayer(tiles).addTo(map);

            // Ícone do entregador rotativo
            const vehicle = navState.vehicle_type || 'car';

            const customIcon = L.divIcon({
                className: 'gps-marker',
                html: `<div class="relative w-12 h-12 flex items-center justify-center">
                <div class="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                <img src="${navIcons[vehicle] || (vehicle === 'bike' ? '/pwa/icons/bike.png' : vehicle === 'moto' ? '/pwa/icons/moto.png' : '/pwa/icons/car.png')}" class="w-8 h-8 relative z-10 drop-shadow-lg" style="transform: rotate(${heading}deg)" />
               </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });

            markerRef.current = L.marker(currentPos || [0, 0], { icon: customIcon }).addTo(map);

            // Marcador de Destino
            const destIcon = L.divIcon({
                className: 'dest-marker',
                html: `<div class="bg-red-600 p-2 rounded-full border-2 border-white shadow-lg animate-bounce flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
               </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            L.marker([navState.destination!.lat, navState.destination!.lng], { icon: destIcon }).addTo(map);

            mapRef.current = map;
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [loading, navState]);

    // 8. Sincronizar Mapa com Posição e Heading
    useEffect(() => {
        if (!mapRef.current || !currentPos) return;

        const L = (window as any).L;
        const map = mapRef.current;
        map.panTo(currentPos);

        if (mapMode === 'direction-up' && typeof map.setBearing === 'function') {
            map.setBearing(heading);
        } else if (typeof map.setBearing === 'function') {
            map.setBearing(0);
        }

        if (markerRef.current) {
            markerRef.current.setLatLng(currentPos);
            const vehicle = navState?.vehicle_type || 'car';

            markerRef.current.setIcon(L.divIcon({
                className: 'gps-marker',
                html: `<div class="relative w-12 h-12 flex items-center justify-center">
                <div class="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                <img src="${navIcons[vehicle] || (vehicle === 'bike' ? '/pwa/icons/bike.png' : vehicle === 'moto' ? '/pwa/icons/moto.png' : '/pwa/icons/car.png')}" class="w-8 h-8 relative z-10 drop-shadow-lg" style="transform: rotate(${heading}deg)" />
               </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            }));
        }

        // Desenhar Rota
        if (route && L) {
            if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);

            routeLayerRef.current = L.polyline(route.geometry.map(p => [p.lat, p.lng]), {
                color: '#990026',
                weight: 8,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);
        }
    }, [currentPos, heading, route, mapMode, navState]);

    const handleFinish = () => {
        clearNavigationState();
        setNavState(null);
        setNavigationMode('idle');
        setRoute(null);
        setNextStep(null);
        setShowSearchOverlay(true);

        // Se veio de um pedido, volta para a tela anterior
        if (navState?.return_tab) {
            const event = new CustomEvent('navigateToTab', { detail: { tab: navState.return_tab } });
            window.dispatchEvent(event as any);
        }
    };

    const handleExit = () => {
        clearNavigationState();
        setNavState(null);
        setNavigationMode('idle');
        setRoute(null);
        setNextStep(null);
        setShowSearchOverlay(false);
    };

    const recenter = () => {
        if (mapRef.current && currentPos) {
            mapRef.current.setView(currentPos, 18);
        }
    };

    const handleSearchStreet = async () => {
        if (!streetSearchTerm.trim()) return;
        setSearchingStreets(true);
        try {
            let query = streetSearchTerm;
            if (selectedCity) {
                query += `, ${selectedCity.name}, ${selectedCity.state}`;
            }

            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setStreetResults(data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setSearchingStreets(false);
        }
    };

    const handleSelectResult = (result: any) => {
        const newState: NavigationState = {
            active: true,
            destination: {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                address: result.display_name,
                label: result.display_name.split(',')[0]
            },
            vehicle_type: navState?.vehicle_type || 'car',
            return_tab: navState?.return_tab || 'daily_panel'
        };

        saveNavigationState(newState);
        setNavState(newState);
        setShowSearchOverlay(false);
        setNavigationMode('preview'); // Entra em modo preview primeiro
        setStreetSearchTerm('');
        setStreetResults([]);
        setRoute(null);
        setNextStep(null);
    };

    const handleStartNavigation = () => {
        if (navState) {
            const newState = { ...navState, active: true };
            saveNavigationState(newState);
            setNavState(newState);
            setNavigationMode('guided');
        }
    };

    if (error) return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-10 z-[100] text-center">
            <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 mb-6">
                <AlertTriangle className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Erro na Navegação</h2>
            <p className="text-gray-500 mb-8 max-w-sm">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" fullWidth>Tentar Novamente</Button>
            <Button onClick={() => handleFinish()} className="mt-2" fullWidth>Voltar ao Início</Button>
        </div>
    );

    if (loading) return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-10 z-[100]">
            <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-brand-200 dark:border-brand-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
                <Navigation className="absolute inset-0 m-auto w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Iniciando GPS...</h2>
            <p className="text-sm text-gray-500 text-center mt-2 max-w-xs">Aguardando sinal estável do satélite para maior precisão.</p>
        </div>
    );

    if (gpsStatus === 'denied') return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-10 z-[100] text-center">
            <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 mb-6">
                <ShieldAlert className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">GPS Desativado</h2>
            <p className="text-gray-500 mb-8 max-w-sm">A navegação interna precisa de acesso à sua localização em tempo real para funcionar.</p>
            <Button onClick={() => window.location.reload()} size="lg" icon={<Settings className="w-5 h-5" />} fullWidth>
                Dar Permissão nas Configurações
            </Button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-[100] flex flex-col items-stretch overflow-hidden select-none">
            {/* Map Background */}
            <div id="nav-map" className="absolute inset-0 z-0"></div>

            {/* TOP HUD: Próxima Manobra - Só aparece em modo GUIDED */}
            {navigationMode === 'guided' && (
                <div className="absolute top-4 inset-x-4 z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-brand-600 text-white rounded-3xl p-3 shadow-2xl flex items-center gap-3 border-2 border-white/10 backdrop-blur-md">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Navigation2 className="w-8 h-8 rotate-[-45deg]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{nextStep ? `Em ${(nextStep.distance_m).toFixed(0)}m` : 'Calculando...'}</p>
                            <h1 className="text-base font-black leading-tight line-clamp-2">{nextStep ? translateInstruction(nextStep.instruction) : 'Localizando trajeto ideal...'}</h1>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT CONTROLS: Speed & GPS */}
            <div className="absolute left-4 top-32 z-10 flex flex-col gap-3">
                <div className={`bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-xl border-2 ${highSpeedAlert ? 'border-red-500 animate-pulse' : 'border-gray-100 dark:border-gray-700'}`}>
                    <p className="text-[10px] font-black uppercase text-gray-400 text-center">KM/H</p>
                    <p className={`text-3xl font-black text-center ${highSpeedAlert ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {Math.round(speed)}
                    </p>
                    {highSpeedAlert && <p className="text-[8px] font-bold text-red-500 text-center">ALTA VELOC.</p>}
                </div>

                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-2 shadow-lg flex flex-col items-center gap-2 border border-white/20">
                    <div className={`w-3 h-3 rounded-full ${gpsStatus === 'locked' ? 'bg-green-500' : gpsStatus === 'weak' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400">GPS</p>
                </div>
            </div>

            {/* RIGHT CONTROLS: Map View Tools */}
            <div className="absolute right-4 top-32 z-10 flex flex-col gap-2">
                <button onClick={() => setMapMode(m => m === 'north-up' ? 'direction-up' : 'north-up')} className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-all">
                    {mapMode === 'north-up' ? <Compass className="w-6 h-6" /> : <Navigation className="w-6 h-6" />}
                </button>
                <button onClick={recenter} className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center text-brand-600 active:scale-95 transition-all">
                    <Crosshair className="w-6 h-6" />
                </button>
                <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                    <button onClick={() => mapRef.current?.zoomIn()} className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 active:bg-gray-100"><ZoomIn className="w-5 h-5" /></button>
                    <button onClick={() => mapRef.current?.zoomOut()} className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 active:bg-gray-100"><ZoomOut className="w-5 h-5" /></button>
                </div>
                <button
                    onClick={() => {
                        if (routeLayerRef.current && mapRef.current) {
                            try {
                                const bounds = routeLayerRef.current.getBounds();
                                if (bounds.isValid()) {
                                    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                                }
                            } catch (e) {
                                console.error('Erro ao ajustar limites:', e);
                                recenter();
                            }
                        } else {
                            recenter();
                        }
                    }}
                    className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-all"
                    title="Ver Rota Inteira"
                >
                    <Maximize2 className="w-6 h-6" />
                </button>
                <button onClick={() => setShowSearchOverlay(true)} className="w-12 h-12 bg-brand-600 text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-all">
                    <Search className="w-6 h-6" />
                </button>
            </div>

            {/* BOTTOM HUD: Info & Actions */}
            <div className="absolute bottom-6 inset-x-4 z-10 flex flex-col gap-4">
                {isOffline && (
                    <div className="bg-yellow-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg animate-bounce">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-xs font-bold">Sem conexão. Mantendo rota offline.</span>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white/5">
                    <div className="p-6">
                        <div className="flex items-end justify-between mb-6">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chegada em</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white">
                                        {route ? Math.ceil(route.duration_s / 60) : '--'}
                                    </span>
                                    <span className="text-lg font-bold text-gray-500">min</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-brand-600">
                                    {route ? (route.distance_m / 1000).toFixed(1) : '--'}
                                    <span className="text-sm ml-1">km</span>
                                </p>
                                <p className="text-xs font-bold text-gray-400">{navigationMode === 'guided' ? 'Restante' : 'Distância'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (navigationMode === 'guided') {
                                        handleFinish();
                                    } else {
                                        const event = new CustomEvent('navigateToTab', { detail: { tab: 'support' } });
                                        window.dispatchEvent(event as any);
                                    }
                                }}
                                className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors"
                                title={navigationMode === 'guided' ? 'Finalizar' : 'Suporte'}
                            >
                                {navigationMode === 'guided' ? <CloseIcon className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
                            </button>

                            {navigationMode === 'preview' ? (
                                <Button
                                    onClick={handleStartNavigation}
                                    className="flex-1 h-16 rounded-[1.5rem] bg-brand-600 text-white font-black text-lg shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Navigation className="w-6 h-6" />
                                    INICIAR NAVEGAÇÃO
                                </Button>
                            ) : navigationMode === 'guided' ? (
                                <Button
                                    onClick={handleFinish}
                                    className="flex-1 h-16 rounded-[1.5rem] bg-brand-600 text-white font-black text-lg shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    CHEGUEI / FINALIZAR
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setShowSearchOverlay(true)}
                                    className="flex-1 h-16 rounded-[1.5rem] bg-brand-600 text-white font-black text-lg shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Search className="w-6 h-6" />
                                    BUSCAR DESTINO
                                </Button>
                            )}

                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${showAdvanced ? 'bg-brand-600 text-white shadow-brand-500/30 shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                                title="Configurações Avançadas"
                            >
                                <Settings className="w-6 h-6" />
                            </button>

                            {navigationMode !== 'idle' && (
                                <button
                                    onClick={handleExit}
                                    className="px-4 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center font-bold text-xs hover:bg-red-200 transition-colors uppercase tracking-tighter"
                                >
                                    Sair
                                </button>
                            )}
                        </div>

                        {showAdvanced && (
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                    <Switch
                                        checked={avoidTolls}
                                        onChange={setAvoidTolls}
                                        label="Evitar pedágios e rodovias"
                                        className="w-full flex-row-reverse justify-between"
                                    />
                                    {/* GPS Audio Toggle */}
                                    {audioEnabled && (
                                        <button
                                            onClick={() => {
                                                const newVoice = !shopSettings?.navigation_voice_enabled;
                                                setShopSettings(s => s ? { ...s, navigation_voice_enabled: newVoice } : null);
                                            }}
                                            className={`p-4 rounded-2xl border transition-all shadow-sm flex items-center justify-center gap-2 ${shopSettings?.navigation_voice_enabled
                                                ? 'bg-brand-50 border-brand-200 text-brand-600'
                                                : 'bg-white border-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
                                                }`}
                                        >
                                            <Volume2 className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<RotateCw className="w-4 h-4" />}
                                    fullWidth
                                    onClick={() => {
                                        setRoute(null);
                                        setNextStep(null);
                                    }}
                                >
                                    Recalcular Rota Manualmente
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SEARCH OVERLAY */}
            {showSearchOverlay && (
                <div className="fixed inset-0 z-[110] bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <button onClick={() => setShowSearchOverlay(false)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Buscar Destino</h2>
                    </div>

                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        <CitySearchSelect
                            value={selectedCity ? `${selectedCity.name} - ${selectedCity.state}` : ''}
                            onSelect={setSelectedCity}
                            label="Cidade de Busca"
                            placeholder="Selecione para limitar a busca..."
                        />

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Nome da Rua / Local</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={streetSearchTerm}
                                        onChange={(e) => setStreetSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStreet()}
                                        placeholder="Ex: Av. Paulista, 1000"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <Button onClick={handleSearchStreet} disabled={searchingStreets || !streetSearchTerm} className="aspect-square">
                                    {searchingStreets ? <Loader2 className="animate-spin" /> : <Search />}
                                </Button>
                            </div>
                        </div>

                        {/* Sugestões da Cidade (Overpass) */}
                        {loadingAllStreets && (
                            <div className="flex items-center justify-center py-4 gap-2 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-bold uppercase">Carregando ruas da cidade...</span>
                            </div>
                        )}

                        {suggestions.length > 0 && streetResults.length === 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Sugestões na Cidade</p>
                                <div className="grid gap-1">
                                    {suggestions.map((rua, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectSuggestion(rua)}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-2xl text-left flex items-center gap-3 active:scale-[0.98] transition-all"
                                        >
                                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                                                <MapPin className="w-4 h-4 text-brand-500" />
                                            </div>
                                            <span className="font-bold text-sm text-gray-700 dark:text-gray-300 truncate">{rua}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {streetResults.length > 0 && (
                            <div className="space-y-2 pt-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Resultados encontrados</p>
                                <div className="grid gap-2">
                                    {streetResults.map((res, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectResult(res)}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-2xl text-left border-2 border-transparent hover:border-brand-300 transition-all flex items-start gap-3"
                                        >
                                            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                                <MapPin className="w-5 h-5 text-brand-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white truncate">{res.display_name.split(',')[0]}</p>
                                                <p className="text-xs text-gray-500 truncate">{res.display_name.split(',').slice(1).join(',').trim()}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!searchingStreets && streetSearchTerm && streetResults.length === 0 && (
                            <div className="py-20 text-center opacity-40">
                                <Search className="w-16 h-16 mx-auto mb-4" />
                                <p className="font-bold">Busque por ruas ou pontos de referência</p>
                                <p className="text-sm">Os resultados aparecerão aqui.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
