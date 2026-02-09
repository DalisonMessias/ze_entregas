import React, { useState, useEffect, useRef } from 'react';
import { StoreProduct } from '../types';
import { X, Save, Loader2, Upload } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { CategorySelector } from './CategorySelector';
import { AddonGroupSelector } from './AddonGroupSelector';
import { Toast } from './Toast';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Partial<StoreProduct>;
    onSave: (product: Partial<StoreProduct>) => Promise<void>;
    isSaving: boolean;
}

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const ProductModal: React.FC<ProductModalProps> = ({
    isOpen,
    onClose,
    product,
    onSave,
    isSaving
}) => {
    const [editingProduct, setEditingProduct] = useState<Partial<StoreProduct>>({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [wasUploaded, setWasUploaded] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [addonGroups, setAddonGroups] = useState<any[]>([]);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [newAvulsoName, setNewAvulsoName] = useState('');
    const [newAvulsoPrice, setNewAvulsoPrice] = useState<number>(0);

    // Size Management
    const [manageSizes, setManageSizes] = useState(false);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [pricesBySize, setPricesBySize] = useState<Record<string, number>>({});
    const [defaultSize, setDefaultSize] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEditingProduct({ ...product });
            // Consider an image "uploaded" if it contains our storage path pattern
            // or if it was just uploaded in this session.
            setWasUploaded(!!product.image_url?.includes('/storage/v1/object/public/products/'));

            // Inicializar estados de tamanho
            setManageSizes(!!product.has_sizes);
            setSelectedSizes(product.available_sizes || []);
            setPricesBySize(product.price_by_size || {});
            setDefaultSize(product.default_size || '');

            loadCategories();
            loadAddonGroups();
        }
    }, [isOpen, product]);

    const loadCategories = async () => {
        try {
            const data = await cloud.getStoreCategories();
            setCategories(data);
        } catch (error) {
            // console.error("Erro ao carregar categorias:", error);
        }
    };

    const loadAddonGroups = async () => {
        try {
            const data = await cloud.getStoreAddonGroups();
            setAddonGroups(data);
        } catch (error) {
            // console.error("Erro ao carregar adicionais:", error);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const publicUrl = await cloud.uploadProductImage(file);
            setEditingProduct(prev => ({ ...prev, image_url: publicUrl }));
            setWasUploaded(true);
        } catch (error) {
            console.error("Erro ao subir imagem:", error);
            setToast({
                message: 'Não foi possível carregar a imagem. Verifique se o bucket de produtos está configurado.',
                type: 'error'
            });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAddAvulso = () => {
        if (!newAvulsoName || newAvulsoPrice < 0) return;

        const newOption = {
            id: crypto.randomUUID(),
            name: newAvulsoName,
            price: newAvulsoPrice,
            is_active: true
        };

        setEditingProduct(prev => ({
            ...prev,
            addon_options: [...(prev.addon_options || []), newOption]
        }));

        setNewAvulsoName('');
        setNewAvulsoPrice(0);
    };

    const handleRemoveAvulso = (id: string) => {
        setEditingProduct(prev => ({
            ...prev,
            addon_options: (prev.addon_options || []).filter(opt => opt.id !== id)
        }));
    };

    const handleSizeToggle = (size: string) => {
        const current = new Set(selectedSizes);
        if (current.has(size)) {
            current.delete(size);
            const newPrices = { ...pricesBySize };
            delete newPrices[size];
            setPricesBySize(newPrices);

            if (defaultSize === size) setDefaultSize('');
        } else {
            current.add(size);
        }
        setSelectedSizes(Array.from(current));
    };

    const handleSizePriceChange = (size: string, val: number) => {
        setPricesBySize(prev => ({ ...prev, [size]: val }));
    };

    const handleInternalSave = async () => {
        console.log("ProductModal: handleInternalSave started");
        const finalProduct = { ...editingProduct };

        try {
            if (manageSizes) {
                if (selectedSizes.length === 0) {
                    setToast({ message: 'Selecione pelo menos um tamanho.', type: 'error' });
                    return;
                }
                if (!defaultSize || !selectedSizes.includes(defaultSize)) {
                    setToast({ message: 'Selecione um tamanho padrão válido.', type: 'error' });
                    return;
                }

                // Validar preços dos tamanhos selecionados
                for (const size of selectedSizes) {
                    if (pricesBySize[size] === undefined || pricesBySize[size] < 0) {
                        setToast({ message: `Defina um preço válido para o tamanho ${size}.`, type: 'error' });
                        return;
                    }
                }

                finalProduct.has_sizes = true;
                finalProduct.available_sizes = selectedSizes;
                finalProduct.price_by_size = pricesBySize;
                finalProduct.default_size = defaultSize;

                // Definir o preço principal como o do tamanho padrão para listagens simples
                finalProduct.price = pricesBySize[defaultSize];
            } else {
                finalProduct.has_sizes = false;
                finalProduct.available_sizes = [];
                finalProduct.price_by_size = {};
                finalProduct.default_size = '';

                // Validar preço único
                if ((finalProduct.price || 0) <= 0) {
                    setToast({ message: 'Defina um preço de venda válido.', type: 'error' });
                    return;
                }
            }

            console.log("ProductModal: Calling onSave with", finalProduct);
            await onSave(finalProduct);
            console.log("ProductModal: onSave completed successfully");
        } catch (error: any) {
            console.error("ProductModal: Error in handleInternalSave:", error);
            setToast({
                message: `Erro ao salvar: ${error.message || 'Erro desconhecido'}`,
                type: 'error'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[95vh] scrollbar-none [&::-webkit-scrollbar]:hidden">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black dark:text-white">
                            {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
                        </h3>
                        <p className="text-gray-500 text-sm">Preencha as informações do item abaixo</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    {/* Image Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {/* Column 1: Upload */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Imagem (Upload)
                                </label>
                                {wasUploaded && (
                                    <button
                                        onClick={() => {
                                            setEditingProduct(prev => ({ ...prev, image_url: '' }));
                                            setWasUploaded(false);
                                        }}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase"
                                    >
                                        Remover
                                    </button>
                                )}
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative aspect-video w-full rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-all overflow-hidden group"
                            >
                                {editingProduct.image_url ? (
                                    <>
                                        <img src={editingProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="flex flex-col items-center text-white">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="font-bold">Trocar Imagem</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        {uploadingImage ? (
                                            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
                                        ) : (
                                            <>
                                                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-brand-600" />
                                                </div>
                                                <span className="font-bold text-sm">Clique para subir</span>
                                                <span className="text-[10px] uppercase mt-1">PNG, JPG ou WEBP</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {/* Column 2: External Link */}
                        <div>
                            <div className="mb-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Ou Cole um Link (URL)
                                </label>
                            </div>
                            <div className="relative h-full flex flex-col justify-center">
                                <CustomInput
                                    label=""
                                    value={editingProduct.image_url || ''}
                                    onChange={(e) => {
                                        if (!wasUploaded) {
                                            setEditingProduct({ ...editingProduct, image_url: e.target.value });
                                        }
                                    }}
                                    placeholder="https://exemplo.com/foto.jpg"
                                    disabled={wasUploaded}
                                    className={wasUploaded ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800" : ""}
                                />
                                {wasUploaded && (
                                    <div className="text-[10px] text-brand-600 mt-2 font-bold flex items-center gap-1 animate-in fade-in">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                        Modo Upload Ativo
                                    </div>
                                )}
                                {!wasUploaded && !editingProduct.image_url && (
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        Cole o link direto da imagem aqui caso não queira fazer upload.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Basic Info Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="w-1 h-4 bg-brand-500 rounded-full" />
                            Informações Básicas
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <CustomInput
                                label="Nome do Produto"
                                value={editingProduct.name || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                placeholder="Ex: Hambúrguer Artesanal"
                            />
                            <CustomInput
                                label="Marca (Opcional)"
                                value={editingProduct.brand || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                                placeholder="Ex: Coca-Cola, Heinz, Caseiro"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <CustomInput
                                label="Preço de Venda"
                                mask="currency"
                                value={editingProduct.price || ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const floatVal = Number(raw) / 100;
                                    setEditingProduct({ ...editingProduct, price: floatVal });
                                }}
                                placeholder="R$ 0,00"
                            />
                            <CategorySelector
                                categories={categories}
                                selectedCategory={editingProduct.category_id || null}
                                onSelect={(catId) => setEditingProduct({ ...editingProduct, category_id: catId })}
                            />
                        </div>
                    </div>

                    {/* Size Variations Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                Variações de Tamanho
                            </h4>

                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none" onClick={() => setManageSizes(!manageSizes)}>
                                    Ativar Variações
                                </label>
                                <div
                                    onClick={() => setManageSizes(!manageSizes)}
                                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${manageSizes ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${manageSizes ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {manageSizes && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {['Pequeno', 'Médio', 'Grande'].map((size) => {
                                    const isSelected = selectedSizes.includes(size);
                                    const isDefault = defaultSize === size;

                                    return (
                                        <div key={size} className={`p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-white dark:bg-gray-800 border-brand-500 shadow-md' : 'bg-gray-100 dark:bg-gray-900/30 border-transparent opacity-60'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                        {isSelected && <X className="w-3 h-3 rotate-45" strokeWidth={4} />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={() => handleSizeToggle(size)}
                                                    />
                                                    <span className="font-bold text-sm dark:text-white">{size}</span>
                                                </label>

                                                {isSelected && (
                                                    <div className="relative group/tooltip">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDefaultSize(size);
                                                            }}
                                                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full cursor-pointer transition-colors ${isDefault ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-400 hover:bg-brand-600 hover:text-white'}`}
                                                        >
                                                            {isDefault ? 'Padrão' : 'Definir Padrão'}
                                                        </div>

                                                        {/* Custom Tooltip */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 text-center shadow-lg z-10 pointer-events-none">
                                                            Este tamanho será pré-selecionado para o cliente.
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-500 font-bold text-gray-900 dark:text-white"
                                                        placeholder="0,00"
                                                        value={pricesBySize[size] !== undefined ? (pricesBySize[size] * 100).toFixed(0).replace(/(\d)(\d{2})$/, '$1,$2').replace(/(?=(\d{3})+(\D))\B/g, '.') : ''}
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/\D/g, '');
                                                            handleSizePriceChange(size, Number(raw) / 100);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Addons Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="w-1 h-4 bg-brand-500 rounded-full" />
                            Adicionais e Complementos
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <AddonGroupSelector
                                    groups={addonGroups}
                                    selectedGroup={editingProduct.addon_group_id || null}
                                    onSelect={(groupId) => {
                                        // Ao trocar de grupo, opcionalmente limpamos exclusões antigas se os IDs forem muito diferentes,
                                        // mas por segurança e simplicidade vamos manter, pois IDs de opções são únicos.
                                        setEditingProduct({ ...editingProduct, addon_group_id: groupId });
                                    }}
                                />
                                <p className="text-[10px] text-gray-400 uppercase font-medium px-1">Vincular um grupo pré-configurado</p>

                                {/* Opções do Grupo Selecionado para Customização por Produto */}
                                {editingProduct.addon_group_id && (
                                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50 dark:border-gray-700">
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Opcionais do Grupo</span>
                                            <span className="text-[9px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-bold">Resumo do Produto</span>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                                            {addonGroups.find(g => g.id === editingProduct.addon_group_id)?.options?.map((opt: any) => {
                                                const isExcluded = (editingProduct.excluded_addon_options || []).includes(opt.id);
                                                return (
                                                    <div key={opt.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-colors group">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold transition-colors ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {opt.name}
                                                            </span>
                                                            <span className={`text-[10px] font-medium ${isExcluded ? 'text-gray-300' : 'text-brand-500'}`}>
                                                                R$ {opt.price.toFixed(2).replace('.', ',')}
                                                            </span>
                                                        </div>
                                                        <div
                                                            onClick={() => {
                                                                const current = editingProduct.excluded_addon_options || [];
                                                                const next = isExcluded
                                                                    ? current.filter(id => id !== opt.id)
                                                                    : [...current, opt.id];
                                                                setEditingProduct({ ...editingProduct, excluded_addon_options: next });
                                                            }}
                                                            className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-300 flex items-center ${!isExcluded ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${!isExcluded ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Adicionais Avulsos (Extras)</label>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Nome"
                                            className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                            value={newAvulsoName}
                                            onChange={(e) => setNewAvulsoName(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="text"
                                            placeholder="R$ 0,00"
                                            className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                            value={newAvulsoPrice === 0 ? '' : `R$ ${newAvulsoPrice.toFixed(2).replace('.', ',')}`}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                setNewAvulsoPrice(Number(raw) / 100);
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddAvulso}
                                        type="button"
                                        className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors shadow-sm"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-2 mt-4 max-h-40 overflow-y-auto pr-1">
                                    {(editingProduct.addon_options || []).length === 0 ? (
                                        <p className="text-xs text-center text-gray-400 py-4 italic">Nenhum adicional avulso cadastrado.</p>
                                    ) : (
                                        (editingProduct.addon_options || []).map((opt) => (
                                            <div key={opt.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 group">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-white">{opt.name}</span>
                                                    <span className="text-xs text-brand-600 font-medium">R$ {opt.price.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveAvulso(opt.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Description Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-4 bg-brand-500 rounded-full" />
                            Descrição Detalhada
                        </label>
                        <textarea
                            className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] dark:text-white resize-none transition-all shadow-sm"
                            value={editingProduct.description || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            placeholder="Descreva os ingredientes, modo de preparo ou detalhes que façam o cliente querer comprar..."
                        />
                    </div>

                    {/* Availability Toggle */}
                    <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/30 rounded-3xl border border-gray-100 dark:border-gray-800 transition-colors hover:border-brand-200 dark:hover:border-brand-900/50">
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => setEditingProduct({ ...editingProduct, is_active: editingProduct.is_active === false ? true : false })}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${editingProduct.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${editingProduct.is_active !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => setEditingProduct({ ...editingProduct, is_active: editingProduct.is_active === false ? true : false })}>
                                    Disponibilidade do Produto
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {editingProduct.is_active !== false
                                        ? 'O produto está visível para os clientes.'
                                        : 'O produto está oculto no cardápio.'}
                                </p>
                            </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${editingProduct.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                            {editingProduct.is_active !== false ? 'Ativo' : 'Pausado'}
                        </span>
                    </div>
                </div>

                <div className="mt-8 flex gap-4 pb-2 border-t border-gray-100 dark:border-gray-800 pt-6">
                    <Button variant="outline" className="flex-1 py-4 rounded-2xl" onClick={onClose} type="button">Cancelar</Button>
                    <Button
                        className="flex-1 py-4 rounded-2xl shadow-lg shadow-brand-500/20"
                        onClick={handleInternalSave}
                        disabled={isSaving || uploadingImage || !editingProduct.name}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        {editingProduct.id ? 'Salvar Mudanças' : 'Criar Produto'}
                    </Button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};
