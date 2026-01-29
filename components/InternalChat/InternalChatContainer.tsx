import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ChatConversation, ChatMessage, SortCriteria, ManualOrder, PriorityLevel } from './types';
import { useChatWebSocket } from './useChatWebSocket';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import QrCodeModal from './QrCodeModal';
import SearchBar from './SearchBar';
import ContactsManager from './ContactsManager';
import { BaseModal } from '../BaseModal';
import { ZeAssistantConfig, ZeAssistantRulesManager, ZeAssistantDashboard, ZeAssistantQuickReplies } from './ZeAssistant/index';
import { BroadcastModal } from './BroadcastModal';
import { MessageSquare, ArrowLeft, Users, MessageCircle, AlertTriangle, MoreVertical, LogOut, ChevronLeft, ChevronRight, Check, CheckCheck, Paperclip, Send, Mic, RefreshCw, UserPlus, X, Bot, Shield, Megaphone, Scale } from 'lucide-react';

import { getApiBaseUrl } from '../../utils/apiConfig';
import * as cloud from '../../services/cloud';

const API_BASE_URL = getApiBaseUrl();

type TabType = 'conversations' | 'contacts';

import { chatOfflineService } from '../../services/chatOfflineService';

interface InternalChatContainerProps {
  storeId?: string;
  attendantId?: string; // ID do atendente logado
  onBack?: () => void; // Função para voltar ao dashboard do app
}

