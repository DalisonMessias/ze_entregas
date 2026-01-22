import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, Trash2, Edit2, Check, X, Package, Loader2, Plus, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreProduct, Category } from '../types';
import { useDialog } from '../utils/dialogService';
// GoogleGenAI agora é gerenciado pelo cloud.generateAIContent

interface StoreAIGeneratorProps {
    onProductCreated: () => void;
    categories: Category[];
    products: StoreProduct[];
}

interface AnalysisReport {
    score: number;
    metrics: {
        descriptionQuality: number;
        mixCompleteness: number;
        pricingConsistency: number;
    };
    summary: string;
    strengths: string[];
    weaknesses: string[];
}

interface AnalysisSuggestion {
    id: string;
    type: 'improvement' | 'new_product';
    target_product_id?: string;
    target_product_name?: string;
    suggestion: string;
    reason: string;
    new_data?: Partial<StoreProduct> & { category_name?: string };
}

export const StoreAIGenerator: React.FC<StoreAIGeneratorProps> = ({ onProductCreated, categories, products }) => {
    const [apiKey, setApiKey] = useState<string>('');

    // Generator Modes
    const [generatorMode, setGeneratorMode] = useState<'chat' | 'batch' | 'analyze'>('chat');

    // State
    const [aiMessage, setAiMessage] = useState('');
    const [batchInput, setBatchInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [pendingReviewProducts, setPendingReviewProducts] = useState<Partial<StoreProduct & { id_temp: string, category_name: string }>[]>([]);
    const [analysisSuggestions, setAnalysisSuggestions] = useState<AnalysisSuggestion[]>([]);
    const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing State
    const [editingItem, setEditingItem] = useState<string | null>(null); // id_temp being edited
    const [previewItem, setPreviewItem] = useState<any>(null); // item for preview modal
    const [editForm, setEditForm] = useState<Partial<StoreProduct & { category_name: string }>>({});

    const { confirm, alert: showMessage } = useDialog();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleClearChat = async () => {
        const confirmed = await confirm({
            title: 'Limpar Conversa?',
            message: 'Deseja realmente apagar todo o histórico desta conversa?',
            confirmButtonText: 'Limpar'
        });

        if (confirmed) {
            setChatHistory([]);
            localStorage.removeItem('ze_store_chat_history');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            showMessage({ title: 'Arquivo muito grande', message: 'Por favor, selecione uma imagem com menos de 4MB.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Content = (event.target?.result as string).split(',')[1];
            setSelectedImage({
                data: base64Content,
                mimeType: file.type
            });
            setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        loadSettings();
        // Restaurar histórico do chat e relatório de análise do localStorage
        const savedHistory = localStorage.getItem('ze_store_chat_history');
        if (savedHistory) {
            try {
                setChatHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Erro ao carregar histórico do chat:", e);
            }
        }

        const savedReport = localStorage.getItem('ze_store_analysis_report');
        const savedSuggestions = localStorage.getItem('ze_store_analysis_suggestions');
        if (savedReport && savedSuggestions) {
            try {
                setAnalysisReport(JSON.parse(savedReport));
                setAnalysisSuggestions(JSON.parse(savedSuggestions));
            } catch (e) {
                console.error("Erro ao carregar relatório salvo:", e);
            }
        }

        const savedPending = localStorage.getItem('ze_store_pending_products');
        if (savedPending) {
            try {
                setPendingReviewProducts(JSON.parse(savedPending));
            } catch (e) {
                console.error("Erro ao carregar produtos pendentes:", e);
            }
        }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        localStorage.setItem('ze_store_chat_history', JSON.stringify(chatHistory));
    }, [chatHistory]);

    useEffect(() => {
        if (analysisReport) {
            localStorage.setItem('ze_store_analysis_report', JSON.stringify(analysisReport));
            localStorage.setItem('ze_store_analysis_suggestions', JSON.stringify(analysisSuggestions));
        }
    }, [analysisReport, analysisSuggestions]);

    useEffect(() => {
        localStorage.setItem('ze_store_pending_products', JSON.stringify(pendingReviewProducts));
    }, [pendingReviewProducts]);

    const loadSettings = async () => {
        try {
            const settings = await cloud.getShopSettings();
            setApiKey(settings?.google_gemini_api_key || '');
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setInitializing(false);
        }
    };

    const ensureCategoryExists = async (name: string): Promise<string> => {
        if (!name) return categories[0]?.id || '';

        const lowerName = name.toLowerCase().trim();
        const found = categories.find(c => c.name.toLowerCase().trim() === lowerName);
        if (found) return found.id;

        // Se não encontrar, cria a categoria dinamicamente
        try {
            const newCat = await cloud.createStoreCategory(name);
            // Atualiza a lista local de categorias no componente pai para futuros produtos no mesmo lote
            if (onProductCreated) onProductCreated();
            return newCat.id;
        } catch (error) {
            console.error("Erro ao criar categoria dinâmica:", error);
            return categories[0]?.id || '';
        }
    };

    const handleSendMessage = async () => {
        if (!aiMessage.trim() && !selectedImage) return;

        if (!apiKey) {
            showMessage({ title: 'Configuração Necessária', message: 'Solicite ao administrador a configuração da API Key.' });
            return;
        }

        const userMsg = aiMessage;
        const currentImage = selectedImage;
        const currentPreview = imagePreview;

        setAiMessage('');
        setSelectedImage(null);
        setImagePreview(null);

        setChatHistory(prev => [...prev, {
            role: 'user',
            content: userMsg,
            image: currentPreview || undefined
        }]);
        setIsAILoading(true);

        try {
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Atue como um especialista em cadastro de produtos para delivery.
            Categorias disponíveis na loja: ${catNames || 'Geral'}.

            Analise: "${userMsg}" ${currentImage ? 'e a imagem enviada (cardápio/produto).' : '.'}

            Se for DÚVIDA / CONVERSA: Responda amigavelmente em HTML(use<b>, <br>, <i>).
            Se for CRIAÇÃO DE PRODUTO ${currentImage ? 'ou ANÁLISE DE IMAGEM' : ''}: Gere um JSON.

            Formato JSON esperado:
            {
                "type": "PRODUCT_CREATION",
                "content": "Pequeno texto confirmando a ação",
                "products": [
                    {
                        "name": "Nome Produto",
                        "description": "Descrição vendedora",
                        "price": 25.00,
                        "category_name": "Escolha uma das categorias disponíveis ou sugira uma nova se não houver match"
                    }
                ]
            }

            Se não for criação, retorne apenas o texto HTML (ou JSON com type INFORMATION).
            Responda no idioma Português do Brasil.`;

            const response = await cloud.generateAIContent(
                prompt,
                apiKey,
                undefined,
                currentImage ? [currentImage] : undefined
            );

            if (response.text) {
                const text = response.text;
                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[0]);

                        if (jsonData.type === 'PRODUCT_CREATION' && Array.isArray(jsonData.products)) {
                            const newProducts = jsonData.products.map((p: any) => ({
                                ...p,
                                id_temp: crypto.randomUUID(),
                                is_active: true
                            }));
                            setPendingReviewProducts(prev => [...prev, ...newProducts]);

                            setChatHistory(prev => [...prev, {
                                role: 'model',
                                content: jsonData.content || "Produtos gerados para revisão abaixo."
                            }]);
                        } else {
                            setChatHistory(prev => [...prev, { role: 'model', content: jsonData.content || text }]);
                        }
                    } else {
                        // Resposta texto normal
                        setChatHistory(prev => [...prev, { role: 'model', content: text }]);
                    }
                } catch (e) {
                    // Fallback se falhar parse, assume texto
                    setChatHistory(prev => [...prev, { role: 'model', content: text }]);
                }
            }
        } catch (error: any) {
            console.error("Erro na IA:", error);
            let msg = error.message || "Erro desconhecido";
            if (msg.includes('429') || msg.includes('quota') || msg.includes('limit')) {
                msg = "<b>IA em Manutenção</b><br>O sistema de inteligência artificial atingiu o limite de requisições momentâneo. Por favor, tente novamente em alguns instantes.";
            }
            setChatHistory(prev => [...prev, { role: 'model', content: msg }]);
        } finally {
            setIsAILoading(false);
        }
    };

    const handleBatchGenerate = async () => {
        if (!batchInput.trim()) return;
        if (!apiKey) {
            showMessage({ title: 'Configuração Necessária', message: 'API Key não configurada.' });
            return;
        }

        setIsBatchLoading(true);
        try {
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Transforme esta lista em produtos de delivery:
    "${batchInput}"

    Categorias da loja: ${catNames}.

    Retorne APENAS um JSON array:
    [
    {
        "name": "Nome",
    "description": "Descrição",
    "price": 0.00,
    "category_name": "Categoria"
                }
    ]`;

            const response = await cloud.generateAIContent(prompt, apiKey);

            if (response.text) {
                const jsonMatch = response.text.match(/\[[\s\S]*\]/);
                const items = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);

                if (Array.isArray(items)) {
                    const newProducts = items.map((p: any) => ({
                        ...p,
                        id_temp: crypto.randomUUID(),
                        is_active: true
                    }));
                    setPendingReviewProducts(newProducts);
                }
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "O sistema de Inteligência Artificial está passando por uma manutenção rápida. Tente novamente em alguns instantes.";
            }
            showMessage({ title: 'Cota de IA', message: msg });
        } finally {
            setIsBatchLoading(false);
        }
    };

    const handleAnalyzeCatalog = async () => {
        if (!apiKey) {
            showMessage({ title: 'Configuração Necessária', message: 'API Key não configurada.' });
            return;
        }

        setIsAnalyzing(true);
        try {
            // Fornecer dados mais detalhados para análise de qualidade
            const catalogSummary = products.map(p => `- ${p.name} (R$${p.price}) | Categoria: ${p.category} | Descrição: ${p.description || 'SEM DESCRIÇÃO'}`).join('\n');
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Atue como um Consultor de Menu de Delivery Expert e Analista de Dados.
    Analise este catálogo atual da loja:
    ${catalogSummary}

    Categorias da loja: ${catNames}.

    Sua tarefa é gerar um DIAGNÓSTICO COMPLETO do catálogo.

    Retorne APENAS um JSON rigoroso com:
    {
        "report": {
        "score": 0 a 100 (nota geral de qualidade comercial),
    "metrics": {
        "descriptionQuality": 0 a 100 (baseado em quão vendedora é a descrição),
    "mixCompleteness": 0 a 100 (se faltam produtos óbvios para o nicho),
    "pricingConsistency": 0 a 100 (se os preços estão coerentes)
                    },
    "summary": "Resumo executivo curto",
    "strengths": ["Ponto forte 1", "..."],
    "weaknesses": ["Ponto fraco 1", "..."]
                },
    "suggestions": [
    {
        "type": "improvement" | "new_product",
    "target_product_name": "Nome exato se for improvement",
    "suggestion": "Título curto",
    "reason": "Explicação curta",
    "new_data": {"name": "...", "price": 0, "description": "...", "category_name": "..." }
                    }
    ]
            }

    Critérios:
    1. Se o produto tem descrição vazia ou muito curta, sugira 'improvement' com uma descrição 'vendedora' no 'new_data'.
    2. Se faltam acompanhamentos ou bebidas óbvias, sugira 'new_product'.
    3. Analise se os nomes são atraentes.

    Limite a 4-5 sugestões de alto impacto. Idioma: Português do Brasil.`;

            const response = await cloud.generateAIContent(prompt, apiKey);

            if (response.text) {
                const jsonMatch = response.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    if (data.report) setAnalysisReport(data.report);
                    if (Array.isArray(data.suggestions)) {
                        setAnalysisSuggestions(data.suggestions.map((it: any) => ({ ...it, id: crypto.randomUUID() })));
                    }
                }
            }

        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "O assistente de análise está passando por uma manutenção preventiva. Por favor, tente novamente em breve.";
            }
            showMessage({ title: 'Aviso da IA', message: msg });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApproveProduct = async (tempId: string) => {
        const prod = pendingReviewProducts.find(p => p.id_temp === tempId);
        if (!prod) return;

        setIsSaving(true);
        try {
            const catId = await ensureCategoryExists(prod.category_name || '');

            await cloud.createStoreProduct({
                name: prod.name,
                description: prod.description,
                price: Number(prod.price) || 0,
                category_id: catId,
                is_active: true
            });

            setPendingReviewProducts(prev => prev.filter(p => p.id_temp !== tempId));
            onProductCreated(); // Atualiza lista pai
            showMessage({ title: 'Sucesso', message: 'Produto adicionado ao catálogo!' });
        } catch (error: any) {
            showMessage({ title: 'Erro', message: 'Erro ao salvar: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplySuggestion = async (suggestion: AnalysisSuggestion) => {
        setIsSaving(true);
        try {
            if (suggestion.type === 'new_product' && suggestion.new_data) {
                const catId = await ensureCategoryExists(suggestion.new_data.category_name || suggestion.new_data.category || '');
                await cloud.createStoreProduct({
                    ...suggestion.new_data,
                    category_id: catId,
                    is_active: true
                });
                showMessage({ title: 'Criado', message: 'Produto sugerido foi criado!' });
            } else if (suggestion.type === 'improvement' && suggestion.target_product_name && suggestion.new_data) {
                // Find product by name (fuzzy match risk, but acceptable for AI assistant context)
                // Better if we had IDs, but AI sees names. We try to match name.
                const target = products.find(p => p.name === suggestion.target_product_name);
                if (target) {
                    await cloud.updateStoreProduct({
                        id: target.id,
                        ...suggestion.new_data,
                        // Keep existing fields if not suggested
                    });
                    showMessage({ title: 'Atualizado', message: 'Produto atualizado com sucesso!' });
                } else {
                    alert('Produto original não encontrado para atualização.');
                    return;
                }
            }
            // Remove suggestion after apply
            setAnalysisSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            onProductCreated();
        } catch (error: any) {
            showMessage({ title: 'Erro', message: 'Falha ao aplicar: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };


    const handleApproveAll = async () => {
        const ok = await confirm({
            title: 'Salvar Tudo',
            message: `Deseja adicionar estes ${pendingReviewProducts.length} produtos à sua loja?`
        });
        if (!ok) return;

        setIsSaving(true);
        try {
            for (const prod of pendingReviewProducts) {
                const catId = await ensureCategoryExists(prod.category_name || '');
                await cloud.createStoreProduct({
                    name: prod.name,
                    description: prod.description,
                    price: Number(prod.price) || 0,
                    category_id: catId,
                    is_active: true
                });
            }
            setPendingReviewProducts([]);
            setBatchInput('');
            onProductCreated();
            showMessage({ title: 'Sucesso', message: 'Todos os produtos foram adicionados!' });
        } catch (error) {
            alert('Erro ao salvar alguns produtos.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = (tempId: string) => {
        setPendingReviewProducts(prev => prev.filter(p => p.id_temp !== tempId));
    };

    const startEdit = (prod: any) => {
        setEditingItem(prod.id_temp);
        setEditForm({ ...prod });
    };

    const saveEdit = () => {
        setPendingReviewProducts(prev => prev.map(p =>
            p.id_temp === editingItem ? { ...p, ...editForm } : p
        ));
        setEditingItem(null);
    };

    if (initializing) return <div className="p-4"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header - Unified with Admin Style */}
            <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center border border-brand-100 dark:border-brand-900/30">
                        <Bot className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm dark:text-white uppercase tracking-tighter">Gerador de Produtos</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">IA Conectada</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        {(isAILoading || isBatchLoading || isAnalyzing) && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
                        {chatHistory.length > 0 && (
                            <button
                                onClick={handleClearChat}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                                title="Limpar conversa"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setGeneratorMode('chat')}
                        className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${generatorMode === 'chat' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm ring-1 ring-brand-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Bot className="w-4 h-4" /> Conversa
                    </button>
                    <button
                        onClick={() => setGeneratorMode('batch')}
                        className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${generatorMode === 'batch' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm ring-1 ring-brand-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Package className="w-4 h-4" /> Lista
                    </button>
                    <button
                        onClick={() => setGeneratorMode('analyze')}
                        className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${generatorMode === 'analyze' ? 'bg-white dark:bg-gray-700 text-amber-500 shadow-sm ring-1 ring-amber-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Análise
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                {/* MODE: CHAT */}
                {generatorMode === 'chat' && (
                    <>
                        {chatHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center h-40 opacity-50">
                                <Sparkles className="w-10 h-10 text-brand-500 mb-2" />
                                <p className="text-xs font-medium">"Criar X-Bacon com fritas por 25 reais"</p>
                            </div>
                        )}
                        {chatHistory.map((chat: any, idx) => (
                            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-2xl text-xs ${chat.role === 'user'
                                    ? 'bg-brand-600 text-white rounded-tr-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}
                                >
                                    {chat.image && (
                                        <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-sm">
                                            <img src={chat.image} alt="Enviada" className="w-full max-h-48 object-cover" />
                                        </div>
                                    )}
                                    <div dangerouslySetInnerHTML={{ __html: chat.content }} />
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* MODE: BATCH */}
                {generatorMode === 'batch' && (
                    <div className="flex flex-col h-full">
                        <textarea
                            value={batchInput}
                            onChange={(e) => setBatchInput(e.target.value)}
                            placeholder="Cole sua lista aqui...&#10;Ex:&#10;Coca Cola - R$ 12,00&#10;X-Tudo - R$ 25,00"
                            className="w-full h-40 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none mb-2"
                        />
                        <Button fullWidth size="sm" onClick={handleBatchGenerate} disabled={isBatchLoading || !batchInput.trim()}>
                            <Sparkles className="w-4 h-4 mr-2" /> Gerar Produtos
                        </Button>
                    </div>
                )}

                {/* MODE: ANALYZE */}
                {generatorMode === 'analyze' && (
                    <div className="flex flex-col h-full">
                        {!analysisReport && !isAnalyzing ? (
                            <div className="text-center py-6">
                                <BarChart3 className="w-12 h-12 text-amber-200 mx-auto mb-3" />
                                <h3 className="font-bold text-sm dark:text-white">Análise de Catálogo</h3>
                                <p className="text-xs text-gray-500 mb-4 px-4">
                                    Nossa IA vai encontrar oportunidades para você vender mais, sugerindo melhores descrições, preços e novos itens.
                                </p>
                                <Button fullWidth size="sm" variant="secondary" onClick={handleAnalyzeCatalog} disabled={isAnalyzing}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {isAnalyzing ? 'Analisando...' : 'Iniciar Análise'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {isAnalyzing && (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                                        <p className="text-[10px] font-bold text-amber-600 animate-pulse">RECALCULANDO MÉTRICAS...</p>
                                    </div>
                                )}

                                {analysisReport && !isAnalyzing && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {/* Score Dashboard */}
                                        <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg mb-4 relative overflow-hidden">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80">Catálogo Score</h4>
                                                        <div className="text-4xl font-black mt-1 flex items-baseline">
                                                            {analysisReport.score}
                                                            <span className="text-xs font-normal opacity-60 ml-1">/100</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
                                                        <BarChart3 className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                                                        <div className="text-[8px] uppercase font-bold opacity-70">Descrições</div>
                                                        <div className="text-sm font-black">{analysisReport.metrics.descriptionQuality}%</div>
                                                    </div>
                                                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                                                        <div className="text-[8px] uppercase font-bold opacity-70">Mix Produto</div>
                                                        <div className="text-sm font-black">{analysisReport.metrics.mixCompleteness}%</div>
                                                    </div>
                                                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                                                        <div className="text-[8px] uppercase font-bold opacity-70">Preços</div>
                                                        <div className="text-sm font-black">{analysisReport.metrics.pricingConsistency}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Design element */}
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                                        </div>

                                        {/* Summary & Points */}
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                                <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed italic">
                                                    "{analysisReport.summary}"
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <h5 className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Pontos Fortes
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {analysisReport.strengths.map((s, i) => (
                                                            <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                                                {s}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h5 className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Melhorar
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {analysisReport.weaknesses.map((w, i) => (
                                                            <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                                                {w}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Suggestions Area */}
                                        <div className="mt-8 pt-6 border-t dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-black text-xs uppercase tracking-wider text-gray-400">Planos de Ação ({analysisSuggestions.length})</h4>
                                                <button onClick={() => { setAnalysisReport(null); setAnalysisSuggestions([]); }} className="text-[10px] text-brand-600 font-bold hover:underline">Refazer Análise</button>
                                            </div>

                                            <div className="space-y-3">
                                                {analysisSuggestions.map(sug => (
                                                    <div key={sug.id} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-3xl hover:border-brand-200 dark:hover:border-brand-900/30 transition-all shadow-sm">
                                                        <div className="flex gap-3 mb-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sug.type === 'improvement' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-brand-100 dark:bg-brand-900/20 text-brand-600'}`}>
                                                                {sug.type === 'improvement' ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold text-xs text-gray-800 dark:text-white group-hover:text-brand-600 transition-colors uppercase tracking-tight">{sug.suggestion}</h5>
                                                                <p className="text-[10px] text-gray-500 leading-tight mt-1">{sug.reason}</p>
                                                            </div>
                                                        </div>

                                                        {sug.new_data && (
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 mb-4 border border-dashed border-gray-200 dark:border-gray-700">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase">Sugestão de Dados</span>
                                                                    {sug.new_data.price && <span className="text-[10px] font-bold text-brand-600">R$ {sug.new_data.price.toFixed(2)}</span>}
                                                                </div>
                                                                <div className="text-[11px] font-bold dark:text-gray-200">{sug.new_data.name}</div>
                                                                <div className="text-[10px] text-gray-500 line-clamp-2 mt-1">{sug.new_data.description}</div>
                                                            </div>
                                                        )}

                                                        <Button size="sm" fullWidth variant={sug.type === 'improvement' ? 'secondary' : 'primary'} onClick={() => handleApplySuggestion(sug)} disabled={isSaving}>
                                                            <Sparkles className="w-3 h-3 mr-2" />
                                                            {sug.type === 'improvement' ? 'Aplicar Melhoria' : 'Criar Produto'}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Pendings Review Area (Common for Chat/Batch) */}
                {pendingReviewProducts.length > 0 && generatorMode !== 'analyze' && (
                    <div className="pt-4 mt-2 border-t dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-xs uppercase text-gray-400">Revisão ({pendingReviewProducts.length})</h4>
                            {pendingReviewProducts.length > 1 && (
                                <Button size="sm" onClick={handleApproveAll} disabled={isSaving}>
                                    Aprovar Tudo
                                </Button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {pendingReviewProducts.map((prod) => (
                                <div key={prod.id_temp} className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 p-3 rounded-2xl">
                                    {editingItem === prod.id_temp ? (
                                        <div className="space-y-2">
                                            <input
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full text-xs p-1 rounded border"
                                                placeholder="Nome"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={editForm.price}
                                                    onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                                                    className="w-20 text-xs p-1 rounded border"
                                                    placeholder="Preço"
                                                />
                                                <select // Forçar re-render se necessário
                                                    value={editForm.category_name}
                                                    onChange={e => setEditForm({ ...editForm, category_name: e.target.value })}
                                                    className="flex-1 text-xs p-1 rounded border"
                                                >
                                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingItem(null)} className="text-xs text-gray-500">Cancelar</button>
                                                <button onClick={saveEdit} className="text-xs font-bold text-brand-600">Salvar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h5 className="font-bold text-sm dark:text-white">{prod.name}</h5>
                                                    <p className="text-[10px] text-gray-500">
                                                        {prod.category_name} • R$ {prod.price?.toFixed(2)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 line-clamp-1">{prod.description}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setPreviewItem(prod)} className="p-1 hover:bg-white rounded" title="Ver Detalhes"><AlertCircle className="w-3 h-3 text-brand-500" /></button>
                                                    <button onClick={() => startEdit(prod)} className="p-1 hover:bg-white rounded"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                                                    <button onClick={() => handleDiscard(prod.id_temp!)} className="p-1 hover:bg-red-50 rounded"><X className="w-3 h-3 text-red-400" /></button>
                                                </div>
                                            </div>
                                            <Button size="sm" fullWidth variant="success" onClick={() => handleApproveProduct(prod.id_temp!)} disabled={isSaving}>
                                                <Check className="w-3 h-3 mr-1" /> Aprovar
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Chat */}
            {generatorMode === 'chat' && (
                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {imagePreview && (
                        <div className="mb-2 relative w-fit">
                            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-brand-500" />
                            <button
                                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                            >
                                <X className="w-2 h-2" />
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 relative">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={aiMessage}
                                onChange={(e) => setAiMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Diga ou envie foto do cardápio..."
                                className="w-full bg-white dark:bg-gray-800 border-none rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                disabled={isAILoading}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
                                title="Anexar imagem"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={isAILoading || (!aiMessage.trim() && !selectedImage)}
                            className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:bg-gray-300 transition-all font-bold text-xs"
                        >
                            {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 text-left">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h4 className="font-black text-lg dark:text-white mb-2 uppercase tracking-tight">Preview do Produto</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome</label>
                                    <p className="text-sm font-bold dark:text-gray-200">{previewItem.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Preço</label>
                                        <p className="text-sm font-bold text-brand-600">R$ {previewItem.price?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Categoria</label>
                                        <p className="text-sm font-bold dark:text-gray-200">{previewItem.category_name}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Descrição</label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">"{previewItem.description}"</p>
                                </div>
                            </div>
                            <Button fullWidth className="mt-8 rounded-2xl" onClick={() => setPreviewItem(null)}>
                                Fechar Preview
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
