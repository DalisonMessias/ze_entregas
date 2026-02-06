
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StoreProduct, Category } from '../types';
import { StoreAIGenerator } from './StoreAIGenerator';
import { SuperStoreModal } from './SuperStoreModal';
import { Bot, Sparkles, Send, Trash2, Edit2, Check, X, Package, Plus, BarChart3, AlertCircle, Search, Filter, LayoutGrid, Layers, Tag as TagIcon, ShoppingBag, Crown, Camera, Eye, Image as ImageIcon } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { ProductModal } from './ProductModal';
import { CategoryManager } from './CategoryManager';
import { MobileTabsSelect } from './MobileTabsSelect';
import { AddonManager } from './AddonManager';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';
import { Toast } from './Toast';
import { useDebounce } from '../hooks/useDebounce';

type Tab = 'products' | 'categories' | 'addons' | 'import';

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

// Função auxiliar para normalizar texto (remove acentos e lowercase)
const normalizeText = (text: string) => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
};

// Função simples de similaridade (Fuzzy)
const isFuzzyMatch = (text: string, search: string) => {
    const cleanText = normalizeText(text);
    const cleanSearch = normalizeText(search);

    // 1. Busca exata (normalizada)
    if (cleanText.includes(cleanSearch)) return true;

    // 2. Erros de digitação (levenshtein simplificado / proximidade) - opcional ou apenas match parcial mais permissivo
    // Para simplificar e evitar peso, vamos verificar se todas as palavras da busca existem no texto (independente da ordem)
    const searchWords = cleanSearch.split(' ').filter(w => w.length > 0);
    if (searchWords.length === 0) return true;

    return searchWords.every(word => cleanText.includes(word));
};


