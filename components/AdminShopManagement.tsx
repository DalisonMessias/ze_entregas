import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShoppingBag, Plus, Trash2, Edit2, Grid, Tag, Save, X, Sparkles, Truck, DollarSign, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Product, Category, ShopSettings, ShopCoupon } from '../types';
import { Button } from './Button';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) { setter(""); return; }
    const amount = Number(value) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formatted);
};

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};


export const AdminShopManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings' | 'coupons'>('products');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);


    // Products State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    // Categories State
    const [newCategoryName, setNewCategoryName] = useState('');

    // Shop Settings State
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

    // Coupons State
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState<Partial<ShopCoupon> | null>(null);



    const { confirm, alert } = useDialog();

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [p, c, s] = await Promise.all([
                cloud.getStoreProducts(),
                cloud.getStoreCategories(),
                cloud.getShopSettings()
            ]);
            setProducts(p as any);
            setCategories(c);
            setShopSettings(s || { is_shop_enabled: true } as any);
        } catch (e) {
            console.error("Error loading shop data:", e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- Product Management ---
    const handleAddEditProduct = async () => {
        if (!currentProduct?.name || !currentProduct?.price || !currentProduct?.category_id) {
            await alert("Preencha todos os campos obrigatórios.");
            return;
        }
        if (submitting) return;

        setSubmitting(true);
        setSaving(true);
        try {
            const productToSave = {
                ...currentProduct,
                price: parseCurrency(currentProduct.price as any)
            };

            if (currentProduct.id) {
                await cloud.updateStoreProduct(productToSave);
            } else {
                await cloud.createStoreProduct(productToSave);
            }
            setShowProductModal(false);
            setCurrentProduct(null);
            await alert("Produto salvo com sucesso!");
            loadData(true);
        } catch (e: any) {
            await alert("Erro ao salvar: " + (e.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
            setSubmitting(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        const ok = await confirm({ title: 'Excluir produto', message: 'Tem certeza que deseja excluir este produto?' });
        if (!ok) return;

        if (submitting) return;
        setSubmitting(true);

        try {
            await cloud.deleteStoreProduct(id);
            await alert("Produto excluído!");
            loadData(true);
        } catch (e: any) {
            await alert("Erro ao excluir: " + (e.message || "Erro desconhecido"));
        } finally {
            setSubmitting(false);
        }
    };

    // --- Category Management ---
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        if (submitting) return;

        setSubmitting(true);
        setSaving(true);
        try {
            await cloud.createStoreCategory(newCategoryName);
            setNewCategoryName('');
            await alert("Categoria adicionada!");
            loadData(true);
        } catch (e: any) {
            await alert("Erro ao adicionar categoria: " + (e.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const ok = await confirm({ title: 'Excluir categoria', message: 'Tem certeza que deseja excluir esta categoria? Produtos associados não serão removidos, apenas ficarão sem categoria.' });
        if (!ok) return;

        if (submitting) return;
        setSubmitting(true);

        try {
            await cloud.deleteStoreCategory(id);
            await alert("Categoria excluída!");
            loadData(true);
        } catch (e: any) {
            await alert("Erro ao excluir categoria: " + (e.message || "Erro desconhecido"));
        } finally {
            setSubmitting(false);
        }
    };

    // --- Shop Settings Management ---
    const handleSaveShopSettings = async () => {
        if (!shopSettings) return;
        if (submitting) return;

        setSubmitting(true);
        setSaving(true);
        try {
            await cloud.adminUpdateShopSettings({
                is_shop_enabled: shopSettings.is_shop_enabled,
                shop_name: shopSettings.shop_name,
                shop_city: shopSettings.shop_city,
                banner_title: shopSettings.banner_title,
                banner_subtitle: shopSettings.banner_subtitle,
                banner_tag: shopSettings.banner_tag,
                shipping_origin_cep: shopSettings.shipping_origin_cep,
                free_shipping_threshold: shopSettings.free_shipping_threshold,
                payment_methods: shopSettings.payment_methods,
                coupons: shopSettings.coupons
            });
            await alert("Configurações da loja salvas!");
            loadData(true);
        } catch (e: any) {
            await alert("Erro ao salvar configurações: " + (e.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
            setSubmitting(false);
        }
    };

    const updateShopSetting = (field: keyof ShopSettings, value: any) => {
        setShopSettings(prev => prev ? { ...prev, [field]: value } : null);
    };

    const updatePaymentMethod = (method: 'pix' | 'boleto' | 'credit_card', checked: boolean) => {
        setShopSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                payment_methods: {
                    ...(prev.payment_methods || { pix: false, boleto: false, credit_card: false }),
                    [method]: checked
                }
            };
        });
    };

    const addCoupon = () => {
        setShopSettings(prev => {
            if (!prev) return null;
            const newCoupon: ShopCoupon = { code: '', discount_percent: 0, active: true };
            return {
                ...prev,
                coupons: [...(prev.coupons || []), newCoupon]
            };
        });
    };

    const updateCoupon = (index: number, field: keyof ShopCoupon, value: any) => {
        setShopSettings(prev => {
            if (!prev) return null;
            const updatedCoupons = [...(prev.coupons || [])];
            if (updatedCoupons[index]) {
                (updatedCoupons[index] as any)[field] = field === 'discount_percent' ? Number(value) : value;
            }
            return { ...prev, coupons: updatedCoupons };
        });
    };

    const removeCoupon = (index: number) => {
        setShopSettings(prev => {
            if (!prev) return null;
            const updatedCoupons = [...(prev.coupons || [])];
            updatedCoupons.splice(index, 1);
            return { ...prev, coupons: updatedCoupons };
        });
    };

    const handleSaveCoupon = async () => {
        if (!currentCoupon?.code || currentCoupon.discount_percent === undefined) {
            await alert('Preencha todos os campos obrigatórios para o cupom.');
            return;
        }

        setSaving(true);
        try {
            const couponToSave: ShopCoupon = {
                code: currentCoupon.code,
                discount_percent: currentCoupon.discount_percent,
                active: currentCoupon.active || false
            };

            const existingCouponIndex = shopSettings?.coupons.findIndex(c => c.code === couponToSave.code);

            if (existingCouponIndex !== -1 && existingCouponIndex !== undefined) {
                setShopSettings(prev => {
                    if (!prev) return null;
                    const updatedCoupons = [...(prev.coupons || [])];
                    if (updatedCoupons[existingCouponIndex]) {
                        updatedCoupons[existingCouponIndex] = couponToSave;
                    }
                    return { ...prev, coupons: updatedCoupons };
                });
            } else {
                setShopSettings(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        coupons: [...(prev.coupons || []), couponToSave]
                    };
                });
            }
            await handleSaveShopSettings();
            setShowCouponModal(false);
            setCurrentCoupon(null);
            await alert('Cupom salvo com sucesso!');
        } catch (e: any) {
            await alert('Erro ao salvar cupom: ' + (e.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
        }
    };




    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">

            <MobileTabsSelect
                value={activeTab}
                onChange={(val) => setActiveTab(val as 'products' | 'categories' | 'settings' | 'coupons')}
                options={[
                    { value: 'products', label: 'Produtos' },
                    { value: 'categories', label: 'Categorias' },
                    { value: 'settings', label: 'Configurações' },
                    { value: 'coupons', label: 'Cupons' }
                ]}
                label="Seção da Loja"
                className="md:hidden"
            />
            <div role="tablist" className="hidden md:flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full mx-auto mb-[15px]">
                <button
                    role="tab"
                    aria-selected={activeTab === 'products'}
                    tabIndex={activeTab === 'products' ? 0 : -1}
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'products' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    Produtos
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'categories'}
                    tabIndex={activeTab === 'categories' ? 0 : -1}
                    onClick={() => setActiveTab('categories')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'categories' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    Categorias
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'settings'}
                    tabIndex={activeTab === 'settings' ? 0 : -1}
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    Configurações
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'coupons'}
                    tabIndex={activeTab === 'coupons' ? 0 : -1}
                    onClick={() => setActiveTab('coupons')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'coupons' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    Cupons
                </button>
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div role="tabpanel" id="panel-products" aria-labelledby="tab-products" className="space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-gray-500" /> Gerenciamento de Produtos</h3>
                    <div className="flex justify-end">
                        <Button onClick={() => { setCurrentProduct({ is_active: true, price: 0, stock_quantity: null }); setShowProductModal(true); }}>
                            <Plus className="w-5 h-5 mr-2" /> Novo Produto
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Produto</th>
                                        <th className="px-4 py-3">Preço</th>
                                        <th className="px-4 py-3">Estoque</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum produto cadastrado.</td></tr>}
                                    {products.map(p => (
                                        <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-bold dark:text-white">{p.name}</td>
                                            <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                                            <td className="px-4 py-3">{p.stock_quantity === null ? 'Ilimitado' : p.stock_quantity}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {p.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setCurrentProduct(p); setShowProductModal(true); }} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {showProductModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowProductModal(false)}>
                            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                                <h3 className="font-bold text-lg dark:text-white">{currentProduct?.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                                <input
                                    type="text" placeholder="Nome do Produto"
                                    value={currentProduct?.name || ''}
                                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                />
                                <textarea
                                    placeholder="Descrição"
                                    value={currentProduct?.description || ''}
                                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-none"
                                />
                                <input
                                    type="tel" placeholder="Preço"
                                    value={currentProduct?.price ? (currentProduct.price as any).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                    onChange={e => handleCurrencyMask(e, val => setCurrentProduct(prev => prev ? { ...prev, price: parseCurrency(val) } : null))}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                />
                                <input
                                    type="number" placeholder="Estoque (deixe vazio para ilimitado)"
                                    value={currentProduct?.stock_quantity === null ? '' : currentProduct?.stock_quantity || ''}
                                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, stock_quantity: e.target.value === '' ? null : Number(e.target.value) } : null)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                />
                                <select
                                    value={currentProduct?.category_id || ''}
                                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, category_id: e.target.value } : null)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                >
                                    <option value="">Selecionar Categoria</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                                <Switch
                                    checked={currentProduct?.is_active || false}
                                    onChange={c => setCurrentProduct(prev => prev ? { ...prev, is_active: c } : null)}
                                    label="Ativo"
                                />
                                <Button fullWidth onClick={handleAddEditProduct} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" /> : 'Salvar'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
                <div role="tabpanel" id="panel-categories" aria-labelledby="tab-categories" className="space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Grid className="w-5 h-5 text-gray-500" /> Gerenciamento de Categorias</h3>
                    <div className="flex gap-2">
                        <input
                            type="text" placeholder="Nome da Nova Categoria"
                            value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                        />
                        <Button onClick={handleAddCategory} disabled={saving} className="px-4">
                            {saving ? <Loader2 className="animate-spin" /> : <Plus className="w-5 h-5" />}
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Nome da Categoria</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-gray-400">Nenhuma categoria cadastrada.</td></tr>}
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-bold dark:text-white">{cat.name}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Coupons Tab */}
            {activeTab === 'coupons' && shopSettings && (
                <div role="tabpanel" id="panel-coupons" aria-labelledby="tab-coupons" className="space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Tag className="w-5 h-5 text-gray-500" /> Gerenciamento de Cupons</h3>
                    <div className="flex justify-end">
                        <Button onClick={() => { setCurrentCoupon({ active: true, discount_percent: 0 }); setShowCouponModal(true); }}>
                            <Plus className="w-5 h-5 mr-2" /> Novo Cupom
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Desconto</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shopSettings.coupons.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum cupom cadastrado.</td></tr>}
                                    {shopSettings.coupons.map((coupon, index) => (
                                        <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-bold dark:text-white">{coupon.code}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                                                    {coupon.discount_percent > 0 ? `${coupon.discount_percent}%` : '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {coupon.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <Switch checked={coupon.active} onChange={c => updateCoupon(index, 'active', c)} />
                                                <button onClick={() => removeCoupon(index)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {showCouponModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowCouponModal(false)}>
                            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                                <h3 className="font-bold text-lg dark:text-white">{currentCoupon?.code ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                                <input
                                    type="text" placeholder="Código do Cupom"
                                    value={currentCoupon?.code || ''}
                                    onChange={e => setCurrentCoupon(prev => prev ? { ...prev, code: e.target.value } : null)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                />
                                <input
                                    type="number" placeholder="Percentual de Desconto"
                                    value={currentCoupon?.discount_percent || ''}
                                    onChange={e => setCurrentCoupon(prev => prev ? { ...prev, discount_percent: Number(e.target.value) } : null)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                />
                                <Switch
                                    checked={currentCoupon?.active || false}
                                    onChange={c => setCurrentCoupon(prev => prev ? { ...prev, active: c } : null)}
                                    label="Ativo"
                                />
                                <Button fullWidth onClick={handleSaveCoupon} disabled={saving}>
                                    <Save className="w-5 h-5 mr-2" /> Adicionar Cupom
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Shop Settings Tab */}
            {activeTab === 'settings' && shopSettings && (
                <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" className="space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configurações da Loja</h3>

                    {/* General Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Geral</h4>
                        <Switch
                            checked={shopSettings.is_shop_enabled}
                            onChange={c => updateShopSetting('is_shop_enabled', c)}
                            label="Loja Ativa"
                        />
                        <div>
                            <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Loja</label>
                            <input
                                type="text" id="shop_name"
                                value={shopSettings.shop_name || ''}
                                onChange={e => updateShopSetting('shop_name', e.target.value)}
                                className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};