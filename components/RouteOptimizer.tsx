import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { AddressBook } from './AddressBook';
import { BaseModal } from './BaseModal';
import { SavedAddress, RouteListItem } from '../types';
import { MapPin, ListPlus, Loader2, AlertTriangle, Settings, Save } from 'lucide-react';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

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

  const [orsApiKey, setOrsApiKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const { prompt, alert } = useDialog();

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
        // console.error("Error loading ORS API key:", e);
        setError("Não foi possível carregar a configuração de roteamento.");
      } finally {
        setIsKeyLoading(false);
      }
    };
    loadApiKey();
  }, []);

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
    const initialStartCoord = await geocodeAddress(startAddress);
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

  const handleNavigate = async () => {
    if (!optimizedRoute || optimizedRoute.stops.length === 0) return;

    const firstStop = optimizedRoute.stops[0];
    const coords = await geocodeAddress(firstStop);

    if (coords) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setError(`Não foi possível obter as coordenadas para: ${firstStop}`);
    }
  };

  useEffect(() => {
    if (optimizedRoute) {
      setIntermediateStops(optimizedRoute.stops);
    }
  }, [optimizedRoute]);

  const handleSelectFromAddressBook = (addresses: SavedAddress[]) => {
    const newStops = addresses.map(addr => addr.fullAddress);
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
      const newStops = routeItems.map(item => item.address);
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
          <div>
            <label htmlFor="startAddress" className="block text-sm font-medium text-gray-700">
              Endereço de Partida (Obrigatório)
            </label>
            <input
              type="text"
              id="startAddress"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Digite o endereço de partida"
            />
          </div>

          <div>
            <label htmlFor="endAddress" className="block text-sm font-medium text-gray-700">
              Endereço de Chegada (Opcional)
            </label>
            <input
              type="text"
              id="endAddress"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Deixar em branco se for o mesmo da partida"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Pontos de Parada Intermediários</h3>
              <div className="flex items-center gap-2">
                <Button onClick={handleImportFromRouteList} variant="outline" size="sm" className="flex items-center gap-2">
                  <ListPlus className="w-4 h-4" />
                  Importar
                </Button>
                <Button onClick={() => setIsAddressBookOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Agenda
                </Button>
              </div>
            </div>

            {intermediateStops.map((stop, index) => (
              <div key={index} className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  value={stop}
                  onChange={(e) => handleStopChange(index, e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={`Parada ${index + 1}`}
                />
                <Button onClick={() => handleRemoveStop(index)} className="bg-red-500 hover:bg-red-600 text-white">
                  Remover
                </Button>
              </div>
            ))}
            <Button onClick={handleAddStop} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white">
              Adicionar Parada
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
            <div className="flex gap-2 mt-4">
              <Button onClick={handleNavigate} variant="outline" className="w-full flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Navegar
              </Button>
              <Button onClick={handleSaveRoute} className="w-full flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Rota
              </Button>
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
