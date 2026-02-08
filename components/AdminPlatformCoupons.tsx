
import React, { useState, useEffect } from 'react';
import { Plus, Tag, Ticket, Calendar, Search, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, Percent, DollarSign, Truck, Package, Info, Loader2, ArrowRight } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Coupon } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { useDialog } from '../utils/dialogService';

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove "R$", " ", ".", and use "," as decimal separator
    const cleanedValue = value.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanedValue) || 0;
};

export const AdminPlatformCoupons: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const { alert, confirm } = useDialog();

    // Modal State
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [cities, setCities] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const discountTypeOptions = [
        { label: 'Valor Fixo (R$)', value: 'FIXED' },
        { label: 'Porcentagem (%)', value: 'PERCENTAGE' },
        { label: 'Frete Grátis', value: 'FREE_SHIPPING' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            const [couponsRes, citiesRes, categoriesRes] = await Promise.all([
                sb.from('coupons').select('*').eq('is_platform_coupon', true).order('created_at', { ascending: false }),
                sb.from('cities').select('id, name').eq('is_active', true).order('name'),
                sb.from('categories').select('id, name').order('name')
            ]);

            if (couponsRes.error) throw couponsRes.error;
            setCoupons(couponsRes.data || []);
            setCities(citiesRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error(error);
            alert({ title: 'Erro', message: 'Falha ao carregar dados.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCoupon = async () => {
        if (!formData.code || !formData.discount_value || !formData.start_date) {
            alert({ title: 'Atenção', message: 'Preencha os campos obrigatórios.' });
            return;
        }

        const payload = {
            store_id: null, // Global Coupon
            city_id: formData.city_id || null,
            category_id: formData.category_id || null,
            is_platform_coupon: true,
            is_stackable: formData.is_stackable || false,
            code: formData.code.toUpperCase(),
            description: formData.description,
            discount_type: formData.discount_type || 'PERCENTAGE',
            discount_value: parseCurrency(formData.discount_value),
            min_order_value: parseCurrency(formData.min_order_value || '0'),
            max_discount_value: formData.max_discount_value ? parseCurrency(formData.max_discount_value) : null,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            user_usage_limit: formData.user_usage_limit ? parseInt(formData.user_usage_limit) : null,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            usage_count: editingItem?.usage_count || 0
        };

        try {
            if (editingItem) {
                const { success } = await cloud.updateCoupon(editingItem.id, payload);
                if (success) { loadData(); setIsCouponModalOpen(false); }
                else throw new Error('Falha atualizar');
            } else {
                const { success } = await cloud.createCoupon(payload as any);
                if (success) { loadData(); setIsCouponModalOpen(false); }
                else throw new Error('Falha criar');
            }
        } catch (e) {
            alert({ title: 'Erro', message: 'Erro ao salvar cupom. Verifique se o código já existe.' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: 'Excluir?', message: 'Tem certeza que deseja remover este cupom global?' })) return;
        await cloud.deleteCoupon(id);
        loadData();
    };

    const openEditCoupon = (coupon: Coupon) => {
        setEditingItem(coupon);
        setFormData({
            ...coupon,
            start_date: coupon.start_date.split('T')[0],
            end_date: coupon.end_date ? coupon.end_date.split('T')[0] : ''
        });
        setIsCouponModalOpen(true);
    };

    const openNewCoupon = () => {
        setEditingItem(null);
        setFormData({
            discount_type: 'FIXED',
            start_date: new Date().toISOString().split('T')[0],
            is_active: true
        });
        setIsCouponModalOpen(true);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-brand-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Ticket className="w-8 h-8 text-brand-500" /> Cupons Globais (Plataforma)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Crie cupons subsidiados pelo Zé Entregas. O valor do desconto será pago ao lojista via crédito em carteira.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-brand-900/5 min-h-[400px] p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold">Cupons Ativos ({coupons.length})</h2>
                    <Button onClick={openNewCoupon} className="rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20"><Plus className="w-4 h-4" /> Novo Cupom Global</Button>
                </div>

                {coupons.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Ticket className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Nenhum cupom da plataforma criado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="group relative p-5 rounded-2xl border border-dashed border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/10 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all">
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700" />
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700" />

                                <div className="flex justify-between items-start mb-2 pl-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coupon.is_active ? 'Ativo' : 'Inativo'}</span>
                                            <span className="text-xs text-brand-600 font-bold bg-brand-100 px-2 py-0.5 rounded-md">SUBSÍDIO</span>
                                            <span className="text-xs text-gray-400">Usado: {coupon.usage_count}x</span>
                                        </div>
                                        <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-wider">{coupon.code}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditCoupon(coupon)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(coupon.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="pl-4 mt-4 flex items-center justify-between border-t border-brand-100 dark:border-brand-800/50 pt-3">
                                    <span className="font-bold text-brand-600">
                                        {coupon.discount_type === 'FREE_SHIPPING' ? 'Frete Grátis' : `${coupon.discount_value}${coupon.discount_type === 'PERCENTAGE' ? '%' : ''} OFF`}
                                    </span>
                                    <span className="text-xs text-gray-500">Mín: R$ {coupon.min_order_value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MODAL COUPON --- */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-brand-50 dark:bg-brand-900/20">
                            <div>
                                <h3 className="text-xl font-bold">{editingItem ? 'Editar Cupom da Plataforma' : 'Novo Cupom Global'}</h3>
                                <p className="text-xs text-brand-600 font-medium">Este cupom será pago pelo Zé Entregas.</p>
                            </div>
                            <button onClick={() => setIsCouponModalOpen(false)}><XCircle className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <CustomInput label="Código do Cupom" placeholder="Ex: PRIMEIRACOMPRA" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
                            <CustomInput label="Descrição (Opcional)" placeholder="Para novos clientes em todo o app..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    label="Tipo de Desconto"
                                    value={formData.discount_type}
                                    onChange={value => setFormData({ ...formData, discount_type: value })}
                                    options={discountTypeOptions}
                                />
                                {formData.discount_type !== 'FREE_SHIPPING' && (
                                    <CustomInput
                                        label={formData.discount_type === 'PERCENTAGE' ? "Valor do Desconto (%)" : "Valor do Desconto (R$)"}
                                        mask={formData.discount_type === 'FIXED' ? 'currency' : undefined}
                                        value={formData.discount_value || ''}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        placeholder="0.00"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <CustomInput label="Pedido Mínimo (R$)" mask="currency" value={formData.min_order_value || ''} onChange={e => setFormData({ ...formData, min_order_value: e.target.value })} placeholder="R$ 0,00" />
                                <CustomInput label="Desconto Máximo (R$)" mask="currency" value={formData.max_discount_value || ''} onChange={e => setFormData({ ...formData, max_discount_value: e.target.value })} placeholder="Opcional" />
                                <CustomInput label="Limite Global de Usos" type="number" value={formData.usage_limit || ''} onChange={e => setFormData({ ...formData, usage_limit: e.target.value })} placeholder="Ilimitado" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomInput label="Limite por Usuário" type="number" value={formData.user_usage_limit || ''} onChange={e => setFormData({ ...formData, user_usage_limit: e.target.value })} placeholder="Ilimitado" />
                                <div className="flex flex-col">
                                    <label className="block text-sm font-bold mb-2">Acumulável</label>
                                    <label className="flex items-center gap-3 cursor-pointer h-12 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 border border-transparent focus-within:border-brand-500 transition-all shadow-sm shadow-black/5" onClick={() => setFormData({ ...formData, is_stackable: !formData.is_stackable })}>
                                        <div className={`relative w-10 min-w-[40px] h-6 rounded-full transition-colors duration-200 ${formData.is_stackable ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${formData.is_stackable ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">{formData.is_stackable ? 'Sim (Pode usar outros cupons)' : 'Não'}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomSelect
                                    label="Restringir por Cidade (Opcional)"
                                    value={formData.city_id}
                                    onChange={value => setFormData({ ...formData, city_id: value })}
                                    options={[{ label: 'Todas as Cidades', value: '' }, ...cities.map(c => ({ label: c.name, value: c.id }))]}
                                />
                                <CustomSelect
                                    label="Restringir por Categoria (Opcional)"
                                    value={formData.category_id}
                                    onChange={value => setFormData({ ...formData, category_id: value })}
                                    options={[{ label: 'Todas as Categorias', value: '' }, ...categories.map(c => ({ label: c.name, value: c.id }))]}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomInput label="Data Inicial" type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                <CustomInput label="Data Final (Opcional)" type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer mt-4" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${formData.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-sm font-bold select-none">Cupom Ativo</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveCoupon}>Salvar Cupom Global</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPlatformCoupons;
