import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eraser,
  Loader2,
  Mic,
  Plus,
  Send,
  Sparkles
} from 'lucide-react';
import {
  ChatMessage,
  DailySummary,
  DailyTransaction,
  StoreAddonGroup,
  StoreProduct,
  StoreReportData,
  StoreWallet,
  UserRole
} from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { SparklesIcon } from './SparklesIcon';
import { useDialog } from '../utils/dialogService';
import { AssistantTabs } from './assistant/AssistantTabs';
import { AssistantResources } from './assistant/AssistantResources';
import { StructuredResponse } from './assistant/StructuredResponse';
import { CollaboratorFunction } from './assistant/assistantResourcesData';
import {
  AssistantStoreInsights,
  buildSystemPrompt,
  buildUserPrompt,
  getQuickSuggestions,
  promptLibrary
} from './assistant/assistantPrompts';
import { getRoleLabel } from '../utils/accessControl';

interface ChatAssistantProps {
  dailySummary: DailySummary;
  transactions: DailyTransaction[];
  userId: string;
  userRole: UserRole;
  onClose: () => void;
}

const TEXTAREA_BASE_HEIGHT = 44;
const TEXTAREA_MAX_HEIGHT = 120;
const STORE_FINAL_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'FAILED',
  'DELIVERED',
  'EXPIRED',
  'REFUNDED'
]);

const formatTime = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const buildStoreInsights = (
  products: StoreProduct[],
  addonGroups: StoreAddonGroup[],
  reports: StoreReportData | null,
  zePayDashboard: any,
  internalOrders: any[]
): AssistantStoreInsights => {
  const safeProducts = products || [];
  const safeOrders = internalOrders || [];
  const activeProducts = safeProducts.filter(product => Boolean(product.is_active));
  const inactiveProducts = safeProducts.length - activeProducts.length;

  const topProducts = activeProducts.slice(0, 5).map(product => ({
    name: product.name || 'Produto',
    price: Number(product.price || 0),
    stock: product.stock_quantity ?? null
  }));

  const internalOrdersPending = safeOrders.filter(order => {
    const status = String(order?.status || '').toUpperCase();
    return status && !STORE_FINAL_STATUSES.has(status);
  }).length;

  const reportSummary = reports
    ? {
      totalRequests: Number(reports.totalRequests || 0),
      totalValue: Number(reports.totalValue || 0),
      completedCount: Number(reports.completedCount || 0),
      cancelledCount: Number(reports.cancelledCount || 0),
      failedCount: Number(reports.failedCount || 0),
      peakHours: Array.isArray(reports.peakHours) ? reports.peakHours.slice(0, 3) : []
    }
    : null;

  const recentTransactions = Array.isArray(zePayDashboard?.recent_transactions)
    ? zePayDashboard.recent_transactions.slice(0, 5).map((tx: any) => ({
      type: String(tx?.type || tx?.direction || 'N/A'),
      amount: Number(tx?.amount || 0),
      created_at: tx?.created_at,
      description: tx?.description
    }))
    : [];

  return {
    productsTotal: safeProducts.length,
    productsActive: activeProducts.length,
    productsInactive: inactiveProducts,
    addonGroupsTotal: addonGroups?.length || 0,
    topProducts,
    internalOrdersRecent: safeOrders.length,
    internalOrdersPending,
    report: reportSummary,
    financial: {
      corporateBalance: Number(zePayDashboard?.balance || 0),
      recentTransactions
    }
  };
};

const renderFormattedText = (text: string, isUser: boolean) => {
  const textColor = isUser ? 'text-white' : 'text-gray-700 dark:text-gray-200';
  const strongColor = isUser ? 'text-white' : 'text-gray-900 dark:text-white';
  const headingColor = isUser ? 'text-white' : 'text-gray-900 dark:text-white';
  const bulletColor = isUser ? 'bg-white' : 'bg-brand-500';
  const numberColor = isUser ? 'text-white' : 'text-brand-600 dark:text-brand-400';

  const processBold = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={`font-bold ${strongColor}`}>
            {part.slice(2, -2)}
          </strong>
        );
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
        <div key={index} className="flex items-start gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${bulletColor}`} />
          <span className={`flex-1 leading-relaxed ${textColor}`}>{processBold(ulMatch[1])}</span>
        </div>
      );
      return;
    }

    const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
    if (olMatch && trimmedLine.length < 120) {
      elements.push(
        <div key={index} className="flex items-start gap-2">
          <strong className={`font-bold ${numberColor}`}>{olMatch[1]}.</strong>
          <span className={`flex-1 leading-relaxed ${textColor}`}>{processBold(olMatch[2])}</span>
        </div>
      );
      return;
    }

    const headingMatch = trimmedLine.match(/^(#+)\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = processBold(headingMatch[2]);
      const className = level === 1 ? 'text-lg font-black mt-4 mb-2' : 'text-base font-bold mt-3 mb-1';
      elements.push(
        <div key={index} className={`${className} ${headingColor}`}>
          {content}
        </div>
      );
      return;
    }

    elements.push(
      <p key={index} className={`leading-relaxed ${textColor}`}>
        {processBold(trimmedLine)}
      </p>
    );
  });

  return <div className="space-y-2">{elements}</div>;
};

