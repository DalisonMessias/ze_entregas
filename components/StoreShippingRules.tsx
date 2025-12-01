
import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreShippingRule } from '../types';

export const StoreShippingRules: React.FC = () => {
    const [rules, setRules] = useState<StoreShippingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New Rule State
    const [type, setType] = useState<'free_above' | 'fixed_rate'>('free_above');
    const [value, setValue] = useState('');
    const [threshold, setThreshold] = useState('');

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreShippingRules();
            setRules(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!value) return alert("Defina o valor.");
        if (type === 'free_above' && !threshold) return alert("Defina o valor mínimo do pedido.");

        setSaving(true);
        try {
            await cloud.createStoreShippingRule({
                rule_type: type,
                value: parseFloat(value),
                threshold: threshold ? parseFloat(threshold) : undefined
            });
            setValue('');
            setThreshold('');
            loadRules();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta regra?")) return;
        try {
            await cloud.deleteStoreShippingRule(id);
            loadRules();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    <Truck className="w-6 h-6 text-brand-600" /> Regras de Entrega
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Configure taxas personalizadas ou frete grátis para fidelizar seus clientes.
                </p>

                {/* Form */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-4 mb-6">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setType('free_above')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${type === 'free_above' ? 'bg-white dark:bg-gray-600 shadow text-brand-600' : 'text-gray-500'}`}
                        >
                            Frete Grátis Acima de...
                        </button>
                        <button 
                            onClick={() => setType('fixed_rate')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${type === 'fixed_rate' ? 'bg-white dark:bg-gray-600 shadow text-brand-600' : 'text-gray-500'}`}
                        >
                            Taxa Fixa de Entrega
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {type === 'free_above' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Valor Mínimo do Pedido</label>
                                <input 
                                    type="number" 
                                    placeholder="Ex: 100.00" 
                                    value={threshold}
                                    onChange={e => setThreshold(e.target.value)}
                                    className="w-full p-3 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">
                                {type === 'free_above' ? 'Custo para Loja (Subsídio)' : 'Valor da Taxa Fixa'}
                            </label>
                            <input 
                                type="number" 
                                placeholder="Ex: 10.00" 
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                className="w-full p-3 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                            />
                        </div>
                    </div>

                    <Button onClick={handleAdd} disabled={saving} fullWidth>
                        {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Adicionar Regra'}
                    </Button>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600"/></div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                            <p className="text-gray-400 text-sm">Nenhuma regra ativa.</p>
                        </div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                                        {rule.rule_type === 'free_above' 
                                            ? `Frete Grátis p/ pedidos > R$ ${rule.threshold}` 
                                            : `Taxa Fixa de Entrega`
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Valor: R$ {rule.value}
                                    </p>
                                </div>
                                <button onClick={() => handleDelete(rule.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
