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
    const { confirm, alert } = useDialog();

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
            await alert({ title: 'Sucesso', message: 'Categoria criada com sucesso!' });
        } catch (error: any) {
            console.error("Erro ao criar categoria:", error);
            await alert({ title: 'Erro', message: "Erro ao criar categoria: " + (error.message || 'Verifique se o nome já existe.') });
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
            setIsSaving(true);
            try {
                await cloud.deleteStoreCategory(id);
                await loadCategories();
                onCategoriesChange?.();
                await alert({ title: 'Sucesso', message: 'Categoria excluída!' });
            } catch (error) {
                console.error("Erro ao excluir categoria:", error);
                await alert({ title: 'Erro', message: "Não foi possível excluir a categoria." });
            } finally {
                setIsSaving(false);
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
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Nome da Categoria
                        </label>
                        <CustomInput
                            placeholder="Ex: Bebidas, Lanches..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="h-12"
                            autoFocus
                        />
                        <div className="mt-4">
                            <Button
                                onClick={handleAddCategory}
                                disabled={isSaving || !newCategoryName.trim()}
                                className="w-full h-12 rounded-xl font-bold"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                Adicionar Categoria
                            </Button>
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-500">
                        Após adicionar, a categoria aparecerá na lista.
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
