import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Edit2, Trash2, X, Check, LayoutGrid, Camera } from 'lucide-react';

import { Button } from './Button';
import * as cloud from '../services/cloud';
import { InstitutionalCategory } from '../types';
import { useDialog } from '../utils/dialogService';

export const AdminStoreCategories: React.FC = () => {
    const [categories, setCategories] = useState<InstitutionalCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<InstitutionalCategory>>({
        name: '',
        slug: '',
        image_url: ''
    });
    const [uploadingImage, setUploadingImage] = useState(false);


    const { confirm, alert: showMessage } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.getInstitutionalCategories();
            setCategories(data);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploadingImage(true);
        try {
            const url = await cloud.uploadInstitutionalCategoryImage(file);
            setEditingCategory(prev => ({ ...prev, image_url: url }));
            showMessage({ title: 'Sucesso', message: 'Imagem carregada!' });
        } catch (error: any) {
            showMessage({ title: 'Erro', message: error.message || 'Erro no upload.' });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!editingCategory.name?.trim()) {
            showMessage({ title: 'Aviso', message: 'O nome da categoria é obrigatório.' });
            return;
        }

        setIsSaving(true);
        try {
            const slug = editingCategory.slug || editingCategory.name.toLowerCase().trim().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const categoryData = { ...editingCategory, slug } as InstitutionalCategory;

            if (editingCategory.id) {
                await cloud.updateInstitutionalCategory(editingCategory.id, categoryData);
                showMessage({ title: 'Sucesso', message: 'Categoria atualizada!' });
            } else {
                await cloud.createInstitutionalCategory(categoryData);
                showMessage({ title: 'Sucesso', message: 'Categoria criada!' });
            }

            setIsModalOpen(false);
            setEditingCategory({ name: '', slug: '', image_url: '' });
            loadData();
        } catch (error: any) {
            showMessage({ title: 'Erro', message: error.message || 'Erro ao salvar categoria.' });
        } finally {
            setIsSaving(false);
        }
    };


    const handleDelete = async (category: InstitutionalCategory) => {
        const isConfirmed = await confirm({
            title: 'Excluir Categoria',
            message: `Tem certeza que deseja excluir "${category.name}"? Isso pode afetar as lojas vinculadas a ela.`
        });

        if (isConfirmed) {
            try {
                await cloud.deleteInstitutionalCategory(category.id);
                loadData();
                showMessage({ title: 'Sucesso', message: 'Categoria excluída.' });
            } catch (error: any) {
                showMessage({ title: 'Erro', message: error.message || 'Erro ao excluir categoria.' });
            }
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black dark:text-white flex items-center gap-2">
                        <LayoutGrid className="w-6 h-6 text-brand-600" />
                        Categorias de Loja
                    </h2>
                    <p className="text-sm text-gray-500">Gerencie os tipos de estabelecimentos disponíveis no sistema.</p>
                </div>
                <Button onClick={() => { setEditingCategory({ name: '', slug: '' }); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Categoria
                </Button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Imagem</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Nome</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Slug</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Ações</th>
                            </tr>

                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600" />
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-400">Nenhuma categoria encontrada.</td>
                                </tr>
                            ) : (
                                filteredCategories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4">
                                            {cat.image_url ? (
                                                <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                                    <LayoutGrid className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-sm dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">{cat.slug}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] w-full max-w-lg shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-xl dark:text-white">
                                {editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700 group-hover:border-brand-500 transition-colors relative">
                                        {editingCategory.image_url ? (
                                            <img src={editingCategory.image_url} alt="Previa" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <LayoutGrid className="w-8 h-8 mb-1" />
                                                <span className="text-[10px] font-bold uppercase">Sem Imagem</span>
                                            </div>
                                        )}
                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-xl cursor-pointer shadow-lg transition-all">
                                        <Camera className="w-4 h-4" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Icone da Categoria</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nome da Categoria</label>
                                <input
                                    type="text"
                                    value={editingCategory.name}
                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    placeholder="Ex: Restaurantes"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Slug (Customizado)</label>
                                <input
                                    type="text"
                                    value={editingCategory.slug}
                                    onChange={e => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white text-xs"
                                    placeholder="Ex: restaurantes-premium (opcional)"
                                />
                            </div>


                            <Button fullWidth onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                {editingCategory.id ? 'Salvar Alterações' : 'Criar Categoria'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
