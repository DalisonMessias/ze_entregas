
import React, { useState, useEffect } from 'react';
import { StoreProduct } from '../types';
import { Plus, Search, Edit2, Trash2, Package, Loader2, ShoppingBag, LayoutGrid, Layers, Tag as TagIcon } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { ProductModal } from './ProductModal';
import { CategoryManager } from './CategoryManager';
import { AddonManager } from './AddonManager';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

type Tab = 'products' | 'categories' | 'addons';

export const StoreCatalog: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('products');

    // Products State
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<StoreProduct>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    const { confirm, alert: showMessage } = useDialog();

    useEffect(() => {
        if (activeTab === 'products') {
            loadProducts();
        }
    }, [activeTab]);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const [data, profile] = await Promise.all([
                cloud.getStoreProducts(),
                cloud.getMyPartnerProfile()
            ]);
            setProducts(data);

            // Validar perfil completo
            const validation = validateStoreProfile(profile);
            setProfileValid(validation.isValid);
            setMissingFields(validation.missingFields);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            setProfileValid(false);
            setMissingFields(['Erro ao carregar perfil']);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProduct = async (productData: Partial<StoreProduct>) => {
        setIsSaving(true);
        try {
            if (productData.id) {
                await cloud.updateStoreProduct(productData);
            } else {
                await cloud.createStoreProduct(productData);
            }
            setIsProductModalOpen(false);
            loadProducts();
        } catch (error: any) {
            console.error("Erro ao salvar produto:", error);
            if (error.code === '42501') {
                showMessage({
                    title: 'Erro de Permissão',
                    message: 'Sua sessão pode ter expirado ou você não tem permissão para esta ação. Tente recarregar a página.'
                });
            } else {
                alert("Erro ao salvar produto. Verifique sua conexão.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Produto?',
            message: `Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteStoreProduct(id);
                loadProducts();
            } catch (error) {
                console.error("Erro ao excluir:", error);
                alert("Erro ao excluir produto.");
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Validação de perfil
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black dark:text-white mb-2 tracking-tight">Catálogo</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie cardápio, categorias e adicionais</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mb-8 w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'products'
                        ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Produtos
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'categories'
                        ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <TagIcon className="w-4 h-4" />
                    Categorias
                </button>
                <button
                    onClick={() => setActiveTab('addons')}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'addons'
                        ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Adicionais
                </button>
            </div>

            {/* Content Areas */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">

                {activeTab === 'products' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar produtos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingProduct({});
                                    setIsProductModalOpen(true);
                                }}
                                className="w-full md:w-auto rounded-2xl shadow-xl shadow-brand-500/20"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Novo Produto
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-12 h-12 animate-spin text-brand-600 mb-4" />
                                <p className="text-gray-500 font-bold">Carregando catálogo...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center mb-6">
                                    <ShoppingBag className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-black dark:text-white mb-2">Nenhum produto encontrado</h3>
                                <p className="text-gray-500 max-w-xs">
                                    {searchTerm ? 'Tente ajustar sua busca ou limpar os filtros.' : 'Comece adicionando seu primeiro produto ao cardápio.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className="group bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 hover:border-brand-500 transition-all duration-300 relative overflow-hidden flex flex-col"
                                    >
                                        <div className="flex gap-4 items-start mb-6">
                                            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-black uppercase text-brand-600 tracking-widest mb-1 block">
                                                        {product.category || 'Sem Categoria'}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingProduct(product);
                                                                setIsProductModalOpen(true);
                                                            }}
                                                            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors shadow-sm"
                                                        >
                                                            <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => product.id && handleDeleteProduct(product.id, product.name)}
                                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shadow-sm"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{product.name}</h3>
                                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                                    {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="text-[10px] font-bold uppercase text-gray-500">
                                                    {product.is_active ? 'Ativo' : 'Pausado'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400"># {product.id?.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'categories' && <CategoryManager />}

                {activeTab === 'addons' && <AddonManager />}
            </div>

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={editingProduct}
                onSave={handleSaveProduct}
                isSaving={isSaving}
            />
        </div>
    );
};
