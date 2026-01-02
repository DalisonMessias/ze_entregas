import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, Save, CheckCircle, AlertTriangle, Edit } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerLevelBenefit } from '../types';

export const AdminPartnerLevels: React.FC = () => {
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadLevels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPartnerLevels();
            setLevels(data);
        } catch (error) {
            console.error("Failed to load partner levels:", error);
            setFeedback({ type: 'error', text: 'Erro ao carregar os níveis de parceiro.' });
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

    const handleSaveChanges = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await cloud.adminUpdatePartnerLevels(levels);
            setFeedback({ type: 'success', text: 'Níveis de parceiro salvos com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar os níveis: ' + e.message });
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
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Star className="w-6 h-6 text-yellow-500" /> Configuração de Níveis de Parceiro
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Defina os benefícios e requisitos para cada nível de entregador parceiro.</p>

                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.id} className="p-4 border rounded-lg dark:border-gray-700">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Nível</label>
                                <input
                                    type="text"
                                    value={level.display_name}
                                    onChange={e => handleLevelChange(level.id, 'display_name', e.target.value)}
                                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600 text-lg font-bold text-brand-600 dark:text-brand-400"
                                />
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

                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveChanges} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>}
                </Button>
            </div>
        </div>
    );
};
