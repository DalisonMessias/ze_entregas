import React, { useState, useEffect, useRef } from 'react';
import {
    Image as ImageIcon,
    Sparkles,
    Send,
    Check,
    X,
    Loader2,
    Search,
    Filter,
    Plus,
    Trash2,
    Grid,
    MessageSquare,
    Bot,
    Upload,
    Link as LinkIcon,
    FileImage
} from 'lucide-react';

import { Button } from '../Button';
import * as geminiAI from '../../services/geminiImageService';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiOptions, setAiOptions] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'gallery' | 'chat'>('gallery');

    // Estados para o Modal de Aprovação
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedAiImage, setSelectedAiImage] = useState<string | null>(null);
    const [approvalData, setApprovalData] = useState({
        productName: '',
        category: ''
    });

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

    // Estado para "Histórico" do Chat Simples (Apenas a última interação)
    const [lastPromptSent, setLastPromptSent] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isGenerating, aiOptions, activeTab]);




    const { confirm, alert } = useDialog();

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const data = await geminiAI.getGalleryImages();
            setImages(data);
        } catch (error) {
            console.error("Erro ao carregar galeria:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;

        const promptToGenerate = aiPrompt;
        setLastPromptSent(promptToGenerate);
        setAiPrompt(''); // Limpa o campo IMEDIATAMENTE conforme pedido
        setIsGenerating(true);
        setAiOptions([]);

        try {
            const options = await geminiAI.generateProductImages(promptToGenerate);
            setAiOptions(options);
            setActiveTab('chat');
        } catch (error: any) {
            alert({ title: 'Erro na IA', message: error.message || 'Falha ao gerar imagens.' });
        } finally {
            setIsGenerating(false);
        }
    };


    const handleApproveClick = (imageUrl: string) => {
        setSelectedAiImage(imageUrl);
        setApprovalData({ productName: aiPrompt, category: '' });
        setShowApprovalModal(true);
    };

    const handleFinalApproval = async () => {
        if (!approvalData.productName || !approvalData.category) {
            alert({ title: 'Dados Incompletos', message: 'Por favor, preencha o nome do produto e a categoria.' });
            return;
        }

        try {
            await geminiAI.saveGalleryImage({
                product_name: approvalData.productName,
                category: approvalData.category,
                image_url: selectedAiImage!,
                is_ai_generated: true
            });

            setShowApprovalModal(false);
            setAiOptions(prev => prev.filter(img => img !== selectedAiImage));
            loadImages();
            alert({ title: 'Sucesso', message: 'Imagem salva na galeria!' });
        } catch (error: any) {
            alert({ title: 'Erro ao Salvar', message: error.message });
        }
    };

    const handleManualSave = async () => {
        if (!manualData.productName || !manualData.category || !manualData.imageUrl) {
            alert({ title: 'Dados Incompletos', message: 'Por favor, preencha todos os campos.' });
            return;
        }

        try {
            await geminiAI.saveGalleryImage({
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
            const publicUrl = await geminiAI.uploadGalleryImage(file);
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

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Grid className="w-4 h-4" /> Galeria
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <MessageSquare className="w-4 h-4" /> Gerar com IA
                    </button>
                </div>
            </div>

            {activeTab === 'gallery' ? (
                /* GALLERY VIEW */
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
                            <Plus className="w-5 h-5 mr-2" /> Adicionar Manual
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
                                        {img.is_ai_generated && (
                                            <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full border border-white/20 shadow-sm flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3 text-brand-500" />
                                                <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300">IA</span>
                                            </div>
                                        )}
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
            ) : (
                /* AI CHAT VIEW - REDESENHADA PARA SER MAIS INTUITIVA */
                <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-[600px] animate-in slide-in-from-bottom-5 duration-700">
                    {/* Chat Column */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden relative">
                        {/* Chat Header */}
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                                    <Bot className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-tight">Zé Assistente</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">IA Nano Banana Ativa</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right hidden sm:block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status da Sessão</span>
                                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Pronto para criar brilho</p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-8 overflow-y-auto space-y-8 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] absolute inset-0 pointer-events-none" />

                        <div className="flex-1 p-8 overflow-y-auto space-y-8 relative z-0">
                            {aiOptions.length === 0 && !isGenerating && !lastPromptSent && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                                    <div className="w-20 h-20 rounded-3xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-6">
                                        <Sparkles className="w-10 h-10 text-brand-500 animate-bounce" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">O que vamos criar hoje?</h3>
                                    <p className="font-medium text-gray-500 dark:text-gray-400 max-w-sm text-sm">
                                        Descreva em detalhes um produto ou alimento e eu gerarei 2 opções de imagens publicitárias de alto nível para você.
                                    </p>
                                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                        {['Hambúrguer com bacon', 'Pizza de pepperoni', 'Açaí completo', 'Suco de laranja'].map(sug => (
                                            <button
                                                key={sug}
                                                onClick={() => setAiPrompt(sug)}
                                                className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-all text-left"
                                            >
                                                ✨ {sug}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {lastPromptSent && (
                                <div className="flex flex-col items-end gap-2 animate-in slide-in-from-right duration-500">
                                    <div className="bg-brand-500 text-white p-5 rounded-[2rem] rounded-tr-none shadow-xl shadow-brand-500/10 max-w-[80%]">
                                        <p className="font-bold text-sm leading-relaxed">{lastPromptSent}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Você</span>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="flex gap-4 animate-in slide-in-from-left duration-300">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                                        <Bot className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-6 rounded-[2rem] rounded-tl-none shadow-xl border border-gray-50 dark:border-gray-600 flex flex-col gap-4 max-w-[80%]">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                            <span className="text-sm font-black text-gray-700 dark:text-white uppercase tracking-widest">Processando Criação...</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            Estou utilizando o modelo Nano Banana para renderizar as melhores opções publicitárias para o seu pedido. Por favor, aguarde alguns segundos.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {aiOptions.length > 0 && (
                                <div className="flex gap-4 animate-in slide-in-from-left duration-500">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                                        <Bot className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="bg-white dark:bg-gray-700 p-6 rounded-[2rem] rounded-tl-none shadow-xl border border-gray-50 dark:border-gray-600">
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
                                                Aqui estão as opções de alta definição que preparei para você. Escolha a sua favorita para salvar na galeria central:
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {aiOptions.map((imageUrl, idx) => (
                                                    <div key={idx} className="group flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-lg border-2 border-brand-500/10 hover:border-brand-500/30 transition-all duration-500">
                                                        <div className="aspect-square relative">
                                                            <img src={imageUrl} alt="IA Generated" className="w-full h-full object-cover" />
                                                            <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full shadow-sm">
                                                                <span className="text-[10px] font-black text-brand-600">OPÇÃO {idx + 1}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 grid grid-cols-2 gap-3">
                                                            <button
                                                                onClick={() => setAiOptions(prev => prev.filter(img => img !== imageUrl))}
                                                                className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-800 text-red-500 border border-red-50 dark:border-red-900/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors"
                                                            >
                                                                <X className="w-4 h-4" /> Recusar
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveClick(imageUrl)}
                                                                className="flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-[1.03] transition-transform active:scale-95"
                                                            >
                                                                <Check className="w-4 h-4" /> Aprovar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input Area */}
                        <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 relative z-10">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-[2rem] opacity-20 blur group-focus-within:opacity-40 transition-opacity" />
                                <div className="relative flex gap-3 items-end bg-gray-50 dark:bg-gray-900/50 p-3 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner">
                                    <textarea
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleGenerate();
                                            }
                                        }}
                                        placeholder="Descreva o produto com detalhes (ingredientes, ângulo, luz...)"
                                        className="flex-1 p-3 bg-transparent outline-none font-bold text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 placeholder:font-medium resize-none min-h-[50px] max-h-[150px]"
                                        rows={1}
                                        disabled={isGenerating}
                                    />
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !aiPrompt.trim()}
                                        className="shrink-0 w-14 h-14 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/20 disabled:grayscale transition-all active:scale-90 hover:scale-105 flex items-center justify-center"
                                    >
                                        {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">Pressione Enter para enviar para o Zé</p>
                        </div>
                    </div>

                    {/* Quick Tips Re-styled */}
                    <div className="w-full md:w-80 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                            <div className="flex items-center gap-3 mb-6 relative">
                                <div className="p-2 bg-brand-500/10 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-brand-500" />
                                </div>
                                <h3 className="font-black uppercase tracking-tight text-gray-900 dark:text-white">Expertise IA</h3>
                            </div>

                            <div className="space-y-6 relative">
                                {[
                                    { title: 'Seja Detalhado', desc: 'Em vez de "Pizza", use "Pizza de calabresa artesanal fumegante com borda recheada".' },
                                    { title: 'Estilo de Foto', desc: 'Mencione "Fundo desfocado", "Close-up" ou "Luz natural" para realismo.' },
                                    { title: 'Sem Texto', desc: 'A IA foca na qualidade visual. Logotipos podem ser adicionados depois no sistema.' }
                                ].map((tip, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <h4 className="text-[11px] font-black text-brand-600 uppercase tracking-widest">{tip.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{tip.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-brand-500/10 opacity-50" />
                            <Bot className="absolute bottom-4 right-4 w-12 h-12 text-white/5" />
                            <h3 className="font-black uppercase tracking-widest text-[10px] text-brand-400 mb-2 relative">Aviso do Sistema</h3>
                            <p className="text-xs font-bold leading-relaxed relative">
                                Cada geração consome créditos de IA. Use com sabedoria para manter a qualidade do banco de dados global.
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* MODAL DE APROVAÇÃO */}
            {showApprovalModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-xl">
                                    <Check className="w-6 h-6 text-white" />
                                </div>
                                Salvar na Galeria
                            </h3>

                            <div className="space-y-6">
                                <div className="aspect-video rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 mb-6">
                                    <img src={selectedAiImage!} className="w-full h-full object-cover" />
                                </div>

                                <CustomInput
                                    label="Nome do Produto"
                                    value={approvalData.productName}
                                    onChange={e => setApprovalData({ ...approvalData, productName: e.target.value })}
                                    placeholder="Ex: Hambúrguer Clássico"
                                />


                                <CustomInput
                                    label="Categoria"
                                    value={approvalData.category}
                                    onChange={e => setApprovalData({ ...approvalData, category: e.target.value })}
                                    placeholder="Ex: Lanches, Bebidas, Pizzas..."
                                />

                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => setShowApprovalModal(false)}
                                    className="py-4"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={handleFinalApproval}
                                    className="py-4 shadow-lg shadow-brand-500/20"
                                >
                                    Salvar Agora
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ADIÇÃO MANUAL */}
            {showManualModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-brand-500 rounded-xl">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                Adicionar Imagem Manual
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