export const StoreCatalog: React.FC = () => {
    // ... (rest of imports/hooks)
    const [activeTab, setActiveTab] = useState<Tab>('products');

    // Products State
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<StoreProduct>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    // Super Store State
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [showSuperModal, setShowSuperModal] = useState(false);

    // Preview State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewProduct, setPreviewProduct] = useState<StoreProduct | null>(null);

    const { confirm, alert: showMessage } = useDialog();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [updatingImageProdId, setUpdatingImageProdId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, [activeTab]); // Reload when tab changes impacting categories/products

    const [baseProducts, setBaseProducts] = useState<any[]>([]);
    const [isImportLoading, setIsImportLoading] = useState(false);

    const loadData = async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const [prodData, catData, profile] = await Promise.all([
                cloud.getStoreProducts(undefined, signal),
                cloud.getStoreCategories(signal),
                cloud.getMyPartnerProfile()
            ]);

            if (!signal?.aborted) {
                setProducts(prodData);
                setCategories(catData);
                setIsSuperStore(!!profile?.is_super_store);

                // Validar perfil completo
                const validation = validateStoreProfile(profile);
                setProfileValid(validation.isValid);
                setMissingFields(validation.missingFields);

                if (activeTab === 'import') {
                    // Import base products doesn't strictly need abort signal as it's secondary
                    loadBaseProducts();
                }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError' && error.code !== '20') {
                // console.error("Erro ao carregar dados:", error);
                setProfileValid(false);
                setMissingFields(['Erro ao carregar perfil']);
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false);
            }
        }
    };

    const loadBaseProducts = async () => {
        setIsImportLoading(true);
        try {
            const data = await cloud.getCatalogBaseProducts();
            setBaseProducts(data);
        } catch (error) {
            console.error("Erro ao carregar catálogo base:", error);
        } finally {
            setIsImportLoading(false);
        }
    };

    const handleSaveProduct = async (productData: Partial<StoreProduct>) => {
        setIsSaving(true);
        try {
            if (productData.id) {
                await cloud.updateStoreProduct(productData);
                setToast({ message: 'Produto atualizado com sucesso!', type: 'success' });
            } else {
                await cloud.createStoreProduct(productData);
                setToast({ message: 'Produto criado com sucesso!', type: 'success' });
            }
            setIsProductModalOpen(false);
            loadData();
        } catch (error: any) {
            if (error.code === '42501') {
                setToast({
                    message: 'Sua sessão pode ter expirado ou você não tem permissão para esta ação. Tente recarregar a página.',
                    type: 'error'
                });
            } else {
                setToast({ message: 'Erro ao salvar produto. Verifique sua conexão.', type: 'error' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportProduct = async (baseProduct: any) => {
        setIsSaving(true);
        try {
            await cloud.importBaseProductToStore(baseProduct);
            setToast({ message: `"${baseProduct.name}" importado com sucesso!`, type: 'success' });
            loadData();
        } catch (error) {
            setToast({ message: 'Erro ao importar produto.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Produto?',
            message: `Deseja realmente excluir "${name}"? Esta ação não pode ser desfeita.`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteStoreProduct(id);
                loadData();
                showMessage({ title: 'Sucesso', message: 'Produto excluído.' });
            } catch (error) {
                console.error("Erro ao excluir produto:", error);
            }
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await cloud.updateStoreProduct({
                id,
                is_active: !currentStatus
            });
            loadData();
        } catch (error) {
            console.error("Erro ao alterar status do produto:", error);
        }
    };

    const handleQuickImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !updatingImageProdId) return;

        setIsSaving(true);
        try {
            const publicUrl = await cloud.uploadProductImage(file);
            await cloud.updateStoreProduct({
                id: updatingImageProdId,
                image_url: publicUrl
            });
            loadData();
            setToast({ message: 'Imagem atualizada com sucesso!', type: 'success' });
        } catch (error) {
            console.error("Erro ao trocar imagem:", error);
            setToast({ message: 'Erro ao enviar imagem.', type: 'error' });
        } finally {
            setIsSaving(false);
            setUpdatingImageProdId(null);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const term = debouncedSearchTerm.toLowerCase().trim();
            let matchesSearch = false;

            if (term.startsWith('id-')) {
                const idPart = term.replace('id-', '');
                matchesSearch = p.id.toLowerCase().includes(idPart);
            } else if (term.length > 0 && /^[a-f0-9]+$/i.test(term)) {
                // Se o termo parece ser um ID (apenas caracteres hexadecimais)
                // Verifica se corresponde aos primeiros caracteres do ID
                matchesSearch = p.id.toLowerCase().startsWith(term.toLowerCase());
            } else {
                matchesSearch = p.name.toLowerCase().includes(term) ||
                    (p.category && p.category.toLowerCase().includes(term));
            }

            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, debouncedSearchTerm, selectedCategory]);

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
        <div className="flex flex-col lg:flex-row gap-4 md:h-[calc(100vh-140px)] animate-in fade-in duration-500 max-w-full md:overflow-hidden">
            {/* Left Column: AI Assistant - Peristent across tabs for SuperStore */}
            {isSuperStore && (
                <div className="w-full lg:w-[400px] flex-shrink-0 h-full">
                    <StoreAIGenerator
                        onProductCreated={loadData}
                        categories={categories}
                        products={products}
                    />
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="flex-1 flex flex-col h-full min-w-0 lg:min-w-[500px]">
                {/* Compact Control Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                    <MobileTabsSelect
                        value={activeTab}
                        onChange={(val) => setActiveTab(val as Tab)}
                        options={[
                            { value: 'products', label: 'Produtos' },
                            { value: 'categories', label: 'Categorias' },
                            { value: 'addons', label: 'Adicionais' },
                            { value: 'import', label: 'Importar' }
                        ]}
                        label="Seção do Catálogo"
                        className="md:hidden w-full"
                    />
                    <div className="hidden md:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full overflow-x-auto no-scrollbar flex-shrink-0">
                        <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4" /> Produtos</button>
                        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}><TagIcon className="w-4 h-4" /> Categorias</button>
                        <button onClick={() => setActiveTab('addons')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'addons' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}><Layers className="w-4 h-4" /> Adicionais</button>
                        <button onClick={() => setActiveTab('import')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'import' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}><Sparkles className="w-4 h-4 text-amber-500" /> Importar</button>
                    </div>

                    {!isSuperStore && (
                        <div className="flex-1 flex justify-end">
                            <button onClick={() => setShowSuperModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                                <Crown className="w-4 h-4" /> SEJA SUPER
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Area - Full Height Scrollable */}
                <div className="flex-1 bg-white dark:bg-gray-900/40 rounded-[2rem] p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 overflow-y-auto">
                    {activeTab === 'products' && (
                        <div className="animate-in fade-in duration-300 flex flex-col">
                            <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
                                <div className="relative flex-1 group w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar em seus produtos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent focus:border-brand-500/20 focus:bg-white dark:focus:bg-gray-900 rounded-[2rem] text-sm transition-all outline-none shadow-sm"
                                    />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button
                                        onClick={() => {
                                            setEditingProduct({});
                                            setIsProductModalOpen(true);
                                        }}
                                        className="flex-1 md:flex-none rounded-2xl h-14"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Novo Produto
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const event = new CustomEvent('navigateToTab', { detail: { tab: 'store_print_catalog' } });
                                            window.dispatchEvent(event);
                                        }}
                                        className="flex-1 md:flex-none rounded-2xl h-14"
                                    >
                                        <ImageIcon className="w-5 h-5 mr-2" />
                                        Catálogo Impresso
                                    </Button>
                                </div>
                            </div>

                            {/* Category Filter Pills - Enhanced Scrolling */}
                            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-6 scroll-smooth px-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${selectedCategory === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}
                                >
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${selectedCategory === cat.name ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {!isSuperStore && (
                                <div className="mb-8 bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-900/10 dark:to-indigo-900/10 rounded-[2.5rem] p-6 border border-brand-100/50 dark:border-brand-900/20 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center shadow-md animate-pulse">
                                        <Sparkles className="w-8 h-8 text-brand-500" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="font-black text-lg dark:text-white">Potencialize com IA</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Torne-se <strong>Super Lojista</strong> para automação completa e análise inteligente.
                                        </p>
                                    </div>
                                    <Button variant="secondary" onClick={() => setShowSuperModal(true)} className="rounded-2xl shadow-lg hover:shadow-xl transition-all">
                                        <Crown className="w-4 h-4 mr-2" /> Upgrade Agora
                                    </Button>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loading variant="container" size="lg" message="Carregando catálogo..." />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
                                        <ShoppingBag className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-black dark:text-white mb-2">Nenhum produto aqui</h3>
                                    <p className="text-gray-500 max-w-xs text-sm">
                                        {searchTerm || selectedCategory !== 'all' ? 'Tente ajustar seus filtros para encontrar o que busca.' : 'Seu cardápio está vazio. Comece a criar agora!'}
                                    </p>
                                </div>
                            ) : (
                                <div className={`grid grid-cols-1 ${isSuperStore ? 'md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} gap-4 pb-24`}>
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className="group bg-white dark:bg-gray-900/50 rounded-[1.5rem] p-4 border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-500 relative flex flex-col"
                                        >
                                            <div className="flex gap-3 items-start mb-3">
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500 relative group/img">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover ${(isSaving && updatingImageProdId === product.id) ? 'opacity-30 blur-[2px]' : ''}`} />
                                                    ) : (
                                                        <Package className={`w-8 h-8 text-gray-300 group-hover:text-brand-300 transition-colors ${(isSaving && updatingImageProdId === product.id) ? 'opacity-30' : ''}`} />
                                                    )}

                                                    {/* Loading Overlay */}
                                                    {(isSaving && updatingImageProdId === product.id) ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                                            <Loading variant="inline" size="sm" />
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setUpdatingImageProdId(product.id!);
                                                                    imageInputRef.current?.click();
                                                                }}
                                                                className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
                                                                title="Trocar Imagem"
                                                            >
                                                                <Camera className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[9px] font-black uppercase text-brand-600 tracking-[0.15em] py-1 px-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                                                            {product.category || 'Geral'}
                                                        </span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setPreviewProduct(product);
                                                                    setShowPreviewModal(true);
                                                                }}
                                                                className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:text-brand-600 transition-colors"
                                                                title="Preview"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingProduct(product);
                                                                    setIsProductModalOpen(true);
                                                                }}
                                                                className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:text-brand-600 transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => product.id && handleDeleteProduct(product.id, product.name)}
                                                                className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <h3 className="font-black text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-brand-600 transition-colors">
                                                        {product.brand ? `${product.brand} - ` : ''}{product.name}
                                                    </h3>
                                                    <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5 tracking-tighter">
                                                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-8 leading-relaxed">
                                                {product.description || 'Produto sem descrição definida.'}
                                            </p>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleActive(product.id!, product.is_active || false);
                                                        }}
                                                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${product.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${product.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                        {product.is_active ? 'Ativo' : 'Pausado'}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 font-mono">ID-{product.id?.slice(0, 6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'categories' && <CategoryManager />}

                    {activeTab === 'addons' && <AddonManager />}

                    {activeTab === 'import' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-black dark:text-white mb-2">Sugestões da Plataforma</h2>
                                    <p className="text-sm text-gray-500">Produtos otimizados e prontos para o seu cardápio</p>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar produto sugerido..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {isImportLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loading variant="container" size="lg" message="Buscando sugestões..." />
                                </div>
                            ) : baseProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                    <Sparkles className="w-16 h-16 mb-4 text-amber-500" />
                                    <h3 className="font-bold text-lg dark:text-white">Nenhum produto disponível</h3>
                                    <p className="text-sm">Aguarde novas sugestões da administração.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {baseProducts
                                        .filter(bp =>
                                            !searchTerm ||
                                            isFuzzyMatch(bp.name, searchTerm) ||
                                            (bp.category && isFuzzyMatch(bp.category, searchTerm))
                                        )
                                        .map(bp => (
                                            <div key={bp.id} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex flex-col">
                                                <div className="flex gap-4 mb-4">
                                                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 flex-shrink-0">
                                                        <Package className="w-8 h-8 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-brand-600 block mb-1">{bp.category || 'Geral'}</span>
                                                        <h4 className="font-bold dark:text-white leading-tight">{bp.name}</h4>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">{bp.description}</p>
                                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Preço Sugerido</p>
                                                        <p className="text-xl font-black dark:text-white">
                                                            R$ {bp.valor_sugerido?.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleImportProduct(bp)} disabled={isSaving}>
                                                        Importar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    {baseProducts.length > 0 && baseProducts.filter(bp => !searchTerm || isFuzzyMatch(bp.name, searchTerm) || (bp.category && isFuzzyMatch(bp.category, searchTerm))).length === 0 && (
                                        <div className="col-span-full py-10 text-center opacity-50">
                                            <p>Nenhum produto encontrado com "{searchTerm}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={editingProduct}
                onSave={handleSaveProduct}
                isSaving={isSaving}
            />

            {showSuperModal && (
                <SuperStoreModal
                    onClose={() => setShowSuperModal(false)}
                    onSuccess={() => {
                        loadData(); // Reload profile to update permissions
                        setShowSuperModal(false);
                    }}
                />
            )}

            {/* Preview Modal */}
            {showPreviewModal && previewProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-left animate-in fade-in duration-200" onClick={() => setShowPreviewModal(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/20 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Header com Gradiente */}
                        <div className="relative bg-gradient-to-br from-brand-600 to-purple-700 p-6 text-white overflow-hidden">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <Eye className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-tight">Preview do Produto</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Catálogo da Loja</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPreviewModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 space-y-5">
                            {/* Imagem do Produto */}
                            {previewProduct.image_url && (
                                <div className="w-full h-48 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                                    <img
                                        src={previewProduct.image_url}
                                        alt={previewProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Categoria e Preço */}
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.15em] py-2 px-3 bg-brand-50 dark:bg-brand-900/20 rounded-full border border-brand-100 dark:border-brand-900/30">
                                    <Package className="w-3 h-3" />
                                    {previewProduct.category || 'Sem categoria'}
                                </span>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Preço</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {previewProduct.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>

                            {/* Nome e Marca */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nome do Produto</label>
                                <p className="text-xl font-black dark:text-white leading-tight">
                                    {previewProduct.brand ? `${previewProduct.brand} - ` : ''}{previewProduct.name}
                                </p>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Descrição</label>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                    {previewProduct.description || 'Nenhuma descrição disponível para este produto.'}
                                </p>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Status do Produto</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${previewProduct.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    {previewProduct.is_active ? 'Ativo' : 'Pausado'}
                                </span>
                            </div>

                            {/* ID do Produto */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">ID do Produto</span>
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">ID-{previewProduct.id?.slice(0, 6).toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Footer com Ações */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <Button
                                fullWidth
                                variant="secondary"
                                onClick={() => setShowPreviewModal(false)}
                                className="rounded-xl"
                            >
                                Fechar
                            </Button>
                            <Button
                                fullWidth
                                onClick={() => {
                                    setEditingProduct(previewProduct);
                                    setIsProductModalOpen(true);
                                    setShowPreviewModal(false);
                                }}
                                className="rounded-xl"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Input for Quick Image Change */}
            <input
                type="file"
                ref={imageInputRef}
                onChange={handleQuickImageChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};
