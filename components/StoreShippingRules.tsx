
import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Info, HelpCircle, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { StoreShippingRule } from '../types';
import { useDialog } from '../utils/dialogService'; // Import useDialog

const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
        setter("");
        return;
    }
    const amount = Number(value) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formatted);
};



export const StoreShippingRules: React.FC = () => {
    const [rules, setRules] = useState<StoreShippingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New Rule State
    // const [type, setType] = useState<'free_above' | 'fixed_rate'>('free_above'); // Removed as fixed_rate is deprecated here
    const [value, setValue] = useState('');
    const [threshold, setThreshold] = useState('');

    const { alert, confirm } = useDialog(); // Use the custom dialog service

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreShippingRules();
            setRules(data);
        } catch (e) {
            // console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!value) {
            await alert({ title: "Valor Não Definido", message: "Defina o valor." });
            return;
        }
        if (!threshold) {
            await alert({ title: "Valor Mínimo Não Definido", message: "Defina o valor mínimo do pedido." });
            return;
        }

        const valFloat = parseCurrency(value);
        const thresholdFloat = threshold ? parseCurrency(threshold) : undefined;



        setSaving(true);
        try {
            await cloud.createStoreShippingRule({
                rule_type: 'free_above',
                value: valFloat,
                threshold: thresholdFloat
            });
            setValue('');
            setThreshold('');
            loadRules();
        } catch (e: any) {
            await alert({ title: "Erro ao Adicionar Regra", message: "Erro: " + e.message });
        }
    };

    const handleDelete = async (id: string) => {
        const result = await confirm({ title: "Confirmar Remoção", message: "Remover esta regra?" });
        if (!result) return;
        try {
            await cloud.deleteStoreShippingRule(id);
            loadRules();
        } catch (e: any) {
            await alert({ title: "Erro ao Remover Regra", message: "Erro: " + e.message });
        }
    };

    return (
        <div id="shipping-rules-section" className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    <Truck className="w-6 h-6 text-brand-600" /> Regras de Entrega
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Configure taxas personalizadas ou frete grátis para fidelizar seus clientes.
                </p>

                {/* Form */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-4 mb-6">
                    <div className="flex gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-600 shadow text-brand-600 flex-1 text-center text-xs font-bold">
                            Frete Grátis Acima de...
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Valor Mínimo do Pedido
                                </label>
                                <div className="group relative">
                                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center shadow-lg">
                                        Valor mínimo que o cliente precisa comprar para ganhar o frete grátis. Ex: "Acima de R$ 50,00".
                                        <div className="absolute top-100 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                    </div>
                                </div>
                            </div>
                            <CustomInput
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                placeholder="0,00"
                                mask="currency"
                                icon={DollarSign}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Custo para Loja (Subsídio)
                                </label>
                                <div className="group relative">
                                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center shadow-lg">
                                        Quanto custaria essa entrega se não fosse grátis. Usado apenas para seu controle financeiro interno, o cliente não vê isso.
                                        <div className="absolute top-100 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                    </div>
                                </div>
                            </div>
                            <CustomInput
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder="0,00"
                                mask="currency"
                                icon={DollarSign}
                            />
                        </div>
                    </div>
                    <Button onClick={handleAdd} disabled={saving} fullWidth>
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Adicionar Regra'}
                    </Button>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600" /></div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">Nenhuma regra ativa.</p>
                        </div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                                        {rule.rule_type === 'free_above'
                                            ? `Frete Grátis p/ pedidos > R$ ${rule.threshold?.toFixed(2)}`
                                            : `Taxa Fixa (Antigo - Remova e use a nova configuração)`
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Valor: R$ {rule.value.toFixed(2)}
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
