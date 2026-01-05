
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Trash2, RotateCcw, Download, Plus, ArrowLeft, Eraser, Copy, Check, ChevronDown, ChevronUp, Mic, Map, Square, CheckSquare, X, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { SavedAddress } from '../types';
import * as storage from '../services/storage';
import { useDialog } from '../utils/dialogService';

interface AddressBookProps {
  onClose: () => void;
  onNavigateInternal?: (destination: { lat: number, lng: number, name: string, fullAddress: string }) => void;
  isSelectionMode?: boolean;
  onSelectionComplete?: (addresses: SavedAddress[]) => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const AddressBook: React.FC<AddressBookProps> = ({ onClose, onNavigateInternal, isSelectionMode = false, onSelectionComplete }) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [addrInput, setAddrInput] = useState('');

  const [listeningField, setListeningField] = useState<'name' | 'addr' | null>(null);

  const [expandedIds, setExpandedIds] = useState(new Set<string>());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [deletedItem, setDeletedItem] = useState<SavedAddress | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [selectedIds, setSelectedIds] = useState(new Set<string>());

  // Sort State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showMap, setShowMap] = useState(false);
  const { alert, confirm } = useDialog();

  useEffect(() => {
    let loaded = storage.getAddresses();
    // Default sort by visit count/time
    loaded.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    setAddresses(loaded);
  }, []);

  const handleClearForm = () => {
    setNameInput('');
    setAddrInput('');
  };

