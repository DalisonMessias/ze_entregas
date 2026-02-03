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
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEditingProduct({ ...product });
            // Consider an image "uploaded" if it contains our storage path pattern
            // or if it was just uploaded in this session.
            setWasUploaded(!!product.image_url?.includes('/storage/v1/object/public/products/'));
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

                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    {/* Image Upload Area */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Imagem do Produto</label>
                            {wasUploaded && (
                                <button
                                    onClick={() => {
                                        setEditingProduct(prev => ({ ...prev, image_url: '' }));
                                        setWasUploaded(false);
                                    }}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase"
                                >
                                    Remover Upload
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
                                            <span className="font-bold text-sm">Clique para subir uma foto</span>
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <AddonGroupSelector
                                groups={addonGroups}
                                selectedGroup={editingProduct.addon_group_id || null}
                                onSelect={(groupId) => setEditingProduct({ ...editingProduct, addon_group_id: groupId })}
                            />
                            <p className="text-[10px] text-gray-400 uppercase font-medium px-1">Vincular um grupo pré-configurado de opcionais</p>
                        </div>

                        <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Adicionais Avulsos (Extras)</label>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Nome"
                                        className="w-full p-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={newAvulsoName}
                                        onChange={(e) => setNewAvulsoName(e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <input
                                        type="text"
                                        placeholder="R$ 0,00"
                                        className="w-full p-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
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
                                        <div key={opt.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group">
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

                    <div className="relative">
                        <CustomInput
                            label="Link da Imagem (Opcional)"
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
                            <p className="text-[10px] text-brand-600 mt-1 font-bold">Campo bloqueado: Imagem via upload ativa.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">Descrição detalhada</label>
                        <textarea
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px] dark:text-white resize-none transition-all"
                            value={editingProduct.description || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            placeholder="Descreva os ingredientes ou detalhes do produto..."
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div
                                onClick={() => setEditingProduct({ ...editingProduct, is_active: editingProduct.is_active === false ? true : false })}
                                className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${editingProduct.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${editingProduct.is_active !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => setEditingProduct({ ...editingProduct, is_active: editingProduct.is_active === false ? true : false })}>
                                Produto disponível para venda
                            </label>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${editingProduct.is_active !== false ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {editingProduct.is_active !== false ? 'Ativado' : 'Pausado'}
                        </span>
                    </div>
                </div>

                <div className="mt-8 flex gap-4 pb-2 border-t border-gray-100 dark:border-gray-800 pt-6">
                    <Button variant="outline" className="flex-1 py-4 rounded-2xl" onClick={onClose} type="button">Cancelar</Button>
                    <Button
                        className="flex-1 py-4 rounded-2xl shadow-lg shadow-brand-500/20"
                        onClick={() => onSave(editingProduct)}
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
