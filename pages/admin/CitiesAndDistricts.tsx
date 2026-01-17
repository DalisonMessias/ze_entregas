
import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Save, Search, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { brasilAbertoService } from '../../services/brasilAbertoService';
import { getClient } from '../../services/cloud';
import { City } from '../../types';
import { CityDistrict } from '../../types/brasilAberto';
import { useDialog } from '../../utils/dialogService';
import { CitySearchSelect } from '../../components/CitySearchSelect';

export const CitiesAndDistricts: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'config' | 'import'>('import');
    const [apiKey, setApiKey] = useState('');
    const [loadingKey, setLoadingKey] = useState(false);

    // Import state
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [ibgeCode, setIbgeCode] = useState(''); // New state
    const [importing, setImporting] = useState(false);
    const [storedDistricts, setStoredDistricts] = useState<CityDistrict[]>([]);
    const [loadingDistricts, setLoadingDistricts] = useState(false);

    // Feedback
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadApiKey();
    }, []);

    useEffect(() => {
        if (selectedCity) {
            loadStoredDistricts(selectedCity.id);
            setIbgeCode(selectedCity.ibge_code || '');
        } else {
            setStoredDistricts([]);
            setMessage(null);
        }
    }, [selectedCity]);

    const loadApiKey = async () => {
        try {
            const key = await brasilAbertoService.getApiKey();
            if (key) setApiKey(key);
        } catch (e) {
            console.error(e);
        }
    };

    const loadStoredDistricts = async (cityId: string) => {
        setLoadingDistricts(true);
        const data = await brasilAbertoService.getStoredDistricts(cityId);
        setStoredDistricts(data);
        setLoadingDistricts(false);
    };

    const handleSaveKey = async () => {
        setLoadingKey(true);
        setMessage(null);
        try {
            await brasilAbertoService.saveApiKey(apiKey);
            setMessage({ type: 'success', text: 'API Key salva com sucesso!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Erro ao salvar API Key.' });
        }
        setLoadingKey(false);
    };

    const handleImport = async () => {
        if (!selectedCity) return;

        setImporting(true);
        setMessage(null);

        try {
            console.log(`Iniciando importação para: ${selectedCity.name} (${selectedCity.state}). IBGE Manual: ${ibgeCode}`);
            const result = await brasilAbertoService.importDistricts(selectedCity.id, selectedCity.state, selectedCity.name, ibgeCode);
            if (result.success) {
                setMessage({
                    type: 'success', text: `Sucesso! ${result.count} bairros importados/valid
                ados.` });
                loadStoredDistricts(selectedCity.id);
            } else {
                setMessage({ type: 'error', text: result.message || 'Erro desconhecido na importação.' });
            }
        } catch (e: any) {
            console.error(e);
            setMessage({ type: 'error', text: e.message || 'Erro falha critica.' });
        }
        setImporting(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Bairros</h1>
                    <p className="text-gray-500 dark:text-gray-400">Integração com Brasil Aberto para importação automática</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('import')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'import'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Importação e Listagem
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'config'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Configuração da API
                </button>
            </div>

            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {activeTab === 'config' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-5 h-5" /> Configuração Brasil Aberto
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Key (Token de Acesso)
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder="Insira sua chave da API Brasil Aberto"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Obtenha sua chave em <a href="https://brasilaberto.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">brasilaberto.com</a>
                            </p>
                        </div>
                        <button
                            onClick={handleSaveKey}
                            disabled={loadingKey}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loadingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Configuração
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'import' && (
                <div className="space-y-6">
                    {/* Seleção de Cidade */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5" /> Selecionar Cidade
                        </h2>

                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full relative z-50">
                                <CitySearchSelect
                                    value={selectedCity ? `${selectedCity.name} - ${selectedCity.state}` : ''}
                                    onSelect={setSelectedCity}
                                    placeholder="Busque por nome da cidade..."
                                    label="Cidade Cadastrada"
                                />
                                <div className="mt-2 text-xs text-gray-500 flex gap-1">
                                    <span>Não sabe o código IBGE?</span>
                                    <a href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-0.5">
                                        Consultar no IBGE <Globe className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="w-full md:w-48">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Cód. IBGE (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={ibgeCode}
                                    onChange={(e) => setIbgeCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ex: 3550308"
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono"
                                />
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={!selectedCity || importing || !apiKey}
                                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[50px] mt-auto"
                            >
                                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                                {activeTab === 'import' && storedDistricts.length > 0 ? 'Atualizar Bairros' : 'Importar da API'}
                            </button>
                        </div>

                        {!apiKey && (
                            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Configure a API Key na aba de configurações primeiro.
                            </p>
                        )}
                    </div>

                    {/* Listagem de Bairros */}
                    {selectedCity && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    Bairros Cadastrados <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{storedDistricts.length}</span>
                                </h2>
                            </div>

                            {loadingDistricts ? (
                                <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                            ) : storedDistricts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {storedDistricts.map(district => (
                                        <div key={district.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-colors">
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{district.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Nenhum bairro encontrado para esta cidade.</p>
                                    <p className="text-sm mt-1">Clique em "Importar da API" para buscar dados automaticamente.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
