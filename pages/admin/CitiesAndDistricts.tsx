
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { neighborhoodService, Neighborhood } from '../../services/neighborhoodService';
import { City } from '../../types';
import { CitySearchSelect } from '../../components/CitySearchSelect';
import { Button } from '../../components/Button';
import { useDialog } from '../../utils/dialogService';

export const CitiesAndDistricts: React.FC = () => {
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [districts, setDistricts] = useState<Neighborhood[]>([]);
    const [loading, setLoading] = useState(false);

    // Add State
    const [newDistrictName, setNewDistrictName] = useState('');
    const [adding, setAdding] = useState(false);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        if (selectedCity) {
            loadDistricts(selectedCity.id);
        } else {
            setDistricts([]);
        }
    }, [selectedCity]);

    const loadDistricts = async (cityId: string) => {
        setLoading(true);
        try {
            const data = await neighborhoodService.getNeighborhoods(cityId);
            setDistricts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDistrict = async () => {
        if (!selectedCity || !newDistrictName.trim()) return;
        setAdding(true);
        try {
            const result = await neighborhoodService.createNeighborhood(selectedCity.id, newDistrictName);
            if (result.success) {
                setNewDistrictName('');
                await loadDistricts(selectedCity.id);
            } else {
                await alert(result.message || 'Erro ao adicionar bairro.');
            }
        } catch (e: any) {
            await alert('Erro: ' + e.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteDistrict = async (district: Neighborhood) => {
        const ok = await confirm({
            title: 'Excluir Bairro',
            message: `Deseja excluir o bairro "${district.name}"?`
        });
        if (!ok) return;

        try {
            const result = await neighborhoodService.deleteNeighborhood(district.id);
            if (result.success) {
                setDistricts(prev => prev.filter(d => d.id !== district.id));
            } else {
                await alert(result.message || 'Erro ao excluir.');
            }
        } catch (e: any) {
            await alert('Erro: ' + e.message);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                    <MapPin className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Bairros</h1>
                    <p className="text-gray-500 dark:text-gray-400">Adicione e remova bairros manualmente por cidade.</p>
                </div>
            </div>

            {/* City Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Search className="w-5 h-5" /> Selecionar Cidade
                </h2>
                <CitySearchSelect
                    value={selectedCity ? `${selectedCity.name} - ${selectedCity.state}` : ''}
                    onSelect={setSelectedCity}
                    placeholder="Busque por nome da cidade..."
                    label="Cidade"
                />
            </div>

            {selectedCity && (
                <div className="space-y-6">
                    {/* Add Form */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Novo Bairro
                        </h2>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newDistrictName}
                                onChange={e => setNewDistrictName(e.target.value)}
                                placeholder="Nome do Bairro"
                                className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                onKeyDown={e => e.key === 'Enter' && handleAddDistrict()}
                            />
                            <Button onClick={handleAddDistrict} disabled={adding || !newDistrictName.trim()}>
                                {adding ? <Loader2 className="animate-spin w-5 h-5" /> : 'Adicionar'}
                            </Button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Bairros Cadastrados <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{districts.length}</span>
                            </h2>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                        ) : districts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {districts.map(district => (
                                    <div key={district.id} className="group p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:border-brand-300 transition-all">
                                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2" title={district.name}>{district.name}</span>
                                        <button
                                            onClick={() => handleDeleteDistrict(district)}
                                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Nenhum bairro cadastrado nesta cidade.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
