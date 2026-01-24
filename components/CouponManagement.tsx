import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

// Interfaces simplificadas
interface GlobalCoupon {
    id: string;
    code: string;
    description?: string;
    discount_type: 'FIXED' | 'PERCENTAGE';
    discount_value: number;
    min_order_value?: number;
    usage_limit?: number;
    usage_count: number;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
}

export const CouponManagement: React.FC = () => {
    const [coupons, setCoupons] = useState<GlobalCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { confirm } = useDialog();

    const [form, setForm] = useState<Partial<GlobalCoupon>>({
        code: '',
        discount_type: 'FIXED',
        discount_value: 0,
        is_active: true
    });

    // Mock initial data load (replace with real API call later)
    useEffect(() => {
        // TODO: Implement cloud.getGlobalCoupons()
        setTimeout(() => {
            setCoupons([]); // Empty for now
            setLoading(false);
        }, 500);
    }, []);

    const handleSave = async () => {
        if (!form.code || !form.discount_value) return;
        setIsSaving(true);
        try {
            // TODO: Implement cloud.createGlobalCoupon(form)
            // Mock success
            await new Promise(r => setTimeout(r, 1000));
            setCoupons(prev => [{ ...form, id: Math.random().toString(), usage_count: 0, created_at: new Date().toISOString() } as GlobalCoupon, ...prev]);
            setIsModalOpen(false);
            setForm({ code: '', discount_type: 'FIXED', discount_value: 0, is_active: true });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                <div>
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <Tag className="w-5 h-5 text-brand-600" /> Cupons Globais
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Gerencie cupons de desconto válidos em toda a plataforma.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Cupom
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 mx-auto max-w-lg">
                        <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">Nenhum cupom criado</h3>
                        <p className="text-gray-500 text-sm mb-6">Crie cupons para impulsionar as vendas na plataforma.</p>
                        <Button variant="outline" onClick={() => setIsModalOpen(true)}>Criar Primeiro Cupom</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 bg-brand-50 dark:bg-brand-900/20 rounded-bl-xl text-xs font-bold text-brand-700 dark:text-brand-300">
                                    {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`} OFF
                                </div>
                                <h4 className="font-black text-lg text-gray-900 dark:text-white mb-1 uppercase tracking-wider">{coupon.code}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{coupon.description || 'Sem descrição'}</p>
                                <div className="flex justify-between items-center text-[10px] font-medium text-gray-400">
                                    <span>Usos: {coupon.usage_count}</span>
                                    <span className={coupon.is_active ? "text-green-500" : "text-red-500"}>{coupon.is_active ? 'ATIVO' : 'INATIVO'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[32px] shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg dark:text-white">Novo Cupom Global</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 dark:text-white" /></button>
                        </div>
                        <div className="space-y-4">
                            <CustomInput
                                label="Código do Cupom"
                                value={form.code}
                                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                placeholder="Ex: BEMVINDO10"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Desconto</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                                        value={form.discount_type}
                                        onChange={e => setForm({ ...form, discount_type: e.target.value as any })}
                                    >
                                        <option value="FIXED">Valor Fixo (R$)</option>
                                        <option value="PERCENTAGE">Porcentagem (%)</option>
                                    </select>
                                </div>
                                <CustomInput
                                    label="Valor"
                                    type="number"
                                    value={form.discount_value}
                                    onChange={e => setForm({ ...form, discount_value: parseFloat(e.target.value) })}
                                />
                            </div>
                            <CustomInput
                                label="Descrição (Opcional)"
                                value={form.description || ''}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                textarea
                            />
                            <Button fullWidth onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cupom'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
