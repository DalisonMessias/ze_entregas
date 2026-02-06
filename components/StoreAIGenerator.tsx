import React, { useState, useEffect, useRef } from 'react';
import { Bot, Package, Loader2, BarChart3, Edit2, Trash2, Check, Send, Layers, Sparkles, X, AlertCircle, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreProduct, Category, StoreAddonGroup } from '../types';
import { useDialog } from '../utils/dialogService';

interface StoreAIGeneratorProps {
    onProductCreated: (signal?: AbortSignal) => Promise<void>;
    categories: Category[];
    products: StoreProduct[];
    onEditProduct: (product: Partial<StoreProduct>, onSaved?: () => void) => void;
    onEditAddonGroup: (group: Partial<StoreAddonGroup>, onSaved?: () => void) => void;
    isSuperStore?: boolean;
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
    target_product_name?: string;
    suggestion: string;
    reason: string;
    new_data?: Partial<StoreProduct> & { category_name?: string };
}

type GeneratorMode = 'chat' | 'list' | 'analyze' | 'addons';

export const StoreAIGenerator: React.FC<StoreAIGeneratorProps> = ({ onProductCreated, categories, products, onEditProduct, onEditAddonGroup, isSuperStore = false }) => {
    const [apiKey, setApiKey] = useState<string>('');

    // Generator Modes
    const [generatorMode, setGeneratorMode] = useState<GeneratorMode>('chat');

    // State
    const [aiMessage, setAiMessage] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [pendingChatProducts, setPendingChatProducts] = useState<Partial<StoreProduct & { id_temp: string, category_name: string }>[]>([]);

    // Batch Mode State
    const [batchInput, setBatchInput] = useState('');
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [pendingBatchProducts, setPendingBatchProducts] = useState<Partial<StoreProduct & { id_temp: string, category_name: string }>[]>([]);

    // Addons Mode State
    const [addonMessage, setAddonMessage] = useState('');
    const [pendingAddonGroups, setPendingAddonGroups] = useState<Partial<StoreAddonGroup & { id_temp: string }>[]>([]);

    // Analysis Mode State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
    const [analysisSuggestions, setAnalysisSuggestions] = useState<AnalysisSuggestion[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    // Initializing removed to prevent UI block

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { alert: showMessage } = useDialog();

    // Chat History
    interface ChatMessage {
        role: 'user' | 'model';
        content: string;
        image?: string;
    }
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isAILoading]);

    const loadSettings = async () => {
        try {
            const key = await cloud.getAPIKey('google');
            setApiKey(key || '');
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setSelectedImage(base64);
                setImagePreview(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const ensureCategory = async (name: string): Promise<string> => {
        try {
            const normalized = name.trim().toLowerCase();
            const existing = categories.find(c => c.name.toLowerCase() === normalized);
            if (existing) return existing.id;

            const { user } = await cloud.getUserWithCache();
            if (!user) return categories[0]?.id || '';

            const catId = await cloud.ensureStoreCategory(user.id, name);
            if (catId) {
                if (onProductCreated) onProductCreated();
                return catId;
            }
            return categories[0]?.id || '';
        } catch (e) {
            console.error("Erro wrapper ensureCategory:", e);
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

            const prompt = `Atue como um EXPERT COPYWRITER e CONSULTOR DE VENDAS para delivery.
            Categorias na loja: ${catNames || 'Geral'}.

            ENTRADA: "${userMsg}" ${currentImage ? 'e IMAGEM (analise detalhes visuais).' : '.'}

            DIRETRIZES DE OURO:
            1. PERSONA: Você é um mestre em vendas. Suas descrições devem ser IRRESISTÍVEIS, usando gatilhos de apetite, frescor e conveniência.
            2. PROATIVIDADE MÁXIMA: Se detectar itens vendáveis, SEMPRE gere "PRODUCT_CREATION". Se falta preço, sugira um valor "premium" de mercado.
            3. EXTRAÇÃO DE IMAGEM: Se for um cardápio, ignore ruídos e extraia TODOS os itens com precisão cirúrgica.
            4. COPYWRITING:
                - Artesanal: "Pão brioche selado na manteiga, blend suculento de 180g, queijo cheddar derretido..." (Liste ingredientes de forma poética).
                - Industrial: "Coca-Cola trincando de gelada, o acompanhamento perfeito para sua refeição." (Foco no momento de consumo).

            JSON ESPERADO:
            {
                "type": "PRODUCT_CREATION",
                "content": "Texto vendedor confirmando a ação e justificando preços sugeridos",
                "products": [
                    {
                        "name": "Nome Impactante",
                        "description": "Copy irresistível seguindo as regras",
                        "price": 0.00,
                        "category_name": "Categoria mais adequada",
                        "addon_options": [
                            { "name": "Bacon Extra", "price": 5.00, "is_active": true },
                            { "name": "Molho Especial", "price": 0.00, "is_active": true }
                        ]
                    }
                ]
            }

            Se for apenas conversa teórica, use "INFORMATION" com formatação HTML rica.
            IDOMA: Português do Brasil.`;

            const response = await cloud.generateAIContent(
                prompt,
                apiKey,
                undefined,
                currentImage ? [{ data: currentImage.split(',')[1], mimeType: currentImage.match(/data:(.*?);base64/)?.[1] || 'image/jpeg' }] : undefined
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
                            setPendingChatProducts(prev => [...prev, ...newProducts]);

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

            const prompt = `Atue como um ALGORITMO DE EXTRAÇÃO E COPYWRITING EM MASSA.
            LISTA BRUTA: "${batchInput}"
            Categorias: ${catNames}.

            TAREFA: Transformar cada linha em um produto de alta conversão.
            - Se a linha estiver bagunçada, use inteligência para deduzir Nome, Preço e Categoria.
            - Se não houver preço, aplique um valor médio de mercado.
            - Gere descrições RICAS e CRIATIVAS para cada item (Artesanal = Ingredientes, Industrial = Comercial).

            RETORNE APENAS JSON ARRAY:
            [
                {
                    "name": "Nome do Produto",
                    "description": "Copy persuasiva e detalhada",
                    "price": 0.00,
                    "category_name": "Categoria",
                    "addon_options": [{ "name": "...", "price": 0, "is_active": true }]
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
                    setPendingBatchProducts(newProducts);
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
            const catalogSummary = products.map(p => `- ${p.name} (R$${p.price}) | Categoria: ${(p as any).category || (p as any).category_name || 'Geral'} | Descrição: ${p.description || 'SEM DESCRIÇÃO'}`).join('\n');
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Atue como um MENTOR DE NEGÓCIOS Estratégico e Especialista em Engenharia de Cardápio.
            DADOS DO CATÁLOGO:
            ${catalogSummary}

            Categorias: ${catNames}.

            OBJETIVO: Diagnosticar falhas e sugerir ações que AUMENTEM O TICKET MÉDIO E A CONVERSÃO.
            
            DIRETRIZES DE ANÁLISE:
            1. PSICOLOGIA DE PREÇOS: Identifique se há falta de combos ou ancoragem de preços.
            2. GATILHOS MENTAIS: Sugira descrições que usem Escassez, Urgência ou Prova Social.
            3. MIX DE PRODUTOS: Sugira itens que faltam para complementar a experiência (cross-sell).
            4. HIGIENE VISUAL: Avalie se os nomes são curtos e impactantes.

            RETORNE APENAS JSON:
            {
                "report": {
                    "score": 0-100,
                    "metrics": {
                        "descriptionQuality": 0-100,
                        "mixCompleteness": 0-100,
                        "pricingConsistency": 0-100
                    },
                    "summary": "Texto direto e provocativo sobre o estado do catálogo",
                    "strengths": ["Ponto forte real e estratégico"],
                    "weaknesses": ["Ponto fraco crítico que impede vendas"]
                },
                "suggestions": [
                    {
                        "type": "improvement" | "new_product",
                        "target_product_name": "Nome exato",
                        "suggestion": "Título da Melhoria",
                        "reason": "Explicação baseada em psicologia de vendas",
                        "new_data": { "name": "...", "price": 0, "description": "Copy Mestre", "category_name": "..." }
                    }
                ]
            }

            IDOMA: Português do Brasil.`;

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

    const handleSendAddonsMessage = async () => {
        if (!addonMessage.trim()) return;
        if (!apiKey) {
            showMessage({ title: 'Configuração Necessária', message: 'API Key não configurada.' });
            return;
        }

        setIsAILoading(true);
        try {
            const prompt = `
            Atue como um especialista em engenharia de cardápios.
            Crie Grupos de Adicionais (Complementos) para produtos de delivery com base no pedido: "${addonMessage}".
            
            Retorne APENAS um JSON válido seguindo estritamente este formato:
            {
                "groups": [
                    {
                        "name": "Nome do Grupo (ex: Escolha sua Proteína)",
                        "type": "SINGLE" (para apenas uma escolha) ou "MULTIPLE" (para várias),
                        "min": 0 (mínimo de escolhas),
                        "max": 1 (máximo de escolhas),
                        "options": [
                            { "name": "Opção 1", "price": 0.00, "is_active": true },
                            { "name": "Opção 2", "price": 5.00, "is_active": true }
                        ]
                    }
                ]
            }

            Regras:
            1. Seja comercial e organizado.
            2. Se o usuário pedir "Adicionais para Açaí", crie grupos como "Frutas", "Caldas", "Complementos".
            3. "min": 1 obriga o usuário a escolher. "min": 0 é opcional.
            `;

            const response = await cloud.generateAIContent(prompt, apiKey);
            if (response.text) {
                const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                // Tenta extrair JSON se houver texto ao redor
                const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
                const jsonToParse = jsonMatch ? jsonMatch[0] : jsonStr;

                const data = JSON.parse(jsonToParse);

                if (data.groups && Array.isArray(data.groups)) {
                    const newGroups = data.groups.map((g: any) => ({
                        ...g,
                        id_temp: Math.random().toString(36).substr(2, 9),
                        store_id: 'temp',
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }));
                    setPendingAddonGroups(prev => [...prev, ...newGroups]);
                    setAddonMessage('');
                    showMessage({ title: 'Sucesso', message: 'Sugestões de adicionais geradas!' });
                }
            }
        } catch (error: any) {
            console.error("Erro ao gerar adicionais:", error);
            showMessage({ title: 'Erro', message: 'Não foi possível gerar os adicionais. Tente novamente.' });
        } finally {
            setIsAILoading(false);
        }
    };

    const handleApproveAddonGroup = async (tempId: string) => {
        const group = pendingAddonGroups.find(g => g.id_temp === tempId);
        if (!group) return;

        setIsSaving(true);
        try {
            const { id_temp, ...payload } = group;
            await cloud.createStoreAddonGroup(payload as any);

            setPendingAddonGroups(prev => prev.filter(g => g.id_temp !== tempId));
            showMessage({ title: 'Sucesso', message: 'Grupo de adicionais salvo com sucesso!' });
            onProductCreated();
        } catch (error: any) {
            console.error("Erro ao salvar grupo:", error);
            showMessage({ title: 'Erro', message: 'Erro ao salvar grupo.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditAddonGroup = (group: any) => {
        onEditAddonGroup(group, () => {
            setPendingAddonGroups(prev => prev.filter(g => g.id_temp !== group.id_temp));
        });
    };

    const handleDiscardAddonGroup = (tempId: string) => {
        setPendingAddonGroups(prev => prev.filter(g => g.id_temp !== tempId));
    };

    const startEdit = (prod: any) => {
        onEditProduct(prod, () => handleDiscard(prod.id_temp));
    };

    const handleDiscard = (tempId: string) => {
        setPendingChatProducts(prev => prev.filter(p => p.id_temp !== tempId));
        setPendingBatchProducts(prev => prev.filter(p => p.id_temp !== tempId));
    };

    const handleApproveProduct = async (prod: any, sourceList: 'chat' | 'batch' | 'list') => {
        setIsSaving(true);
        try {
            const catId = await ensureCategory(prod.category_name || 'Geral');

            await cloud.createStoreProduct({
                name: prod.name,
                description: prod.description,
                price: Number(prod.price) || 0,
                category_id: catId,
                is_active: true,
                addon_options: prod.addon_options || []
            });

            if (sourceList === 'chat') {
                setPendingChatProducts(prev => prev.filter(p => p.id_temp !== prod.id_temp));
            } else {
                setPendingBatchProducts(prev => prev.filter(p => p.id_temp !== prod.id_temp));
            }

            showMessage({ title: 'Sucesso', message: 'Produto criado com sucesso!' });
            if (onProductCreated) onProductCreated();
        } catch (error) {
            console.error(error);
            showMessage({ title: 'Erro', message: 'Erro ao criar produto.' });
        } finally {
            setIsSaving(false);
        }
    };

    // initializing check removed to allow instant load

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-2">
                <div className="flex gap-1 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-xl">
                    <button
                        onClick={() => setGeneratorMode('chat')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors relative ${generatorMode === 'chat' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex flex-col items-center gap-1.5">
                            <Bot className={`w-5 h-5 ${generatorMode === 'chat' ? 'scale-110' : ''} transition-transform`} />
                            Conversa
                        </div>
                        {generatorMode === 'chat' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setGeneratorMode('addons')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors relative ${generatorMode === 'addons' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex flex-col items-center gap-1.5">
                            <Layers className={`w-5 h-5 ${generatorMode === 'addons' ? 'scale-110' : ''} transition-transform`} />
                            Adicionais
                        </div>
                        {generatorMode === 'addons' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setGeneratorMode('list')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors relative ${generatorMode === 'list' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex flex-col items-center gap-1.5">
                            <Package className={`w-5 h-5 ${generatorMode === 'list' ? 'scale-110' : ''} transition-transform`} />
                            Em Massa
                        </div>
                        {generatorMode === 'list' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setGeneratorMode('analyze')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors relative ${generatorMode === 'analyze' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex flex-col items-center gap-1.5">
                            <BarChart3 className={`w-5 h-5 ${generatorMode === 'analyze' ? 'scale-110' : ''} transition-transform`} />
                            Análise
                        </div>
                        {generatorMode === 'analyze' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white dark:bg-gray-800">
                {/* PRO UPSIDE DOWN BANNER BLOCKER */}
                {!isSuperStore && (
                    <div className="absolute inset-0 z-50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-[2.5rem] p-8 border border-brand-100/50 dark:border-gray-700 shadow-xl max-w-sm w-full text-center">
                            <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-3xl flex items-center justify-center shadow-lg animate-pulse mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-brand-500" />
                            </div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">Potencialize com IA</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                                Torne-se <strong>Super Lojista</strong> para automação completa, análise inteligente e geração ilimitada de cardápios.
                            </p>
                            <Button
                                fullWidth
                                onClick={() => {
                                    const event = new CustomEvent('openSuperStoreModal');
                                    window.dispatchEvent(event);
                                }}
                                className="rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all py-3 font-bold uppercase tracking-widest text-xs"
                            >
                                <Check className="w-4 h-4 mr-2" /> Upgrade Agora
                            </Button>
                        </div>
                    </div>
                )}

                {/* MODE: CHAT */}
                {generatorMode === 'chat' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {/* Empty State */}
                            {chatHistory.length === 0 && pendingChatProducts.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                    <Sparkles className="w-12 h-12 text-brand-300 mb-4" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Assistente IA</h3>
                                    <p className="text-xs text-gray-400 mt-2 max-w-xs">
                                        Envie uma foto do cardápio ou descreva seus produtos. Eu crio tudo para você.
                                    </p>
                                </div>
                            )}

                            {/* History */}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-none'}`}>
                                        {msg.image && (
                                            <img src={msg.image} alt="Upload" className="w-full h-32 object-cover rounded-lg mb-2" />
                                        )}
                                        <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            ))}

                            {/* Pending Products */}
                            {pendingChatProducts.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                        <div className="h-px bg-gray-200 flex-1" />
                                        Sugestões Geradas
                                        <div className="h-px bg-gray-200 flex-1" />
                                    </div>
                                    {pendingChatProducts.map((p) => (
                                        <div key={p.id_temp} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3 rounded-2xl shadow-sm flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[9px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 block w-fit">
                                                        {p.category_name || 'Geral'}
                                                    </span>
                                                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.name}</h4>
                                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{p.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-black text-sm text-gray-900 dark:text-gray-100">
                                                        {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {p.addon_options && p.addon_options.length > 0 && (
                                                <div className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                                    <span className="font-bold">Adicionais sugeridos:</span>
                                                    <ul className="list-disc pl-4 mt-1">
                                                        {p.addon_options.map((opt, i) => (
                                                            <li key={i}>{opt.name} (+ R$ {opt.price.toFixed(2)})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => handleApproveProduct(p, 'chat')}
                                                    disabled={isSaving}
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Check className="w-3 h-3" /> Aprovar
                                                </button>
                                                <button
                                                    onClick={() => startEdit(p)}
                                                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDiscard(p.id_temp!)}
                                                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-500 rounded-xl transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isAILoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                                        <span className="text-xs text-gray-500">Escrevendo...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                            {/* Preview block removed - moving to button */}
                            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-end">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 rounded-xl transition-all h-[48px] w-[48px] flex items-center justify-center relative group"
                                    title="Enviar imagem"
                                >
                                    {selectedImage && imagePreview ? (
                                        <>
                                            <img
                                                src={imagePreview}
                                                alt="Selected"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedImage(null);
                                                    setImagePreview(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm cursor-pointer z-10"
                                                title="Remover imagem"
                                            >
                                                <X className="w-3 h-3" />
                                            </div>
                                        </>
                                    ) : (
                                        <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    )}
                                </button>

                                <textarea
                                    value={aiMessage}
                                    onChange={(e) => setAiMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ex: Crie um X-Bacon suculento e uma Coca-Cola..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 text-xs h-[48px] max-h-32 resize-none focus:ring-2 focus:ring-brand-500 scrollbar-hide dark:text-white"
                                    disabled={isAILoading}
                                />

                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!aiMessage.trim() && !selectedImage) || isAILoading}
                                    className="p-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-all shadow-sm hover:shadow-md h-[48px] w-[48px] flex items-center justify-center"
                                >
                                    {isAILoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODE: LIST (BATCH) */}
                {generatorMode === 'list' && (
                    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Cole sua lista de produtos</label>
                                <textarea
                                    value={batchInput}
                                    onChange={(e) => setBatchInput(e.target.value)}
                                    placeholder={`Exemplo:
X-Bacon - R$ 25,00
Coca-Cola Lata
Açaí 500ml com banana`}
                                    className="w-full h-32 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none dark:text-white"
                                />
                                <div className="flex justify-end mt-2">
                                    <Button
                                        onClick={handleBatchGenerate}
                                        disabled={isBatchLoading || !batchInput.trim()}
                                        className="text-xs"
                                    >
                                        {isBatchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Processar Lista
                                    </Button>
                                </div>
                            </div>

                            {pendingBatchProducts.length > 0 && (
                                <div className="space-y-3 pb-20">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px bg-gray-200 flex-1" />
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Resultados</span>
                                        <div className="h-px bg-gray-200 flex-1" />
                                    </div>
                                    {pendingBatchProducts.map((p) => (
                                        <div key={p.id_temp} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[9px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                                                        {p.category_name}
                                                    </span>
                                                    <h4 className="font-bold text-sm text-gray-800 dark:text-white">{p.name}</h4>
                                                </div>
                                                <span className="font-black text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap ml-2">
                                                    {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 leading-tight">{p.description}</p>

                                            {p.addon_options && p.addon_options.length > 0 && (
                                                <div className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-700/50 p-2 rounded block">
                                                    + {p.addon_options.length} adicionais sugeridos
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-1">
                                                <Button fullWidth onClick={() => handleApproveProduct(p, 'list')} disabled={isSaving}>
                                                    <Check className="w-3 h-3 mr-1" /> Aprovar
                                                </Button>
                                                <button onClick={() => startEdit(p)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDiscard(p.id_temp!)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODE: ADDONS */}
                {generatorMode === 'addons' && (
                    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">

                            {pendingAddonGroups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                    <Layers className="w-12 h-12 text-gray-300 mb-3" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Sem sugestões no momento</p>
                                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">
                                        Peça logo abaixo para a IA criar grupos de complementos para seus produtos.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-20">
                                    {pendingAddonGroups.map((group) => (
                                        <div key={group.id_temp} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in slide-in-from-bottom-2">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-sm text-gray-800 dark:text-white">{group.name}</h4>
                                                        <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 uppercase">
                                                            {group.type === 'SINGLE' ? 'Escolha Única' : 'Múltipla'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                        Min: {group.min} • Max: {group.max}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditAddonGroup(group)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-brand-600 transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDiscardAddonGroup(group.id_temp!)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-rose-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1 mb-4">
                                                {group.options?.map((opt, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg">
                                                        <span className="text-gray-600 dark:text-gray-300">{opt.name}</span>
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {opt.price === 0 ? 'Grátis' : `+ R$ ${Number(opt.price).toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button fullWidth onClick={() => handleApproveAddonGroup(group.id_temp!)} disabled={isSaving}>
                                                <Check className="w-4 h-4 mr-2" />
                                                Aprovar Grupo
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={addonMessage}
                                    onChange={(e) => setAddonMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendAddonsMessage()}
                                    placeholder="Ex: Crie adicionais para Açaí (Frutas, Caldas...)"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-4 pr-12 py-3 text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    disabled={isAILoading}
                                />
                                <button
                                    onClick={handleSendAddonsMessage}
                                    disabled={isAILoading || !addonMessage.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-300 transition-all"
                                >
                                    {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODE: ANALYZE */}
                {generatorMode === 'analyze' && (
                    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
                        {!analysisReport ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm">
                                    <BarChart3 className="w-12 h-12 text-brand-600 mb-4 mx-auto" />
                                    <h3 className="font-black text-base text-gray-800 dark:text-white mb-2">Auditoria de Cardápio</h3>
                                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                        Nossa IA vai analisar a psicologia de preços, descrições e mix de produtos para encontrar oportunidades de venda.
                                    </p>
                                    <Button fullWidth onClick={handleAnalyzeCatalog} disabled={isAnalyzing}>
                                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Iniciar Análise
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                {/* Score Header */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nota do Cardápio</span>
                                    <div className="text-5xl font-black text-brand-600 my-2">{analysisReport.score}</div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 max-w-md mx-auto">{analysisReport.summary}</p>

                                    <div className="grid grid-cols-3 gap-2 mt-6">
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl">
                                            <div className="text-xl font-bold text-gray-800 dark:text-white mb-1">{analysisReport.metrics.descriptionQuality}%</div>
                                            <div className="text-[9px] uppercase font-bold text-gray-400">Copywriting</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl">
                                            <div className="text-xl font-bold text-gray-800 dark:text-white mb-1">{analysisReport.metrics.mixCompleteness}%</div>
                                            <div className="text-[9px] uppercase font-bold text-gray-400">Mix/Combos</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl">
                                            <div className="text-xl font-bold text-gray-800 dark:text-white mb-1">{analysisReport.metrics.pricingConsistency}%</div>
                                            <div className="text-[9px] uppercase font-bold text-gray-400">Precificação</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
                                        <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                            <Check className="w-4 h-4" /> Pontos Fortes
                                        </h4>
                                        <ul className="space-y-2">
                                            {analysisReport.strengths.map((s, i) => (
                                                <li key={i} className="text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/20">
                                        <h4 className="font-bold text-sm text-rose-800 dark:text-rose-400 mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Pontos de Atenção
                                        </h4>
                                        <ul className="space-y-2">
                                            {analysisReport.weaknesses.map((w, i) => (
                                                <li key={i} className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5" />
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {analysisSuggestions.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-2 my-2">
                                            <div className="h-px bg-gray-200 flex-1" />
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Sugestões Práticas</span>
                                            <div className="h-px bg-gray-200 flex-1" />
                                        </div>

                                        {analysisSuggestions.map((sug) => (
                                            <div key={sug.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                                <div className="flex gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${sug.type === 'new_product' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {sug.type === 'new_product' ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">{sug.suggestion}</h4>
                                                                <p className="text-[10px] text-gray-500 mt-1">{sug.reason}</p>
                                                            </div>
                                                            {sug.target_product_name && (
                                                                <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 font-medium">
                                                                    {sug.target_product_name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {sug.new_data && (
                                                            <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">Sugestão de Alteração</div>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Nome:</span>
                                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{sug.new_data.name}</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        <span className="block mb-0.5">Descrição:</span>
                                                                        <span className="text-gray-600 dark:text-gray-300 italic">"{sug.new_data.description}"</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs mt-1">
                                                                        <span className="text-gray-500">Preço:</span>
                                                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                                                            {Number(sug.new_data.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3 flex justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            if (sug.new_data) {
                                                                                // Se for produto novo, adicionar a lista pendente
                                                                                const newP: any = { ...sug.new_data, id_temp: crypto.randomUUID(), is_active: true };
                                                                                setPendingChatProducts(prev => [...prev, newP]);
                                                                                setGeneratorMode('chat');
                                                                                showMessage({ title: 'Adicionado', message: 'Sugestão enviada para a aba Conversa para revisão.' });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Check className="w-3 h-3 mr-1" /> Aplicar
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
