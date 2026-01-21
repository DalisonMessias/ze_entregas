import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, Trash2, Edit2, Check, X, Package, Loader2, Plus, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreProduct, Category } from '../types';
import { useDialog } from '../utils/dialogService';
import { GoogleGenAI } from '@google/genai';

interface StoreAIGeneratorProps {
    onProductCreated: () => void;
    categories: Category[];
    products: StoreProduct[];
}

interface AnalysisSuggestion {
    id: string;
    type: 'improvement' | 'new_product';
    target_product_id?: string;
    target_product_name?: string;
    suggestion: string;
    reason: string;
    new_data?: Partial<StoreProduct> & { category_name?: string }; // Se for melhoria ou novo produto
}

export const StoreAIGenerator: React.FC<StoreAIGeneratorProps> = ({ onProductCreated, categories, products }) => {
    const [apiKey, setApiKey] = useState<string>('');

    // Generator Modes
    const [generatorMode, setGeneratorMode] = useState<'chat' | 'batch' | 'analyze'>('chat');

    // State
    const [aiMessage, setAiMessage] = useState('');
    const [batchInput, setBatchInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [pendingReviewProducts, setPendingReviewProducts] = useState<Partial<StoreProduct & { id_temp: string, category_name: string }>[]>([]);
    const [analysisSuggestions, setAnalysisSuggestions] = useState<AnalysisSuggestion[]>([]);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Editing State
    const [editingItem, setEditingItem] = useState<string | null>(null); // id_temp being edited
    const [editForm, setEditForm] = useState<Partial<StoreProduct & { category_name: string }>>({});

    const { confirm, alert: showMessage } = useDialog();
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

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

    const getCategoryIdByName = (name: string): string => {
        if (!name) return categories[0]?.id || '';
        const lowerName = name.toLowerCase().trim();
        const found = categories.find(c => c.name.toLowerCase().trim() === lowerName);
        if (found) return found.id;

        // Fallback: Tenta encontrar 'Geral' ou retorna a primeira
        return categories.find(c => c.name.toLowerCase() === 'geral' || c.name.toLowerCase() === 'todos')?.id || categories[0]?.id || '';
    };

    const handleSendMessage = async () => {
        if (!aiMessage.trim()) return;

        if (!apiKey) {
            showMessage({ title: 'Configuração Necessária', message: 'Solicite ao administrador a configuração da API Key.' });
            return;
        }

        const userMsg = aiMessage;
        setAiMessage('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsAILoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Atue como um especialista em cadastro de produtos para delivery.
            Categorias disponíveis na loja: ${catNames || 'Geral'}.
            
            Analise: "${userMsg}".

            Se for DÚVIDA/CONVERSA: Responda amigavelmente em HTML (use <b>, <br>, <i>).
            Se for CRIAÇÃO DE PRODUTO: Gere um JSON.

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

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

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
            setChatHistory(prev => [...prev, { role: 'model', content: "Erro ao processar: " + error.message }]);
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
            const ai = new GoogleGenAI({ apiKey: apiKey });
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

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            if (response.text) {
                const jsonMatch = response.text.match(/\[[\s\S]*\]/);
                const items = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

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
            showMessage({ title: 'Erro', message: 'Falha ao gerar lista: ' + error.message });
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
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const catalogSummary = products.map(p => `${p.name} (R$${p.price}) - ${p.category}`).join('\n');
            const catNames = categories.map(c => c.name).join(', ');

            const prompt = `Atue como um Consultor de Menu de Delivery Expert.
            Analise este catálogo atual:
            ${catalogSummary}

            Categorias da loja: ${catNames}.

            Sugira melhorias pontuais ou novos produtos para aumentar vendas.
            Retorne APENAS um JSON array com sugestões:
            
            [
                {
                    "type": "improvement", // ou "new_product"
                    "target_product_name": "Nome exato do produto alvo se for improvement",
                    "suggestion": "Título da Sugestão (ex: Alterar nome para X)",
                    "reason": "Por que isso vai vender mais?",
                    "new_data": { "name": "...", "price": 25.00, "category_name": "..." } // Dados sugeridos
                }
            ]
            
            Limite a 5 sugestões de alto impacto.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            if (response.text) {
                const jsonMatch = response.text.match(/\[[\s\S]*\]/);
                const items = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

                if (Array.isArray(items)) {
                    setAnalysisSuggestions(items.map((it: any) => ({ ...it, id: crypto.randomUUID() })));
                }
            }

        } catch (error: any) {
            showMessage({ title: 'Erro', message: 'Falha na análise: ' + error.message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApproveProduct = async (tempId: string) => {
        const prod = pendingReviewProducts.find(p => p.id_temp === tempId);
        if (!prod) return;

        setIsSaving(true);
        try {
            const catId = getCategoryIdByName(prod.category_name || '');

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
                const catId = getCategoryIdByName(suggestion.new_data.category_name || suggestion.new_data.category || '');
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
                const catId = getCategoryIdByName(prod.category_name || '');
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
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b dark:border-gray-700 bg-brand-50/50 dark:bg-brand-900/10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm dark:text-white">Assistente IA</h3>
                        <p className="text-[10px] text-gray-500">Super Lojista</p>
                    </div>
                    {(isAILoading || isBatchLoading || isAnalyzing) && <Loader2 className="w-4 h-4 animate-spin text-brand-600 ml-auto" />}
                </div>

                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
                    <button
                        onClick={() => setGeneratorMode('chat')}
                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all flex justify-center items-center gap-1 ${generatorMode === 'chat' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Bot className="w-3 h-3" /> Conversa
                    </button>
                    <button
                        onClick={() => setGeneratorMode('batch')}
                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all flex justify-center items-center gap-1 ${generatorMode === 'batch' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Package className="w-3 h-3" /> Lista
                    </button>
                    <button
                        onClick={() => setGeneratorMode('analyze')}
                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all flex justify-center items-center gap-1 ${generatorMode === 'analyze' ? 'bg-white shadow text-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BarChart3 className="w-3 h-3" /> Análise
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
                        {chatHistory.map((chat, idx) => (
                            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-2xl text-xs ${chat.role === 'user'
                                    ? 'bg-brand-600 text-white rounded-tr-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}
                                    dangerouslySetInnerHTML={{ __html: chat.content }}
                                />
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
                        {analysisSuggestions.length === 0 ? (
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
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-xs uppercase text-gray-400">Sugestões ({analysisSuggestions.length})</h4>
                                    <button onClick={() => setAnalysisSuggestions([])} className="text-[10px] text-gray-400 underline">Limpar</button>
                                </div>
                                {analysisSuggestions.map(sug => (
                                    <div key={sug.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                        <div className="flex gap-2 mb-2">
                                            <div className="mt-0.5"><Sparkles className="w-4 h-4 text-amber-500" /></div>
                                            <div>
                                                <h5 className="font-bold text-xs text-gray-800 dark:text-white">{sug.suggestion}</h5>
                                                <p className="text-[10px] text-gray-500 leading-tight mt-1">{sug.reason}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <Button size="sm" fullWidth variant="secondary" onClick={() => handleApplySuggestion(sug)} disabled={isSaving}>
                                                Aplicar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
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
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiMessage}
                            onChange={(e) => setAiMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Descreva o produto..."
                            className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isAILoading || !aiMessage.trim()}
                            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
