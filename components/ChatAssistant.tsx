
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Eraser, Loader2, Mic, AlertTriangle, ArrowLeft, ChevronLeft, Lock } from 'lucide-react';
import { ChatMessage, DailySummary, DailyTransaction, UserRole, StoreWallet } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { SparklesIcon } from './SparklesIcon';

// Helper para verificar horário comercial (Mantido do original)
const getBusinessStatus = () => {
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();
    
    const isWeekDay = day >= 1 && day <= 5;
    const isWorkingHours = hour >= 9 && hour < 18;
    
    const isOpen = isWeekDay && isWorkingHours;
    
    return {
        isOpen,
        currentTime: now.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
        nextOpen: "Segunda a Sexta, das 09h às 18h"
    };
};

// --- ENGENHARIA DE PROMPT (Mantida do original) ---
const getSystemInstruction = (
    userRole: UserRole,
    userName: string,
    userEmail: string,
    walletBalance: number,
    userCity: string,
    userLocation: { lat: number; lng: number } | null
) => {
    const { isOpen, currentTime, nextOpen } = getBusinessStatus();

    const locationContext = userLocation
        ? `[COORDENADAS GPS ATUAIS: ${userLocation.lat}, ${userLocation.lng}]`
        : `[COORDENADAS GPS ATUAIS: INDISPONÍVEL/OFFLINE]`;

    const businessRule = isOpen
        ? `[STATUS ATENDIMENTO: ABERTO]
           - O suporte humano ESTÁ DISPONÍVEL agora.
           - Se o problema for complexo ou o usuário pedir explicitamente, você PODE orientar a buscar a aba "Suporte" para falar no WhatsApp ou abrir chamado.`
        : `[STATUS ATENDIMENTO: FECHADO - ALERTA MÁXIMO]
           - Horário Atual: ${currentTime}. O suporte humano está FECHADO.
           - Reabertura: ${nextOpen}.
           - Você DEVE tentar resolver tudo sozinho.
           - Se o usuário pedir humano, diga que o suporte volta no próximo dia útil.`;

    let roleSpecificInstructions = '';
    switch (userRole) {
        case 'admin':
            roleSpecificInstructions = `
            ESPECIALIZAÇÃO - ADMINISTRADOR:
            - Aja como um analista de sistemas sênior.
            - Foco em dados agregados, saúde do sistema, e gerenciamento de usuários.
            `;
            break;
        case 'store_partner':
            roleSpecificInstructions = `
            ESPECIALIZAÇÃO - LOJISTA:
            - Aja como um parceiro de logística focado em negócios.
            - Foco em ajudar a loja a enviar pedidos, gerenciar a carteira (saldo atual: R$ ${walletBalance.toFixed(2)}) e entender os custos.
            `;
            break;
        case 'delivery_partner':
            roleSpecificInstructions = `
            ESPECIALIZAÇÃO - ENTREGADOR PARCEIRO:
            - Aja como um parceiro "do corre", um colega de equipe que entende o dia a dia na rua.
            - Foco em ajudar o entregador a ganhar mais, encontrar corridas e gerenciar sua rotina.
            `;
            break;
        default: 
             roleSpecificInstructions = `
            ESPECIALIZAÇÃO - ENTREGADOR (USO PESSOAL):
            - Aja como um assistente pessoal para controle de entregas diárias.
            - Foco em ajudar o usuário a registrar suas entregas manuais, ver histórico e usar as ferramentas do app.
            `;
            break;
    }

    return `Você é o Zé, assistente virtual inteligente do app Zé Entregas.
    
    CONTEXTO DO USUÁRIO:
    - Nome: ${userName}
    - Email: ${userEmail}
    - Função no App: ${userRole}
    - Cidade Principal: ${userCity}
    - ${locationContext}
    
    ${businessRule}
    
    ${roleSpecificInstructions}
    
    SUAS FUNÇÕES GERAIS:
    - Analisar dados fornecidos pelo usuário.
    - Explicar como usar as funcionalidades do app.
    - Dar dicas e conselhos.
    - **USAR LOCALIZAÇÃO DE FORMA INTELIGENTE:**
        - Perguntas GERAIS: use "Cidade Principal".
        - Perguntas PRECISAS: use "Coordenadas GPS Atuais".

    TOM DE VOZ GERAL:
    - Amigável, direto e profissional.
    - Use emojis ocasionalmente 🏍️📦.
    - Respostas curtas e objetivas (mobile-first).
    `;
};

interface ChatAssistantProps {
    dailySummary: DailySummary;
    transactions: DailyTransaction[];
    userId: string;
    userRole: UserRole;
    onClose: () => void;
}

