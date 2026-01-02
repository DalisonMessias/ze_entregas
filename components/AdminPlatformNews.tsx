
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Newspaper, Plus, Trash2, Edit2, Save, CheckCircle, AlertTriangle, RefreshCw, X, Sparkles, Map, Gift, Headphones, Bell, Truck } from 'lucide-react';
import { PlatformNews } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';

// Helper to select icon
const ICON_OPTIONS = [
    { name: 'Sparkles', icon: Sparkles },
    { name: 'Map', icon: Map },
    { name: 'Gift', icon: Gift },
    { name: 'Headphones', icon: Headphones },
    { name: 'Newspaper', icon: Newspaper },
    { name: 'Bell', icon: Bell },
    { name: 'Truck', icon: Truck },
];

export const AdminPlatformNews: React.FC = () => {
    const [newsItems, setNewsItems] = useState<PlatformNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Add/Edit Modal State
    const [showModal, setShowModal] = useState(false);
    const [currentNews, setCurrentNews] = useState<Partial<PlatformNews> | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const loadNews = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPlatformNews();
            setNewsItems(data);
        } catch (e) {
            console.error("Error loading platform news:", e);
        } finally {
            setLoading(false);
        }
    }, []); // Removed unnecessary dependency

    const { confirm } = useDialog();

    useEffect(() => {
        loadNews();
    }, [loadNews]);

    const handleAddEditNews = async () => {
        if (!currentNews?.title || !currentNews.description || !currentNews.icon_name) {
            setFeedback({ type: 'error', text: 'Preencha título, descrição e ícone.' });
            return;
        }

        setSaving(true);
        setFeedback(null);
        try {
            const saved = await cloud.adminAddPlatformNews(currentNews);
            const savedId = (saved?.id || currentNews.id) as string | undefined;
            if (imageFile && savedId) {
                await cloud.adminUploadPlatformNewsImage(savedId, imageFile);
            }
            setShowModal(false);
            setCurrentNews(null);
            setImageFile(null);
            setImagePreview(null);
            loadNews();
            setFeedback({ type: 'success', text: 'Notícia salva com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar notícia: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNews = async (id: string) => {
        const ok = await confirm({ title: 'Excluir notícia', message: 'Tem certeza que deseja excluir esta notícia?' });
        if (!ok) return;
        try {
            await cloud.adminDeletePlatformNews(id);
            loadNews();
            setFeedback({ type: 'success', text: 'Notícia excluída.' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao excluir notícia: ' + e.message });
        }
    };

    const openModalForEdit = (news: PlatformNews) => {
        setCurrentNews(news);
        setShowModal(true);
    };

    const openModalForAdd = () => {
        setCurrentNews({ is_active: true, sort_order: 0 });
        setShowModal(true);
    };

    const NewsModal: React.FC<{ news: Partial<PlatformNews>, onClose: () => void }> = ({ news, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-brand-500" /> {news.id ? 'Editar Notícia' : 'Nova Notícia'}
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                        <input type="text" value={news.title || ''} onChange={e => setCurrentNews(prev => prev ? { ...prev, title: e.target.value } : null)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                        <textarea value={news.description || ''} onChange={e => setCurrentNews(prev => prev ? { ...prev, description: e.target.value } : null)} rows={4} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ícone</label>
                        <select value={news.icon_name || ''} onChange={e => setCurrentNews(prev => prev ? { ...prev, icon_name: e.target.value } : null)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                            <option value="">Selecione um Ícone</option>
                            {ICON_OPTIONS.map(icon => <option key={icon.name} value={icon.name}>{icon.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ordem de Exibição</label>
                        <input type="number" value={news.sort_order || 0} onChange={e => setCurrentNews(prev => prev ? { ...prev, sort_order: Number(e.target.value) } : null)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                    </div>
                    <Switch 
                        checked={news.is_active || false} 
                        onChange={c => setCurrentNews(prev => prev ? { ...prev, is_active: c } : null)} 
                        label="Ativa" 
                    />
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Imagem</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={e => {
                                    const f = e.target.files?.[0] || null;
                                    if (!f) { setImageFile(null); setImagePreview(null); return; }
                                    const maxSize = 4 * 1024 * 1024;
                                    if (f.size > maxSize) {
                                        setFeedback({ type: 'error', text: 'Imagem muito grande. Máximo 4MB.' });
                                        return;
                                    }
                                    setImageFile(f);
                                    const reader = new FileReader();
                                    reader.onload = () => setImagePreview(reader.result as string);
                                    reader.readAsDataURL(f);
                                }}
                                className="w-full text-sm"
                            />
                        </div>
                        {imagePreview && (
                            <div className="mt-3">
                                <img src={imagePreview} alt="Pré-visualização" className="w-full h-40 object-cover rounded-xl" />
                            </div>
                        )}
                    </div>
                </div>
                <Button fullWidth onClick={handleAddEditNews} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : 'Salvar Notícia'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Newspaper className="w-6 h-6 text-brand-600" /> Gerenciar Notícias
                    </h2>
                    <Button onClick={openModalForAdd}><Plus className="w-5 h-5 mr-2"/> Nova Notícia</Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Mantenha os usuários informados sobre novidades e atualizações da plataforma.</p>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-lg dark:text-white">Notícias Atuais</h3>
                        <button onClick={loadNews} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-96 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Título</th>
                                    <th className="px-4 py-3">Ícone</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>}
                                {!loading && newsItems.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma notícia cadastrada.</td></tr>}
                                {!loading && newsItems.map(item => {
                                    const Icon = ICON_OPTIONS.find(opt => opt.name === item.icon_name)?.icon || Sparkles;
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-bold dark:text-white">{item.title}</td>
                                            <td className="px-4 py-3">
                                                <Icon className="w-5 h-5 text-gray-500" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.is_active ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openModalForEdit(item)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteNews(item.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && currentNews && <NewsModal news={currentNews} onClose={() => setShowModal(false)} />}
        </div>
    );
};
