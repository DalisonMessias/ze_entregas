
import React, { useState, useEffect } from 'react';
import { Plus, Tag, Ticket, Calendar, Search, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, Percent, DollarSign, Truck, Package, Info, ArrowRight } from 'lucide-react';
import { Loading } from './Loading';
import { MobileTabsSelect } from './MobileTabsSelect';
import * as cloud from '../services/cloud';
import { Promotion, Coupon, StoreProduct } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import CustomDateInput from './CustomDateInput';
import { useDialog } from '../utils/dialogService';

interface AdminPromotionsProps {
    storeId: string;
}


export const StorePromotions: React.FC<AdminPromotionsProps> = ({ storeId }) => {
    const [activeTab, setActiveTab] = useState<'PROMOTIONS' | 'COUPONS'>('PROMOTIONS');
    const [loading, setLoading] = useState(true);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const { alert, confirm } = useDialog();

    // Modal State
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

    // Edit State
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form States
    const [formData, setFormData] = useState<any>({});
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [storeId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [promos, cps, prods] = await Promise.all([
                cloud.getPromotions(storeId),
                cloud.getCoupons(storeId),
                cloud.getPublicStoreProducts(storeId) // Using public endpoint or admin equivalent
            ]);
            setPromotions(promos as Promotion[]);
            setCoupons(cps as Coupon[]);
            setProducts(prods);
        } catch (error) {
            console.error(error);
            alert({ title: 'Erro', message: 'Falha ao carregar dados.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSavePromotion = async () => {
        if (!formData.name || !formData.discount_value || !formData.start_date) {
            alert({ title: 'Atenção', message: 'Preencha os campos obrigatórios.' });
            return;
        }

        const payload = {
            store_id: storeId,
            name: formData.name,
            description: formData.description,
            discount_type: formData.discount_type || 'PERCENTAGE',
            discount_value: parseFloat(formData.discount_value),
            min_order_value: parseFloat(formData.min_order_value || '0'),
            start_date: new Date(formData.start_date).toISOString(),
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            applies_to_all_products: formData.applies_to_all_products || false
        };

        try {
            if (editingItem) {
                const { success } = await cloud.updatePromotion(editingItem.id, payload, selectedProducts);
                if (success) { loadData(); setIsPromoModalOpen(false); }
                else throw new Error('Falha atualizar');
            } else {
                const { success } = await cloud.createPromotion(payload as any, selectedProducts);
                if (success) { loadData(); setIsPromoModalOpen(false); }
                else throw new Error('Falha criar');
            }
        } catch (e) {
            alert({ title: 'Erro', message: 'Erro ao salvar promoção.' });
        }
    };

    const handleSaveCoupon = async () => {
        if (!formData.code || !formData.discount_value || !formData.start_date) {
            alert({ title: 'Atenção', message: 'Preencha os campos obrigatórios.' });
            return;
        }

        const payload = {
            store_id: storeId,
            code: formData.code.toUpperCase(),
            description: formData.description,
            discount_type: formData.discount_type || 'PERCENTAGE',
            discount_value: parseFloat(formData.discount_value),
            min_order_value: parseFloat(formData.min_order_value || '0'),
            max_discount_value: formData.max_discount_value ? parseFloat(formData.max_discount_value) : null,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            user_usage_limit: formData.user_usage_limit ? parseInt(formData.user_usage_limit) : null,
            is_stackable: formData.is_stackable || false,
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

    const handleDelete = async (type: 'PROMO' | 'COUPON', id: string) => {
        if (!await confirm({ title: 'Excluir?', message: 'Tem certeza que deseja remover este item?' })) return;

        if (type === 'PROMO') {
            await cloud.deletePromotion(id);
        } else {
            await cloud.deleteCoupon(id);
        }
        loadData();
    };

    const openEditPromo = (promo: Promotion) => {
        setEditingItem(promo);
        setFormData({
            ...promo,
            start_date: promo.start_date.split('T')[0],
            end_date: promo.end_date ? promo.end_date.split('T')[0] : ''
        });
        setSelectedProducts(promo.products || []);
        setIsPromoModalOpen(true);
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

    const openNewPromo = () => {
        setEditingItem(null);
        setFormData({
            discount_type: 'PERCENTAGE',
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
            applies_to_all_products: true
        });
        setSelectedProducts([]);
        setIsPromoModalOpen(true);
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

    if (loading) return <div className="flex justify-center p-20"><Loading variant="container" size="md" message="Carregando promoções e cupons..." /></div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Tag className="w-8 h-8 text-brand-500" /> Promoções & Cupons
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie descontos automáticos e códigos promocionais.</p>
                </div>
                <MobileTabsSelect
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'PROMOTIONS' | 'COUPONS')}
                    options={[
                        { value: 'PROMOTIONS', label: 'Promoções' },
                        { value: 'COUPONS', label: 'Cupons' }
                    ]}
                    label="Seção de Promoções"
                    className="md:hidden w-full"
                />
                <div className="hidden md:flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('PROMOTIONS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'PROMOTIONS' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Tag className="w-4 h-4" /> Promoções
                    </button>
                    <button
                        onClick={() => setActiveTab('COUPONS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'COUPONS' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Ticket className="w-4 h-4" /> Cupons
                    </button>
                </div>
            </div>

            {/* --- LIST VIEW --- */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-brand-900/5 min-h-[400px]">
                {activeTab === 'PROMOTIONS' ? (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">Promoções Ativas ({promotions.length})</h2>
                            <Button onClick={openNewPromo} className="rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20"><Plus className="w-4 h-4" /> Nova Promoção</Button>
                        </div>

                        {promotions.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Tag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium">Nenhuma promoção criada.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {promotions.map(promo => (
                                    <div key={promo.id} className="group relative p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${promo.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <h3 className="font-bold text-gray-900 dark:text-white">{promo.name}</h3>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditPromo(promo)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete('PROMO', promo.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-lg text-sm font-black flex items-center gap-1">
                                                {promo.discount_type === 'PERCENTAGE' ? <Percent className="w-3.5 h-3.5" /> : promo.discount_type === 'FREE_SHIPPING' ? <Truck className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                                                {promo.discount_type === 'FREE_SHIPPING' ? 'Frete Grátis' : `${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ''} OFF`}
                                            </div>
                                            {promo.min_order_value > 0 && <span className="text-xs text-gray-500 bg-white dark:bg-gray-700 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">Mín. R$ {promo.min_order_value}</span>}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(promo.start_date).toLocaleDateString()} {promo.end_date ? `à ${new Date(promo.end_date).toLocaleDateString()}` : '(Indeterminado)'}</div>
                                            <div className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {promo.applies_to_all_products ? 'Todos os produtos' : `${promo.products?.length || 'Alguns'} produto(s)`}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">Cupons de Desconto ({coupons.length})</h2>
                            <Button onClick={openNewCoupon} className="rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20"><Plus className="w-4 h-4" /> Novo Cupom</Button>
                        </div>

                        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3 items-start">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-bold mb-1">Sobre Cupons da Plataforma</p>
                                <p>Cupons criados pelo Zé Entregas (identificados como "Global") geram desconto para o cliente, mas o valor é <strong>creditado na sua Carteira Digital</strong> como subsídio da plataforma.</p>
                            </div>
                        </div>

                        {coupons.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Ticket className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium">Nenhum cupom criado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {coupons.map(coupon => (
                                    <div key={coupon.id} className="group relative p-5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 hover:border-brand-300 transition-all">
                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700" />
                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700" />

                                        <div className="flex justify-between items-start mb-2 pl-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coupon.is_active ? 'Ativo' : 'Inativo'}</span>
                                                    <span className="text-xs text-gray-400">Usado: {coupon.usage_count}x</span>
                                                </div>
                                                <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-wider">{coupon.code}</h3>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditCoupon(coupon)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete('COUPON', coupon.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="pl-4 mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
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
                )}
            </div>

            {/* --- MODAL PROMOTION --- */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold">{editingItem ? 'Editar Promoção' : 'Nova Promoção'}</h3>
                            <button onClick={() => setIsPromoModalOpen(false)}><XCircle className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <CustomInput label="Nome da Promoção" placeholder="Ex: Oferta de Natal" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            <CustomInput label="Descrição (Opcional)" placeholder="Detalhes da oferta..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    label="Tipo de Desconto"
                                    value={formData.discount_type || 'PERCENTAGE'}
                                    onChange={(val) => setFormData({ ...formData, discount_type: val })}
                                    options={[
                                        { label: 'Porcentagem (%)', value: 'PERCENTAGE' },
                                        { label: 'Valor Fixo (R$)', value: 'FIXED' },
                                        { label: 'Frete Grátis', value: 'FREE_SHIPPING' }
                                    ]}
                                />
                                {formData.discount_type !== 'FREE_SHIPPING' && (
                                    <CustomInput
                                        label="Valor do Desconto"
                                        mask={formData.discount_type === 'FIXED' ? 'currency' : undefined}
                                        type={formData.discount_type === 'PERCENTAGE' ? 'number' : undefined}
                                        value={formData.discount_value || ''}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        placeholder={formData.discount_type === 'FIXED' ? 'R$ 0,00' : '0'}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomInput label="Pedido Mínimo (R$)" mask="currency" value={formData.min_order_value || ''} onChange={e => setFormData({ ...formData, min_order_value: e.target.value })} placeholder="R$ 0,00" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDateInput
                                    label="Data Inicial"
                                    value={formData.start_date || null}
                                    onChange={(date) => setFormData({ ...formData, start_date: date || '' })}
                                    required
                                />
                                <CustomDateInput
                                    label="Data Final (Opcional)"
                                    value={formData.end_date || null}
                                    onChange={(date) => setFormData({ ...formData, end_date: date || '' })}
                                />
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <label className="flex items-center gap-3 cursor-pointer mb-4">
                                    <input type="checkbox" className="w-5 h-5 accent-brand-600 rounded-md" checked={formData.applies_to_all_products} onChange={e => setFormData({ ...formData, applies_to_all_products: e.target.checked })} />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">Aplicar a todos os produtos</span>
                                </label>

                                {!formData.applies_to_all_products && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Selecione os produtos:</p>
                                        {products.map(prod => (
                                            <label key={prod.id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-brand-600"
                                                    checked={selectedProducts.includes(prod.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedProducts([...selectedProducts, prod.id]);
                                                        else setSelectedProducts(selectedProducts.filter(id => id !== prod.id));
                                                    }}
                                                />
                                                <span className="text-sm truncate">{prod.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                    <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.is_active ? 'translate-x-4' : ''}`} />
                                </span>
                                <span className="text-sm font-bold">Promoção Ativa</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsPromoModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSavePromotion}>Salvar Promoção</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL COUPON --- */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold">{editingItem ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                            <button onClick={() => setIsCouponModalOpen(false)}><XCircle className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <CustomInput label="Código do Cupom" placeholder="Ex: BEMVINDO10" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
                            <CustomInput label="Descrição (Opcional)" placeholder="Para novos clientes..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    label="Tipo de Desconto"
                                    value={formData.discount_type || 'PERCENTAGE'}
                                    onChange={(val) => setFormData({ ...formData, discount_type: val })}
                                    options={[
                                        { label: 'Porcentagem (%)', value: 'PERCENTAGE' },
                                        { label: 'Valor Fixo (R$)', value: 'FIXED' },
                                        { label: 'Frete Grátis', value: 'FREE_SHIPPING' }
                                    ]}
                                />
                                {formData.discount_type !== 'FREE_SHIPPING' && (
                                    <CustomInput
                                        label="Valor do Desconto"
                                        mask={formData.discount_type === 'FIXED' ? 'currency' : undefined}
                                        type={formData.discount_type === 'PERCENTAGE' ? 'number' : undefined}
                                        value={formData.discount_value || ''}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        placeholder={formData.discount_type === 'FIXED' ? 'R$ 0,00' : '0'}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomInput label="Pedido Mínimo (R$)" mask="currency" value={formData.min_order_value || ''} onChange={e => setFormData({ ...formData, min_order_value: e.target.value })} placeholder="R$ 0,00" />
                                <CustomInput label="Limite de Uso (Global)" type="number" value={formData.usage_limit || ''} onChange={e => setFormData({ ...formData, usage_limit: e.target.value })} placeholder="Ilimitado" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomInput label="Limite por Usuário" type="number" value={formData.user_usage_limit || ''} onChange={e => setFormData({ ...formData, user_usage_limit: e.target.value })} placeholder="Ilimitado" />
                                <div className="flex flex-col">
                                    <label className="block text-sm font-bold mb-2">Acumulável</label>
                                    <label className="flex items-center gap-2 cursor-pointer h-full">
                                        <span className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${formData.is_stackable ? 'bg-brand-500' : 'bg-gray-300'}`} onClick={() => setFormData({ ...formData, is_stackable: !formData.is_stackable })}>
                                            <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.is_stackable ? 'translate-x-4' : ''}`} />
                                        </span>
                                        <span className="text-xs font-bold text-gray-500">{formData.is_stackable ? 'Sim' : 'Não'}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomDateInput
                                    label="Data Inicial"
                                    value={formData.start_date || null}
                                    onChange={(date) => setFormData({ ...formData, start_date: date || '' })}
                                    required
                                />
                                <CustomDateInput
                                    label="Data Final (Opcional)"
                                    value={formData.end_date || null}
                                    onChange={(date) => setFormData({ ...formData, end_date: date || '' })}
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer mt-4">
                                <span className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                    <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.is_active ? 'translate-x-4' : ''}`} />
                                </span>
                                <span className="text-sm font-bold">Cupom Ativo</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveCoupon}>Salvar Cupom</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};