  const handleVoiceInput = async (field: 'name' | 'addr') => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      await alert({ title: 'Reconhecimento de Voz', message: 'Seu navegador não suporta reconhecimento de voz.' });
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
        setNameInput(transcript);
      } else {
        setAddrInput(transcript);
      }
      setListeningField(null);
    };

    recognition.onerror = (event: any) => {
      setListeningField(null);
      if (event.error !== 'no-speech') {
        void alert({ title: 'Microfone', message: 'Erro no microfone ou permissão negada.' });
      }
    };

    recognition.onend = () => {
      setListeningField(null);
    };

    try {
      recognition.start();
    } catch (e) {
      setListeningField(null);
    }
  };

  const handleAddAddress = () => {
    if (!addrInput.trim()) return;

    const normalizedNew = addrInput.trim().toLowerCase();
    const isDuplicate = addresses.some(addr => addr.fullAddress.toLowerCase() === normalizedNew);

    if (isDuplicate) {
      (async () => {
        const confirmAdd = await confirm({ title: 'Endereço duplicado', message: 'Este endereço parece já estar cadastrado. Deseja adicionar mesmo assim?' });
        if (!confirmAdd) return;

        const newAddress: SavedAddress = {
          id: crypto.randomUUID(),
          name: nameInput.trim() || addrInput.trim().split(',')[0], // Name is optional, default to start of address
          fullAddress: addrInput.trim(),
          createdAt: Date.now(),
          visitCount: 0
        };

        const updated = [newAddress, ...addresses];
        setAddresses(updated);
        storage.saveAddresses(updated);
        handleClearForm();
      })();
      return;
    }

    const newAddress: SavedAddress = {
      id: crypto.randomUUID(),
      name: nameInput.trim() || addrInput.trim().split(',')[0], // Name is optional, default to start of address
      fullAddress: addrInput.trim(),
      createdAt: Date.now(),
      visitCount: 0
    };

    const updated = [newAddress, ...addresses];
    setAddresses(updated);
    storage.saveAddresses(updated);

    handleClearForm();
  };

  const handleRemove = (id: string) => {
    const itemToRemove = addresses.find(a => a.id === id);
    if (!itemToRemove) return;

    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    storage.saveAddresses(updated);

    setDeletedItem(itemToRemove);
    setShowToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setShowToast(false);
      setDeletedItem(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (!deletedItem) return;
    const updated = [deletedItem, ...addresses].sort((a, b) => b.createdAt - a.createdAt);
    setAddresses(updated);
    storage.saveAddresses(updated);
    setShowToast(false);
    setDeletedItem(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const registerVisit = (id: string) => {
    const updatedAddresses = addresses.map(a =>
      a.id === id ? { ...a, visitCount: (a.visitCount || 0) + 1, lastVisited: Date.now() } : a
    );
    setAddresses(updatedAddresses);
    storage.saveAddresses(updatedAddresses);
  };

  const handleSystemNavigation = async (addressToNavigate: SavedAddress) => {
    if (!addressToNavigate || !onNavigateInternal) return;
    setIsGeocoding(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToNavigate.fullAddress)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        registerVisit(addressToNavigate.id);
        onNavigateInternal({ lat, lng: lon, name: addressToNavigate.name, fullAddress: addressToNavigate.fullAddress });
      } else {
        await alert({ title: 'Geocoding', message: 'Não foi possível encontrar as coordenadas para este endereço.' });
      }
    } catch (e) {
      await alert({ title: 'Geocoding', message: 'Erro ao buscar coordenadas. Verifique a conexão.' });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleExportCSV = () => {
    if (addresses.length === 0) return;
    const headers = "Nome,Endereco,Visitas\n";
    const rows = addresses.map(a => `"${a.name}","${a.fullAddress}",${a.visitCount || 0}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ze_enderecos.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSort = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    const sorted = [...addresses].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return newOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    setAddresses(sorted);
  };

  return (
    <div className="space-y-6">

      {!isSelectionMode && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                Agenda
              </h2>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowMap(!showMap)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <Map className="w-5 h-5" />
              </button>
              <button onClick={toggleSort} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                {sortOrder === 'asc' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                className="w-full pl-3 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm font-bold"
                placeholder="Nome (Opcional)"
              />
              <button onClick={() => handleVoiceInput('name')} className={`absolute right-2 top-2.5 p-1.5 rounded-full ${listeningField === 'name' ? 'bg-red-100 text-red-500' : 'text-gray-400'}`}>
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <input
                type="text" value={addrInput} onChange={(e) => setAddrInput(e.target.value)}
                className="w-full pl-3 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm"
                placeholder="Endereço Completo (Obrigatório)"
              />
              <button onClick={() => handleVoiceInput('addr')} className={`absolute right-2 top-2.5 p-1.5 rounded-full ${listeningField === 'addr' ? 'bg-red-100 text-red-500' : 'text-gray-400'}`}>
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClearForm} className="px-4"><Eraser className="w-5 h-5" /></Button>
              <div className="flex-1">
                <Button onClick={handleAddAddress} fullWidth disabled={!addrInput}>
                  <Plus className="w-5 h-5 mr-2" /> Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Placeholder */}
      {showMap && (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl h-48 flex items-center justify-center text-gray-500 animate-in fade-in">
          <p className="text-sm">Mapa de endereços em breve...</p>
        </div>
      )}

      {/* Tools Bar */}
      {addresses.length > 0 && !isSelectionMode && (
        <div className="flex justify-end items-center px-1">
          <button onClick={handleExportCSV} className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <Download className="w-3 h-3 mr-1" /> CSV
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            Nenhum endereço salvo.
          </div>
        ) : (
          addresses.map((addr) => {
            const isExpanded = expandedIds.has(addr.id);
            const isSelected = selectedIds.has(addr.id);
            return (
              <div
                key={addr.id}
                onClick={() => isSelectionMode ? toggleSelection(addr.id) : null}
                className={`bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm transition-all duration-200 ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-brand-500 ring-2 ring-brand-500' : 'border-gray-100 dark:border-gray-700'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {isSelectionMode && (
                      <div className="text-brand-600">
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-300" />}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{addr.name}</div>
                      {addr.visitCount !== undefined && addr.visitCount > 0 && (
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">{addr.visitCount} visitas</div>
                      )}
                    </div>
                  </div>

                  {!isSelectionMode && (
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(addr.id); }} className="p-1.5 text-gray-300 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className={`rounded-lg p-2.5 mb-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 ${!isExpanded ? 'line-clamp-2' : ''}`} onClick={(e) => { if (!isSelectionMode) { e.stopPropagation(); toggleExpand(addr.id); } }}>
                  {addr.fullAddress}
                </div>

                {!isSelectionMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(addr.fullAddress, addr.id); }}
                      className="flex-none p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-brand-500"
                    >
                      {copiedId === addr.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSystemNavigation(addr); }}
                      disabled={isGeocoding}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                      {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iniciar Rota'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
          <span className="font-medium">Removido</span>
          <button onClick={handleUndo} className="flex items-center gap-2 text-brand-400 font-bold text-sm hover:text-brand-300">
            <RotateCcw className="w-4 h-4" /> Desfazer
          </button>
        </div>
      )}
    </div>
  );
};