const PromptCategoryCard = ({
  title,
  prompts,
  onSelect,
  isOpen,
  onToggle
}: {
  title: string;
  prompts: string[];
  onSelect: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between text-left"
      >
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
          {title}
        </h4>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelect(prompt)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-all hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  dailySummary,
  transactions,
  userId,
  userRole,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(storage.getAssistantHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('chat');
  const [messageTimes, setMessageTimes] = useState<Record<number, string>>({});

  const { alert, confirm } = useDialog();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const [userProfile, setUserProfile] = useState({ name: 'Usuário', email: '', city: 'Não definida' });
  const [wallet, setWallet] = useState<StoreWallet | null>(null);
  const [storeIdentity, setStoreIdentity] = useState<{ name: string; city: string } | null>(null);
  const [storeInsights, setStoreInsights] = useState<AssistantStoreInsights | null>(null);
  const [collaboratorFunction, setCollaboratorFunction] = useState<CollaboratorFunction | null>(null);
  const [openPromptCategory, setOpenPromptCategory] = useState<string>('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setIsConfigLoading(true);
      try {
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
          const settled = await Promise.allSettled([
            cloud.getMyWallet(),
            cloud.getMyPartnerProfile(),
            cloud.getStoreProducts(userId),
            cloud.getStoreAddonGroups(),
            cloud.getStoreReportsData(),
            cloud.getZePayDashboardData(),
            cloud.getStoreInternalOrders(userId)
          ]);

          const walletResult = settled[0].status === 'fulfilled' ? settled[0].value : null;
          const partnerProfileResult = settled[1].status === 'fulfilled' ? settled[1].value : null;
          const productsResult = settled[2].status === 'fulfilled' ? settled[2].value : [];
          const addonGroupsResult = settled[3].status === 'fulfilled' ? settled[3].value : [];
          const reportsResult = settled[4].status === 'fulfilled' ? settled[4].value : null;
          const zePayResult = settled[5].status === 'fulfilled' ? settled[5].value : null;
          const internalOrdersResult = settled[6].status === 'fulfilled' ? settled[6].value : [];

          setWallet(walletResult);
          setStoreIdentity({
            name: partnerProfileResult?.store_name || partnerProfileResult?.name || 'Não informado',
            city: partnerProfileResult?.store_address_city || partnerProfileResult?.city || 'Não informada'
          });
          setStoreInsights(
            buildStoreInsights(
              productsResult || [],
              addonGroupsResult || [],
              reportsResult || null,
              zePayResult,
              internalOrdersResult || []
            )
          );
        } else {
          setWallet(null);
          setStoreIdentity(null);
          setStoreInsights(null);
        }

        let settings: { google_gemini_api_key?: string | null } | null = null;
        try {
          settings = await cloud.getShopSettings();
        } catch {
          settings = null;
        }

        if (userRole === 'collaborator') {
          try {
            const stored = localStorage.getItem('ze_collaborator_session');
            if (stored) {
              const parsed = JSON.parse(stored);
              setCollaboratorFunction(parsed?.function === 'kitchen' ? 'kitchen' : 'waiter');
            }
          } catch {
            setCollaboratorFunction('waiter');
          }
        } else {
          setCollaboratorFunction(null);
        }

        if (settings?.google_gemini_api_key) {
          setApiKey(settings.google_gemini_api_key);
        } else {
          const envKey = (process as any)?.env?.GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
          if (envKey) setApiKey(envKey);
        }
      } catch (e) {
        console.error('Failed to init chat', e);
        setError('Erro ao inicializar chat. Verifique sua conexão.');
      } finally {
        setIsConfigLoading(false);
      }
    };
    init();
  }, [userRole, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      storage.saveAssistantHistory(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      if (!messagesContainerRef.current) return;
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: messages.length <= 1 ? 'auto' : 'smooth'
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, isLoading]);

  useEffect(() => {
    setMessageTimes(prev => {
      const next = { ...prev };
      messages.forEach((_, index) => {
        if (!next[index]) next[index] = formatTime(new Date());
      });
      return next;
    });
  }, [messages.length]);

  useEffect(() => {
    if (inputRef.current) {
      const nextHeight = Math.max(
        TEXTAREA_BASE_HEIGHT,
        Math.min(inputRef.current.scrollHeight, TEXTAREA_MAX_HEIGHT)
      );
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${nextHeight}px`;
      inputRef.current.style.overflowY =
        inputRef.current.scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input]);

  const suggestions = useMemo(
    () => getQuickSuggestions(userRole, collaboratorFunction),
    [userRole, collaboratorFunction]
  );

  const handleSend = async (overrideText?: string) => {
    const content = (overrideText ?? input).trim();
    if (!content || isLoading) return;

    if (!apiKey) {
      setError('O Zé está indisponível no momento (Chave de API não configurada).');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: content }] };
    setMessages(prev => [...prev, userMessage]);
    setMessageTimes(prev => ({ ...prev, [messages.length]: formatTime(new Date()) }));
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = `${TEXTAREA_BASE_HEIGHT}px`;
      inputRef.current.style.overflowY = 'hidden';
    }
    setIsLoading(true);
    setError(null);

    try {
      const systemInstruction = buildSystemPrompt({
        userRole,
        userName: userProfile.name,
        userEmail: userProfile.email,
        walletBalance: wallet?.balance_decimal || 0,
        userCity: userProfile.city,
        userLocation: dailySummary.location,
        storeName: storeIdentity?.name,
        storeCity: storeIdentity?.city,
        route: '/assistente',
        collaboratorFunction,
        storeInsights
      });

      const promptWithContext = buildUserPrompt({
        dailySummary,
        transactions,
        userInput: content,
        userRole,
        storeInsights
      });

      const response = await cloud.generateAIContent(promptWithContext, apiKey, systemInstruction);

      if (response.text) {
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }] };
        setMessages(prev => [...prev, modelMessage]);
        setMessageTimes(prev => ({ ...prev, [messages.length + 1]: formatTime(new Date()) }));
      } else {
        throw new Error('Recebi uma resposta vazia. Tente reformular sua pergunta.');
      }
    } catch (e: any) {
      console.error(e);
      let errorMessage = 'Ocorreu um erro ao conectar com o Zé.';
      if (e.message.includes('API key not valid') || e.message.includes('400')) {
        errorMessage = 'Chave da IA inválida. Contate o administrador.';
      } else if (e.message.includes('rate limit')) {
        errorMessage = 'Muitas perguntas! Aguarde um instante.';
      } else {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.defaultPrevented) return;

    const nativeEvent = event.nativeEvent as KeyboardEvent & {
      keyCode?: number;
      which?: number;
      isComposing?: boolean;
    };
    if (nativeEvent.isComposing) return;

    const keyCode = nativeEvent.keyCode ?? nativeEvent.which ?? 0;
    const isEnter = event.key === 'Enter' || event.code === 'Enter' || keyCode === 13;

    if (!isEnter) return;
    if (event.shiftKey) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    event.preventDefault();
    event.stopPropagation();
    void handleSend();
  };

  const handleClearHistory = async () => {
    const ok = await confirm({ title: 'Novo chat', message: 'Deseja iniciar um novo chat e limpar o histórico?' });
    if (!ok) return;
    setMessages([]);
    setMessageTimes({});
    storage.clearAssistantHistory();
  };

  const handleVoiceInput = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      await alert({ title: 'Voz', message: 'Seu navegador não suporta voz.' });
      return;
    }

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
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const status = !apiKey
    ? { label: 'offline', color: 'bg-red-500', text: 'text-red-500' }
    : isLoading
      ? { label: 'ocupado', color: 'bg-amber-400', text: 'text-amber-500' }
      : { label: 'online', color: 'bg-emerald-500', text: 'text-emerald-500' };

  if (isConfigLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden bg-slate-50 text-gray-900 dark:bg-gray-950"
      style={{ fontFamily: '"AmsiProUltra", "Space Grotesk", "Sora", ui-sans-serif, system-ui' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-gradient-to-br from-brand-200/40 via-white/10 to-transparent blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-4rem] h-72 w-72 rounded-full bg-gradient-to-tr from-blue-200/30 via-white/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="z-30 shrink-0 border-b border-white/60 bg-white/85 px-4 py-3 backdrop-blur dark:border-gray-800/60 dark:bg-gray-950/85">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-brand-600" />
                  <span className="text-lg font-black tracking-tight">Zé</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <span className={`h-2 w-2 rounded-full ${status.color}`} />
                  <span className={status.text}>{status.label}</span>
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[9px] text-white dark:bg-white dark:text-gray-900">
                    {getRoleLabel(userRole)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 md:flex"
              >
                <Plus className="h-4 w-4" />
                Novo chat
              </button>
              <button
                onClick={handleClearHistory}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 md:hidden"
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-4">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="md:hidden">
                <AssistantTabs
                  value={activeMobileTab}
                  onChange={setActiveMobileTab}
                  tabs={[
                    { id: 'chat', label: 'Chat', icon: Sparkles },
                    { id: 'resources', label: 'Recursos' },
                    { id: 'details', label: 'Detalhes' }
                  ]}
                />
              </div>

              <div
                className={`${
                  activeMobileTab !== 'chat' ? 'hidden md:flex' : 'flex'
                } flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70`}
              >
                {!apiKey && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs font-bold text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                    <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                    Zé indisponível. Chave de API não configurada.
                  </div>
                )}

                <div ref={messagesContainerRef} className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                  {messages.length === 0 && apiKey ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-gray-500">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-200/70 to-white/40 shadow-inner">
                        <SparklesIcon className="h-10 w-10 text-brand-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Olá!</h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                          Sou o Zé, sua central inteligente. Pergunte sobre operação, pedidos, marketing ou suporte.
                        </p>
                      </div>
                      <div className="grid w-full max-w-xs gap-2">
                        {suggestions.map(suggestion => (
                          <button
                            key={suggestion.label}
                            onClick={() => setInput(suggestion.text)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-xs font-bold text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                          >
                            {msg.role === 'user' ? (
                              renderFormattedText(msg.parts[0].text, true)
                            ) : (
                              <StructuredResponse
                                text={msg.parts[0].text}
                                renderText={text => renderFormattedText(text, false)}
                              />
                            )}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            {messageTimes[index] || formatTime(new Date())}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex w-full justify-start">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-900">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                        <span className="text-xs text-gray-500">Zé está gerando...</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-center">
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                        {error}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(suggestion => (
                      <button
                        key={suggestion.label}
                        onClick={() => setInput(suggestion.text)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-3xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-brand-400 dark:border-gray-700 dark:bg-gray-900">
                    <button
                      onClick={handleVoiceInput}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        isListening
                          ? 'bg-red-100 text-red-500'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                      }`}
                      disabled={!apiKey}
                    >
                      <Mic className="h-5 w-5" />
                    </button>

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={apiKey ? 'Pergunte ao Zé...' : 'Zé offline'}
                      rows={1}
                      enterKeyHint="send"
                      className="flex-1 resize-none overflow-y-hidden bg-transparent py-[10px] text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                      style={{ minHeight: `${TEXTAREA_BASE_HEIGHT}px`, height: `${TEXTAREA_BASE_HEIGHT}px` }}
                      disabled={!apiKey}
                    />

                    <button
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim() || !apiKey}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        input.trim() && apiKey
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                          : 'bg-gray-200 text-gray-400 dark:bg-gray-800'
                      }`}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${activeMobileTab !== 'resources' ? 'hidden md:block' : 'block'} lg:hidden`}>
                <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    Recursos
                  </h3>
                  <div className="mt-4">
                    <AssistantResources userRole={userRole} collaboratorFunction={collaboratorFunction} />
                  </div>
                </div>
              </div>

              <div className={`${activeMobileTab !== 'details' ? 'hidden md:block' : 'block'} lg:hidden`}>
                <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    Biblioteca de Prompts
                  </h3>
                  <div className="mt-4 space-y-3">
                    {Object.entries(promptLibrary).map(([category, prompts]) => (
                      <PromptCategoryCard
                        key={category}
                        title={category}
                        prompts={prompts}
                        isOpen={openPromptCategory === category}
                        onToggle={() => setOpenPromptCategory(prev => (prev === category ? '' : category))}
                        onSelect={text => setInput(text)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="hidden h-full min-h-0 flex-col gap-4 lg:flex">
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                      Recursos
                    </h3>
                    <span className="rounded-full bg-gray-900 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white dark:bg-white dark:text-gray-900">
                      Perfil
                    </span>
                  </div>
                  <div className="mt-4">
                    <AssistantResources userRole={userRole} collaboratorFunction={collaboratorFunction} />
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                      Biblioteca de Prompts
                    </h3>
                    <Sparkles className="h-4 w-4 text-brand-600" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {Object.entries(promptLibrary).map(([category, prompts]) => (
                      <PromptCategoryCard
                        key={category}
                        title={category}
                        prompts={prompts}
                        isOpen={openPromptCategory === category}
                        onToggle={() => setOpenPromptCategory(prev => (prev === category ? '' : category))}
                        onSelect={text => setInput(text)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

