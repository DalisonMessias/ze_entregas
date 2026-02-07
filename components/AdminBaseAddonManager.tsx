import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Loader2, Search, Layers, Edit2, Power, PowerOff, Bot, Sparkles, Send, X, Check, ImageIcon, BarChart3, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { AdminBaseAddonModal } from './AdminBaseAddonModal';
import { BaseAddonGroup, BaseAddonOption } from '../types';
import { Toast } from './Toast';

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

interface PendingAddonGroup extends Partial<BaseAddonGroup> {
    id_temp: string;
}

export const AdminBaseAddonManager: React.FC = () => {
    const [groups, setGroups] = useState<BaseAddonGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<BaseAddonGroup | undefined>(undefined);
    const [toast, setToast] = useState<ToastState | null>(null);
    const { confirm } = useDialog();

    // IA State
    const [generatorMode, setGeneratorMode] = useState<'chat' | 'batch' | 'analyze'>('chat');
    const [aiMessage, setAiMessage] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string, image?: string, isError?: boolean }[]>([]);
    const [apiKey, setApiKey] = useState<string>('');
    const [pendingReviewGroups, setPendingReviewGroups] = useState<PendingAddonGroup[]>([]);
    const [batchInput, setBatchInput] = useState('');
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<any>(null);
    const [analysisSuggestions, setAnalysisSuggestions] = useState<any[]>([]);

    // Cooldown state
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [lastUserMessage, setLastUserMessage] = useState<{ text: string, image: any } | null>(null);
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Image upload
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
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

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [data, geminiKey] = await Promise.all([
                cloud.getBaseAddonGroups(),
                cloud.getApiKey('google_gemini')
            ]);
            setGroups(data);
            setApiKey(geminiKey || '');
        } catch (error) {
            console.error("Erro ao carregar grupos de adicionais:", error);
            setToast({ message: 'Erro ao carregar adicionais.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingGroup(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (group: BaseAddonGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Grupo?',
            message: `Tem certeza que deseja excluir o grupo "${name}"? Esta ação não pode ser desfeita.`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteBaseAddonGroup(id);
                setToast({ message: 'Grupo excluído com sucesso!', type: 'success' });
                await loadData();
            } catch (error) {
                console.error("Erro ao excluir grupo:", error);
                setToast({ message: 'Erro ao excluir grupo.', type: 'error' });
            }
        }
    };

    const handleToggleActive = async (group: BaseAddonGroup) => {
        try {
            await cloud.updateBaseAddonGroup(group.id, {
                ...group,
                is_active: !group.is_active
            });
            setToast({
                message: group.is_active ? 'Grupo desativado!' : 'Grupo ativado!',
                type: 'success'
            });
            await loadData();
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            setToast({ message: 'Erro ao alterar status do grupo.', type: 'error' });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            setToast({ message: 'Imagem muito grande. Máximo 4MB.', type: 'warning' });
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

    const handleSendAIMessage = async () => {
        if (cooldownSeconds > 0) {
            return; // Bloqueia envio durante cooldown
        }

        if (!aiMessage.trim() && !selectedImage) {
            setToast({ message: 'Digite uma mensagem ou envie uma imagem.', type: 'warning' });
            return;
        }

        if (!apiKey) {
            setToast({ message: 'Configure a chave da API Gemini.', type: 'warning' });
            return;
        }

        setIsAILoading(true);
        const userMessage = aiMessage;
        const currentImage = selectedImage;

        // Salvar última mensagem para retry
        setLastUserMessage({ text: userMessage, image: currentImage });

        setAiMessage('');
        setSelectedImage(null);
        setImagePreview(null);

        setChatHistory(prev => [...prev, {
            role: 'user',
            content: userMessage || '(Imagem enviada)',
            image: imagePreview || undefined
        }]);

        try {
            const existingGroupNames = groups.map(g => g.name).join(', ');

            const prompt = `Você é um assistente especializado em criar grupos de adicionais para produtos de delivery.

Grupos existentes: ${existingGroupNames || 'Nenhum'}

Mensagem do usuário: "${userMessage}"

Sua resposta DEVE ser APENAS um JSON rigoroso no seguinte formato:
{
    "type": "INFORMATION" | "ADDON_CREATION",
    "content": "Sua resposta em HTML elegante (use <strong>, <em>, <p>, <ul>, <li>). Explique o que você criou ou responda a pergunta.",
    "addon_groups": [
        {
            "name": "Nome do Grupo (ex: Molhos, Bordas, Bebidas)",
            "type": "SINGLE" | "MULTIPLE",
            "min": 0,
            "max": 1,
            "options": [
                {
                    "name": "Nome da Opção",
                    "price": 5.00,
                    "is_active": true
                }
            ],
            "is_active": true
        }
    ]
}

- Se for INFORMATION: Mantenha "addon_groups" como array vazio [].
- Se for ADDON_CREATION: Gere os grupos no array "addon_groups".
- No "content", explique o que foi feito usando HTML semântico.
- Para type SINGLE: min=0, max=1
- Para type MULTIPLE: sugira min e max adequados
- Mantenha o tom profissional e amigável em Português do Brasil.
- Responda APENAS o JSON.`;

            const response = await cloud.generateAIContent(
                prompt,
                apiKey,
                undefined,
                currentImage ? [currentImage] : undefined
            );

            if (response.text) {
                try {
                    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
                    const jsonData = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);

                    if (jsonData.type === 'ADDON_CREATION' && Array.isArray(jsonData.addon_groups)) {
                        const groupsWithIds = jsonData.addon_groups.map((g: any) => ({
                            ...g,
                            id_temp: crypto.randomUUID(),
                            is_active: true
                        }));
                        setPendingReviewGroups(prev => [...prev, ...groupsWithIds]);
                    }

                    setChatHistory(prev => [...prev, {
                        role: 'model',
                        content: jsonData.content || (jsonData.type === 'ADDON_CREATION' ? "Gerei estas sugestões para você." : "Entendido.")
                    }]);
                } catch (e) {
                    console.error("Erro ao processar JSON da IA:", e);
                    setChatHistory(prev => [...prev, { role: 'model', content: response.text }]);
                }
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "<strong>Sistema em Manutenção</strong><br>O motor de inteligência artificial está sendo otimizado. Tente novamente daqui a pouco.";
                setCooldownSeconds(300); // 5 minutos
                setChatHistory(prev => [...prev, { role: 'model', content: msg, isError: true }]);
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
        setChatHistory(prev => prev.filter(msg => !msg.isError));

        // Restaura a mensagem no input
        setAiMessage(lastUserMessage.text);
        if (lastUserMessage.image) {
            setSelectedImage(lastUserMessage.image);
            setImagePreview(lastUserMessage.image.data);
        }

        // Reseta o cooldown
        setCooldownSeconds(0);

        // Pequeno delay para garantir que o estado do React atualizou antes do envio
        setTimeout(() => {
            handleSendAIMessage();
        }, 200);
    };

    const handleBatchGenerate = async () => {
        if (cooldownSeconds > 0) {
            return; // Bloqueia envio durante cooldown
        }

        if (!batchInput.trim() || !apiKey) {
            setToast({ message: 'Digite uma lista de itens.', type: 'warning' });
            return;
        }

        setIsBatchLoading(true);
        try {
            const prompt = `Analise a seguinte lista de itens e gere grupos de adicionais completos para um catálogo de delivery:
LISTA: "${batchInput}"

Responda APENAS um JSON rigoroso no formato de um ARRAY de objetos:
[
    {
        "name": "Nome do Grupo",
        "type": "SINGLE" | "MULTIPLE",
        "min": 0,
        "max": 1,
        "options": [
            {
                "name": "Nome da Opção",
                "price": 5.00,
                "is_active": true
            }
        ],
        "is_active": true
    },
    ...
]
Se o item for vago, tente deduzir o melhor grupo, tipo e opções.`;

            const response = await cloud.generateAIContent(prompt, apiKey);

            if (response.text) {
                const jsonMatch = response.text.match(/\[[\s\S]*\]/);
                const items = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);

                if (Array.isArray(items)) {
                    const groupsWithIds = items.map(it => ({
                        ...it,
                        id_temp: crypto.randomUUID(),
                        is_active: true
                    }));
                    setPendingReviewGroups(groupsWithIds);
                    setToast({ message: `${items.length} grupos gerados!`, type: 'success' });
                } else {
                    throw new Error("Resposta da IA não é uma lista válida.");
                }
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('429') || msg.includes('quota')) {
                msg = "O sistema de geração está sendo otimizado. Tente novamente daqui a pouco.";
                setCooldownSeconds(300);
            }
            setToast({ message: msg, type: 'error' });
        } finally {
            setIsBatchLoading(false);
        }
    };

    const handleAnalyzeGroups = async () => {
        if (cooldownSeconds > 0) {
            return; // Bloqueia envio durante cooldown
        }

        if (!apiKey) {
            setToast({ message: 'API Key não configurada.', type: 'warning' });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisReport(null);
        setAnalysisSuggestions([]);

        try {
            const catalogSummary = groups.slice(0, 50).map(g =>
                `- ${g.name} (${g.type === 'SINGLE' ? 'Única' : 'Múltipla'}) | ${g.options.length} opções`
            ).join('\n');

            const prompt = `Atue como Especialista em Gestão de Catálogo de Delivery.
Analise estes Grupos de Adicionais do Catálogo Base:
${catalogSummary}

Total de grupos: ${groups.length}

Retorne APENAS um JSON rigoroso:
{
    "score": 85,
    "summary": "Resumo técnico do catálogo",
    "metrics": {
        "completeness": 80,
        "diversity": 75,
        "pricing": 90
    },
    "suggestions": [
        {
            "id": "uuid",
            "type": "new_group" | "improvement",
            "suggestion": "Título curto da ação",
            "reason": "Por que fazer isso?",
            "target_group_name": "Nome do grupo (se improvement)",
            "new_data": {
                "name": "Nome do Grupo",
                "type": "SINGLE" | "MULTIPLE",
                "min": 0,
                "max": 1,
                "options": [
                    {"name": "Opção", "price": 5.00, "is_active": true}
                ]
            }
        }
    ]
}

Avaliar: completitude do mix de adicionais, estrutura de grupos, oportunidades de melhoramento.`;

            const response = await cloud.generateAIContent(prompt, apiKey);

            if (response.text) {
                const jsonMatch = response.text.match(/\{[\s\S]*\}/);
                const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : response.text);

                setAnalysisReport({
                    score: analysis.score || 75,
                    summary: analysis.summary || 'Análise concluída.',
                    metrics: analysis.metrics || { completeness: 70, diversity: 70, pricing: 70 }
                });

                if (analysis.suggestions && Array.isArray(analysis.suggestions)) {
                    setAnalysisSuggestions(analysis.suggestions.map((s: any) => ({
                        ...s,
                        id: s.id || crypto.randomUUID()
                    })));
                }
            }
        } catch (error: any) {
            let errorMsg = error.message;
            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
                setCooldownSeconds(300);
                setAnalysisReport({
                    score: 0,
                    summary: 'O motor de inteligência artificial está sendo otimizado. Aguarde o contador e tente novamente.',
                    metrics: { completeness: 0, diversity: 0, pricing: 0 },
                    isError: true
                });
            } else {
                setAnalysisReport({
                    score: 0,
                    summary: `Erro ao analisar: ${errorMsg}`,
                    metrics: { completeness: 0, diversity: 0, pricing: 0 },
                    isError: true
                });
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplySuggestion = async (suggestion: any) => {
        try {
            if (suggestion.type === 'new_group' && suggestion.new_data) {
                await cloud.createBaseAddonGroup({
                    name: suggestion.new_data.name || 'Novo Grupo',
                    type: suggestion.new_data.type || 'SINGLE',
                    min: suggestion.new_data.min || 0,
                    max: suggestion.new_data.max || 1,
                    options: suggestion.new_data.options || [],
                    is_active: true
                });
                setToast({ message: 'Grupo criado com sucesso!', type: 'success' });
            } else if (suggestion.type === 'improvement' && suggestion.target_group_name && suggestion.new_data) {
                const target = groups.find(g => g.name === suggestion.target_group_name);
                if (target) {
                    await cloud.updateBaseAddonGroup(target.id, {
                        ...suggestion.new_data
                    });
                    setToast({ message: 'Grupo otimizado!', type: 'success' });
                } else {
                    setToast({ message: 'Grupo original não encontrado.', type: 'error' });
                    return;
                }
            }
            setAnalysisSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            await loadData();
        } catch (error: any) {
            setToast({ message: 'Erro ao aplicar sugestão: ' + error.message, type: 'error' });
        }
    };

    const handleClearChat = async () => {
        const confirmed = await confirm({
            title: 'Limpar Conversa?',
            message: 'Deseja realmente apagar todo o histórico E os grupos pendentes?',
            confirmButtonText: 'Limpar Tudo'
        });

        if (confirmed) {
            setChatHistory([]);
            setPendingReviewGroups([]);
        }
    };

    const handleApproveGroup = async (tempId: string) => {
        const group = pendingReviewGroups.find(g => g.id_temp === tempId);
        if (!group) return;

        try {
            await cloud.createBaseAddonGroup({
                name: group.name || 'Grupo sem nome',
                type: group.type || 'SINGLE',
                min: group.min || 0,
                max: group.max || 1,
                options: group.options || [],
                is_active: true
            });

            setPendingReviewGroups(prev => prev.filter(g => g.id_temp !== tempId));
            setToast({ message: 'Grupo criado com sucesso!', type: 'success' });
            await loadData();
        } catch (error) {
            console.error("Erro ao aprovar grupo:", error);
            setToast({ message: 'Erro ao criar grupo.', type: 'error' });
        }
    };

    const handleRejectGroup = (tempId: string) => {
        setPendingReviewGroups(prev => prev.filter(g => g.id_temp !== tempId));
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 md:h-[calc(100vh-200px)] animate-in fade-in duration-500">
                {/* Left Column: AI Assistant */}
                <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full">
                    {/* Header com Modos */}
                    <div className="p-4 border-b dark:border-gray-700 bg-brand-50/50 dark:bg-brand-900/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm dark:text-white">Gerador de Adicionais</h3>
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
                                        LISTA
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
                            {(isAILoading || isBatchLoading || isAnalyzing) && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
                            {(chatHistory.length > 0 || pendingReviewGroups.length > 0) && (
                                <button
                                    onClick={handleClearChat}
                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                                    title="Limpar conversa e grupos pendentes"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        {/* Modo Chat */}
                        {generatorMode === 'chat' && (
                            <>
                                {chatHistory.length === 0 && pendingReviewGroups.length === 0 && (
                                    <div className="flex flex-col items-center justify-center text-center h-full py-10 opacity-50">
                                        <Sparkles className="w-12 h-12 text-brand-500 mb-4" />
                                        <p className="text-sm font-medium px-4">Peça à IA para sugerir grupos de adicionais ou envie uma foto do cardápio.<br />Ex: "Sugerir grupo de molhos"</p>
                                    </div>
                                )}

                                {chatHistory.map((chat, idx) => (
                                    <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${chat.role === 'user'
                                            ? 'bg-brand-600 text-white rounded-tr-none'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                            }`}
                                        >
                                            {chat.image && (
                                                <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-sm">
                                                    <img src={chat.image} alt="Enviada" className="w-full max-h-48 object-cover" />
                                                </div>
                                            )}
                                            {chat.role === 'model' ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: chat.content }} />
                                            ) : (
                                                <div>{chat.content}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Retry Button após erro de quota */}
                                {cooldownSeconds > 0 && (
                                    <div className="flex justify-center py-4">
                                        <Button
                                            onClick={handleRetryAfterCooldown}
                                            disabled={cooldownSeconds > 0}
                                            variant="primary"
                                            size="sm"
                                        >
                                            {cooldownSeconds > 0 ? (
                                                <>
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Aguarde {Math.floor(cooldownSeconds / 60)}:{String(cooldownSeconds % 60).padStart(2, '0')}
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="w-4 h-4 mr-2" />
                                                    Tentar Novamente
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Pending Review Groups */}
                                {pendingReviewGroups.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Grupos Pendentes ({pendingReviewGroups.length})</p>
                                        {pendingReviewGroups.map(group => (
                                            <div key={group.id_temp} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 p-3 rounded-2xl space-y-2">
                                                <div>
                                                    <h4 className="font-bold text-sm dark:text-white">{group.name}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        {group.type === 'SINGLE' ? 'Escolha Única' : 'Múltipla'} • {group.options?.length || 0} opções
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    {group.options?.slice(0, 3).map((opt, idx) => (
                                                        <div key={idx} className="text-xs flex justify-between text-gray-600 dark:text-gray-400">
                                                            <span>{opt.name}</span>
                                                            <span className="font-bold">
                                                                {opt.price > 0 ? `R$ ${opt.price.toFixed(2)}` : 'Grátis'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {(group.options?.length || 0) > 3 && (
                                                        <p className="text-xs text-gray-400">+ {(group.options?.length || 0) - 3} opções</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={() => handleApproveGroup(group.id_temp)}
                                                        className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectGroup(group.id_temp)}
                                                        className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Rejeitar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </>
                        )}

                        {/* Modo Batch */}
                        {generatorMode === 'batch' && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Lista de Itens (um por linha)</label>
                                    <textarea
                                        value={batchInput}
                                        onChange={(e) => setBatchInput(e.target.value)}
                                        className="w-full h-full min-h-[300px] bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none"
                                        placeholder="Molhos&#10;Bordas Recheadas&#10;Bebidas&#10;Tamanhos de Pizza&#10;..."
                                    />
                                </div>
                                <Button onClick={handleBatchGenerate} disabled={isBatchLoading} fullWidth>
                                    {isBatchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Gerar Grupos
                                </Button>
                            </div>
                        )}

                        {/* Modo Análise */}
                        {generatorMode === 'analyze' && (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                                {!analysisReport && !isAnalyzing ? (
                                    <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                                            <BarChart3 className="w-8 h-8 text-amber-500" />
                                        </div>
                                        <h3 className="font-bold text-lg dark:text-white mb-2">Diagnóstico de Adicionais</h3>
                                        <p className="text-xs text-gray-500 mb-6 px-8 text-center leading-relaxed">
                                            Analise a base de adicionais em busca de grupos faltantes e oportunidades de melhoria.
                                        </p>
                                        <Button size="sm" onClick={handleAnalyzeGroups} disabled={isAnalyzing || cooldownSeconds > 0}>
                                            {cooldownSeconds > 0 ? (
                                                <>
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Aguarde {Math.floor(cooldownSeconds / 60)}:{String(cooldownSeconds % 60).padStart(2, '0')}
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    {isAnalyzing ? 'Processando...' : 'Iniciar Auditoria'}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 h-full flex flex-col overflow-y-auto pr-1 no-scrollbar">
                                        {isAnalyzing && (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
                                                <span className="text-xs font-black text-amber-600 animate-pulse tracking-tighter uppercase">Analisando Grupos...</span>
                                            </div>
                                        )}

                                        {analysisReport && !isAnalyzing && (
                                            <>
                                                {/* Report Card */}
                                                <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden shrink-0 ${analysisReport.isError
                                                    ? 'bg-gradient-to-br from-red-600 to-red-800'
                                                    : 'bg-gradient-to-br from-amber-600 to-amber-800'
                                                    }`}>
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                                                    {analysisReport.isError ? 'Sistema em Manutenção' : 'Qualidade Global'}
                                                                </div>
                                                                {!analysisReport.isError && (
                                                                    <div className="text-5xl font-black mt-1 flex items-baseline">
                                                                        {analysisReport.score}
                                                                        <span className="text-xs font-normal opacity-50 ml-1">/100</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
                                                                <AlertCircle className="w-6 h-6 text-white" />
                                                            </div>
                                                        </div>

                                                        {!analysisReport.isError && (
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Mix</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.completeness}%</div>
                                                                </div>
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Diversidade</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.diversity}%</div>
                                                                </div>
                                                                <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                                                                    <div className="text-[8px] uppercase font-black opacity-60 mb-0.5">Preços</div>
                                                                    <div className="text-xs font-black">{analysisReport.metrics.pricing}%</div>
                                                                </div>
                                                            </div>
                                                        )}
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
                                                {!analysisReport.isError && (
                                                    <div className="flex-1 space-y-3 pb-4">
                                                        <div className="flex justify-between items-center px-1">
                                                            <h4 className="font-black text-[10px] uppercase tracking-wider text-gray-400">Ações Sugeridas ({analysisSuggestions.length})</h4>
                                                            <button onClick={() => { setAnalysisReport(null); setAnalysisSuggestions([]); }} className="text-[10px] font-bold text-amber-600 hover:underline hover:opacity-80">REFRESCAR</button>
                                                        </div>

                                                        {analysisSuggestions.map(sug => (
                                                            <div key={sug.id} className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-4 rounded-3xl shadow-sm hover:border-amber-200 dark:hover:border-amber-900/30 transition-all group">
                                                                <div className="flex gap-3 mb-3">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sug.type === 'improvement' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'}`}>
                                                                        {sug.type === 'improvement' ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-bold text-xs text-gray-800 dark:text-white group-hover:text-amber-600 transition-colors uppercase tracking-tight leading-none">{sug.suggestion}</h5>
                                                                        <p className="text-[10px] text-gray-500 leading-tight mt-1.5">{sug.reason}</p>
                                                                    </div>
                                                                </div>

                                                                {sug.new_data && (
                                                                    <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-3 mb-4 border border-dashed border-gray-200 dark:border-gray-700">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Preview</span>
                                                                            <span className="text-[10px] font-black text-amber-600">{sug.new_data.options?.length || 0} opções</span>
                                                                        </div>
                                                                        <div className="text-[11px] font-bold dark:text-gray-200 line-clamp-1">{sug.new_data.name}</div>
                                                                        <div className="text-[9px] text-gray-400 line-clamp-1 leading-none mt-1">{sug.new_data.type === 'SINGLE' ? 'Escolha Única' : 'Múltipla Escolha'}</div>
                                                                    </div>
                                                                )}

                                                                <Button size="sm" fullWidth variant={sug.type === 'improvement' ? 'secondary' : 'success'} onClick={() => handleApplySuggestion(sug)}>
                                                                    <Sparkles className="w-3 h-3 mr-2" />
                                                                    {sug.type === 'improvement' ? 'Otimizar Grupo' : 'Adicionar à Base'}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input Area - Apenas no modo Chat */}
                    {generatorMode === 'chat' && (
                        <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                            {imagePreview && (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="Preview" className="h-20 rounded-xl border-2 border-brand-500" />
                                    <button
                                        onClick={() => {
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                    title="Enviar imagem"
                                >
                                    <ImageIcon className="w-4 h-4 text-gray-500" />
                                </button>
                                <input
                                    type="text"
                                    value={aiMessage}
                                    onChange={(e) => setAiMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendAIMessage()}
                                    placeholder="Ex: Sugerir grupo de bebidas..."
                                    className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    disabled={isAILoading}
                                />
                                <button
                                    onClick={handleSendAIMessage}
                                    disabled={isAILoading || (!aiMessage.trim() && !selectedImage)}
                                    className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:bg-gray-300 transition-all font-bold text-xs"
                                >
                                    {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Addon Groups List */}
                <div className="flex-1 flex flex-col h-full">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar grupos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white shadow-sm"
                            />
                        </div>
                        <Button onClick={handleCreate} className="w-full md:w-auto rounded-2xl">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Grupo
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                                </div>
                            ) : filteredGroups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
                                    <Layers className="w-16 h-16 mb-4" />
                                    <h3 className="font-bold text-lg dark:text-white">Nenhum grupo encontrado</h3>
                                    <p className="text-sm">{searchTerm ? 'Tente buscar com outro termo.' : 'Use o assistente ao lado ou crie manualmente.'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredGroups.map((group) => (
                                        <div
                                            key={group.id}
                                            className={`bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border group transition-all hover:border-brand-500 ${group.is_active
                                                ? 'border-gray-100 dark:border-gray-800'
                                                : 'border-gray-200 dark:border-gray-600 opacity-60'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                                            {group.name}
                                                        </h4>
                                                        {!group.is_active && (
                                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                Inativo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {group.type === 'SINGLE' ? 'Escolha Única' : 'Múltipla Escolha'} • {group.options.length} opções
                                                    </p>
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">
                                                    {group.min} - {group.max}
                                                </div>
                                            </div>

                                            {/* Preview de Opções */}
                                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 space-y-2 mb-3">
                                                {group.options.slice(0, 4).map((opt, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{opt.name}</span>
                                                        <span className="text-gray-500 font-medium whitespace-nowrap">
                                                            {opt.price > 0
                                                                ? `+ ${opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                                : 'Grátis'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {group.options.length > 4 && (
                                                    <div className="text-xs text-center text-gray-400 font-medium pt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        + {group.options.length - 4} opções
                                                    </div>
                                                )}
                                                {group.options.length === 0 && (
                                                    <div className="text-xs text-center text-gray-400 italic">
                                                        Nenhuma opção adicionada
                                                    </div>
                                                )}
                                            </div>

                                            {/* Ações */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(group)}
                                                    className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                                    title={group.is_active ? 'Desativar' : 'Ativar'}
                                                >
                                                    {group.is_active ? <PowerOff className="w-4 h-4 text-gray-500" /> : <Power className="w-4 h-4 text-gray-500" />}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(group)}
                                                    className="flex-1 py-2 px-3 bg-white dark:bg-gray-800 border dark:border-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-200 text-gray-700 dark:text-gray-300 hover:text-brand-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(group.id, group.name)}
                                                    className="p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 rounded-xl transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            <AdminBaseAddonModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                groupToEdit={editingGroup}
                onSave={loadData}
            />

            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }
        </>
    );
};
