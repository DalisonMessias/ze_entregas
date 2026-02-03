import React, { useState, useEffect, useRef } from 'react';
import {
    Image as ImageIcon,
    Search,
    Plus,
    Trash2,
    Upload,
    Link as LinkIcon,
    FileImage,
    Loader2
} from 'lucide-react';

import { Button } from '../Button';
import * as galleryService from '../../services/galleryService';
import * as cloud from '../../services/cloud';
import { useDialog } from '../../utils/dialogService';
import { CustomInput } from '../CustomInput';
import { CustomSelect } from '../CustomSelect';

interface GalleryImage {
    id: string;
    product_name: string;
    category: string;
    image_url: string;
    subtitle: string;
    is_ai_generated: boolean;
    created_at: string;
}

export const AdminImageGallery: React.FC = () => {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Estados para Adição Manual
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualData, setManualData] = useState({
        productName: '',
        category: '',
        imageUrl: ''
    });
    const [manualTab, setManualTab] = useState<'link' | 'upload'>('link');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { confirm, alert } = useDialog();

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const data = await galleryService.getGalleryImages();
            setImages(data);
        } catch (error) {
            console.error("Erro ao carregar galeria:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualSave = async () => {
        if (!manualData.productName || !manualData.category || !manualData.imageUrl) {
            alert({ title: 'Dados Incompletos', message: 'Por favor, preencha todos os campos.' });
            return;
        }

        try {
            await galleryService.saveGalleryImage({
                product_name: manualData.productName,
                category: manualData.category,
                image_url: manualData.imageUrl,
                is_ai_generated: false
            });

            setShowManualModal(false);
            setManualData({ productName: '', category: '', imageUrl: '' });
            setManualTab('link');
            loadImages();
            alert({ title: 'Sucesso', message: 'Imagem adicionada manualmente!' });
        } catch (error: any) {
            alert({ title: 'Erro ao Salvar', message: error.message });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await galleryService.uploadGalleryImage(file);
            setManualData({ ...manualData, imageUrl: publicUrl });
            alert({ title: 'Upload Concluído', message: 'A imagem foi enviada com sucesso!' });
        } catch (error: any) {
            alert({ title: 'Erro no Upload', message: error.message || 'Falha ao enviar arquivo.' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = async (id: string) => {
        const ok = await confirm({
            title: 'Excluir Imagem',
            message: 'Deseja realmente remover esta imagem do banco de dados?'
        });

        if (ok) {
            const sb = cloud.getClient();
            if (sb) {
                await sb.from('product_images_gallery').delete().eq('id', id);
                loadImages();
            }
        }
    };

    const filteredImages = images.filter(img => {
        const matchesSearch = img.product_name.toLowerCase().includes(search.toLowerCase()) ||
            img.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === 'all' || img.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(images.map(img => img.category)));

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/20">
                            <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                        Galeria de Imagens
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Banco de dados central de imagens para produtos.</p>
                </div>
            </div>

            {/* GALLERY VIEW */}
            <div className="space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por imagem ou categoria..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 h-[58px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    <CustomSelect
                        className="w-48 h-[58px]"
                        value={filterCategory}
                        onChange={setFilterCategory}
                        options={[
                            { value: 'all', label: 'Todas Categorias' },
                            ...categories.map(cat => ({ value: cat, label: cat }))
                        ]}
                    />

                    <Button
                        onClick={() => setShowManualModal(true)}
                        className="h-[58px] px-8 rounded-2xl shadow-lg shadow-brand-500/20"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Adicionar Imagem
                    </Button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                        <p className="text-gray-500 font-bold animate-pulse">Carregando galeria...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredImages.map(img => (
                            <div key={img.id} className="group relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                <div className="aspect-square relative overflow-hidden">
                                    <img
                                        src={img.image_url}
                                        alt={img.product_name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleDeleteImage(img.id)}
                                            className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform active:scale-95 shadow-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{img.product_name}</h3>
                                    <p className="text-xs text-brand-600 font-black uppercase tracking-widest mt-0.5">{img.category}</p>
                                    <p className="text-[10px] text-gray-400 italic mt-2">{img.subtitle}</p>
                                </div>
                            </div>
                        ))}
                        {filteredImages.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-gray-500 font-bold">Nenhuma imagem encontrada</h3>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL DE ADIÇÃO MANUAL */}
            {showManualModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-brand-500 rounded-xl">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                Adicionar Imagem
                            </h3>

                            {/* TABS NO MODAL */}
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
                                <button
                                    onClick={() => setManualTab('link')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${manualTab === 'link' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <LinkIcon className="w-4 h-4" /> Via Link
                                </button>
                                <button
                                    onClick={() => setManualTab('upload')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${manualTab === 'upload' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Upload className="w-4 h-4" /> Via Upload
                                </button>
                            </div>

                            <div className="space-y-4">
                                {manualTab === 'link' ? (
                                    <CustomInput
                                        label="URL da Imagem"
                                        value={manualData.imageUrl}
                                        onChange={e => setManualData({ ...manualData, imageUrl: e.target.value })}
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        icon={LinkIcon}
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Upload de Arquivo</label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`w-full aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative ${manualData.imageUrl ? 'border-brand-500 bg-brand-50/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 bg-gray-50 dark:bg-gray-800/50'}`}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                                                    <span className="text-xs font-bold text-gray-500">Enviando imagem...</span>
                                                </>
                                            ) : manualData.imageUrl ? (
                                                <img src={manualData.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-white dark:bg-gray-700 rounded-2xl shadow-sm">
                                                        <FileImage className="w-8 h-8 text-brand-500" />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="block text-sm font-black text-gray-700 dark:text-white uppercase tracking-tight">Clique para buscar</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">PNG, JPG ou WEBP até 5MB</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <CustomInput
                                    label="Nome do Produto"
                                    value={manualData.productName}
                                    onChange={e => setManualData({ ...manualData, productName: e.target.value })}
                                    placeholder="Ex: Coca-Cola 2L"
                                />

                                <CustomInput
                                    label="Categoria"
                                    value={manualData.category}
                                    onChange={e => setManualData({ ...manualData, category: e.target.value })}
                                    placeholder="Ex: Bebidas"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => {
                                        setShowManualModal(false);
                                        setManualData({ productName: '', category: '', imageUrl: '' });
                                        setManualTab('link');
                                    }}
                                    className="py-4"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={handleManualSave}
                                    disabled={uploading || !manualData.imageUrl}
                                    className="py-4 shadow-lg shadow-brand-500/20"
                                >
                                    Salvar Imagem
                                </Button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