const renderFormattedText = (text: string, isUser: boolean) => {
    const textColor = isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300';
    const strongColor = isUser ? 'text-white' : 'text-gray-900 dark:text-white';
    const headingColor = isUser ? 'text-white' : 'text-gray-900 dark:text-white';
    const bulletColor = isUser ? 'bg-white' : 'bg-brand-500';
    const numberColor = isUser ? 'text-white' : 'text-brand-600 dark:text-brand-400';

    // Helper to process inline bolding within a line
    const processBold = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className={`font-bold ${strongColor}`}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const ulMatch = trimmedLine.match(/^\*\s+(.*)/);
        if (ulMatch) {
            elements.push(
                <div key={index} className="flex items-start my-1 ml-2">
                    <span className={`mr-2 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${bulletColor}`}></span>
                    <span className={`flex-1 leading-relaxed ${textColor}`}>{processBold(ulMatch[1])}</span>
                </div>
            );
            return;
        }

        const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
        if (olMatch && trimmedLine.length < 100) { 
             elements.push(
                <div key={index} className="flex items-start my-2 ml-1">
                    <strong className={`mr-2 font-bold ${numberColor}`}>{olMatch[1]}.</strong>
                    <span className={`flex-1 leading-relaxed ${textColor}`}>{processBold(olMatch[2])}</span>
                </div>
            );
            return;
        }
        
        const headingMatch = trimmedLine.match(/^(#+)\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = processBold(headingMatch[2]);
            const className = level === 1 ? "text-lg font-black mt-4 mb-2" : "text-base font-bold mt-3 mb-1";
            elements.push(<div key={index} className={`${className} ${headingColor}`}>{content}</div>);
            return;
        }

        elements.push(<p key={index} className={`my-1 leading-relaxed ${textColor}`}>{processBold(trimmedLine)}</p>);
    });

    return <div className="space-y-1">{elements}</div>;
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ dailySummary, transactions, userId, userRole, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(storage.getAssistantHistory());
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    // Config State
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isConfigLoading, setIsConfigLoading] = useState(true);

    const [userProfile, setUserProfile] = useState({ name: 'Usuário', email: '', city: 'Não definida' });
    const [wallet, setWallet] = useState<StoreWallet | null>(null);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            setIsConfigLoading(true);
            try {
                // 1. Fetch User Data
                const client = cloud.getClient();
                if (client) {
                    const { data: { user } } = await (client.auth as any).getUser();
                    setUserProfile({
                        name: user?.user_metadata?.name || 'Usuário',
                        email: user?.email || '',
                        city: user?.user_metadata?.city || 'Não definida'
                    });
                }
                if (userRole === 'store_partner') {
                    const w = await cloud.getMyWallet();
                    setWallet(w);
                }

                // 2. Fetch API Key from DB (Critical)
                const settings = await cloud.getShopSettings();
                if (settings?.google_gemini_api_key) {
                    setApiKey(settings.google_gemini_api_key);
                }
            } catch (e) {
                console.error("Failed to init chat", e);
                setError("Erro ao inicializar chat. Verifique sua conexão.");
            } finally {
                setIsConfigLoading(false);
            }
        };
        init();
    }, [userRole]);

    useEffect(() => {
        storage.saveAssistantHistory(messages);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        if (!apiKey) {
            setError("O assistente está indisponível no momento (Chave de API não configurada).");
            return;
        }
        
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        // Ajusta a rolagem imediatamente após o usuário enviar
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const fullContext = `
                DADOS DO DIA ATUAL:
                - Lucro: R$ ${dailySummary.profit.toFixed(2)}
                - Entregas: ${dailySummary.deliveryCount}
                - KM Rodados: ${dailySummary.km.toFixed(1)}
                - Meta Diária: ${dailySummary.goal ? `R$ ${dailySummary.goal.toFixed(2)}` : 'Não definida'}
                - Últimas Transações: ${JSON.stringify(transactions.slice(-5))}
            `;
            
            const systemInstruction = getSystemInstruction(
                userRole, 
                userProfile.name,
                userProfile.email,
                wallet?.balance_decimal || 0,
                userProfile.city,
                dailySummary.location
            );

            const promptWithContext = `${fullContext}\n\nPERGUNTA DO USUÁRIO: ${input}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: promptWithContext }] }],
                config: { systemInstruction },
            });

            if (response.text) {
                const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }] };
                setMessages(prev => [...prev, modelMessage]);
            } else {
                throw new Error("Recebi uma resposta vazia. Tente reformular sua pergunta.");
            }

        } catch (e: any) {
            console.error(e);
            let errorMessage = "Ocorreu um erro ao conectar com o assistente.";
            if (e.message.includes('API key not valid') || e.message.includes('400')) {
                errorMessage = "Chave da IA inválida. Contate o administrador.";
            } else if (e.message.includes('rate limit')) {
                errorMessage = "Muitas perguntas! Aguarde um instante.";
            } else {
                errorMessage = e.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = () => {
        if (confirm("Limpar todo o histórico da conversa?")) {
            setMessages([]);
            storage.clearAssistantHistory();
        }
    };
    
    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("Seu navegador não suporta voz.");

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;

        setIsListening(true);

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setInput(transcript);
        };
        recognition.onend = () => {
            setIsListening(false);
            // Opcional: auto-enviar após terminar de falar
            // setTimeout(() => handleSend(), 500); 
        };
        recognition.start();
    };

    // --- Dynamic Suggestions Based on Role ---
    const getSuggestions = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return [
                    { label: "📊 Saúde do sistema", text: "Me dê um resumo geral da saúde do sistema hoje." },
                    { label: "🛡️ Alertas de segurança", text: "Existem alertas de segurança pendentes?" },
                    { label: "💡 Gestão de usuários", text: "Dicas para melhorar a gestão de usuários na plataforma." }
                ];
            case 'store_partner':
                return [
                    { label: "💰 Meu faturamento", text: "Como está meu faturamento hoje e quais as previsões?" },
                    { label: "🚀 Atrair clientes", text: "Me dê dicas de marketing para atrair mais pedidos." },
                    { label: "📦 Status dos pedidos", text: "Resuma o status dos meus pedidos atuais." }
                ];
            case 'delivery_partner':
                return [
                    { label: "🏍️ Lucro de hoje", text: "Quanto eu lucrei hoje e quantas entregas fiz?" },
                    { label: "⛽ Economizar combustível", text: "Me dê dicas práticas para economizar combustível na moto." },
                    { label: "⭐ Melhorar avaliação", text: "O que posso fazer para melhorar minha avaliação com as lojas?" }
                ];
            default: // User
                return [
                    { label: "💵 Balanço do dia", text: "Faça um balanço das minhas entregas e gastos de hoje." },
                    { label: "📉 Registrar gasto", text: "Como faço para registrar um gasto novo?" },
                    { label: "🎯 Bater a meta", text: "Dicas para me ajudar a bater minha meta diária." }
                ];
        }
    };

    const suggestions = getSuggestions(userRole);

    if (isConfigLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 flex flex-col h-[100dvh]">
            {/* Header Flutuante / Fixo */}
            <div className="flex-shrink-0 px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm z-10">
                <button 
                    onClick={onClose} 
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        <span className="font-black text-lg text-gray-900 dark:text-white tracking-tight">Assistente Zé</span>
                    </div>
                    {apiKey ? (
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            <Lock className="w-3 h-3"/> Configuração Pendente
                        </span>
                    )}
                </div>

                <button 
                    onClick={handleClearHistory} 
                    className="p-2 -mr-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="Limpar Histórico"
                >
                    <Eraser className="w-5 h-5" />
                </button>
            </div>
            
            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900 scroll-smooth">
                {!apiKey && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-red-700 dark:text-red-300">Assistente Indisponível</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            A chave de API não foi configurada pelo administrador.
                        </p>
                    </div>
                )}

                {messages.length === 0 && apiKey ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60 mt-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-brand-100 to-purple-100 dark:from-brand-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 animate-subtle-bounce-in">
                            <SparklesIcon className="w-10 h-10 text-brand-600 dark:text-brand-400"/>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Olá, Parceiro!</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Sou o Zé, sua inteligência artificial. Posso ajudar com rotas, finanças, dicas ou dúvidas sobre o app.
                        </p>
                        <div className="grid grid-cols-1 gap-2 mt-8 w-full max-w-xs">
                            {suggestions.map((s, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setInput(s.text)} 
                                    className="p-3 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brand-300 transition-colors text-left"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-gray-200 dark:bg-gray-700' 
                                        : 'bg-gradient-to-br from-brand-500 to-purple-600'
                                    }`}>
                                        {msg.role === 'user' 
                                            ? <div className="w-4 h-4 bg-gray-400 rounded-full" /> 
                                            : <SparklesIcon className="w-5 h-5 text-white" />
                                        }
                                    </div>

                                    {/* Bubble */}
                                    <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed ${
                                        msg.role === 'user' 
                                        ? 'bg-brand-600 text-white rounded-br-none' 
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                    }`}>
                                        {renderFormattedText(msg.parts[0].text, msg.role === 'user')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                
                {isLoading && (
                    <div className="flex w-full justify-start animate-pulse">
                        <div className="flex items-end gap-2 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700 flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 dark:border-red-800">
                            <AlertTriangle className="w-4 h-4"/> {error}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Área de Input */}
            <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe">
                <div className="relative flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-[24px] p-2 transition-all ring-offset-2 focus-within:ring-2 focus-within:ring-brand-500">
                    <button
                        onClick={handleVoiceInput}
                        className={`p-3 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                            isListening 
                            ? 'bg-red-100 text-red-500 animate-pulse' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                        disabled={!apiKey}
                    >
                        <Mic className="w-5 h-5" />
                    </button>

                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={apiKey ? "Pergunte ao Zé..." : "Assistente Offline"}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white py-3 max-h-32 resize-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                        disabled={!apiKey}
                    />

                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || !apiKey}
                        className={`p-3 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                            input.trim() && apiKey
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 transform hover:scale-105 active:scale-95' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