const InternalChatContainer: React.FC<InternalChatContainerProps> = ({
  storeId = 'default-store-id',
  attendantId,
  onBack
}) => {
  const { status, setStatus, lastMessage, lastStatusUpdate } = useChatWebSocket(storeId);
  const [hasSession, setHasSession] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Estados para Exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Organização
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('recent');
  const [manualOrder, setManualOrder] = useState<Record<string, number>>({});
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Estados para Modais de Funcionalidade
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState<'block' | 'unblock' | 'report' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false); // New State
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState<string | null>(null); // New State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false); // Novo state
  const [isAssistantActive, setIsAssistantActive] = useState(true);
  const [isMediationActive, setIsMediationActive] = useState(false); // NOVO: Estado da mediação
  const [pixKey, setPixKey] = useState<string>("");
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const scrollFilters = (direction: 'left' | 'right') => {
    if (filterContainerRef.current) {
      const scrollAmount = 150;
      filterContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Fechar menu de mais opções ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Monitorar status online
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-clear Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get<ChatConversation[]>(`${API_BASE_URL}/conversations?storeId=${storeId}`);

      // Normalizar e Remover Duplicatas Rigorosamente
      const seen = new Map<string, ChatConversation>();
      response.data.forEach(conv => {
        // Normaliza o ID para apenas dígitos (ex: 5511999999999:1@s.whatsapp.net -> 5511999999999)
        // Se for grupo (@g.us), mantemos o ID original
        const isGroup = conv.conversation_id.includes('@g.us');

        // Prioridade de chave: 1. phone_number do banco, 2. sufixo removido, 3. ID original
        const phoneDigits = conv.conversation_id.split('@')[0].split(':')[0].replace(/\D/g, '');
        const dedupeKey = isGroup ? conv.conversation_id : (conv.phone_number || phoneDigits || conv.conversation_id);

        if (!dedupeKey) return;

        const existing = seen.get(dedupeKey);
        // Prioridade: conversa com mensagem mais recente ou a que já tem prioridade 'high'
        const isNewer = !existing || new Date(conv.last_message_timestamp || 0) > new Date(existing.last_message_timestamp || 0);

        if (isNewer) {
          seen.set(dedupeKey, conv);
        }
      });
      const uniqueConversations = Array.from(seen.values());

      setConversations(uniqueConversations);
      await chatOfflineService.saveConversations(storeId, uniqueConversations);
      setApiError(null);

      uniqueConversations.forEach(async (conv) => {
        if (!profilePictures[conv.conversation_id]) {
          try {
            const picRes = await axios.get(`${API_BASE_URL}/profile-picture/${conv.conversation_id}?storeId=${storeId}`);
            if (picRes.data?.profilePicUrl) {
              setProfilePictures(prev => ({ ...prev, [conv.conversation_id]: picRes.data.profilePicUrl }));
            }
          } catch (e) {
            // Ignora erro de foto
          }
        }
      });
    } catch (error: any) {
      console.error('Erro ao buscar conversas:', error);
      // Fallback offline
      const offlineData = await chatOfflineService.getConversations(storeId);
      if (offlineData.length > 0) setConversations(offlineData);

      const data = error.response?.data;
      const msg = data?.message || error.message;
      const details = data?.details ? ` (${data.details})` : '';
      const hint = data?.hint ? ` - Dica: ${data.hint}` : '';

      setApiError(`${msg}${details}${hint}`);
    }
  }, [storeId]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await axios.get<any[]>(`${API_BASE_URL}/messages/${conversationId}?storeId=${storeId}`);
      const normalizedMessages = response.data.map(msg => ({
        ...msg,
        is_from_me: msg.from_me ?? msg.is_from_me
      }));
      setMessages(normalizedMessages);
      await chatOfflineService.saveMessages(storeId, conversationId, normalizedMessages);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      // Fallback offline
      const offlineMsgs = await chatOfflineService.getMessages(storeId, conversationId);
      if (offlineMsgs.length > 0) setMessages(offlineMsgs);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [storeId]);

  const fetchManualOrder = useCallback(async () => {
    if (!attendantId) return;
    try {
      const response = await axios.get<ManualOrder[]>(`${API_BASE_URL}/conversations/order?storeId=${storeId}&attendantId=${attendantId}`);
      const orderMap: Record<string, number> = {};
      response.data.forEach(o => {
        orderMap[o.conversation_id] = o.position;
      });
      setManualOrder(orderMap);
      if (typeof chatOfflineService.saveConversationOrders === 'function') {
        await chatOfflineService.saveConversationOrders(response.data.map(o => ({ ...o, attendant_id: attendantId, store_id: storeId })));
      }
    } catch (error) {
      console.error('Erro ao buscar ordem manual:', error);
      if (typeof chatOfflineService.getConversationOrders === 'function') {
        const offlineOrder = await chatOfflineService.getConversationOrders(attendantId, storeId);
        const orderMap: Record<string, number> = {};
        offlineOrder.forEach(o => {
          orderMap[o.conversation_id] = o.position;
        });
        if (Object.keys(orderMap).length > 0) setManualOrder(orderMap);
      }
    }
  }, [storeId, attendantId]);

  const saveManualOrder = async (newOrder: Record<string, number>) => {
    if (!attendantId) return;
    const orderList = Object.entries(newOrder).map(([id, pos]) => ({
      conversation_id: id,
      position: pos
    }));

    // Otimista
    setManualOrder(newOrder);
    await chatOfflineService.saveConversationOrders(orderList.map(o => ({ ...o, attendant_id: attendantId, store_id: storeId })));

    if (isOnline) {
      try {
        await axios.post(`${API_BASE_URL}/conversations/order`, {
          storeId,
          attendantId,
          orders: orderList
        });
      } catch (error) {
        console.error('Erro ao salvar ordem manual:', error);
      }
    }
  };

  // Sincronização offline
  useEffect(() => {
    const syncOfflineMessages = async () => {
      if (status.status !== 'CONNECTED' || !isOnline) return;

      const pending = await chatOfflineService.getPendingSync();
      const myPending = pending.filter(p => p.store_id === storeId);

      if (myPending.length === 0) return;

      console.log(`[Loja ${storeId}] Sincronizando ${myPending.length} mensagens offline...`);

      for (const item of myPending) {
        try {
          await axios.post(`${API_BASE_URL}/send/text`, {
            to: item.to,
            text: item.text,
            storeId: item.store_id,
            attendantId: item.attendantId
          });
          await chatOfflineService.clearPendingItem(item.temp_id);
        } catch (error) {
          console.error('Erro ao sincronizar mensagem offline:', error);
          break; // Tenta novamente depois
        }
      }

      if (selectedConversation) {
        fetchMessages(selectedConversation.conversation_id);
      }
      fetchConversations();
    };

    const syncTimer = setTimeout(syncOfflineMessages, 2000);
    return () => clearTimeout(syncTimer);
  }, [status.status, isOnline, storeId, selectedConversation, fetchConversations, fetchMessages]);

  const handleSelectConversation = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setActiveTab('conversations');
    fetchMessages(conversation.conversation_id);

    // Buscar status do assistente para esta conversa
    try {
      const { data: assistantData } = await cloud.getClient()
        ?.from('ze_assistant_conversations')
        .select('is_assistant_active')
        .eq('store_id', storeId)
        .eq('conversation_id', conversation.conversation_id)
        .single() || { data: null };

      if (assistantData) {
        setIsAssistantActive(assistantData.is_assistant_active);
      } else {
        setIsAssistantActive(true); // Default
      }
    } catch (e) {
      console.warn('Erro ao buscar status do assistente:', e);
      setIsAssistantActive(true);
    }

    // Buscar status da mediação
    checkMediationStatus(conversation.conversation_id);
  };

  const checkMediationStatus = async (conversationId: string) => {
    // Tenta inferir orderId da conversa ou busca sessão ativa
    // Por simplificação no MVP, vamos checar se existe sessão para algum pedido associado ou se a flag está ativa no pedido
    try {
      // Assume que conversation_id pode ser mapeado para order, ou buscamos via API customizada
      // Aqui vamos simular/buscar da tabela orders se tivessemos o orderId
      // Como o chat é por conversation_id, se for entregador, buscamos pedido ativo dele
      // MVP: Chama endpoint para checar status
      // Implementação real requereria saber qual pedido está sendo discutido.
      setIsMediationActive(false); // Default off até implementação robusta de contexto
    } catch (e) {
      console.warn('Erro ao checar mediação', e);
    }
  };

  const triggerMediation = async (text: string) => {
    if (!isMediationActive || !selectedConversation) return;

    // Tenta extrair ID do pedido do contexto ou usar um placeholder
    // Em produção, o chat deve estar vinculado a um pedido
    const orderId = "ORDER_ID_PLACEHOLDER"; // TODO: Obter do contexto do chat

    try {
      await axios.post('/api/mediation/run', {
        orderId,
        userRole: 'store', // Estamos no painel da loja
        message: text,
        storeId
      });
    } catch (e) {
      console.error('Falha ao acionar mediação:', e);
    }
  };

  const handleToggleMediation = async () => {
    if (!selectedConversation) return;

    // Optimistic Update
    const newState = !isMediationActive;
    setIsMediationActive(newState);

    try {
      // Assume que temos um endpoint para persistir o estado
      const orderId = "ORDER_ID_PLACEHOLDER";
      await axios.post('/api/mediation/status', {
        orderId,
        active: newState,
        storeId
      });
      setToast({ message: `Mediação ${newState ? 'ativada' : 'desativada'}`, type: 'info' });
    } catch (e) {
      console.warn('Erro ao alternar mediação:', e);
      setToast({ message: 'Erro ao salvar status da mediação.', type: 'error' });
      setIsMediationActive(!newState); // Revert
    }
  };

  const handleStartChatFromContact = (phoneNumber: string, contactName: string) => {
    // Criar ou buscar conversa existente
    const existingConv = conversations.find(c => c.conversation_id === phoneNumber);

    if (existingConv) {
      handleSelectConversation(existingConv);
    } else {
      // Criar nova conversa temporária
      const newConv: ChatConversation = {
        conversation_id: phoneNumber,
        contact_name: contactName,
        unread_count: 0,
        last_message_content: '',
        last_message_timestamp: new Date().toISOString(),
        profile_pic_url: null,
        status: 'pending'
      };
      setSelectedConversation(newConv);
      setMessages([]);
      setActiveTab('conversations');
    }
  };

  // Lógica de Ordenação
  const sortedConversations = React.useMemo(() => {
    let sorted = [...conversations];

    // Aplicar Filtro de Busca primeiro
    // 1. Filtrar por busca (se houver)
    if (searchQuery.trim()) {
      sorted = sorted.filter(c =>
        (c.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.conversation_id.includes(searchQuery)
      );
    }

    // 2. Aplicar Filtro de Categoria (Abas)
    if (sortCriteria === 'blocked') {
      sorted = sorted.filter(c => c.is_blocked === true);
    } else {
      // Fora da aba de bloqueados, nunca mostrar contatos bloqueados
      sorted = sorted.filter(c => c.is_blocked !== true);

      if (sortCriteria === 'unread') {
        sorted = sorted.filter(c => (c.unread_count || 0) > 0);
      } else if (sortCriteria === 'inprogress') {
        sorted = sorted.filter(c => c.status === 'open');
      } else if (sortCriteria === 'closed') {
        sorted = sorted.filter(c => c.status === 'closed');
      } else if (sortCriteria === 'priority') {
        sorted = sorted.filter(c => c.priority === 'high' || c.priority === 'critical');
      }
    }

    // 3. Aplicar Ordenação
    // Se for manual, usamos o mapa de ordens. Se não, usamos o timestamp mais recente.
    // Algumas abas específicas podem ter sua própria ordenação (opcional)
    if (sortCriteria === 'manual') {
      sorted.sort((a, b) => {
        const posA = manualOrder[a.conversation_id] ?? 999999;
        const posB = manualOrder[b.conversation_id] ?? 999999;
        return posA - posB;
      });
    } else if (sortCriteria === 'unread') {
      sorted.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0));
    } else if (sortCriteria === 'priority') {
      const priorityScore = { critical: 4, high: 3, normal: 2, low: 1, undefined: 0 };
      sorted.sort((a, b) => {
        const scoreA = priorityScore[a.priority || 'undefined'] || 0;
        const scoreB = priorityScore[b.priority || 'undefined'] || 0;
        return scoreB - scoreA;
      });
    } else {
      // Ordenação padrão por tempo
      sorted.sort((a, b) => {
        const timeA = new Date(a.last_message_timestamp || 0).getTime();
        const timeB = new Date(b.last_message_timestamp || 0).getTime();
        return timeB - timeA;
      });
    }

    return sorted;
  }, [conversations, searchQuery, sortCriteria, manualOrder]);

  const handleUpdateSortPreference = async (preference: SortCriteria) => {
    if (preference !== 'recent' && preference !== 'manual') return;

    setSortCriteria(preference);
    try {
      await axios.patch(`${API_BASE_URL}/conversations/sort-preference`, { preference, storeId });
    } catch (error) {
      console.error('Erro ao salvar preferência de ordenação:', error);
    }
  };

  const handleToggleAssistant = async () => {
    if (!selectedConversation) return;

    const newState = !isAssistantActive;
    setIsAssistantActive(newState);

    try {
      // A rota é: /api/ze-assistant/conversations/:storeId/:conversationId/toggle-assistant
      // O encodeURIComponent é importante para IDs que contêm @ ou :
      await axios.patch(`${getApiBaseUrl().replace('/chat', '/ze-assistant')}/conversations/${storeId}/${encodeURIComponent(selectedConversation.conversation_id)}/toggle-assistant`, {
        active: newState
      });
      setToast({ message: `Zé Assistente ${newState ? 'ativado' : 'desativado'}`, type: 'info' });
    } catch (error) {
      console.error('Erro ao alternar assistente:', error);
      setToast({ message: 'Erro ao alternar estado do assistente.', type: 'error' });
      setIsAssistantActive(!newState); // Revert
    }
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    const newSorted = [...sortedConversations];
    const draggedIdx = newSorted.findIndex(c => c.conversation_id === draggedId);
    const targetIdx = newSorted.findIndex(c => c.conversation_id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedItem] = newSorted.splice(draggedIdx, 1);
    newSorted.splice(targetIdx, 0, draggedItem);

    // Atualizar mapa de ordens baseado na nova lista (apenas para modo manual)
    const newOrderMap: Record<string, number> = { ...manualOrder };
    newSorted.forEach((conv, index) => {
      newOrderMap[conv.conversation_id] = index;
    });

    saveManualOrder(newOrderMap);
  };

  const handleUpdatePriority = async (conversationId: string, priority: PriorityLevel) => {
    // 1. Otimista
    setConversations(prev => prev.map(c =>
      c.conversation_id === conversationId ? { ...c, priority } : c
    ));

    // 2. Persistir no backend
    try {
      await axios.patch(`${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/priority`, { priority, storeId });
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      setToast({ message: 'Erro ao salvar prioridade.', type: 'error' });
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    setShowDeleteConfirm(conversationId);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/conversations/${encodeURIComponent(showDeleteConfirm)}?storeId=${storeId}`);
      setConversations(prev => prev.filter(c => c.conversation_id !== showDeleteConfirm));
      if (selectedConversation?.conversation_id === showDeleteConfirm) {
        setSelectedConversation(null);
        setMessages([]);
      }
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Erro detalhado ao deletar conversa:', error.response?.data || error.message);
      setToast({ message: `Erro ao deletar conversa: ${error.response?.data?.error || error.message}. Verifique sua conexão.`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrar mensagens com base na busca (dentro do chat selecionado)
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg =>
      msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!messageId || !newContent) return;
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, content: newContent, is_edited: true } : m));

      await axios.patch(`${API_BASE_URL}/messages/${messageId}`, {
        content: newContent,
        storeId
      });
    } catch (e: any) {
      console.error('Erro ao editar mensagem:', e);
      setToast({ message: 'Erro ao editar mensagem: ' + (e.response?.data?.message || e.message), type: 'error' });
      fetchMessages(selectedConversation?.conversation_id || ''); // Revert on error
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setShowDeleteMessageConfirm(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!showDeleteMessageConfirm) return;
    const messageId = showDeleteMessageConfirm;

    try {
      // Optimistic update
      setMessages(prev => prev.filter(m => m.message_id !== messageId));

      await axios.delete(`${API_BASE_URL}/messages/${messageId}?storeId=${storeId}`);
      setShowDeleteMessageConfirm(null);
    } catch (e: any) {
      console.error('Erro ao apagar mensagem:', e);
      setToast({ message: 'Erro ao apagar mensagem.', type: 'error' });
      fetchMessages(selectedConversation?.conversation_id || ''); // Revert
    }
  };

  const handleFinalizeConversation = async () => {
    setShowFinalizeConfirm(true);
  };

  const confirmFinalizeConversation = async () => {
    if (!selectedConversation) return;

    try {
      // Optimistic
      setConversations(prev => prev.map(c =>
        c.conversation_id === selectedConversation.conversation_id ? { ...c, status: 'closed' } : c
      ));
      setSelectedConversation(prev => prev ? { ...prev, status: 'closed' } : null);
      setShowFinalizeConfirm(false);

      // Fix URL: Using API_BASE_URL directly. If API_BASE_URL includes /api/chat, we are good.
      // If error 404 persisted, check if double encoded or bad path.
      // We decoded encodingURIComponent because axios handles params well, but for path params we need it.
      await axios.patch(`${API_BASE_URL}/conversations/${encodeURIComponent(selectedConversation.conversation_id)}/status`, {
        status: 'closed',
        storeId
      });
    } catch (e: any) {
      console.error('Erro ao finalizar conversa:', e);
      setToast({ message: 'Erro ao finalizar conversa: ' + (e.response?.data?.message || e.message), type: 'error' });
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) return;

    const tempId = Date.now().toString();
    const newMessage: ChatMessage = {
      message_id: tempId,
      conversation_id: selectedConversation.conversation_id,
      store_id: storeId,
      attendant_id: attendantId,
      sender_id: 'me',
      content: text,
      status: (status.status === 'CONNECTED' && isOnline) ? 'sent' : 'pending',
      message_timestamp: new Date().toISOString(),
      is_from_me: true,
      media_url: null,
      media_type: null,
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);

    if (status.status === 'CONNECTED' && isOnline) {
      try {
        await axios.post(`${API_BASE_URL}/send/text`, {
          to: selectedConversation.conversation_id,
          text,
          storeId,
          attendantId
        });
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        setMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m));
      }

      // Acionar Mediação (Fire and forget)
      if (isMediationActive) {
        triggerMediation(text);
      }

    } else {
      // Modo Offline: Fila de sincronização
      console.log('Mensagem enfileirada para envio posterior (offline)');
      await chatOfflineService.queueMessage(storeId, selectedConversation.conversation_id, text, attendantId);
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    if (!selectedConversation) return;

    const tempId = 'audio-' + Date.now();
    const newMessage: ChatMessage = {
      message_id: tempId,
      conversation_id: selectedConversation.conversation_id,
      store_id: storeId,
      attendant_id: attendantId,
      sender_id: 'me',
      content: '[Áudio]',
      status: (status.status === 'CONNECTED' && isOnline) ? 'sent' : 'pending',
      message_timestamp: new Date().toISOString(),
      is_from_me: true,
      media_url: URL.createObjectURL(blob),
      media_type: 'audio',
    };
    setMessages(prev => [...prev, newMessage]);

    if (status.status === 'CONNECTED' && isOnline) {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('to', selectedConversation.conversation_id);
        formData.append('storeId', storeId);
        if (attendantId) formData.append('attendantId', attendantId);

        await axios.post(`${API_BASE_URL}/send/audio`, formData);
      } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        setMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m));
      }
    }
  };


  const handleContactAction = async (action: 'block' | 'unblock' | 'report') => {
    if (!selectedConversation) return;

    // Se for denúncia, manter simulação por enquanto ou implementar depois
    if (action === 'report') {
      setToast({ message: `Ação "Denunciar" realizada para: ${selectedConversation.conversation_id} (Simulado)`, type: 'info' });
      return;
    }

    try {
      const contactName = selectedConversation.contact_name || selectedConversation.phone_number || selectedConversation.conversation_id;
      const displayName = contactName === 'Visitante' ? `Visitante (${selectedConversation.conversation_id.substring(0, 8)})` : contactName;

      await axios.post(`${API_BASE_URL}/contacts/block`, {
        conversationId: selectedConversation.conversation_id,
        action: action,
        storeId
      });

      // Atualizar localmente de forma consistente
      const isBlocked = action === 'block';

      setConversations(prev => prev.map(c =>
        c.conversation_id === selectedConversation.conversation_id ? { ...c, is_blocked: isBlocked } : c
      ));

      setSelectedConversation(prev => prev ? { ...prev, is_blocked: isBlocked } : null);

      setToast({
        message: `Contato ${displayName} ${isBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
        type: 'success'
      });

      // NOVO: Não deselecionar automaticamente ao bloquear, para permitir desbloqueio imediato se necessário
      // mas podemos querer fechar o chat se for a preferência. O requisito diz que após a ação o estado deve ser refletido imediatamente.
    } catch (error: any) {
      console.error(`Erro ao ${action === 'block' ? 'bloquear' : 'desbloquear'} contato:`, error);
      setToast({ message: `Erro ao realizar ação. Verifique a conexão.`, type: 'error' });
    }
    setShowBlockConfirm(null);
  };

  const handleSaveContactName = async (conversationId: string, name: string) => {
    try {
      const phoneNumber = conversationId.split('@')[0];
      await axios.post(`${API_BASE_URL}/contacts`, {
        storeId,
        phoneNumber,
        name
      });
      // Atualizar localmente
      setConversations(prev => prev.map(c =>
        c.conversation_id === conversationId ? { ...c, contact_name: name } : c
      ));
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, contact_name: name } : null);
      }
    } catch (error) {
      console.error('Erro ao salvar nome do contato:', error);
      setToast({ message: 'Erro ao salvar nome do contato.', type: 'error' });
    }
  };

  const handleSendMedia = async (file: File) => {
    if (!selectedConversation) return;

    if (!isOnline || status.status !== 'CONNECTED') {
      setToast({ message: 'O envio de arquivos não é suportado no modo offline.', type: 'info' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('to', selectedConversation.conversation_id);
      formData.append('storeId', storeId);
      if (attendantId) formData.append('attendantId', attendantId);

      const fileType = file.type.split('/')[0];
      let endpoint = '';

      if (fileType === 'image') endpoint = `${API_BASE_URL}/send/image`;
      else if (fileType === 'audio') endpoint = `${API_BASE_URL}/send/audio`;
      else if (fileType === 'video') endpoint = `${API_BASE_URL}/send/video`;
      else endpoint = `${API_BASE_URL}/send/document`;

      await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Recarregar mensagens após envio
      fetchMessages(selectedConversation.conversation_id);
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      setToast({ message: 'Erro ao enviar mídia: ' + (error as any).message, type: 'error' });
    }
  };

  const handleRestart = async () => {
    try {
      setStatus({ status: 'CONNECTING' }); // Optimistic update

      // Se tem sessão, tenta reconectar (forceLogout: false). Se não, reinicia tudo (true).
      // Mas se o botão clicado foi "NOVA CONEXÃO", deveria ser forceLogout: true
      const shouldForce = status.status === 'DISCONNECTED' && !hasSession;
      // Na verdade, a lógica visual no botão decide o texto, aqui decidimos a ação.
      // Vamos simplificar: Se o usuário clicou explicito para RECONECTAR SESSÃO, passamos false.
      // Se clicou NOVA CONEXÃO, passamos true.
      // Como não temos esse state no clique, vamos inferir:
      const forceLogout = !hasSession;

      await axios.post(`${API_BASE_URL}/restart`, { storeId, forceLogout });

    } catch (error: any) {
      console.error('Erro ao reiniciar serviço:', error);
      setStatus({ status: 'DISCONNECTED' });
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      setToast({ message: `Não foi possível iniciar a conexão.\n\nDetalhe técnico: ${errorMessage}`, type: 'error' });
    }
  };

  const handleChatDisconnect = async () => {
    // Só mostramos o modal de confirmação se o status atual for CONNECTED
    // Se estiver em CONNECTING ou WAITING_QR, fechamos sem perguntar (como solicitado)
    if (status.status === 'CONNECTED') {
      setShowLogoutConfirm(true);
    } else {
      // Se não está conectado, apenas fechamos o modal do QR e limpamos estado local
      setShowQrModal(false);
      setStatus({ status: 'DISCONNECTED' });
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setShowQrModal(false);
    try {
      await axios.post(`${API_BASE_URL}/logout`, { storeId });
    } catch (error) {
      console.error('Erro ao desconectar Chat (prosseguindo com limpeza local):', error);
    } finally {
      // Force cleanup regardless of backend success/failure
      setStatus({ status: 'DISCONNECTED' });
      setSelectedConversation(null);
      setMessages([]);
      setConversations([]);
    }
  };

  // Buscar conversas e STATUS periodicamente (Fallback do WebSocket)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/status`, { params: { storeId } });
        if (res.data) {
          setStatus(prev => {
            // Evita sobrescrever se o status for igual, mas atualiza se tiver QR novo ou mudou status
            if (prev.status !== res.data.status || prev.qrCode !== res.data.qrCode) {
              return res.data;
            }
            return prev;
          });
          // Atualiza se tem sessão
          if (res.data.hasSession !== undefined) {
            setHasSession(res.data.hasSession);
          }
        }

        // Buscar configuração do assistente para pegar a preferência de ordenação
        const { data: config } = await cloud.getClient()?.from('ze_assistant_config').select('chat_sort_preference').eq('store_id', storeId).single() || { data: null };
        if (config?.chat_sort_preference) {
          setSortCriteria(config.chat_sort_preference as SortCriteria);
        }
      } catch (e) {
        // Silently fail on status poll
      }
    };

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await cloud.getClient()?.auth.getUser() || { data: { user: null } };
        if (user) {
          const { data: profile } = await cloud.getClient()?.from('user_profiles').select('pix_key').eq('id', user.id).single() || { data: null };
          if (profile?.pix_key) setPixKey(profile.pix_key);
        }
      } catch (e) {
        console.error('Erro ao buscar perfil para PIX:', e);
      }
    };

    fetchConversations();
    fetchManualOrder();
    fetchStatus();
    fetchProfile();

    // Polling de 8s para status (garante QR code estável)
    const statusInterval = setInterval(fetchStatus, 8000);

    // Polling de 10s para conversas APENAS se estiver conectado
    // Se estiver desconectado, não faz sentido ficar batendo no banco/backend
    const chatsInterval = setInterval(() => {
      if (status.status === 'CONNECTED') {
        fetchConversations();
      }
    }, 10000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(chatsInterval);
    };
  }, [fetchManualOrder, storeId, status.status]); // Adicionado status.status na dependência

  // Atualizar mensagens quando chegar uma nova via WebSocket
  useEffect(() => {
    if (lastMessage && selectedConversation) {
      const isForCurrentChat = (lastMessage as any).conversationId === selectedConversation.conversation_id;
      if (isForCurrentChat) {
        // Verificar se a mensagem já existe
        const exists = messages.some(m => m.message_id === (lastMessage as any).messageId);
        if (!exists) {
          // Normalizar is_from_me se vier do WebSocket como fromMe ou from_me
          const normalizedNewMsg = {
            ...(lastMessage as any),
            is_from_me: (lastMessage as any).fromMe ?? (lastMessage as any).from_me ?? (lastMessage as any).is_from_me
          };

          // Se for uma mensagem que acabamos de enviar (ja adicionada otimisticamente), podemos ignorar ou atualizar status
          // Por simplicidade, vamos dar fetchMessages
          fetchMessages(selectedConversation.conversation_id);
        }
      }

      // Atualizar lista de conversas para mostrar mensagem recente
      fetchConversations();
    }
  }, [lastMessage, selectedConversation]); // Removido messages para evitar loops infinitos se fetchMessages mudar o state

  const handleBackToList = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  // Atualizar status da mensagem (ticks) quando chegar via WebSocket
  useEffect(() => {
    if (lastStatusUpdate) {
      setMessages(prev => prev.map(msg =>
        msg.message_id === lastStatusUpdate.messageId
          ? { ...msg, status: lastStatusUpdate.status as any }
          : msg
      ));
    }
  }, [lastStatusUpdate]);

  // Carregar fotos de perfil
  useEffect(() => {
    const loadProfilePics = async () => {
      const newPics: Record<string, string> = {};
      const pending = conversations.filter(c => !profilePictures[c.conversation_id]);

      for (const conv of pending) {
        try {
          const res = await axios.get(`${API_BASE_URL}/profile-picture/${conv.conversation_id}?storeId=${storeId}`);
          if (res.data.profilePicUrl) {
            newPics[conv.conversation_id] = res.data.profilePicUrl;
          }
        } catch (e) {
          // Ignorar erro
        }
      }

      if (Object.keys(newPics).length > 0) {
        setProfilePictures(prev => ({ ...prev, ...newPics }));
      }
    };

    if (conversations.length > 0) {
      loadProfilePics();
    }
  }, [conversations]);


  return (
    <div className="flex w-full h-full md:h-[calc(100vh-110px)] md:m-4 md:shadow-2xl md:rounded-[32px] md:border md:border-gray-100 bg-white font-sans overflow-hidden animate-in fade-in duration-300 relative">
      {/* Container Full Screen */}
      <div className="z-10 flex w-full h-full">
        {/* Sidebar */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] bg-white flex flex-col h-full border-r border-gray-200`}>
          {/* Sidebar Header */}
          <div className="h-16 bg-[#F0F2F5] flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-200 rounded-full text-[#54656F] -ml-2"
                  title="Voltar ao Sistema"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => setActiveTab('contacts')}>
                <Users className="text-gray-600" size={24} />
              </div>
            </div>


            <div className="flex gap-4 text-[#54656F] items-center">
              <button
                onClick={() => setActiveTab('conversations')}
                title="Conversas"
                className={`p-2 rounded-full transition-colors relative ${activeTab === 'conversations' ? 'bg-brand-50' : 'hover:bg-gray-200'}`}
              >
                <div className="relative">
                  <MessageCircle size={20} />
                  {/* Badge de mensagens não lidas */}
                  {conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                      {conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0)}
                    </span>
                  )}
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowAssistantModal(true)}
              title="Zé Assistente"
              className={`p-2 rounded-full transition-colors relative hover:bg-gray-200`}
            >
              <Bot size={20} className="text-[#54656F]" />
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              title="Disparo em Massa"
              className={`p-2 rounded-full transition-colors relative hover:bg-gray-200`}
            >
              <Megaphone size={20} className="text-[#54656F]" />
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'contacts' ? 'conversations' : 'contacts')}
              title="Gerenciar Contatos"
              className={`p-2 rounded-full transition-colors ${activeTab === 'contacts' ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-200 text-[#54656F]'}`}
            >
              <Users size={20} />
            </button>


            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="Mais opções"
                className={`p-2 rounded-full transition-colors relative ${showMoreMenu ? 'bg-gray-200' : 'hover:bg-gray-200'} text-[#54656F]`}
              >
                <MoreVertical size={20} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-100 py-1 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <button onClick={() => { fetchConversations(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw size={14} /> Atualizar lista
                  </button>
                  <button onClick={() => { setActiveTab(activeTab === 'conversations' ? 'contacts' : 'conversations'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Users size={14} /> {activeTab === 'conversations' ? 'Ver Contatos' : 'Ver Conversas'}
                  </button>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button onClick={() => { handleChatDisconnect(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut size={14} /> Desconectar tudo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Connection Alert Bar removed as it's internal now */}

          {activeTab === 'contacts' && (
            <ContactsManager
              storeId={storeId}
              onStartChat={handleStartChatFromContact}
              onClose={() => setActiveTab('conversations')}
              setToast={setToast}
            />
          )}


          {/* Search Bar Container */}
          {activeTab === 'conversations' && (
            <div className="p-2 bg-white border-b border-gray-100 flex flex-col gap-2">
              <div className="bg-[#F0F2F5] rounded-lg px-4 py-1.5 flex items-center">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>

              {/* Filtros de Ordenação */}
              <div className="relative flex items-center group/filters">
                <button
                  onClick={() => scrollFilters('left')}
                  className="absolute left-0 z-10 p-1 bg-white/80 backdrop-blur-sm shadow-sm rounded-full border border-gray-100 -ml-1 hover:bg-white transition-all opacity-0 group-hover/filters:opacity-100"
                >
                  <ChevronLeft size={14} className="text-gray-600" />
                </button>

                <div
                  ref={filterContainerRef}
                  className="flex gap-1 overflow-x-auto no-scrollbar py-1 scroll-smooth"
                >
                  {[
                    { id: 'recent', label: 'Recentes' },
                    { id: 'unread', label: 'Não lidas' },
                    { id: 'manual', label: 'Manual' },
                    { id: 'inprogress', label: 'Em aberto' },
                    { id: 'priority', label: 'Prioridade' },
                    { id: 'closed', label: 'Encerradas' },
                    { id: 'blocked', label: 'Bloqueados' }
                  ].map((crit) => (
                    <button
                      key={crit.id}
                      onClick={() => {
                        if (crit.id === 'recent' || crit.id === 'manual') {
                          handleUpdateSortPreference(crit.id as SortCriteria);
                        } else {
                          setSortCriteria(crit.id as SortCriteria);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${sortCriteria === crit.id
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-[#F0F2F5] text-[#54656F] border-transparent hover:bg-[#E9EDEF]'
                        }`}
                    >
                      {crit.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollFilters('right')}
                  className="absolute right-0 z-10 p-1 bg-white/80 backdrop-blur-sm shadow-sm rounded-full border border-gray-100 -mr-1 hover:bg-white transition-all opacity-0 group-hover/filters:opacity-100"
                >
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            <ConversationList
              conversations={status.status === 'CONNECTED' ? sortedConversations : []}
              selectedId={selectedConversation?.conversation_id}
              onSelectConversation={handleSelectConversation}
              profilePictures={profilePictures}
              isManualOrder={true}
              onReorder={handleReorder}
              onUpdatePriority={handleUpdatePriority}
              onDeleteConversation={handleDeleteConversation}
              onSaveContactName={handleSaveContactName}
            />
          </div>
        </div>

        <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 bg-[#ECE5DD] flex-col relative overflow-hidden`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-[#F0F2F5] flex items-center px-4 border-b border-gray-200 flex-shrink-0 z-20 justify-between">
                <div className="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-200 rounded-full text-[#54656F]"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
                    {profilePictures[selectedConversation.conversation_id] || selectedConversation.profile_pic_url ? (
                      <img
                        src={profilePictures[selectedConversation.conversation_id] || selectedConversation.profile_pic_url || ''}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedConversation.conversation_id.includes('@g.us') ? (
                        <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-600">
                          <Users size={20} />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                          <Users size={20} />
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex flex-col justify-center cursor-pointer" onClick={() => setShowContactDetails(true)}>
                    <h3 className="font-normal text-[#111B21] truncate text-[16px]">
                      {selectedConversation.contact_name || selectedConversation.conversation_id.split('@')[0]}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 truncate">
                        clique para dados do contato
                      </span>
                      {isAssistantActive && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          <Bot size={10} /> ASSISTENTE ATIVO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center text-[#54656F]">
                  <button
                    onClick={handleToggleAssistant}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isAssistantActive
                      ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    title={isAssistantActive ? 'Pausar assistente nesta conversa' : 'Retomar assistente'}
                  >
                    {isAssistantActive ? (
                      <><RefreshCw size={14} /> PAUSAR ZÉ</>
                    ) : (
                      <><Bot size={14} /> RETOMAR ZÉ</>
                    )}
                  </button>

                  <button
                    onClick={handleToggleMediation}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMediationActive
                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    title={isMediationActive ? 'Parar Mediação Automática' : 'Iniciar Mediação Automática'}
                  >
                    {isMediationActive ? (
                      <><Scale size={14} /> MEDIAÇÃO ON</>
                    ) : (
                      <><Scale size={14} /> MEDIAÇÃO OFF</>
                    )}
                  </button>

                  <button
                    onClick={handleFinalizeConversation}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title="Finalizar Conversa"
                  >
                    <CheckCheck size={14} /> FINALIZAR
                  </button>

                  <button onClick={() => setShowContactDetails(true)} className="p-2 hover:bg-gray-200 rounded-full" title="Ver Detalhes"><Users size={20} /></button>
                  <button
                    onClick={() => setShowBlockConfirm(selectedConversation.is_blocked ? 'unblock' : 'block')}
                    className={`p-2 hover:bg-gray-200 rounded-full ${selectedConversation.is_blocked ? 'text-brand-600' : ''}`}
                    title={selectedConversation.is_blocked ? "Desbloquear Contato" : "Bloquear Contato"}
                  >
                    <AlertTriangle size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 relative bg-[#E5DDD5] overflow-hidden"
                style={{
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                  backgroundRepeat: 'repeat',
                  backgroundSize: '400px'
                }}
              >
                <div className="absolute inset-0 bg-[#E5DDD5] opacity-90 -z-10"></div>
                <MessageArea
                  messages={filteredMessages}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                />
              </div>

              {/* Input Area */}
              <div className="bg-[#F0F2F5] p-0 z-20 min-h-[62px] flex-shrink-0 border-t border-gray-200">
                {selectedConversation.is_blocked ? (
                  <div className="flex items-center justify-center h-full py-4 px-6 bg-red-50/50">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                      <Shield size={18} />
                      ESTE CONTATO ESTÁ BLOQUEADO. DESBLOQUEIE PARA ENVIAR MENSAGENS.
                    </div>
                  </div>
                ) : (
                  <MessageInput
                    onSend={handleSendMessage}
                    onSendMedia={handleSendMedia}
                    onSendAudio={handleSendAudio}
                    pixKey={pixKey}
                    storeId={storeId}
                    setToast={setToast}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] border-b-[6px] border-brand-600 text-center px-10 h-full">
              <div className="mb-8">
                <div className="flex items-center justify-center mb-5 mx-auto">
                  <MessageCircle size={80} className="text-[#d1d7db]" />
                </div>
                <h1 className="text-3xl font-light text-[#41525d] mb-4">Chat Interno</h1>
                <p className="text-[#667781] text-sm">
                  Fale com seus clientes e visitantes em tempo real de forma nativa.<br />
                  Mantenha todas as conversas organizadas em um só lugar.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[#8696a0] text-xs mt-10">
                <Shield size={12} className="text-brand-600" />
                <span>Mensagens persistidas com segurança no banco de dados</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {
        showQrModal && status.status === 'WAITING_QR' && status.qrCode && (
          <QrCodeModal
            qrCode={status.qrCode}
            status={status.status}
            onClose={() => {
              setShowQrModal(false);
              handleChatDisconnect();
            }}
          />
        )
      }
      {/* Deletion Confirmation Modal */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-in-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Apagar conversa?</h3>
              <p className="text-gray-500 text-sm mb-6 text-left">
                Esta ação irá apagar permanentemente todas as mensagens desta conversa **tanto no sistema quanto no seu aparelho vinculado**. Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Apagando...
                    </>
                  ) : 'Apagar para Todos'}
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* Modal: Detalhes do Contato */}
      {showContactDetails && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-[400px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="h-48 bg-gradient-to-br from-brand-600 to-brand-700 flex flex-col items-center justify-center relative">
              <button
                onClick={() => setShowContactDetails(false)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center mb-3">
                {profilePictures[selectedConversation.conversation_id] ? (
                  <img src={profilePictures[selectedConversation.conversation_id]} className="w-full h-full object-cover" alt="Perfil" />
                ) : (
                  <Users size={48} className="text-gray-300" />
                )}
              </div>
              <h3 className="text-white text-xl font-bold">{selectedConversation.contact_name}</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Número</label>
                  <p className="text-[#111B21] text-lg">+{selectedConversation.phone_number || selectedConversation.conversation_id.split('@')[0]}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selectedConversation.status === 'open' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <p className="text-sm font-medium text-gray-700">{selectedConversation.status === 'open' ? 'Conversa Ativa' : 'Conversa Fechada'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowContactDetails(false); setShowBlockConfirm(selectedConversation.is_blocked ? 'unblock' : 'block'); }}
                  className={`px-4 py-2 border rounded font-medium transition-colors ${selectedConversation.is_blocked ? 'border-brand-200 text-brand-600 hover:bg-brand-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                >
                  {selectedConversation.is_blocked ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button
                  onClick={() => setShowContactDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Bloqueio/Denúncia */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Confirmar ação?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você deseja realmente {showBlockConfirm === 'block' ? 'bloquear' : showBlockConfirm === 'unblock' ? 'desbloquear' : 'denunciar'} este contato?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBlockConfirm(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleContactAction(showBlockConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Desconectar?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você deseja realmente desconectarQR Code Chat desta loja? Todas as sessões serão encerradas.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Finalizar Conversa */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Finalizar Conversa?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Esta conversa será movida para a aba "Encerradas".
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFinalizeConversation}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apagar Mensagem */}
      {showDeleteMessageConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Apagar Mensagem?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Esta mensagem será apagada para todos os participantes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteMessageConfirm(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Zé Assistente */}
      {showAssistantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Zé Assistente</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Inteligência Artificial</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssistantModal(false)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <ZeAssistantDashboard storeId={storeId} />
              <ZeAssistantQuickReplies storeId={storeId} setToast={setToast} />
              <ZeAssistantConfig storeId={storeId} />
              <ZeAssistantRulesManager storeId={storeId} />
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-center">
              <button
                onClick={() => setShowAssistantModal(false)}
                className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 uppercase text-sm tracking-widest"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Broadcast / Disparo em Massa */}
      {showBroadcastModal && (
        <BroadcastModal
          storeId={storeId}
          attendantId={attendantId}
          onClose={() => setShowBroadcastModal(false)}
        />
      )}

      {/* Notificação Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-[#00A884] text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-[#111B21] text-white'
          }`}>
          {toast.type === 'success' ? <Check size={18} /> : toast.type === 'error' ? <AlertTriangle size={18} /> : <MessageSquare size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};


export default InternalChatContainer;
