
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Navigation, WifiOff, Maximize2, Minimize2, Loader2, MapPin, Search, Mic, X, Clock, Map as MapIcon, RotateCcw, ArrowUp, ArrowUpLeft, ArrowUpRight, Flag, ListPlus, Download, SlidersHorizontal, AlertTriangle, GripVertical, CheckCircle, Volume2, VolumeX, CornerUpRight, CornerUpLeft, Crosshair, ChevronsRight, ArrowLeft, Layers, Trash2, Plus, Moon, Sun, Globe, Gauge, Siren, Zap, Bookmark } from 'lucide-react';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { ManualWaypoint, SavedRoute, City, SavedAddress, BlitzAlert } from '../types';
import { Button } from './Button';
import { openNavigation } from '../utils/mapHelpers';

// Declare Leaflet global
declare const L: any;

// Helper functions for tile calculation
function lon2tile(lon: number, zoom: number) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat: number, zoom: number) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

interface OfflineMapProps {
  initialDestination?: {lat: number, lng: number, name: string, fullAddress: string} | null;
  onClearDestination: () => void;
  onSaveRoute?: (value: number, km: number) => void;
  onBack?: () => void;
}

const ManeuverIcon = ({ step, className }: { step: any, className?: string }) => {
  if (!step || !step.maneuver) return <Navigation className={className} />;
  const { modifier, type } = step.maneuver;

  if (type === 'arrive') return <Flag className={className} />;
  if (type === 'roundabout') return <RotateCcw className={className} />; 

  switch (modifier) {
      case 'straight': return <ArrowUp className={className} />;
      case 'uturn': return <RotateCcw className={className} />;
      case 'right': return <CornerUpRight className={className} />;
      case 'slight right': return <ArrowUpRight className={className} />;
      case 'sharp right': return <CornerUpRight className={className} />;
      case 'left': return <CornerUpLeft className={className} />;
      case 'slight left': return <ArrowUpLeft className={className} />;
      case 'sharp left': return <CornerUpLeft className={className} />;
      default: return <Navigation className={className} />;
  }
};

const SwipeButton = ({ onConfirm, label, className = '', disabled = false, mapInstanceRef }: { onConfirm: () => void, label: string, className?: string, disabled?: boolean, mapInstanceRef: React.RefObject<any> }) => {
    const [dragWidth, setDragWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const [confirmed, setConfirmed] = useState(false);

    const reset = useCallback(() => {
        const timer = setTimeout(() => {
            setDragWidth(0);
            setConfirmed(false);
            isDragging.current = false;
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!disabled && confirmed) {
            reset();
        }
    }, [disabled, confirmed, reset]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onMove = (clientX: number) => {
            if (!isDragging.current || !containerRef.current) return;
    
            const containerWidth = containerRef.current.clientWidth;
            const handleWidth = 56;
            const maxDrag = containerWidth - handleWidth;
            
            const diff = clientX - startX.current;
            const newWidth = Math.max(0, Math.min(maxDrag, diff));
            setDragWidth(newWidth);
    
            if (newWidth >= maxDrag - 5) {
                isDragging.current = false; 
                if (!confirmed) {
                    setConfirmed(true);
                    setDragWidth(maxDrag);
                    if (navigator.vibrate) navigator.vibrate(50);
                    onConfirm();
                }
                onEnd(); 
            }
        };

        const onEnd = () => {
            if (mapInstanceRef.current && mapInstanceRef.current.dragging) {
                mapInstanceRef.current.dragging.enable();
            }
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            
            if (isDragging.current) { 
                isDragging.current = false;
                setDragWidth(0);
            }
        };

        const onMouseMove = (e: MouseEvent) => { e.preventDefault(); onMove(e.clientX); };
        const onMouseUp = (e: MouseEvent) => { e.preventDefault(); onEnd(); };
        const onTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX); };
        const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); onEnd(); };

        const onStart = (clientX: number) => {
            if (disabled || confirmed || isDragging.current) return;

            if (mapInstanceRef.current && mapInstanceRef.current.dragging) {
                mapInstanceRef.current.dragging.disable();
            }

            isDragging.current = true;
            startX.current = clientX;
    
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        };
        
        const onTouchStart = (e: TouchEvent) => { e.stopPropagation(); onStart(e.touches[0].clientX); };
        const onMouseDown = (e: MouseEvent) => { e.stopPropagation(); onStart(e.clientX); };

        container.addEventListener('touchstart', onTouchStart, { passive: false });
        container.addEventListener('mousedown', onMouseDown);
        
        return () => {
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

    }, [disabled, confirmed, onConfirm, reset, mapInstanceRef]);


    return (
        <div 
            ref={containerRef}
            className={`relative h-14 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden select-none cursor-pointer border border-gray-200 dark:border-gray-600 ${className} ${disabled ? 'opacity-50' : ''}`}
        >
             <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-400 uppercase tracking-widest transition-opacity ${dragWidth > 50 ? 'opacity-0' : 'opacity-100'}`}>
                {label}
            </div>
            
            <div 
                className="absolute top-0 bottom-0 left-0 bg-brand-100/50 dark:bg-brand-900/30"
                style={{ width: `${dragWidth + 28}px`, transition: isDragging.current ? 'none' : 'width 0.3s ease' }}
            />

            <div 
                className="absolute top-1 bottom-1 left-1 w-12 bg-brand-600 rounded-full flex items-center justify-center text-white shadow-md z-10"
                style={{ transform: `translateX(${dragWidth}px)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease' }}
            >
                <ChevronsRight className={`w-6 h-6 ${isDragging.current ? 'scale-110' : ''}`} />
            </div>
        </div>
    );
};

const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) {
    setter("");
    return;
  }
  const amount = Number(value) / 100;
  const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  setter(formatted);
};

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

