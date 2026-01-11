import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCategoriesChange?: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen,
    onClose,
    onCategoriesChange
}) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { confirm } = useDialog();

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await cloud.getStoreCategories();
            setCategories(data);
        } catch (error) {
            console.error("Erro ao carregar categorias:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setIsSaving(true);
        try {
            await cloud.createStoreCategory(newCategoryName.trim());
            setNewCategoryName('');
            await loadCategories();
            onCategoriesChange?.();
        } catch (error) {
            console.error("Erro ao criar categoria:", error);
            alert("Erro ao criar categoria. Verifique se o nome já existe.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Categoria?',
            message: `Tem certeza que deseja excluir a categoria "${name}"? Isso não afetará os produtos já cadastrados, mas eles ficarão sem categoria vinculada.`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteStoreCategory(id);
                await loadCategories();
                onCategoriesChange?.();
            } catch (error) {
                console.error("Erro ao excluir categoria:", error);
                alert("Não foi possível excluir a categoria.");
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black dark:text-white flex items-center gap-2">
                            <Tag className="w-6 h-6 text-brand-500" />
                            Categorias
                        </h3>
                        <p className="text-gray-500 text-sm">Organize seus produtos</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <CustomInput
                                placeholder="Nova categoria..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="h-12"
                            />
                        </div>
                        <Button
                            onClick={handleAddCategory}
                            disabled={isSaving || !newCategoryName.trim()}
                            className="h-12 px-4 rounded-xl"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhuma categoria cadastrada.
                            </div>
                        ) : (
                            categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-brand-200 dark:hover:border-brand-900 transition-all"
                                >
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    <Button variant="outline" className="w-full py-4 rounded-2xl font-bold" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
};
