import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Link2, Users, Calendar, Image as ImageIcon, CheckCircle, X, Loader2, Monitor, Smartphone, Layout } from 'lucide-react';
import * as cloud from '../services/cloud';
import { AppSlide } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { useDialog } from '../utils/dialogService';
import { ImageUpload } from './ImageUpload';

export const AdminSlides: React.FC = () => {
    const [slides, setSlides] = useState<AppSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<AppSlide | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { confirm, alert } = useDialog();

    // Form State
    const [formData, setFormData] = useState<Partial<AppSlide>>({
        name: '',
        image_url: '',
        link: '',
        display_days: 7,
        target_audience: 'both',
        is_active: true
    });

    useEffect(() => {
        loadSlides();
    }, []);

    const loadSlides = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetSlides();
            setSlides(data);
        } catch (error) {
            console.error('Error loading slides:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (slide?: AppSlide) => {
        if (slide) {
            setEditingSlide(slide);
            setFormData(slide);
        } else {
            setEditingSlide(null);
            setFormData({
                name: '',
                image_url: '',
                link: '',
                display_days: 7,
                target_audience: 'both',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.image_url) {
            await alert({ title: 'Campos Obrigatórios', message: 'Por favor, preencha o nome e selecione uma imagem para o slide.' });
            return;
        }

        setIsSaving(true);
        try {
            if (editingSlide) {
                await cloud.adminUpdateSlide(editingSlide.id, formData);
                await alert({ title: 'Sucesso', message: 'Slide atualizado com sucesso!' });
            } else {
                await cloud.adminCreateSlide(formData);
                await alert({ title: 'Sucesso', message: 'Novo slide criado com sucesso!' });
            }
            setIsModalOpen(false);
            await loadSlides();
        } catch (error: any) {
            console.error('Error saving slide:', error);
            await alert({ title: 'Erro ao Salvar', message: 'Ocorreu um erro ao salvar o slide: ' + (error.message || 'Erro desconhecido') });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'Excluir Slide',
            message: 'Tem certeza que deseja excluir este slide? Esta ação não pode ser desfeita.'
        });

        if (!ok) return;

        setLoading(true);
        try {
            await cloud.adminDeleteSlide(id);
            await alert({ title: 'Sucesso', message: 'Slide excluído com sucesso!' });
            setSlides(prev => prev.filter(s => s.id !== id));
        } catch (error: any) {
            console.error('Error deleting slide:', error);
            await alert({ title: 'Erro ao Excluir', message: 'Ocorreu um erro ao excluir o slide: ' + (error.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const getAudienceLabel = (audience: string) => {
        switch (audience) {
            case 'drivers': return 'Entregadores';
            case 'merchants': return 'Lojistas';
            default: return 'Ambos';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Layout className="w-6 h-6 text-brand-600" /> Gerenciar Slides
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure os banners promocionais da tela inicial.</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Slide
                </Button>
            </div>

            {/* Grid de Slides */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
                    </div>
                ) : slides.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum slide configurado.</p>
                        <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
                            Criar Primeiro Slide
                        </Button>
                    </div>
                ) : (
                    slides.map(slide => (
                        <div key={slide.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
                            {/* Preview da Imagem */}
                            <div className="aspect-[16/4] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                <img
                                    src={slide.image_url}
                                    alt={slide.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                        onClick={() => handleOpenModal(slide)}
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full text-gray-700 dark:text-white hover:text-brand-600 shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(slide.id)}
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full text-red-500 hover:bg-red-50 shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {!slide.is_active && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/30">Inativo</span>
                                    </div>
                                )}
                            </div>

                            {/* Detalhes */}
                            <div className="p-5 space-y-3">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{slide.name}</h3>

                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                        <Users className="w-3.5 h-3.5" />
                                        {getAudienceLabel(slide.target_audience)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {slide.display_days} dias
                                    </div>
                                    {slide.link && (
                                        <div className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg">
                                            <Link2 className="w-3.5 h-3.5" />
                                            Link Ativo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Criação/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                {editingSlide ? 'Editar Slide' : 'Novo Slide'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Visual Preview Area */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Prévia (1600x400)</label>
                                <div className="aspect-[16/4] w-full rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs">Insira a URL da imagem abaixo</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Slide</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Promoção de Natal"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <ImageUpload
                                        label="Imagem do Slide (Sugerido 1600x400)"
                                        currentImageUrl={formData.image_url}
                                        onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                        folderPath="slides"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Link de Destino (Rota ou URL)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: /shop ou /daily_panel"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.link}
                                        onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tempo de Exibição (Em dias)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.display_days}
                                        onChange={e => setFormData(prev => ({ ...prev, display_days: parseInt(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Público-Alvo</label>
                                    <CustomSelect
                                        value={formData.target_audience || 'both'}
                                        onChange={val => setFormData(prev => ({ ...prev, target_audience: val as any }))}
                                        options={[
                                            { label: 'Entregadores', value: 'drivers' },
                                            { label: 'Lojistas', value: 'merchants' },
                                            { label: 'Ambos', value: 'both' }
                                        ]}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-6">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="w-5 h-5 rounded-lg border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Slide Ativo</label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                            <Button fullWidth onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Slide'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
