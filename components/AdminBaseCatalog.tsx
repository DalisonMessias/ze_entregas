import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, Search, Plus, Loader2, Sparkles, Send, Trash2, Edit2, Check, X, Package, MessageSquare, BarChart3, AlertCircle, Layers, Clock, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { CatalogBaseProduct } from '../types';
import { useDialog } from '../utils/dialogService';
import { useDebounce } from '../hooks/useDebounce';
import { AdminBaseAddonManager } from './AdminBaseAddonManager';
// GoogleGenAI import removido - Gerenciado pelo cloud.generateAIContent

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
    new_data?: Partial<CatalogBaseProduct>;
}

export const AdminBaseCatalog: React.FC = () => {
    // Estado da Tab
    const [activeTab, setActiveTab] = useState<'produtos' | 'adicionais'>('produtos');

    const [products, setProducts] = useState<CatalogBaseProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [apiKey, setApiKey] = useState<string>('');
    const [existingCategories, setExistingCategories] = useState<string[]>([]);

    // Generator Modes & Multi-Product State
    const [generatorMode, setGeneratorMode] = useState<'chat' | 'batch' | 'analyze'>('chat');
    const [batchInput, setBatchInput] = useState('');
    const [pendingReviewProducts, setPendingReviewProducts] = useState<Partial<CatalogBaseProduct & { id_temp: string }>[]>([]);
    const [analysisSuggestions, setAnalysisSuggestions] = useState<AnalysisSuggestion[]>([]);
    const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cooldown state
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [lastUserMessage, setLastUserMessage] = useState<{ text: string, image: any } | null>(null);
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Manual Creation State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualProduct, setManualProduct] = useState<Partial<CatalogBaseProduct>>({
        name: '',
        description: '',
        brand: '',
        category: '',
        valor_sugerido: 0,
        is_active: true
    });
    const [isSavingManual, setIsSavingManual] = useState(false);

    const { confirm, alert: showMessage } = useDialog();
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        loadData(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Cooldown timer
    useEffect(() => {
        if (cooldownSeconds > 0) {
            cooldownTimerRef.current = setTimeout(() => {
                setCooldownSeconds(cooldownSeconds - 1);
            }, 1000);
        }
        return () => {
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }
        };
    }, [cooldownSeconds]);

    const loadData = async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const [baseProducts, geminiKey] = await Promise.all([
                cloud.getCatalogBaseProducts(signal),
                cloud.getApiKey('google_gemini')
            ]);
            if (!signal?.aborted) {
                setProducts(baseProducts);
                setApiKey(geminiKey || '');

                // Extrair categorias únicas para contexto da IA
                const cats = Array.from(new Set(baseProducts.map(p => p.category || 'Geral').filter(Boolean)));
                setExistingCategories(cats);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError' && error.code !== '20') {
                console.error("Error loading base catalog:", error);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    const handleClearChat = async () => {
        const confirmed = await confirm({
            title: 'Limpar Conversa?',
            message: 'Deseja realmente apagar todo o histórico desta conversa?',
            confirmButtonText: 'Limpar'
        });

        if (confirmed) {
            setChatHistory([]);
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

    const checkForDuplicates = (newProduct: Partial<CatalogBaseProduct>) => {
        if (!newProduct.name) return { isDuplicate: false };

        const normalizedNewName = newProduct.name.toLowerCase().trim();

        // Busca exata por nome
        const existing = products.find(p =>
            p.name.toLowerCase().trim() === normalizedNewName
        );

        if (existing) {
            return { isDuplicate: true, existingProduct: existing };
        }

        // Busca por descrição similar ou nome contido
        const partialMatch = products.find(p => {
            const pName = p.name.toLowerCase().trim();
            return normalizedNewName.includes(pName) || pName.includes(normalizedNewName);
        });

        if (partialMatch) {
            return { isDuplicate: true, existingProduct: partialMatch };
        }

        return { isDuplicate: false };
    };

    const handleSendMessage = async () => {
        if (cooldownSeconds > 0) return;
        if (!aiMessage.trim() && !selectedImage) {
            if (!apiKey) showMessage({ title: 'Configuração Necessária', message: 'Configure a chave da API do Gemini em IA Config.' });
            return;
        }

        const userMsg = aiMessage;
        const currentImage = selectedImage;
        const currentPreview = imagePreview;

        // Salvar última mensagem
        setLastUserMessage({ text: userMsg, image: currentImage });

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
            const prompt = `Atue como um especialista em catálogo de produtos para deliverys.
            Categorias existentes no catálogo base da loja: ${existingCategories.join(', ') || 'Geral, Bebidas, Lanches, Pizzas'}.

            Analise a solicitação do usuário: "${userMsg}" ${currentImage ? 'e a imagem enviada.' : '.'}

            Sua tarefa é identificar se o usuário:
            1. Está com uma DÚVIDA ou quer apenas INFORMAÇÃO.
            2. Quer CRIAR um ou mais produtos (mesmo que seja uma lista ${currentImage ? 'extraída da imagem' : ''}).

            Responda em JSON rigoroso com a seguinte estrutura:
            {
                "type": "INFORMATION" | "PRODUCT_CREATION",
                "content": "Sua resposta em HTML elegante (use <strong>, <em>, <p>, <ul>, <li>). Organize a informação de forma atraente e fácil de ler.",
                "products": [
                    {
                        "name": "Nome do Produto",
                        "description": "Descrição atraente e detalhada",
                        "brand": "Sugestão de Marca (ex: Coca-Cola, Nestlé) ou vazio se não aplicável",
                        "category": "Categoria Sugerida (tente usar categorias existentes)",
                        "valor_sugerido": 25.00,
                        "observations": "Observações técnicas ou curiosidades"
                    }
                ]
            }

            - Se for INFORMATION: Mantenha "products" como um array vazio [].
            - Se for PRODUCT_CREATION: Gere os detalhes dos produtos no array "products".
            - No "content", explique o que foi feito ou responda a dúvida usando HTML semântico.
            - Mantenha o tom profissional e amigável em Português do Brasil.
            - Responda APENAS o JSON.`;

            const response = await cloud.generateAIContent(
                prompt,
                apiKey,
                undefined,
                currentImage ? [currentImage] : undefined
            );

            if (response.text) {
                const text = response.text;
                // console.log(`[AI Admin] Gerado via: ${response.model}`);

                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    const jsonData = JSON.parse(jsonMatch ? jsonMatch[0] : text);

                    if (jsonData.type === 'PRODUCT_CREATION' && Array.isArray(jsonData.products)) {
                        const productsWithIds = jsonData.products.map((p: any) => {
                            const duplicateInfo = checkForDuplicates(p);
                            return {
                                ...p,
                                id_temp: crypto.randomUUID(),
                                is_active: true,
                                isDuplicate: duplicateInfo.isDuplicate,
                                existingProduct: duplicateInfo.existingProduct
                            };
                        });
                        setPendingReviewProducts(prev => [...prev, ...productsWithIds]);
                    }

                    setChatHistory(prev => [...prev, {
                        role: 'model',
                        content: jsonData.content || (jsonData.type === 'PRODUCT_CREATION' ? "Gerei estas sugestões para você." : "Entendido.")
                    }]);
                } catch (e) {
                    console.error("Erro ao processar JSON da IA:", e);
                    setChatHistory(prev => [...prev, { role: 'model', content: text }]);
                }
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "<strong>Sistema em Manutenção</strong><br>O motor de inteligência artificial está sendo otimizado. Tente novamente daqui a pouco.";
                setCooldownSeconds(300); // 5 minutos
                setChatHistory(prev => [...prev, { role: 'model', content: msg, isError: true } as any]);
            } else {
                setChatHistory(prev => [...prev, { role: 'model', content: msg }]);
            }
        } finally {
            setIsAILoading(false);
        }
    };

    const handleRetryAfterCooldown = () => {
        if (!lastUserMessage) return;

        // Remove mensagem de erro do histórico
        setChatHistory(prev => prev.filter((msg: any) => !msg.isError));

        // Restaura a mensagem no input
        setAiMessage(lastUserMessage.text);
        if (lastUserMessage.image) {
            setSelectedImage(lastUserMessage.image);
            setImagePreview(`data:${lastUserMessage.image.mimeType};base64,${lastUserMessage.image.data}`);
        }

        // Reseta o cooldown
        setCooldownSeconds(0);

        // Pequeno delay para garantir atualização do estado
        setTimeout(() => {
            handleSendMessage();
        }, 200);
    };

    const handleBatchGenerate = async () => {
        if (!batchInput.trim() || !apiKey) {
            if (!apiKey) showMessage({ title: 'Configuração Necessária', message: 'Configure a chave da API do Gemini.' });
            return;
        }

        setIsBatchLoading(true);
        try {
            const prompt = `Analise a seguinte lista de produtos/itens e gere sugestões completas para um catálogo de delivery:
            LISTA: "${batchInput}"

            Responda APENAS um JSON rigoroso no formato de um ARRAY de objetos:
            [
                {
                    "name": "Nome do Produto",
                    "description": "Descrição atraente e detalhada",
                    "brand": "Marca Sugerida (Ex: Coca-Cola, Heinz) ou vazio",
                    "category": "Categoria Sugerida",
                    "valor_sugerido": 25.0,
                    "observations": "Breve nota técnica"
                },
                ...
            ]
            Se o item for vago, tente deduzir o melhor nome, marca e preço para um delivery padrão.`;

            const response = await cloud.generateAIContent(prompt, apiKey);

            if (response.text) {
                const jsonMatch = response.text.match(/\[[\s\S]*\]/);
                const items = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);

                if (Array.isArray(items)) {
                    const productsWithIds = items.map(it => {
                        const duplicateInfo = checkForDuplicates(it);
                        return {
                            ...it,
                            id_temp: crypto.randomUUID(),
                            is_active: true,
                            isDuplicate: duplicateInfo.isDuplicate,
                            existingProduct: duplicateInfo.existingProduct
                        };
                    });
                    setPendingReviewProducts(productsWithIds);
                } else {
                    throw new Error("Resposta da IA não é uma lista válida.");
                }
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "O sistema de geração automática está em manutenção para melhorias de performance. Tente novamente daqui a pouco.";
                setCooldownSeconds(300);
            }
            showMessage({ title: 'IA Ocupada', message: msg });
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
            // Amostra rica para análise
            const catalogSummary = products.slice(0, 100).map(p => `- ${p.name} (R$${p.valor_sugerido}) | Cat: ${p.category} | Desc: ${p.description || 'Vazia'}`).join('\n');
            const catNames = existingCategories.join(', ');

            const prompt = `Atue como um Especialista em Gestão de Catálogo de Delivery e Analista de BI. 
            Analise este Catálogo Base (Plataforma):
            ${catalogSummary}

            Categorias existentes: ${catNames}.

            Sua tarefa é gerar um DIAGNÓSTICO ESTRATÉGICO para o Administrador.
            
            Retorne APENAS um JSON rigoroso:
            {
                "report": {
                    "score": 0-100,
                    "metrics": {
                        "descriptionQuality": 0-100,
                        "mixCompleteness": 0-100,
                        "pricingConsistency": 0-100
                    },
                    "summary": "Resumo executivo",
                    "strengths": ["Ponto 1", "..."],
                    "weaknesses": ["Ponto 1", "..."]
                },
                "suggestions": [
                    {
                        "type": "improvement" | "new_product",
                        "target_product_name": "Nome exato se improvement",
                        "suggestion": "Título",
                        "reason": "Motivo",
                        "new_data": { "name": "...", "description": "...", "category": "...", "valor_sugerido": 0 }
                    }
                ]
            }

            Critérios Admin:
            1. O catálogo base deve ter descrições impecáveis para os lojistas importarem.
            2. Deve haver variedade de marcas e categorias.
            3. Identifique produtos populares que faltam no mercado.
            
            Limite a 5 sugestões. Idioma: Português do Brasil.`;

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
                msg = "O módulo de auditoria estratégica está passando por uma manutenção programada. Tente novamente daqui a pouco.";
                setCooldownSeconds(300);
            }
            showMessage({ title: 'IA Temporariamente Indisponível', message: msg });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplySuggestion = async (suggestion: AnalysisSuggestion) => {
        setIsSavingManual(true);
        try {
            if (suggestion.type === 'new_product' && suggestion.new_data) {
                await cloud.adminCreateBaseProduct({
                    ...suggestion.new_data, // TS Partial match
                    name: suggestion.new_data.name || 'Novo Produto',
                    description: suggestion.new_data.description || '',
                    brand: suggestion.new_data.brand || '',
                    category: suggestion.new_data.category || 'Geral',
                    valor_sugerido: suggestion.new_data.valor_sugerido || 0,
                    observations: suggestion.new_data.observations || '',
                    is_active: true
                });
                showMessage({ title: 'Criado', message: 'Produto sugerido foi criado!' });
            } else if (suggestion.type === 'improvement' && suggestion.target_product_name && suggestion.new_data) {
                const target = products.find(p => p.name === suggestion.target_product_name);
                if (target) {
                    await cloud.adminUpdateBaseProduct(target.id, {
                        ...suggestion.new_data
                    });
                    showMessage({ title: 'Atualizado', message: 'Produto atualizado com sucesso!' });
                } else {
                    alert('Produto original não encontrado para atualização.');
                    return;
                }
            }
            setAnalysisSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            loadData();
        } catch (error: any) {
            showMessage({ title: 'Erro', message: 'Falha ao aplicar: ' + error.message });
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleApproveRecommendation = async (tempId: string) => {
        const prod = pendingReviewProducts.find(p => p.id_temp === tempId);
        if (!prod) return;

        try {
            const productData = {
                name: String(prod.name || 'Produto sem nome'),
                description: String(prod.description || ''),
                brand: String(prod.brand || ''),
                category: String(prod.category || 'Sem categoria'),
                valor_sugerido: Number(prod.valor_sugerido) || 0,
                observations: String(prod.observations || ''),
                is_active: true
            };

            if (prod.isDuplicate && prod.existingProduct?.id) {
                await cloud.adminUpdateBaseProduct(prod.existingProduct.id, productData);
                showMessage({ title: 'Atualizado', message: 'Produto existente atualizado com sucesso.' });
            } else {
                await cloud.adminCreateBaseProduct(productData);
                showMessage({ title: 'Sucesso', message: 'Produto adicionado ao catálogo base.' });
            }

            setPendingReviewProducts(prev => prev.filter(p => p.id_temp !== tempId));
            await loadData();
        } catch (error: any) {
            alert("Erro ao salvar produto sugerido: " + (error.message || "Erro desconhecido"));
        }
    };

    const handleConfirmBatch = async () => {
        if (pendingReviewProducts.length === 0) return;

        const ok = await confirm({
            title: 'Salvar Lista',
            message: `Deseja adicionar estes ${pendingReviewProducts.length} produtos ao catálogo?`
        });

        if (!ok) return;

        setIsSavingManual(true);
        try {
            for (const prod of pendingReviewProducts) {
                const cleanProd = {
                    name: prod.name,
                    description: prod.description,
                    category: prod.category,
                    valor_sugerido: Number(prod.valor_sugerido) || 0,
                    observations: prod.observations,
                    is_active: prod.is_active
                };
                await cloud.adminCreateBaseProduct(cleanProd);
            }
            setPendingReviewProducts([]);
            setBatchInput('');
            loadData();
            showMessage({ title: 'Sucesso', message: 'Produtos importados com sucesso.' });
        } catch (error) {
            alert("Erro ao salvar alguns produtos do lote.");
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleDiscardPending = (tempId: string) => {
        setPendingReviewProducts(prev => prev.filter(p => p.id_temp !== tempId));
    };

    const handleDuplicatePending = (product: any) => {
        setPendingReviewProducts(prev => [
            ...prev,
            { ...product, id_temp: crypto.randomUUID(), name: `${product.name} (Cópia)` }
        ]);
    };

    const handleDelete = async (id: string, name: string) => {
        const ok = await confirm({ title: 'Excluir Produto', message: `Deseja remover "${name}" do Catálogo Base?` });
        if (ok) {
            try {
                await cloud.adminDeleteBaseProduct(id);
                loadData();
            } catch (error) {
                alert("Erro ao deletar.");
            }
        }
    };

    const handleSaveManual = async () => {
        setIsSavingManual(true);
        try {
            const productData = {
                ...manualProduct,
                name: manualProduct.name || 'Produto sem nome',
                category: manualProduct.category || 'Sem categoria',
                valor_sugerido: Number(manualProduct.valor_sugerido) || 0
            };

            if (manualProduct.id) {
                await cloud.adminUpdateBaseProduct(manualProduct.id!, productData);
                showMessage({ title: 'Sucesso', message: 'Produto atualizado com sucesso.' });
            } else if ((manualProduct as any).id_temp) {
                // Atualiza na lista de revisão
                setPendingReviewProducts(prev => prev.map(p =>
                    p.id_temp === (manualProduct as any).id_temp ? { ...p, ...productData } : p
                ));
                showMessage({ title: 'Sucesso', message: 'Sugestão atualizada.' });
            } else {
                await cloud.adminCreateBaseProduct(productData);
                showMessage({ title: 'Sucesso', message: 'Produto cadastrado manualmente.' });
            }

            setIsManualModalOpen(false);
            setManualProduct({ name: '', description: '', category: '', valor_sugerido: 0, is_active: true });
            loadData();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Erro ao salvar produto.");
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleEdit = (product: CatalogBaseProduct | any) => {
        setManualProduct(product);
        setIsManualModalOpen(true);
    };

    const handleToggleStatus = async (product: CatalogBaseProduct) => {
        try {
            const newStatus = !product.is_active;
            await cloud.adminUpdateBaseProduct(product.id, {
                is_active: newStatus
            });
            loadData();
            // showMessage({ title: 'Status Atualizado', message: `${product.name} está agora ${newStatus ? 'ativo' : 'inativo'}.` });
        } catch (error) {
            alert("Erro ao alterar status.");
        }
    };

    const debouncedSearch = useDebounce(searchTerm, 300);

    const filteredProducts = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        if (!q) return products;

        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q)
        );
    }, [debouncedSearch, products]);

    return (
        <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('produtos')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'produtos'
                        ? 'bg-white dark:bg-gray-900 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Package className="w-4 h-4 inline mr-2" />
                    Produtos
                </button>
                <button
                    onClick={() => setActiveTab('adicionais')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'adicionais'
                        ? 'bg-white dark:bg-gray-900 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Layers className="w-4 h-4 inline mr-2" />
                    Adicionais
                </button>
            </div>

            {/* Conteúdo Condicional */}
            {activeTab === 'produtos' ? (
                <div className="flex flex-col lg:flex-row gap-6 md:h-[calc(100vh-200px)]">
                    {/* Left Column: AI Assistant */}
                    <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full">
                        <div className="p-4 border-b dark:border-gray-700 bg-brand-50/50 dark:bg-brand-900/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-brand-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm dark:text-white">Gerador de Produtos</h3>
                                    <div className="flex gap-2 mt-0.5">
                                        <button
                                            onClick={() => setGeneratorMode('chat')}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${generatorMode === 'chat' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            CONVERSA
                                        </button>
                                        <button
                                            onClick={() => setGeneratorMode('batch')}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${generatorMode === 'batch' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            LISTA (PWA)
                                        </button>
                                        <button
                                            onClick={() => setGeneratorMode('analyze')}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${generatorMode === 'analyze' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            ANÁLISE
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                {(isAILoading || isBatchLoading) && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
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

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {generatorMode === 'chat' && (
                                <>
                                    {chatHistory.length === 0 && (
                                        <div className="flex flex-col items-center justify-center text-center h-full py-10 opacity-50">
                                            <Sparkles className="w-12 h-12 text-brand-500 mb-4" />
                                            <p className="text-sm font-medium">Peça à IA para sugerir produtos.<br />Ex: "Sugerir hambúrguer de picanha"</p>
                                        </div>
                                    )}

                                    {chatHistory.map((chat: any, idx) => (
                                        <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${chat.role === 'user'
                                                ? 'bg-brand-600 text-white rounded-tr-none'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none prose prose-sm dark:prose-invert max-w-none'
                                                }`}
                                            >
                                                {chat.image && (
                                                    <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-sm">
                                                        <img src={chat.image} alt="Enviada" className="w-full max-h-48 object-cover" />
                                                    </div>
                                                )}
                                                {chat.role === 'model' ? (
                                                    <div>
                                                        <div dangerouslySetInnerHTML={{ __html: chat.content }} />
                                                        {(chat as any).isError && (
                                                            <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-900/30 flex justify-center">
                                                                <button
                                                                    onClick={handleRetryAfterCooldown}
                                                                    disabled={cooldownSeconds > 0}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-red-200"
                                                                >
                                                                    {cooldownSeconds > 0 ? (
                                                                        <>
                                                                            <Clock className="w-3 h-3 animate-pulse" />
                                                                            Aguarde {Math.floor(cooldownSeconds / 60)}:{(cooldownSeconds % 60).toString().padStart(2, '0')}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <RefreshCw className="w-3 h-3" />
                                                                            Tentar Novamente
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>{chat.content}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {pendingReviewProducts.length > 0 && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Sugestões Pendentes ({pendingReviewProducts.length})</p>
                                            {pendingReviewProducts.map((prod) => (
                                                <div key={prod.id_temp} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-4 rounded-2xl shadow-sm">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                                            <Package className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-sm dark:text-white">{prod.name}</h4>
                                                                {prod.isDuplicate && (
                                                                    <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shadow-sm border border-amber-200">
                                                                        DUPLICADO
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 line-clamp-1">
                                                                {prod.brand ? `${prod.brand} • ` : ''}{prod.category} • R$ {prod.valor_sugerido?.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            fullWidth
                                                            variant={prod.isDuplicate ? "secondary" : "success"}
                                                            onClick={() => handleApproveRecommendation(prod.id_temp!)}
                                                        >
                                                            <Check className="w-3 h-3 mr-1" /> {prod.isDuplicate ? 'Atualizar' : 'Aprovar'}
                                                        </Button>
                                                        <button onClick={() => setPreviewItem(prod)} title="Ver Detalhes" className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                                                            <AlertCircle className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleEdit(prod)} className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors" title="Editar">
                                                            <Edit2 className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button onClick={() => handleDiscardPending(prod.id_temp!)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="Descartar">
                                                            <X className="w-4 h-4 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {generatorMode === 'batch' && (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Lista de Itens (um por linha)</label>
                                        <textarea
                                            value={batchInput}
                                            onChange={(e) => setBatchInput(e.target.value)}
                                            placeholder="Ex:&#10;Coca Cola 2L&#10;Pizza Calabresa&#10;Hambúrguer Gourmet"
                                            className="w-full h-40 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none"
                                        />
                                        <Button
                                            fullWidth
                                            size="sm"
                                            className="mt-2"
                                            onClick={handleBatchGenerate}
                                            disabled={isBatchLoading || !batchInput.trim()}
                                        >
                                            {isBatchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                            Gerar Produtos da Lista
                                        </Button>
                                    </div>

                                    {pendingReviewProducts.length > 0 && (
                                        <div className="border-t dark:border-gray-700 pt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-xs uppercase text-gray-400">Revisão ({pendingReviewProducts.length})</h4>
                                                <button
                                                    onClick={() => setPendingReviewProducts([])}
                                                    className="text-[10px] font-bold text-red-500 hover:underline"
                                                >
                                                    LIMPAR TUDO
                                                </button>
                                            </div>
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                {pendingReviewProducts.map((prod) => (
                                                    <div key={prod.id_temp} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 group">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="font-bold text-xs dark:text-white line-clamp-1">{prod.name}</h5>
                                                                    {prod.isDuplicate && (
                                                                        <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1 py-0.2 rounded border border-amber-200">EXISTE</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-gray-500 font-bold">
                                                                    {prod.brand ? `${prod.brand} • ` : ''}R$ {prod.valor_sugerido?.toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEdit(prod)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400" title="Editar"><Edit2 className="w-3 h-3" /></button>
                                                                <button onClick={() => handleDuplicatePending(prod)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400" title="Duplicar"><Plus className="w-3 h-3" /></button>
                                                                <button onClick={() => handleDiscardPending(prod.id_temp!)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400" title="Remover"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                fullWidth
                                                variant="success"
                                                size="sm"
                                                className="mt-4"
                                                onClick={handleConfirmBatch}
                                                disabled={isSavingManual}
                                            >
                                                <Check className="w-4 h-4 mr-2" /> Confirmar e Salvar {pendingReviewProducts.length} Produtos
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {generatorMode === 'analyze' && (
                                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                                    {!analysisReport && !isAnalyzing ? (
                                        <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                                                <BarChart3 className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <h3 className="font-bold text-lg dark:text-white mb-2">Diagnóstico de Catálogo</h3>
                                            <p className="text-xs text-gray-500 mb-6 px-8 text-center leading-relaxed">
                                                Analise a base de dados em busca de produtos faltantes e oportunidades de melhoria técnica para os lojistas.
                                            </p>
                                            <Button size="sm" onClick={handleAnalyzeCatalog} disabled={isAnalyzing}>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                {isAnalyzing ? 'Processando Dados...' : 'Iniciar Auditoria'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 h-full flex flex-col custom-scrollbar overflow-y-auto pr-1">
                                            {isAnalyzing && (
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
                                                    <span className="text-xs font-black text-amber-600 animate-pulse tracking-tighter uppercase">Analisando Base de Produtos...</span>
                                                </div>
                                            )}

                                            {analysisReport && !isAnalyzing && (
                                                <>
                                                    {/* Report Card */}
                                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden shrink-0">
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Qualidade Global</div>
                                                                    <div className="text-5xl font-black mt-1 flex items-baseline">
                                                                        {analysisReport.score}
                                                                        <span className="text-xs font-normal opacity-50 ml-1">/100</span>
                                                                    </div>
                                                                </div>
                                                                <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
                                                                    <AlertCircle className="w-6 h-6 text-white" />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Conteúdo</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.descriptionQuality}%</div>
                                                                </div>
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Mix</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.mixCompleteness}%</div>
                                                                </div>
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Preços</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.pricingConsistency}%</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                                                    </div>

                                                    {/* Summary */}
                                                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shrink-0">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                                                            "{analysisReport.summary}"
                                                        </p>
                                                    </div>

                                                    {/* Suggestions List */}
                                                    <div className="flex-1 space-y-3 pb-4">
                                                        <div className="flex justify-between items-center px-1">
                                                            <h4 className="font-black text-[10px] uppercase tracking-wider text-gray-400">Ações Sugeridas ({analysisSuggestions.length})</h4>
                                                            <button onClick={() => { setAnalysisReport(null); setAnalysisSuggestions([]); }} className="text-[10px] font-bold text-indigo-600 hover:underline hover:opacity-80">REFRESCAR</button>
                                                        </div>

                                                        {analysisSuggestions.map(sug => (
                                                            <div key={sug.id} className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-4 rounded-3xl shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all group">
                                                                <div className="flex gap-3 mb-3">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sug.type === 'improvement' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600'}`}>
                                                                        {sug.type === 'improvement' ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-bold text-xs text-gray-800 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none">{sug.suggestion}</h5>
                                                                        <p className="text-[10px] text-gray-500 leading-tight mt-1.5">{sug.reason}</p>
                                                                    </div>
                                                                </div>

                                                                {sug.new_data && (
                                                                    <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-3 mb-4 border border-dashed border-gray-200 dark:border-gray-700">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Preview de Dados</span>
                                                                            {sug.new_data.valor_sugerido && <span className="text-[10px] font-black text-indigo-600">R$ {sug.new_data.valor_sugerido.toFixed(2)}</span>}
                                                                        </div>
                                                                        <div className="text-[11px] font-bold dark:text-gray-200 line-clamp-1">{sug.new_data.name}</div>
                                                                        <div className="text-[9px] text-gray-400 line-clamp-2 leading-none mt-1">{sug.new_data.description || 'Sem descrição'}</div>
                                                                    </div>
                                                                )}

                                                                <Button size="sm" fullWidth variant={sug.type === 'improvement' ? 'secondary' : 'primary'} onClick={() => handleApplySuggestion(sug)} disabled={isSavingManual}>
                                                                    <Sparkles className="w-3 h-3 mr-2" />
                                                                    {sug.type === 'improvement' ? 'Otimizar Produto' : 'Adicionar à Base'}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>


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
                                        <textarea
                                            value={aiMessage}
                                            onChange={(e) => setAiMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Diga ou envie foto do cardápio..."
                                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-3 px-10 text-xs h-[48px] max-h-32 resize-none focus:ring-2 focus:ring-brand-500 scrollbar-hide dark:text-white"
                                            disabled={isAILoading || cooldownSeconds > 0}
                                        ></textarea>
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
                    </div>

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
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Preço Sugerido</label>
                                                <p className="text-sm font-bold text-brand-600">R$ {previewItem.valor_sugerido?.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Categoria</label>
                                                <p className="text-sm font-bold dark:text-gray-200">{previewItem.category}</p>
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

                    {/* Right Column: Base Catalog List */}
                    <div className="flex-1 flex flex-col h-full">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar no catálogo base..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white shadow-sm"
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button onClick={() => setIsManualModalOpen(true)} className="flex-1 md:flex-none">
                                    <Plus className="w-4 h-4 mr-2" /> Manual
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
                                        <Package className="w-16 h-16 mb-4" />
                                        <h3 className="font-bold text-lg dark:text-white">Catálogo Vazio</h3>
                                        <p className="text-sm">Use o assistente ao lado para popular seu catálogo base.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {filteredProducts.map(p => (
                                            <div key={p.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 group transition-all hover:border-brand-500">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full">
                                                        {p.category || 'Geral'}
                                                    </span>
                                                    <div className="flex gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-500 shadow-sm">
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 shadow-sm">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                                                    {p.brand ? `${p.brand} - ` : ''}{p.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1 h-8">{p.description}</p>
                                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                                                    <span className="text-lg font-black dark:text-white">
                                                        R$ {p.valor_sugerido?.toFixed(2)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleStatus(p)}
                                                        className={`w-10 h-5 rounded-full transition-colors relative ${p.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                        title={p.is_active ? 'Clique para Desativar' : 'Clique para Ativar'}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${p.is_active ? 'right-1' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Manual Creation Modal */}
                    {isManualModalOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-black text-xl dark:text-white flex items-center gap-2">
                                        {manualProduct.id ? <Edit2 className="w-5 h-5 text-brand-600" /> : <Plus className="w-5 h-5 text-brand-600" />}
                                        {manualProduct.id ? 'Editar Produto' : 'Novo Produto Manual'}
                                    </h3>
                                    <button onClick={() => {
                                        setIsManualModalOpen(false);
                                        setManualProduct({ name: '', description: '', category: '', valor_sugerido: 0, is_active: true });
                                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nome do Produto</label>
                                        <input
                                            type="text"
                                            value={manualProduct.name}
                                            onChange={e => setManualProduct({ ...manualProduct, name: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white"
                                            placeholder="Ex: Coca-Cola 350ml"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Marca (Opcional)</label>
                                        <input
                                            type="text"
                                            value={manualProduct.brand || ''}
                                            onChange={e => setManualProduct({ ...manualProduct, brand: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white"
                                            placeholder="Ex: Coca-Cola, Heinz, Nestlé"
                                        />
                                    </div>



                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Categoria</label>
                                            <input
                                                type="text"
                                                value={manualProduct.category}
                                                onChange={e => setManualProduct({ ...manualProduct, category: e.target.value })}
                                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white"
                                                placeholder="Ex: Bebidas"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Preço Sugerido</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={manualProduct.valor_sugerido}
                                                    onChange={e => setManualProduct({ ...manualProduct, valor_sugerido: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-9 p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white font-bold"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Descrição</label>
                                        <textarea
                                            value={manualProduct.description || ''}
                                            onChange={e => setManualProduct({ ...manualProduct, description: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 dark:text-white min-h-[100px] resize-none"
                                            placeholder="Detalhes do produto..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button variant="outline" fullWidth onClick={() => {
                                        setIsManualModalOpen(false);
                                        setManualProduct({ name: '', description: '', category: '', valor_sugerido: 0, is_active: true });
                                    }}>Cancelar</Button>
                                    <Button fullWidth onClick={handleSaveManual} disabled={isSavingManual}>
                                        {isSavingManual ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                        {manualProduct.id ? 'Salvar Alterações' : 'Salvar Produto'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <AdminBaseAddonManager />
            )}
        </div>
    );
};
