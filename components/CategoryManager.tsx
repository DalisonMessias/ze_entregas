
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Tag, Search } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { CategoryModal } from './CategoryModal';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

export const CategoryManager: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { confirm } = useDialog();
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const [data, profile] = await Promise.all([
                cloud.getStoreCategories(),
                cloud.getMyPartnerProfile()
            ]);
            setCategories(data);

            // Validar perfil
            if (profile && profile.city) {
                setProfileValid(true);
            } else {
                setProfileValid(false);
            }
        } catch (error) {
            console.error("Erro ao carregar categorias:", error);
            setProfileValid(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Categoria?',
            message: `Tem certeza que deseja excluir a categoria "${name}"? Produtos vinculados ficarão sem categoria.`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteStoreCategory(id);
                await loadCategories();
            } catch (error) {
                console.error("Erro ao excluir categoria:", error);
            }
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar categorias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-brand-500"
                    />
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto rounded-2xl">
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Categoria
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Tag className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nenhuma categoria encontrada</h3>
                    <p className="text-gray-500">
                        {searchTerm ? 'Tente buscar com outro termo.' : 'Crie sua primeira categoria para organizar os produtos.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => (
                        <div
                            key={cat.id}
                            className="group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
                            </div>
                            <button
                                onClick={() => cat.name.toLowerCase() !== 'geral' && handleDeleteCategory(cat.id, cat.name)}
                                className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${cat.name.toLowerCase() === 'geral'
                                    ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed opacity-20'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    }`}
                                title={cat.name.toLowerCase() === 'geral' ? 'Categoria padrão não pode ser excluída' : 'Excluir Categoria'}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCategoriesChange={loadCategories}
            />
        </div>
    );
};
