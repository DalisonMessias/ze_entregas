import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { AddressBook } from './AddressBook';
import { BaseModal } from './BaseModal';
import { SavedAddress, RouteListItem } from '../types';
import { MapPin, ListPlus, Loader2, AlertTriangle, Settings, Save, Lock, Unlock, Search as SearchIcon, Flag, X as CloseIcon } from 'lucide-react';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { startMultiStopNavigation } from '../utils/mapHelpers';
import { useDialog } from '../utils/dialogService';
import { useUserCity } from '../src/hooks/useUserCity';
import { Navigation2, Target, CheckCircle2, Navigation } from 'lucide-react';


interface Coordinate {
  latitude: number;
  longitude: number;
}

const RouteOptimizer: React.FC = () => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [intermediateStops, setIntermediateStops] = useState<string[]>(['']);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [optimizedRoute, setOptimizedRoute] = useState<{ stops: string[], distance: number, duration: number } | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinate | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isStartLocked, setIsStartLocked] = useState(true);
  const [allStreets, setAllStreets] = useState<string[]>([]);
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [activeStopIdx, setActiveStopIdx] = useState<number | null>(null);
  const [stopSuggestions, setStopSuggestions] = useState<string[]>([]);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [currentStreet, setCurrentStreet] = useState<string | null>(null);

  const [orsApiKey, setOrsApiKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const { prompt, alert } = useDialog();
  const { city } = useUserCity();

  useEffect(() => {
    const loadApiKey = async () => {
      setIsKeyLoading(true);
      try {
        const settings = await cloud.getShopSettings();
        if (settings?.open_route_service_api_key) {
          setOrsApiKey(settings.open_route_service_api_key);
        } else {
          setError("A chave da API de roteamento não está configurada. Vá para o painel de administração para adicioná-la.");
        }
      } catch (e) {
        setError("Não foi possível carregar a configuração de roteamento.");
      } finally {
        setIsKeyLoading(false);
      }
    };
    loadApiKey();
    handleGetCurrentLocation();
  }, []);

  useEffect(() => {
    if (city && !isStartLocked) {
      loadCityStreets();
    }
  }, [city, isStartLocked]);

  const loadCityStreets = async () => {
    if (!city) return;
    setIsLoadingStreets(true);
    try {
      const [cityName, stateName] = city.split(' - ');
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
      setIsLoadingStreets(false);
    }
  };

  // Filtragem de sugestões para Partida
  useEffect(() => {
    if (!startAddress.trim() || allStreets.length === 0 || isStartLocked) {
      setStartSuggestions([]);
      return;
    }
    const q = startAddress.trim().toLowerCase();
    setStartSuggestions(allStreets.filter(r => r.toLowerCase().includes(q)).slice(0, 10));
  }, [startAddress, allStreets, isStartLocked]);

  // Filtragem de sugestões para Chegada
  useEffect(() => {
    if (!endAddress.trim() || allStreets.length === 0) {
      setEndSuggestions([]);
      return;
    }
    const q = endAddress.trim().toLowerCase();
    setEndSuggestions(allStreets.filter(r => r.toLowerCase().includes(q)).slice(0, 10));
  }, [endAddress, allStreets]);

  // Filtragem de sugestões para Paradas Intermediárias
  useEffect(() => {
    if (activeStopIdx === null || !intermediateStops[activeStopIdx]?.trim() || allStreets.length === 0) {
      setStopSuggestions([]);
      return;
    }
    const q = intermediateStops[activeStopIdx].trim().toLowerCase();
    setStopSuggestions(allStreets.filter(r => r.toLowerCase().includes(q)).slice(0, 10));
  }, [activeStopIdx, intermediateStops, allStreets]);

  const handleSelectStartStreet = async (streetName: string) => {
    setStartAddress(streetName);
    setStartSuggestions([]);
    setIsLoading(true);
    try {
      const query = `${streetName}, ${city || ''}`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        setCurrentCoords({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        });
        toast({ message: 'Endereço de partida definido!', type: 'success' });
      }
    } catch (err) {
      console.error('Error selecting street:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEndStreet = (streetName: string) => {
    setEndAddress(streetName);
    setEndSuggestions([]);
  };

  const handleSelectStopStreet = (streetName: string, index: number) => {
    const newStops = [...intermediateStops];
    newStops[index] = streetName;
    setIntermediateStops(newStops);
    setActiveStopIdx(null);
    setStopSuggestions([]);
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    setIsStartLocked(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentCoords({ latitude, longitude });
          setStartAddress('Minha Localização Atual');

          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            let street = data.address?.road || data.address?.pedestrian || data.address?.suburb;

            if (!street) {
              const manualStreet = await prompt({
                title: 'Localização não identificada',
                message: 'Não conseguimos identificar sua rua automaticamente. Por favor, digite o nome da rua onde você está:',
                placeholder: 'Ex: Rua das Flores'
              });
              street = manualStreet || null;
            }

            setCurrentStreet(street);
          } catch (err) {
            console.error("Error reverse geocoding:", err);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleToggleStartLock = () => {
    if (isStartLocked) {
      // Unlocking
      setIsStartLocked(false);
      setStartAddress('');
    } else {
      // Locking
      setIsStartLocked(true);
      setStartAddress('Minha Localização Atual');
    }
  };

  const handleAddStop = () => {
    setIntermediateStops([...intermediateStops, '']);
  };

  const handleRemoveStop = (index: number) => {
    const newStops = intermediateStops.filter((_, i) => i !== index);
    setIntermediateStops(newStops);
  };

  const handleStopChange = (index: number, value: string) => {
    const newStops = [...intermediateStops];
    newStops[index] = value;
    setIntermediateStops(newStops);
  };

  const geocodeAddress = async (address: string, viewbox?: [number, number, number, number]): Promise<Coordinate | null> => {
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      if (viewbox) {
        url += `&viewbox=${viewbox[0]},${viewbox[1]},${viewbox[2]},${viewbox[3]}&bounded=1`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
      return null;
    } catch (e) {
      // console.error('Geocoding error:', e);
      return null;
    }
  };

  const handleOptimizeRoute = async () => {
    if (!orsApiKey) {
      setError("A chave da API de roteamento não está configurada.");
      return;
    }
    if (!startAddress.trim()) {
      setError('O endereço de partida é obrigatório.');
      return;
    }
    if (intermediateStops.every(stop => stop.trim() === '')) {
      setError('Adicione pelo menos um ponto de parada.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOptimizedRoute(null);

    // Geocode startAddress
    let initialStartCoord = currentCoords;

    if (startAddress !== 'Minha Localização Atual' || !currentCoords) {
      initialStartCoord = await geocodeAddress(startAddress);
    }

    if (!initialStartCoord) {
      setError('Não foi possível encontrar as coordenadas para o endereço de partida.');
      setIsLoading(false);
      return;
    }

    // Define a viewbox around the start address
    const viewboxBuffer = 0.1; // +/- 0.1 degrees is roughly 10-15 km
    const viewbox: [number, number, number, number] = [
      initialStartCoord.longitude - viewboxBuffer,
      initialStartCoord.latitude - viewboxBuffer,
      initialStartCoord.longitude + viewboxBuffer,
      initialStartCoord.latitude + viewboxBuffer,
    ];

    const addressesToGeocodeWithViewbox: string[] = [];
    const filteredIntermediateStops = intermediateStops.filter(s => s.trim() !== '');
    addressesToGeocodeWithViewbox.push(...filteredIntermediateStops);
    if (endAddress.trim()) {
      addressesToGeocodeWithViewbox.push(endAddress);
    }

    // Geocode intermediate and end addresses using the viewbox
    const geocodedOtherCoords = await Promise.all(
      addressesToGeocodeWithViewbox.map(addr => geocodeAddress(addr, viewbox))
    );

    // Combine start coordinates with other geocoded coordinates
    const coordinates: (Coordinate | null)[] = [initialStartCoord, ...geocodedOtherCoords];

    // Determine the full list of addresses used for geocoding (for error reporting)
    const allAddressesForError = [startAddress, ...filteredIntermediateStops];
    if (endAddress.trim()) {
      allAddressesForError.push(endAddress);
    }
    // Now, allAddressesForError matches the order and count of 'coordinates' array.

    const failedGeocodes = coordinates.map((c, i) => c === null ? allAddressesForError[i] : null).filter(Boolean);
    if (failedGeocodes.length > 0) {
      setError(`Não foi possível encontrar as coordenadas para os seguintes endereços (ou a geocodificação foi muito distante): ${failedGeocodes.join(', ')}`);
      setIsLoading(false);
      return;
    }

    const orsRequestBody = {
      jobs: filteredIntermediateStops.map((_, index) => ({
        id: index + 1,
        type: 'delivery',
        location: [coordinates[index + 1]!.longitude, coordinates[index + 1]!.latitude] // Explicit coordinates
      })),
      vehicles: [{
        id: 1,
        profile: 'driving-car',
        start: { location: [coordinates[0]!.longitude, coordinates[0]!.latitude] }, // Explicit coordinates
        end: endAddress.trim()
          ? { location: [coordinates[coordinates.length - 1]!.longitude, coordinates[coordinates.length - 1]!.latitude] }
          : { location: [coordinates[0]!.longitude, coordinates[0]!.latitude] }, // If no endAddress, return to start explicitly
      }],
      locations: coordinates.map(coord => [coord!.longitude, coord!.latitude]) // All coordinates still provided here
    };

    // console.log('OpenRouteService Request Body:', JSON.stringify(orsRequestBody, null, 2));
    try {
      const response = await fetch('https://api.openrouteservice.org/optimization', {
        method: 'POST',
        headers: {
          'Authorization': orsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orsRequestBody),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Erro ao otimizar a rota.');
      }

      const route = data.routes[0];
      const orderedIndices = route.steps.filter((step: any) => step.type === 'job').map((step: any) => step.id);
      const orderedStops = orderedIndices.map((jobId: number) => filteredIntermediateStops[jobId - 1]);

      setOptimizedRoute({
        stops: orderedStops,
        distance: route.summary.distance,
        duration: route.summary.duration,
      });

    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToGPS = async () => {
    if (!optimizedRoute || optimizedRoute.stops.length === 0) return;

    setIsLoading(true);
    try {
      toast({ message: 'Preparando rota para o GPS...', type: 'info' });

      const waypointPromises = optimizedRoute.stops.map(async (stop, index) => {
        const coords = await geocodeAddress(stop);
        return {
          lat: coords?.latitude || 0,
          lng: coords?.longitude || 0,
          address: stop,
          label: `Parada ${index + 1}`
        };
      });

      const waypoints = await Promise.all(waypointPromises);
      const validWaypoints = waypoints.filter(w => w.lat !== 0);

      if (validWaypoints.length > 0) {
        startMultiStopNavigation(validWaypoints, {
          vehicle_type: 'car', // Pode ser dinâmico no futuro
          return_tab: 'route_tools'
        });
      } else {
        setError('Não foi possível obter coordenadas para as paradas.');
      }
    } catch (err) {
      console.error('Erro ao enviar para o GPS:', err);
      setError('Erro ao preparar navegação.');
    } finally {
      setIsLoading(false);
    }
  };

  const toast = ({ message, type }: { message: string, type: 'success' | 'info' | 'error' | 'warning' }) => {
    // Pequeno helper local se não houver useDialog().toast
    alert({ title: type.toUpperCase(), message });
  };

  useEffect(() => {
    if (optimizedRoute) {
      setIntermediateStops(optimizedRoute.stops);
    }
  }, [optimizedRoute]);

  const handleSelectFromAddressBook = (addresses: SavedAddress[]) => {
    const newStops = addresses.map(addr => addr.fullAddress.split(',')[0].trim());
    const currentStops = intermediateStops.filter(stop => stop.trim() !== '');
    setIntermediateStops([...currentStops, ...newStops]);
    setIsAddressBookOpen(false);
  };

  const handleSaveRoute = async () => {
    if (!optimizedRoute) return;

    const routeName = await prompt({
      title: 'Salvar Rota',
      message: 'Digite um nome para esta rota:',
      placeholder: 'Ex: Entregas de Segunda',
    });

    if (routeName) {
      setIsSaving(true);
      try {
        await cloud.saveRoute(
          routeName,
          [startAddress, ...optimizedRoute.stops, endAddress].filter(Boolean),
          optimizedRoute.distance,
          optimizedRoute.duration
        );
        await alert({ title: 'Sucesso', message: 'Rota salva com sucesso!' });
      } catch (e: any) {
        // console.error("Error saving route:", e);
        await alert({ title: 'Erro', message: `Não foi possível salvar a rota: ${e.message}` });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleImportFromRouteList = () => {
    const routeItems: RouteListItem[] = storage.getRouteListItems();
    if (routeItems && routeItems.length > 0) {
      const newStops = routeItems.map(item => item.address.split(',')[0].trim());
      const currentStops = intermediateStops.filter(stop => stop.trim() !== '');
      setIntermediateStops([...currentStops, ...newStops]);
    }
  };

  if (isKeyLoading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Otimizador de Rotas Inteligente</h2>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <label htmlFor="startAddress" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Endereço de Partida
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-600">
                <Target className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
              </div>
              <input
                type="text"
                id="startAddress"
                value={startAddress}
                readOnly={isStartLocked}
                onChange={(e) => setStartAddress(e.target.value)}
                className={`w-full pl-10 pr-24 py-3 border-none rounded-xl font-bold transition-all ${isStartLocked ? 'bg-gray-100 dark:bg-gray-900/50 text-gray-500' : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500'}`}
                placeholder="Ex: Minha Localização Atual"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={handleToggleStartLock}
                  className={`p-2 rounded-lg transition-all ${isStartLocked ? 'text-gray-400 hover:bg-gray-200' : 'text-brand-600 bg-brand-50 hover:bg-brand-100'}`}
                  title={isStartLocked ? "Clique para editar" : "Clique para bloquear"}
                >
                  {isStartLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleGetCurrentLocation}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                  title="Usar minha localização atual"
                >
                  <Navigation2 className="w-4 h-4" />
                </button>
              </div>

              {!isStartLocked && (startSuggestions.length > 0 || isLoadingStreets) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] max-h-60 overflow-y-auto overflow-x-hidden p-1 animate-in fade-in slide-in-from-top-2">
                  {isLoadingStreets ? (
                    <div className="flex items-center justify-center p-4 gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] font-bold uppercase">Carregando ruas...</span>
                    </div>
                  ) : (
                    startSuggestions.map((rua, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectStartStreet(rua)}
                        className="w-full text-left p-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg flex items-center gap-3 transition-colors group"
                      >
                        <SearchIcon className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{rua}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">
              Por padrão, usamos onde você está agora: <span className="text-brand-600 font-bold">{currentStreet || 'Localização não identificada'}</span>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <label htmlFor="endAddress" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Endereço de Chegada (Opcional)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-600">
                <Flag className="w-5 h-5" />
              </div>
              <input
                type="text"
                id="endAddress"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                placeholder="Vazio para retornar à partida"
              />
              {endSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] max-h-60 overflow-y-auto overflow-x-hidden p-1 animate-in fade-in slide-in-from-top-2">
                  {endSuggestions.map((rua, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectEndStreet(rua)}
                      className="w-full text-left p-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg flex items-center gap-3 transition-colors group"
                    >
                      <SearchIcon className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{rua}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                Paradas Intermediárias
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleImportFromRouteList}
                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  title="Importar do histórico"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsAddressBookOpen(true)}
                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  title="Agenda de endereços"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {intermediateStops.map((stop, index) => (
                <div key={index} className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={stop}
                    onFocus={() => setActiveStopIdx(index)}
                    onBlur={() => setTimeout(() => setActiveStopIdx(null), 200)}
                    onChange={(e) => handleStopChange(index, e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                    placeholder={`Endereço da parada ${index + 1}`}
                  />
                  {intermediateStops.length > 1 && (
                    <button
                      onClick={() => handleRemoveStop(index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  )}

                  {activeStopIdx === index && stopSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[110] max-h-60 overflow-y-auto overflow-x-hidden p-1 animate-in fade-in slide-in-from-top-2">
                      {stopSuggestions.map((rua, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectStopStreet(rua, index)}
                          className="w-full text-left p-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg flex items-center gap-3 transition-colors group"
                        >
                          <SearchIcon className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
                          <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{rua}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              fullWidth
              onClick={handleAddStop}
              className="mt-4 border-dashed border-2 hover:border-brand-500 hover:text-brand-600 transition-all rounded-xl py-3"
              icon={<ListPlus className="w-4 h-4" />}
            >
              Adicionar Nova Parada
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm font-bold flex items-center gap-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {optimizedRoute && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-inner space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Rota Otimizada</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Paradas</p>
                <p className="text-xl font-bold">{optimizedRoute.stops.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Distância</p>
                <p className="text-xl font-bold">{(optimizedRoute.distance / 1000).toFixed(2)} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tempo Estimado</p>
                <p className="text-xl font-bold">{Math.floor(optimizedRoute.duration / 3600)}h {Math.round((optimizedRoute.duration % 3600) / 60)}min</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={handleSendToGPS} className="w-full h-14 bg-brand-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                <Navigation className="w-6 h-6" />
                ENVIAR PARA O GPS INTERNO
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleSaveRoute} variant="outline" className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Rota
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Button
            onClick={handleOptimizeRoute}
            className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
            disabled={isLoading || !orsApiKey}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Otimizar Rota"}
          </Button>
          {!orsApiKey && !isKeyLoading && (
            <p className="text-xs text-center text-red-500 mt-2 flex items-center justify-center gap-1">
              <Settings className="w-3 h-3" />
              A API de Roteamento precisa ser configurada pelo administrador.
            </p>
          )}
        </div>
      </div>

      <BaseModal isOpen={isAddressBookOpen} onClose={() => setIsAddressBookOpen(false)} title="Selecionar Endereços da Agenda">
        <AddressBook
          isSelectionMode={true}
          onSelectionComplete={handleSelectFromAddressBook}
          onClose={() => setIsAddressBookOpen(false)}
        />
      </BaseModal>
    </>
  );
};

export default RouteOptimizer;