const formatDistance = (meters: number | null) => {
    if (meters === null) return '';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

export const OfflineMap: React.FC<OfflineMapProps> = ({ initialDestination, onClearDestination, onSaveRoute, onBack }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const blitzLayerRef = useRef<any>(null); // Layer group for blitz markers
  
  const otherDriversLayerRef = useRef<any>(null);
  const driversMarkers = useRef<Map<string, any>>(new Map());
  
  const driverIconHtml = useMemo(() => `
    <div class="bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-md border border-gray-200 dark:border-gray-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck text-gray-700 dark:text-gray-300">
        <path d="M10 17h4V5H2v12h3"/><path d="M2 17a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3.34a4 4 0 0 1 1.17-2.83L11 5h10v12h-3"/>
        <circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>
      </svg>
    </div>
  `, []);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isLocating, setIsLocating] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [destination, setDestination] = useState<{lat: number, lng: number, name: string, fullAddress: string, cleanAddress?: string} | null>(null);
  const [showNavModal, setShowNavModal] = useState(false);
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [navSteps, setNavSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  const [totalDistanceRemaining, setTotalDistanceRemaining] = useState<number | null>(null);
  const [initialTotalDistance, setInitialTotalDistance] = useState<number | null>(null);
  const [totalDurationRemaining, setTotalDurationRemaining] = useState<number | null>(null);
  const [initialTotalDuration, setInitialTotalDuration] = useState<number | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  
  const [isMuted, setIsMuted] = useState(false);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadRadius, setDownloadRadius] = useState(5); 
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [showMapFailureModal, setShowMapFailureModal] = useState(false);
  const tileErrorCount = useRef(0);
  const tileLoadTimer = useRef<number | null>(null);
  const [estimatedSize, setEstimatedSize] = useState('Calculando...');
  const downloadCancelled = useRef(false);
  
  const [isSmartRouteMode, setIsSmartRouteMode] = useState(false);
  const [waypoints, setWaypoints] = useState<ManualWaypoint[]>([]);
  const [smartRouteSearch, setSmartRouteSearch] = useState('');
  
  const [userCity, setUserCity] = useState<string>('');
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityOptions, setCityOptions] = useState<City[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const isNavigatingRef = useRef(isNavigating);
  const navStepsRef = useRef(navSteps);
  const currentStepIndexRef = useRef(currentStepIndex);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const headingRef = useRef<number | null>(null);
  
  const lastLocationUpdate = useRef<number>(0);

  const [travelMode, setTravelMode] = useState<'driving' | 'bike'>('driving');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<'default' | 'dark' | 'satellite' | 'osm'>('default');
  const [showAllSteps, setShowAllSteps] = useState(false);

  // New State for Finish Modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishValue, setFinishValue] = useState('');
  const [finishKm, setFinishKm] = useState(0);

  // Countdown State
  const [startCountdown, setStartCountdown] = useState<number | null>(null);

  // Blitz States
  const [showBlitzModal, setShowBlitzModal] = useState(false);
  const [selectedBlitzType, setSelectedBlitzType] = useState<'BLITZ' | 'ACCIDENT' | 'TRAFFIC' | 'DANGER'>('BLITZ');
  const [blitzMarkers, setBlitzMarkers] = useState<BlitzAlert[]>([]);
  const [selectedBlitz, setSelectedBlitz] = useState<BlitzAlert | null>(null);

  useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);
  useEffect(() => { navStepsRef.current = navSteps; }, [navSteps]);
  useEffect(() => { currentStepIndexRef.current = currentStepIndex; }, [currentStepIndex]);

  // Load Saved Addresses
  useEffect(() => {
      setSavedAddresses(storage.getAddresses());
  }, []);

  // Countdown Timer Effect
  useEffect(() => {
      if (startCountdown !== null) {
          if (startCountdown > 0) {
              const timer = setTimeout(() => setStartCountdown(startCountdown - 1), 1000);
              return () => clearTimeout(timer);
          } else {
              // Start Navigation when countdown hits 0
              setStartCountdown(null);
              setIsNavigating(true);
              setIsFullScreen(true); // Force Fullscreen
              if (userMarkerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.setView(userMarkerRef.current.getLatLng(), 18, { animate: true });
              }
              const firstInstruction = navStepsRef.current[0]?.maneuver?.instruction || "Iniciando rota.";
              speakInstruction(firstInstruction);
          }
      }
  }, [startCountdown]);

  useEffect(() => {
      if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          setTimeout(() => {
              try {
                  mapInstanceRef.current.invalidateSize();
              } catch (e) {
              }
          }, 300);
      }
  }, [isFullScreen]);

  // Layer Change Effect
  useEffect(() => {
      if (!mapInstanceRef.current || !tileLayerRef.current) return;
      let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      if (currentLayer === 'dark') url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      if (currentLayer === 'satellite') url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      if (currentLayer === 'osm') url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      tileLayerRef.current.setUrl(url);
  }, [currentLayer]);

  const formatDuration = useCallback((seconds: number | null) => {
      if (seconds === null) return '--:--';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m ${s}s`;
  }, []);

  const getArrivalTime = useCallback((durationSeconds: number | null) => {
      if (durationSeconds === null) return '--:--';
      const arrival = new Date(Date.now() + durationSeconds * 1000);
      return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const estimateDownload = useCallback(() => {
        if (!userMarkerRef.current) {
            setEstimatedSize('Localização necessária');
            return;
        }
        const { lat, lng } = userMarkerRef.current.getLatLng();
        let tileCount = 0;
        const zoomLevels = [12, 13, 14, 15, 16]; 
        
        zoomLevels.forEach(zoom => {
             const latDeg = downloadRadius / 111;
             const lngDeg = downloadRadius / (111 * Math.cos(lat * Math.PI / 180));
             
             const minTileX = lon2tile(lng - lngDeg, zoom);
             const maxTileX = lon2tile(lng + lngDeg, zoom);
             const minTileY = Math.min(lat2tile(lat + latDeg, zoom), lat2tile(lat - latDeg, zoom));
             const maxTileY = Math.max(lat2tile(lat + latDeg, zoom), lat2tile(lat - latDeg, zoom));
             
             tileCount += (Math.abs(maxTileX - minTileX) + 1) * (Math.abs(maxTileY - minTileY) + 1);
        });
        
        const sizeMB = (tileCount * 0.025); // ~25KB per tile
        setEstimatedSize(`${tileCount} tiles (~${sizeMB.toFixed(1)} MB)`);
        setDownloadProgress(prev => ({ ...prev, total: tileCount }));
  }, [downloadRadius]);

  // Recalculate estimate when modal opens or radius changes
  useEffect(() => {
      if (showDownloadModal) estimateDownload();
  }, [showDownloadModal, downloadRadius, estimateDownload]);

  const handleDownload = async () => {
      if (!userMarkerRef.current) return;
      setIsDownloading(true);
      downloadCancelled.current = false;
      const { lat, lng } = userMarkerRef.current.getLatLng();
      const zoomLevels = [12, 13, 14, 15, 16];
      const tilesToDownload: {x: number, y: number, z: number}[] = [];
      
      zoomLevels.forEach(zoom => {
             const latDeg = downloadRadius / 111;
             const lngDeg = downloadRadius / (111 * Math.cos(lat * Math.PI / 180));
             const minTileX = lon2tile(lng - lngDeg, zoom);
             const maxTileX = lon2tile(lng + lngDeg, zoom);
             const minTileY = Math.min(lat2tile(lat + latDeg, zoom), lat2tile(lat - latDeg, zoom));
             const maxTileY = Math.max(lat2tile(lat + latDeg, zoom), lat2tile(lat - latDeg, zoom));
             
             for(let x = minTileX; x <= maxTileX; x++) {
                 for(let y = minTileY; y <= maxTileY; y++) {
                     tilesToDownload.push({x, y, z: zoom});
                 }
             }
      });
      
      setDownloadProgress({ current: 0, total: tilesToDownload.length });
      
      const BATCH_SIZE = 12;
      for (let i = 0; i < tilesToDownload.length; i += BATCH_SIZE) {
          if (downloadCancelled.current) break;
          const batch = tilesToDownload.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (tile) => {
              try {
                  const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${tile.z}/${tile.x}/${tile.y}@2x.png`;
                  await fetch(url, { mode: 'no-cors' }); 
              } catch(e) {}
          }));
          setDownloadProgress(prev => ({ ...prev, current: Math.min(prev.total, i + BATCH_SIZE) }));
          await new Promise(r => setTimeout(r, 10));
      }
      
      setIsDownloading(false);
      if (!downloadCancelled.current) {
          setShowDownloadModal(false);
          alert("Mapa offline salvo com sucesso!");
      }
  };

  const cancelDownload = () => {
      downloadCancelled.current = true;
      setIsDownloading(false);
  };

  const stopNavigation = useCallback((completed: boolean) => {
    if (completed && onSaveRoute && initialTotalDistance) {
        setFinishKm(initialTotalDistance / 1000);
        setFinishValue(''); // Reset value for new input
        setShowFinishModal(true); // Open Modal instead of resetting immediately
    } else {
        // Just cancel
        setIsNavigating(false);
        setIsFullScreen(false); // Exit fullscreen
        setNavSteps([]);
        setCurrentStepIndex(0);
        setDestination(null);
        setMapRotation(0);
        
        if (mapInstanceRef.current && userMarkerRef.current) {
            mapInstanceRef.current.setView(userMarkerRef.current.getLatLng(), 17, { animate: true });
            if (mapInstanceRef.current.setBearing) mapInstanceRef.current.setBearing(0);
        }
        if (routeLayerRef.current) {
            routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }
        if(searchMarkerRef.current) {
            searchMarkerRef.current.remove();
            searchMarkerRef.current = null;
        }
        
        storage.clearNavigationState();
        onClearDestination();
    }
  }, [onSaveRoute, initialTotalDistance, onClearDestination]);

  const confirmFinishRun = () => {
      if (!onSaveRoute) return;
      const val = parseCurrency(finishValue);
      onSaveRoute(val, finishKm);
      
      // Cleanup after saving
      setShowFinishModal(false);
      setIsNavigating(false);
      setIsFullScreen(false);
      setNavSteps([]);
      setCurrentStepIndex(0);
      setDestination(null);
      setMapRotation(0);
      
      if (mapInstanceRef.current && userMarkerRef.current) {
          mapInstanceRef.current.setView(userMarkerRef.current.getLatLng(), 17, { animate: true });
          if (mapInstanceRef.current.setBearing) mapInstanceRef.current.setBearing(0);
      }
      if (routeLayerRef.current) {
          routeLayerRef.current.remove();
          routeLayerRef.current = null;
      }
      if(searchMarkerRef.current) {
          searchMarkerRef.current.remove();
          searchMarkerRef.current = null;
      }
      storage.clearNavigationState();
      onClearDestination();
  };

  const startNavigation = useCallback((route: any) => {
    if (!mapInstanceRef.current || !route) return;

    const steps = route.legs[0].steps;
    const routeGeoJSON = {
        type: "Feature",
        properties: {},
        geometry: route.geometry
    };

    if (routeLayerRef.current) routeLayerRef.current.remove();
    routeLayerRef.current = L.geoJSON(routeGeoJSON, {
        style: { color: '#fb923c', weight: 6, opacity: 0.8 }
    }).addTo(mapInstanceRef.current);

    setNavSteps(steps);
    setCurrentStepIndex(0);
    setInitialTotalDistance(route.distance);
    setInitialTotalDuration(route.duration);
    setTotalDistanceRemaining(route.distance);
    setTotalDurationRemaining(route.duration);
    
    // Zoom in close for navigation start
    if (userMarkerRef.current) {
        mapInstanceRef.current.setView(userMarkerRef.current.getLatLng(), 18, { animate: true });
    }
    
    if (destination) {
      storage.saveNavigationState({
        destination,
        steps,
        currentStepIndex: 0,
        routeGeoJSON,
        initialTotalDistance: route.distance,
        initialTotalDuration: route.duration,
      });
      // Save to Address Book automatically
      saveAddressToBook(destination);
    }

    // Trigger Countdown
    setStartCountdown(5);

  }, [destination]);

  const speakInstruction = (text: string) => {
      if (isMuted || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
  };

  // Helper function definitions needed for compilation
  const saveAddressToBook = (dest: {lat: number, lng: number, name: string, fullAddress: string}) => {
      const addresses = storage.getAddresses();
      const exists = addresses.some(a => a.fullAddress === dest.fullAddress || a.name === dest.name);
      
      if (!exists) {
          const newAddr: SavedAddress = {
              id: crypto.randomUUID(),
              name: dest.name || dest.fullAddress.split(',')[0],
              fullAddress: dest.fullAddress,
              createdAt: Date.now(),
              visitCount: 1,
              lastVisited: Date.now()
          };
          storage.saveAddresses([newAddr, ...addresses]);
      }
  };

  const handleSearch = async (query: string) => {
      if (!query.trim()) return;
      if (isSearching) return;
      
      setIsSearching(true);
      
      const searchNominatim = async (q: string) => {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
              headers: { 'Accept-Language': 'pt-BR' }
          });
          if (!response.ok) throw new Error('Network error');
          return await response.json();
      };

      try {
          let data = [];
          if (userCity) {
              data = await searchNominatim(`${query}, ${userCity}, Brasil`);
          }
          if (!data || data.length === 0) {
              data = await searchNominatim(`${query}, Brasil`);
          }

          if (data && data.length > 0) {
              const result = data[0];
              const lat = parseFloat(result.lat);
              const lng = parseFloat(result.lon);
              const name = query.split(',')[0];
              
              const destObj = { 
                  lat, 
                  lng, 
                  name, 
                  fullAddress: result.display_name, 
                  cleanAddress: result.display_name.split(',').slice(0,3).join(',') 
              };
              
              setDestination(destObj);
              setShowNavModal(true); 

              if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([lat, lng], 17);
                  if (searchMarkerRef.current) searchMarkerRef.current.remove();
                  searchMarkerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current).bindPopup(name).openPopup();
              }
          } else {
              alert("Endereço não encontrado.");
          }
      } catch (e) {
          console.error("Search error", e);
          alert("Erro na busca.");
      } finally {
          setIsSearching(false);
      }
  };

  const handleVoiceSearch = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("Seu navegador não suporta reconhecimento de voz.");

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      setIsListening(true);
      
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          handleSearch(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
  };

  const handleCenterOnUser = () => {
      if (userMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.setView(userMarkerRef.current.getLatLng(), isNavigatingRef.current ? 18 : 17, { animate: true });
      } else if (mapInstanceRef.current) {
          mapInstanceRef.current.locate({ setView: true, maxZoom: 18 });
      }
  };

  const handleAddSmartWaypoint = async () => {
      if (!smartRouteSearch) return;
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(smartRouteSearch)}&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
              const result = data[0];
              setWaypoints(prev => [...prev, {
                  id: crypto.randomUUID(),
                  street: result.display_name.split(',')[0],
                  neighborhood: '', 
                  city: '', 
                  reference: '',
                  number: '', 
                  lat: parseFloat(result.lat),
                  lng: parseFloat(result.lon)
              }]);
              setSmartRouteSearch('');
          } else {
              alert('Endereço não encontrado');
          }
      } catch(e) {
          alert('Erro ao buscar endereço');
      }
  };

  const handleAddSavedAddress = async (address: SavedAddress) => {
      setIsSearching(true);
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.fullAddress)}&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
              const result = data[0];
              setWaypoints(prev => [...prev, {
                  id: crypto.randomUUID(),
                  street: address.name,
                  neighborhood: '', 
                  city: '', 
                  reference: '',
                  number: '', 
                  lat: parseFloat(result.lat),
                  lng: parseFloat(result.lon)
              }]);
          } else {
              alert('Não foi possível obter coordenadas para este endereço salvo.');
          }
      } catch(e) {
          alert('Erro ao processar endereço salvo.');
      } finally {
          setIsSearching(false);
      }
  };

  const removeWaypoint = (id: string) => {
      setWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  const handleStartSmartRoute = async () => {
      if (!userMarkerRef.current || waypoints.length === 0) return;
      
      setIsSearching(true);
      const profile = travelMode === 'bike' ? 'biking' : 'driving';
      const start = userMarkerRef.current.getLatLng();
      
      const waypointsString = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${waypointsString}?steps=true&geometries=geojson&overview=full`;
      
      try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
              throw new Error("Rota não encontrada");
          }
          startNavigation(data.routes[0]);
          setIsSmartRouteMode(false); 
          setWaypoints([]); 
      } catch (e) {
          alert("Erro ao calcular rota");
      } finally {
          setIsSearching(false);
      }
  };

  const fetchRoute = useCallback(async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    setIsSearching(true);
    const profile = travelMode === 'bike' ? 'biking' : 'driving';
    
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&overview=full`);
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error("Não foi possível encontrar uma rota.");
      }
      
      startNavigation(data.routes[0]);
    } catch (error) {
      console.error("Route finding error:", error);
      alert("Erro ao buscar rota. Verifique a conexão ou tente novamente.");
      setDestination(null);
    } finally {
      setIsSearching(false);
    }
  }, [startNavigation, travelMode]);

  // --- BLITZ FUNCTIONALITY ---
  const handleReportBlitz = async () => {
      if (!userMarkerRef.current) return alert("Aguarde a localização GPS.");
      const { lat, lng } = userMarkerRef.current.getLatLng();
      
      setIsSearching(true); // Reuse loader
      try {
          // Reverse geocode to get address
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const address = data.display_name.split(',')[0];
          const city = data.address.city || data.address.town || data.address.village || 'Cidade Desconhecida';

          await cloud.reportBlitz(lat, lng, selectedBlitzType, address, city);
          alert("Alerta enviado com sucesso! Outros usuários na região serão notificados.");
          setShowBlitzModal(false);
          fetchBlitzes(); // Refresh map
      } catch(e: any) {
          alert("Erro ao reportar: " + e.message);
      } finally {
          setIsSearching(false);
      }
  };

  const fetchBlitzes = async () => {
      if (!mapInstanceRef.current) return;
      try {
          // Pass current city if known, else global fetch (filtered in backend by radius ideally)
          const blitzes = await cloud.getActiveBlitzes(); // Fetch recent
          
          if (blitzLayerRef.current) blitzLayerRef.current.clearLayers();
          else blitzLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

          blitzes.forEach(b => {
              const iconUrl = 
                  b.type === 'BLITZ' ? 'https://cdn-icons-png.flaticon.com/512/564/564619.png' : // Police Car / Siren
                  b.type === 'ACCIDENT' ? 'https://cdn-icons-png.flaticon.com/512/1032/1032926.png' : // Accident
                  'https://cdn-icons-png.flaticon.com/512/595/595067.png'; // Warning/Danger

              const icon = L.icon({
                  iconUrl: iconUrl,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                  popupAnchor: [0, -10]
              });

              const marker = L.marker([b.lat, b.lng], { icon })
                  .bindPopup(`<b>${b.type}</b><br>${b.address}`)
                  .on('click', () => setSelectedBlitz(b));
              
              blitzLayerRef.current.addLayer(marker);
          });
          setBlitzMarkers(blitzes);
      } catch(e) {
          console.error("Failed to load blitzes", e);
      }
  };

  // Poll for blitzes
  useEffect(() => {
      fetchBlitzes();
      const interval = setInterval(fetchBlitzes, 30000);
      return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    driversMarkers.current.clear();
    const savedRoutesData = storage.getSavedRoutes();
    setSavedRoutes(savedRoutesData);
    let city = localStorage.getItem('user_city');
    if (!city) {
        setIsEditingCity(true);
    } else {
        setUserCity(city);
    }

    if (mapContainerRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
        try {
            const map = L.map(mapContainerRef.current, {
                center: [-15.7801, -47.9292], 
                zoom: 5,
                zoomControl: false, 
                attributionControl: false,
            });
            mapInstanceRef.current = map;

            const layerUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
            tileLayerRef.current = L.tileLayer(layerUrl, { maxZoom: 19 });
            tileLayerRef.current.addTo(map);

            tileLayerRef.current.on('tileerror', (e: any) => {
                tileErrorCount.current++;
                if (tileLoadTimer.current) clearTimeout(tileLoadTimer.current);
                tileLoadTimer.current = window.setTimeout(() => {
                    if (tileErrorCount.current > 5) {
                        setShowMapFailureModal(true);
                    }
                    tileErrorCount.current = 0;
                }, 2000);
            });

            otherDriversLayerRef.current = L.layerGroup().addTo(map);
            blitzLayerRef.current = L.layerGroup().addTo(map);

            // Rehydrate nav state
            const savedState = storage.getNavigationState();
            if (savedState) {
                setDestination(savedState.destination);
                startNavigation({
                    legs: [{ steps: savedState.steps }],
                    geometry: savedState.routeGeoJSON.geometry,
                    distance: savedState.initialTotalDistance,
                    duration: savedState.initialTotalDuration
                });
                setCurrentStepIndex(savedState.currentStepIndex);
            } else if (initialDestination) {
                setDestination(initialDestination);
                setShowNavModal(true);
                if (userMarkerRef.current) {
                    fetchRoute(userMarkerRef.current.getLatLng(), initialDestination);
                }
            }

            map.on('locationfound', (e: any) => {
                const { lat, lng } = e.latlng;
                const { speed, heading } = e;
                if(speed) setCurrentSpeed(speed * 3.6); 
                else setCurrentSpeed(0);
                if(heading !== null) headingRef.current = heading;

                if (userMarkerRef.current) {
                    userMarkerRef.current.setLatLng(e.latlng);
                    if (isNavigatingRef.current) {
                        map.setView(e.latlng, 18, { animate: true });
                    }
                } else {
                    const pulseIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="pulse"></div><div class="dot"></div>',
                        iconSize: [20, 20]
                    });
                    userMarkerRef.current = L.marker(e.latlng, { icon: pulseIcon }).addTo(map);
                    if (!savedState && !initialDestination) map.setView(e.latlng, 17);
                    if(initialDestination && !isNavigating) fetchRoute({lat, lng}, initialDestination);
                }
                setLocationError(null);
                setIsLocating(false);
                lastPositionRef.current = { lat, lng };
                const now = Date.now();
                if (now - lastLocationUpdate.current > 15000) { 
                    cloud.updateUserLocation(lat, lng);
                    lastLocationUpdate.current = now;
                }
            });

            map.on('locationerror', (e: any) => {
                setLocationError("Não foi possível obter sua localização. Verifique as permissões.");
                setIsLocating(false);
            });

            map.locate({ watch: true, setView: false, enableHighAccuracy: true });

            // Simulating fetchDrivers logic
            const fetchDrivers = async () => {
              if (lastPositionRef.current && mapInstanceRef.current) {
                  try {
                      const drivers = await cloud.getOnlineDrivers(lastPositionRef.current.lat, lastPositionRef.current.lng);
                      if (!mapInstanceRef.current) return;
                      const currentDriverIds = new Set(drivers.map(d => d.id));
                      driversMarkers.current.forEach((marker: any, id: string) => {
                          if (!currentDriverIds.has(id)) {
                              marker.remove();
                              driversMarkers.current.delete(id);
                          }
                      });
                      drivers.forEach(driver => {
                          const pos = [driver.current_lat, driver.current_lng];
                          if (driversMarkers.current.has(driver.id)) {
                              const marker = driversMarkers.current.get(driver.id);
                              if (marker) marker.setLatLng(pos);
                          } else {
                              if (otherDriversLayerRef.current) {
                                  const truckIcon = L.divIcon({ 
                                      html: driverIconHtml,
                                      className: 'bg-transparent',
                                      iconSize: [30, 30],
                                      iconAnchor: [15, 15]
                                  });
                                  const marker = L.marker(pos, { icon: truckIcon }).addTo(otherDriversLayerRef.current);
                                  driversMarkers.current.set(driver.id, marker);
                              }
                          }
                      });
                  } catch (err) { console.error("Error fetching drivers", err); }
              }
            };
            const driversInterval = setInterval(fetchDrivers, 5000); 
            
            // Fetch blitzes immediately
            fetchBlitzes();

            return () => {
                clearInterval(driversInterval);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.stopLocate();
                    mapInstanceRef.current.remove();
                    mapInstanceRef.current = null;
                    driversMarkers.current.clear(); 
                }
            };
        } catch (e) {
            console.error("Leaflet init error:", e);
            setShowMapFailureModal(true);
        }
    }
  }, []);

  return (
    <div className={`bg-gray-200 dark:bg-gray-800 transition-all duration-300 ${isFullScreen ? 'h-[100dvh] w-screen fixed inset-0 z-[9999] rounded-none' : 'w-full relative h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-sm'}`}>
      
      {/* Countdown Overlay */}
      {startCountdown !== null && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
              <h2 className="text-white text-3xl font-black mb-4">Iniciando em...</h2>
              <div className="text-[120px] font-black text-brand-500 animate-ping duration-1000">
                  {startCountdown}
              </div>
              <p className="text-white text-xl mt-4 font-bold">Corrida Iniciada 🚀</p>
          </div>
      )}

      {isOffline && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <WifiOff className="w-3 h-3"/> Offline
          </div>
      )}

      {isLocating && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-2 rounded-full shadow-md flex items-center gap-2 border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500"/>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Buscando GPS...</span>
          </div>
      )}

      {!isNavigating && !isSmartRouteMode && (
          <div className="absolute top-0 left-0 right-0 z-40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                   {onBack && <button onClick={onBack} className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200"><ArrowLeft className="w-6 h-6"/></button>}
                   <div className="relative flex-1">
                      <button onClick={() => handleSearch(searchQuery)} disabled={isSearching} className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-brand-500 rounded-full">
                          {isSearching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5" />}
                      </button>
                      <input 
                          type="text"
                          placeholder="Para onde vamos?"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                          className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-800 rounded-full shadow-lg text-sm font-bold border border-gray-100 dark:border-gray-700 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                      />
                      <button onClick={handleVoiceSearch} className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 rounded-full ${isListening ? 'bg-red-100 text-red-500' : ''}`}>
                          <Mic className="w-5 h-5"/>
                      </button>
                  </div>
                   <button onClick={() => setIsSmartRouteMode(true)} className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-white border border-purple-700">
                      <ListPlus className="w-6 h-6"/>
                  </button>
              </div>
          </div>
      )}

      {/* Navigation Top Card (Turn-by-Turn) */}
      {isNavigating && navSteps.length > 0 && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top-10">
              <div className="bg-green-600 dark:bg-green-700 text-white p-4 rounded-2xl shadow-xl flex items-center gap-4">
                  <div className="bg-white/20 p-2 rounded-xl">
                      <ManeuverIcon step={navSteps[currentStepIndex]} className="w-10 h-10" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                      {distanceToNextStep !== null && (
                          <p className="text-2xl font-black leading-none mb-1">
                              {formatDistance(distanceToNextStep)}
                          </p>
                      )}
                      <p className="text-sm font-medium opacity-90 truncate leading-tight">
                          {navSteps[currentStepIndex]?.maneuver?.instruction || 'Siga o trajeto'}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Speedometer Overlay */}
      {isNavigating && (
          <div className="absolute top-28 left-4 z-30 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-lg text-center min-w-[80px]">
                  <div className="flex justify-center mb-1">
                      <Gauge className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-black text-white leading-none">
                      {Math.round(currentSpeed)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase">
                      km/h
                  </div>
              </div>
          </div>
      )}

      {showNavModal && destination && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-900 rounded-t-[32px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-10 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-5 h-5 text-brand-600" />
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{destination.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{destination.fullAddress}</p>
                  </div>
                  <button 
                    onClick={() => { 
                        setShowNavModal(false); 
                        setDestination(null); 
                        if(searchMarkerRef.current) searchMarkerRef.current.remove();
                        handleCenterOnUser();
                    }} 
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                      <X className="w-5 h-5"/>
                  </button>
              </div>
              
              <div className="flex gap-3">
                  <Button 
                      fullWidth 
                      onClick={() => {
                          if (userMarkerRef.current) {
                              fetchRoute(userMarkerRef.current.getLatLng(), destination);
                              setShowNavModal(false);
                          } else {
                              alert("Aguarde a localização do GPS para iniciar.");
                          }
                      }} 
                      className="py-4 text-lg shadow-lg shadow-brand-500/20"
                  >
                      <Navigation className="w-5 h-5 mr-2" /> Iniciar Rota
                  </Button>
              </div>
          </div>
      )}

      {/* Finish Run Modal */}
      {showFinishModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center">Corrida Finalizada</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">Confirme os dados para salvar no histórico.</p>
                  
                  <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Distância Total</span>
                          <span className="text-xl font-black text-gray-900 dark:text-white">{finishKm.toFixed(1)} km</span>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Valor Cobrado (R$)</label>
                          <input 
                              type="tel" 
                              value={finishValue}
                              onChange={(e) => handleCurrencyMask(e, setFinishValue)}
                              className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-2xl font-black text-center text-gray-900 dark:text-white border-2 border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all"
                              placeholder="0,00"
                              autoFocus
                          />
                      </div>
                      
                      <div className="flex gap-3 mt-4">
                          <Button variant="outline" fullWidth onClick={() => { setShowFinishModal(false); stopNavigation(false); }}>Cancelar</Button>
                          <Button fullWidth onClick={confirmFinishRun} disabled={!finishValue}>Salvar no Histórico</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Smart Route Modal UI */}
      {isSmartRouteMode && (
          <div className="absolute inset-0 z-40 bg-white dark:bg-gray-900 p-6 flex flex-col animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl dark:text-white flex items-center gap-2">
                      <ListPlus className="w-6 h-6 text-purple-600" /> Rota Inteligente
                  </h3>
                  <button onClick={() => setIsSmartRouteMode(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                      <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                  <div className="relative">
                      <input 
                          type="text" 
                          placeholder="Adicionar endereço..." 
                          value={smartRouteSearch}
                          onChange={e => setSmartRouteSearch(e.target.value)}
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSmartWaypoint()}
                      />
                      <button onClick={handleAddSmartWaypoint} disabled={isSearching} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-lg text-white">
                          {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                      </button>
                  </div>

                  {savedAddresses.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Endereços Salvos</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {savedAddresses.map(addr => (
                                    <button 
                                        key={addr.id}
                                        onClick={() => handleAddSavedAddress(addr)}
                                        disabled={isSearching}
                                        className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
                                    >
                                        <Bookmark className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold dark:text-white truncate">{addr.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{addr.fullAddress}</p>
                                        </div>
                                        <Plus className="w-4 h-4 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                  )}

                  <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase mt-4 mb-2">Paradas ({waypoints.length})</p>
                      {waypoints.map((wp, index) => (
                          <div key={wp.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                              </div>
                              <div className="flex-1">
                                  <p className="text-sm font-bold dark:text-white line-clamp-1">{wp.street}</p>
                              </div>
                              <button onClick={() => removeWaypoint(wp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                      {waypoints.length === 0 && (
                          <div className="text-center py-10 text-gray-400">
                              <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                              <p className="text-sm">Adicione endereços para criar uma rota otimizada.</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button fullWidth onClick={handleStartSmartRoute} disabled={waypoints.length < 1} className="bg-purple-600 hover:bg-purple-700">
                      <Navigation className="w-4 h-4 mr-2" /> Iniciar Rota
                  </Button>
              </div>
          </div>
      )}

      {/* Navigation UI */}
      {isNavigating && (
          <div className="absolute inset-x-0 bottom-0 z-30 p-4 space-y-3">
              <div className="flex justify-between items-end">
                  <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-400"/>
                      <div>
                          <span className="font-bold text-lg">{getArrivalTime(totalDurationRemaining)}</span>
                          <span className="text-xs text-gray-300 ml-2">({formatDuration(totalDurationRemaining)})</span>
                      </div>
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsMuted(!isMuted)} className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                          {isMuted ? <VolumeX className="w-6 h-6"/> : <Volume2 className="w-6 h-6"/>}
                      </button>
                      {/* Recenter Button Moved Here During Navigation */}
                      <button onClick={handleCenterOnUser} className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                          <Crosshair className="w-6 h-6"/>
                      </button>
                  </div>
              </div>
              <SwipeButton 
                  onConfirm={() => stopNavigation(true)} 
                  label="Finalizar Corrida" 
                  mapInstanceRef={mapInstanceRef}
              />
          </div>
      )}

      {/* Main Map Container */}
      <div ref={mapContainerRef} className={`w-full h-full ${isNavigating ? 'cursor-none' : ''}`}></div>

      {/* Map Controls - Centered Horizontal Row below Search Bar */}
      <div className={`absolute left-1/2 -translate-x-1/2 z-30 flex flex-row gap-3 pointer-events-none ${isNavigating ? 'top-32' : 'top-24'}`}>
        {!isSmartRouteMode && (
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="pointer-events-auto w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors">
                {isFullScreen ? <Minimize2 className="w-6 h-6"/> : <Maximize2 className="w-6 h-6"/>}
            </button>
        )}
        
        {/* Only show center button here if NOT navigating (moved to bottom during nav) */}
        {!isNavigating && (
            <button onClick={handleCenterOnUser} className="pointer-events-auto w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors">
                <Crosshair className="w-6 h-6"/>
            </button>
        )}

        {/* Hide Download and Layers during Navigation */}
        {!isNavigating && (
            <>
                <button onClick={() => setShowDownloadModal(true)} className="pointer-events-auto w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors">
                    <Download className="w-6 h-6"/>
                </button>

                <div className="relative pointer-events-auto">
                    <button onClick={() => setShowLayerMenu(!showLayerMenu)} className={`w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors ${showLayerMenu ? 'bg-brand-50 border-brand-200' : ''}`}>
                        <Layers className="w-6 h-6"/>
                    </button>
                    
                    {showLayerMenu && (
                        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl z-40 flex flex-col gap-2 w-48 animate-in fade-in slide-in-from-top-2 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 mb-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Estilo do Mapa</span>
                                <button onClick={() => setShowLayerMenu(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                            </div>
                            
                            <button 
                                onClick={() => setCurrentLayer('default')}
                                className={`text-left text-sm font-medium p-2 rounded-lg flex items-center gap-2 transition-colors ${currentLayer === 'default' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                            >
                                <Sun className="w-4 h-4"/> Padrão (Claro)
                            </button>
                            
                            <button 
                                onClick={() => setCurrentLayer('dark')}
                                className={`text-left text-sm font-medium p-2 rounded-lg flex items-center gap-2 transition-colors ${currentLayer === 'dark' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                            >
                                <Moon className="w-4 h-4"/> Noturno (Escuro)
                            </button>
                            
                            <button 
                                onClick={() => setCurrentLayer('satellite')}
                                className={`text-left text-sm font-medium p-2 rounded-lg flex items-center gap-2 transition-colors ${currentLayer === 'satellite' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                            >
                                <Globe className="w-4 h-4"/> Satélite
                            </button>

                            <button 
                                onClick={() => setCurrentLayer('osm')}
                                className={`text-left text-sm font-medium p-2 rounded-lg flex items-center gap-2 transition-colors ${currentLayer === 'osm' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                            >
                                <MapIcon className="w-4 h-4"/> Detalhado (OSM)
                            </button>
                        </div>
                    )}
                </div>
            </>
        )}

        {/* Lightning Alert Button (Previously Blitz) */}
        <button onClick={() => setShowBlitzModal(true)} title="Alerta Relâmpago" className="pointer-events-auto w-12 h-12 bg-red-600 rounded-full shadow-lg flex items-center justify-center text-white border border-red-700 hover:bg-red-700 transition-colors animate-pulse">
            <Zap className="w-6 h-6 fill-current"/>
        </button>
      </div>

      {showDownloadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Download className="w-5 h-5 text-brand-500"/> Baixar Mapa Offline</h3>
                      <button onClick={() => setShowDownloadModal(false)}><X className="w-5 h-5"/></button>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400">
                      Baixe uma área do mapa para usar sem internet. O tamanho do download aumenta com o raio.
                  </div>

                  <div>
                      <label className="text-xs font-bold text-gray-400">Raio a partir da sua localização</label>
                      <div className="flex items-center gap-4 mt-2">
                          <input 
                              type="range" 
                              min="1" max="50" 
                              value={downloadRadius} 
                              onChange={e => setDownloadRadius(Number(e.target.value))}
                              className="w-full"
                              disabled={isDownloading}
                          />
                          <span className="font-bold text-lg w-16 text-center dark:text-white">{downloadRadius} km</span>
                      </div>
                  </div>
                  
                  <div className="text-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-xs">
                      <p className="text-gray-500">Tamanho estimado:</p>
                      <p className="font-bold dark:text-white">{isDownloading ? 'Baixando...' : estimatedSize}</p>
                  </div>

                  {isDownloading ? (
                      <div>
                          <progress value={downloadProgress.current} max={downloadProgress.total} className="w-full [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg   [&::-webkit-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-brand-600 [&::-moz-progress-bar]:bg-brand-600"></progress>
                          <p className="text-xs text-center text-gray-400 mt-1">{downloadProgress.current} / {downloadProgress.total} tiles</p>
                          <Button fullWidth variant="danger" onClick={cancelDownload} className="mt-3">Cancelar</Button>
                      </div>
                  ) : (
                      <Button fullWidth onClick={handleDownload} disabled={!userMarkerRef.current}>
                          Iniciar Download
                      </Button>
                  )}
              </div>
          </div>
      )}

      {showMapFailureModal && (
          <div className="fixed inset-0 bg-black/60 z-45 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm text-center">
                  <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4"/>
                  <h3 className="font-bold text-lg dark:text-white">Problema no Mapa</h3>
                  <p className="text-sm text-gray-500 mt-2">Não foi possível carregar o mapa. Verifique sua conexão com a internet ou tente usar o mapa offline se já tiver baixado uma área.</p>
                  <Button fullWidth onClick={() => { setShowMapFailureModal(false); window.location.reload(); }} className="mt-6">Recarregar Página</Button>
              </div>
          </div>
      )}

      {/* Lightning Alert Modal (Previously Blitz Modal) */}
      {showBlitzModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                          <Zap className="w-6 h-6 text-red-600 fill-current"/> Alerta Relâmpago
                      </h3>
                      <button onClick={() => setShowBlitzModal(false)}><X className="w-6 h-6 dark:text-white"/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={() => setSelectedBlitzType('BLITZ')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selectedBlitzType === 'BLITZ' ? 'border-red-600 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="bg-red-100 p-2 rounded-full"><Siren className="w-6 h-6 text-red-600"/></div>
                          <span className="font-bold text-sm dark:text-white">Blitz</span>
                      </button>
                      <button onClick={() => setSelectedBlitzType('ACCIDENT')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selectedBlitzType === 'ACCIDENT' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="bg-orange-100 p-2 rounded-full"><AlertTriangle className="w-6 h-6 text-orange-500"/></div>
                          <span className="font-bold text-sm dark:text-white">Acidente</span>
                      </button>
                      <button onClick={() => setSelectedBlitzType('TRAFFIC')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selectedBlitzType === 'TRAFFIC' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="bg-yellow-100 p-2 rounded-full"><Clock className="w-6 h-6 text-yellow-600"/></div>
                          <span className="font-bold text-sm dark:text-white">Trânsito</span>
                      </button>
                      <button onClick={() => setSelectedBlitzType('DANGER')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${selectedBlitzType === 'DANGER' ? 'border-gray-800 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="bg-gray-200 p-2 rounded-full"><AlertTriangle className="w-6 h-6 text-gray-800"/></div>
                          <span className="font-bold text-sm dark:text-white">Perigo</span>
                      </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                      Sua localização atual será enviada para todos os usuários da cidade.
                  </p>

                  <Button fullWidth onClick={handleReportBlitz} disabled={isSearching} className="bg-red-600 hover:bg-red-700 text-white">
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar e Alertar'}
                  </Button>
              </div>
          </div>
      )}

      {/* Selected Alert Detail Modal */}
      {selectedBlitz && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedBlitz(null)}>
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          {selectedBlitz.type === 'BLITZ' ? <Siren className="w-8 h-8 text-red-600"/> : <AlertTriangle className="w-8 h-8 text-orange-500"/>}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedBlitz.type}</h3>
                      <p className="text-xs text-gray-400">{new Date(selectedBlitz.created_at).toLocaleTimeString()}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4">
                      <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">{selectedBlitz.address}</p>
                      <p className="text-xs text-gray-500">{selectedBlitz.city}</p>
                  </div>

                  <p className="text-xs text-center text-gray-400 mb-4">Reportado por: {selectedBlitz.user_name || 'Anônimo'}</p>

                  <Button fullWidth onClick={() => setSelectedBlitz(null)}>Fechar</Button>
              </div>
          </div>
      )}
    </div>
  );
};
