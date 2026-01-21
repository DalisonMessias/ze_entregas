import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, Save, CheckCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerLevelBenefit } from '../types';
import { useDialog } from '../utils/dialogService';

export const AdminPartnerLevels = () => {
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { confirm, alert } = useDialog();

    const loadLevels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPartnerLevels();
            setLevels(data);
        } catch (error) {
            console.error("Failed to load partner levels:", error);
            await alert({ title: 'Erro', message: 'Erro ao carregar os níveis de parceiro.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLevels();
    }, [loadLevels]);

    const handleLevelChange = (levelId: string, field: keyof PartnerLevelBenefit, value: any) => {
        setLevels(prevLevels =>
            prevLevels.map(l =>
                l.id === levelId ? { ...l, [field]: value } : l
            )
        );
    };

    const handleAddLevel = () => {
        setLevels(prev => [...prev, {
            id: `new-${crypto.randomUUID()}`,
            partner_level: '',
            display_name: '',
            min_deliveries: 0,
            min_rating: 0,
            store_discount_percent: 0,
            service_fee_reduction_percent: 0,
        } as unknown as PartnerLevelBenefit]);
    };

    const handleDeleteLevel = async (levelId: string) => {
        const confirmed = await confirm({
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir este nível? Esta ação não pode ser desfeita.',
        });

        if (confirmed) {
            if (levelId.startsWith('new-')) {
                setLevels(prev => prev.filter(l => l.id !== levelId));
                await alert({ title: 'Sucesso', message: 'Nível removido da lista.' });
                return;
            }

            setSaving(true);
            try {
                await cloud.adminDeletePartnerLevel(levelId);
                await alert({ title: 'Sucesso', message: 'Nível excluído com sucesso!' });
                await loadLevels();
            } catch (e: any) {
                await alert({ title: 'Erro', message: 'Erro ao excluir o nível: ' + e.message });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            // Remove temporary IDs before saving
            const levelsToSave = levels.map(l => {
                if (l.id.startsWith('new-')) {
                    const { id, ...rest } = l;
                    return rest;
                }
                return l;
            });
            await cloud.adminUpdatePartnerLevels(levelsToSave);
            await alert({ title: 'Sucesso', message: 'Níveis de parceiro salvos com sucesso!' });
            await loadLevels(); // Recarregar para obter IDs do banco de dados
        } catch (e: any) {
            await alert({ title: 'Erro', message: 'Erro ao salvar os níveis: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Star className="w-6 h-6 text-yellow-500" /> Configuração de Níveis de Parceiro
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Defina os benefícios e requisitos para cada nível de entregador parceiro.</p>
                    </div>
                    <Button onClick={handleAddLevel}>Adicionar Nível</Button>
                </div>


                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.id} className="p-4 border rounded-lg dark:border-gray-700 relative group">
                            <div className="absolute top-1 right-4">
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLevel(level.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Identificador (Ex: BRONZE)</label>
                                    <input
                                        type="text"
                                        value={level.partner_level}
                                        onChange={e => handleLevelChange(level.id, 'partner_level', e.target.value.toUpperCase())}
                                        className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Exibição</label>
                                    <input
                                        type="text"
                                        value={level.display_name}
                                        onChange={e => handleLevelChange(level.id, 'display_name', e.target.value)}
                                        className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mín. Entregas</label>
                                    <input type="number" value={level.min_deliveries} onChange={e => handleLevelChange(level.id, 'min_deliveries', parseInt(e.target.value))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mín. Avaliação</label>
                                    <input type="number" step="0.1" value={level.min_rating} onChange={e => handleLevelChange(level.id, 'min_rating', parseFloat(e.target.value))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desconto Loja (%)</label>
                                    <input type="number" value={level.store_discount_percent} onChange={e => handleLevelChange(level.id, 'store_discount_percent', parseInt(e.target.value))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Redução Taxa (%)</label>
                                    <input type="number" value={level.service_fee_reduction_percent} onChange={e => handleLevelChange(level.id, 'service_fee_reduction_percent', parseInt(e.target.value))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Button fullWidth onClick={handleSaveChanges} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>}
                </Button>
            </div>
        </div>
    );
};
