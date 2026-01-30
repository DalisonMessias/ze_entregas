import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ChatConversation, ChatMessage } from './types';
import { useChatWebSocket } from './useChatWebSocket';
import { BaseModal } from '../BaseModal';
import { 
  ArrowLeft, MessageCircle, RefreshCw, Bot, Scale, Search, Send, CheckCheck, 
  MoreVertical, LogOut, Phone, Video
} from 'lucide-react';

import { getApiBaseUrl } from '../../utils/apiConfig';
import * as cloud from '../../services/cloud';
import { chatOfflineService } from '../../services/chatOfflineService';

const API_BASE_URL = getApiBaseUrl();

interface StoreDriversChatProps {
  storeId?: string;
  attendantId?: string;
  onBack?: () => void;
}

const StoreDriversChat: React.FC<StoreDriversChatProps> = ({
  storeId = 'default-store-id',
  attendantId,
  onBack
}) => {
  const { status, setStatus, lastMessage, lastStatusUpdate } = useChatWebSocket(storeId);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [isMediationActive, setIsMediationActive] = useState(true);
  const [canShowMediation, setCanShowMediation] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Verificar se deve exibir botão de mediação
  useEffect(() => {
    if (selectedConversation?.phone_number) {
      cloud.checkDeliveryModeForChat(selectedConversation.phone_number).then(mode => {
        setCanShowMediation(mode !== 'OWN');
      }).catch(() => setCanShowMediation(true));
    } else {
      setCanShowMediation(true);
    }
  }, [selectedConversation]);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get<ChatConversation[]>(`${API_BASE_URL}/conversations?storeId=${storeId}`);

      const processed = await Promise.all(response.data.map(async (conv) => {
        if (!conv.phone_number) return null;
        try {
          if (conv.conversation_id.includes('@g.us')) return null;
          const mode = await cloud.checkDeliveryModeForChat(conv.phone_number);
          return mode ? conv : null; 
        } catch {
          return null;
        }
      }));

      const driverConvs = processed.filter((c): c is ChatConversation => c !== null);

      // Remover duplicatas e ordenar
      const uniqueMap = new Map();
      driverConvs.forEach(c => uniqueMap.set(c.conversation_id, c));
      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) =>
        new Date(b.last_message_timestamp || 0).getTime() - new Date(a.last_message_timestamp || 0).getTime()
      );

      setConversations(uniqueList);

      // Enriquecer fotos
      uniqueList.forEach(async (c) => {
        try {
          const picRes = await axios.get(`${API_BASE_URL}/profile-picture/${c.conversation_id}?storeId=${storeId}`);
          if (picRes.data?.profilePicUrl) {
            setProfilePictures(prev => ({ ...prev, [c.conversation_id]: picRes.data.profilePicUrl }));
          }
        } catch { }
      });

    } catch (error) {
      console.error('Erro ao buscar entregadores:', error);
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
      const offlineMsgs = await chatOfflineService.getMessages(storeId, conversationId);
      if (offlineMsgs.length > 0) setMessages(offlineMsgs);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [storeId]);

  // Sincronização offline
  useEffect(() => {
    const syncOfflineMessages = async () => {
      if (status.status !== 'CONNECTED' || !isOnline) return;

      const pending = await chatOfflineService.getPendingSync();
      const myPending = pending.filter(p => p.store_id === storeId);

      if (myPending.length === 0) return;

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

  // Atualizar mensagens quando chegar uma nova via WebSocket
  useEffect(() => {
    if (lastMessage && selectedConversation) {
      const isForCurrentChat = (lastMessage as any).conversationId === selectedConversation.conversation_id;
      if (isForCurrentChat) {
        const exists = messages.some(m => m.message_id === (lastMessage as any).messageId);
        if (!exists) {
          fetchMessages(selectedConversation.conversation_id);
        }
      }
      fetchConversations();
    }
  }, [lastMessage, selectedConversation, fetchMessages, messages, fetchConversations]);

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

  // Polling
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (status.status === 'CONNECTED') fetchConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations, status.status]);

  const handleSelectConversation = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversation_id);
    
    // Reset mediation status default
    setIsMediationActive(true);
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

      // Acionar Mediação (simulado/fire-and-forget)
      if (isMediationActive) {
         // Logic to trigger mediation AI would go here
      }
    } else {
      await chatOfflineService.queueMessage(storeId, selectedConversation.conversation_id, text, attendantId);
    }
  };

  const handleFinalizeConversation = async () => {
    setShowFinalizeConfirm(true);
  };

  const confirmFinalizeConversation = async () => {
    if (!selectedConversation) return;
    try {
      await axios.patch(`${API_BASE_URL}/conversations/${encodeURIComponent(selectedConversation.conversation_id)}/status`, {
        status: 'closed',
        storeId
      });
      setConversations(prev => prev.filter(c => c.conversation_id !== selectedConversation.conversation_id));
      setSelectedConversation(null);
      setMessages([]);
      setShowFinalizeConfirm(false);
      setToast({ message: 'Atendimento finalizado com sucesso.', type: 'success' });
    } catch (e) {
      console.error('Erro ao finalizar:', e);
      setToast({ message: 'Erro ao finalizar atendimento.', type: 'error' });
    }
  };

  const handleToggleMediation = () => {
    setIsMediationActive(!isMediationActive);
    setToast({ message: `Mediação ${!isMediationActive ? 'ativada' : 'desativada'}`, type: 'info' });
  };

  return (
    <div className="flex w-full h-full md:h-[calc(100vh-110px)] md:m-4 md:shadow-2xl md:rounded-[32px] md:border md:border-gray-100 bg-white font-sans overflow-hidden animate-in fade-in duration-300 relative">
      {/* Sidebar List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] flex-col border-r border-gray-100 bg-white h-full z-10`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-20">
               <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                   {onBack && (
                     <button onClick={onBack} className="md:hidden mr-2 text-gray-600">
                       <ArrowLeft size={20} />
                     </button>
                   )}
                   <MessageCircle className="w-5 h-5 text-brand-600" /> 
                   Entregadores
               </h2>
               <div className="flex gap-2">
                 <button onClick={fetchConversations} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Atualizar">
                     <RefreshCw size={16} />
                 </button>
               </div>
          </div>
          <div className="p-2 bg-gray-50 border-b border-gray-100">
               <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                      type="text" 
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                      placeholder="Buscar entregador..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                   />
               </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {conversations.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center">
                      <Bot size={32} className="mb-2 opacity-50" />
                      Nenhum entregador encontrado.
                  </div>
              ) : (
                  conversations
                  .filter(c => !searchQuery || (c.contact_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || c.conversation_id.includes(searchQuery))
                  .map(conv => (
                      <div 
                        key={conv.conversation_id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 ${selectedConversation?.conversation_id === conv.conversation_id ? 'bg-brand-50 hover:bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
                      >
                           <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                               {profilePictures[conv.conversation_id] ? (
                                   <img src={profilePictures[conv.conversation_id]} alt="" className="w-full h-full object-cover" />
                               ) : (
                                   <div className="w-full h-full flex items-center justify-center text-gray-400"><Bot size={20} /></div>
                               )}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-baseline mb-1">
                                   <span className="font-medium text-gray-900 truncate text-sm">
                                      {conv.contact_name || conv.conversation_id.split('@')[0]}
                                   </span>
                                   <span className="text-[10px] text-gray-400">
                                       {new Date(conv.last_message_timestamp || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                   </span>
                               </div>
                               <p className="text-xs text-gray-500 truncate h-4 overflow-hidden">
                                   {conv.last_message_content}
                               </p>
                           </div>
                           {/* Badge Unread */}
                           {(conv.unread_count || 0) > 0 && (
                             <div className="min-w-[18px] h-[18px] rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold px-1 self-center">
                               {conv.unread_count}
                             </div>
                           )}
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col h-full bg-[#E5DDD5] relative ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {!selectedConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-[#F0F2F5]">
                  <MessageCircle size={48} className="mb-4 opacity-20" />
                  <p>Selecione um entregador para iniciar a mediação.</p>
              </div>
          ) : (
              <>
                 {/* Header Simplificado */}
                 <div className="h-16 bg-[#F0F2F5] px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-10 shrink-0">
                     <div className="flex items-center gap-3 overflow-hidden">
                         <button onClick={() => setSelectedConversation(null)} className="md:hidden p-1 -ml-1 text-gray-500">
                             <ArrowLeft size={20} />
                         </button>
                         <div className="w-9 h-9 rounded-full bg-gray-300 overflow-hidden shrink-0">
                             {profilePictures[selectedConversation.conversation_id] ? (
                                 <img src={profilePictures[selectedConversation.conversation_id]} className="w-full h-full object-cover" alt="Profile" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500"><Bot size={18} /></div>
                             )}
                         </div>
                         <div className="min-w-0">
                             <h3 className="font-medium text-gray-800 text-sm truncate">
                                 {selectedConversation.contact_name || selectedConversation.phone_number}
                             </h3>
                             {canShowMediation && (
                               <div className={`text-[10px] font-bold flex items-center gap-1 ${isMediationActive ? 'text-brand-600' : 'text-gray-400'}`}>
                                   <Scale size={10} /> {isMediationActive ? 'MEDIAÇÃO ATIVA' : 'MEDIAÇÃO PAUSADA'}
                               </div>
                             )}
                         </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                         {canShowMediation && (
                           <button 
                               onClick={handleToggleMediation}
                               className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${isMediationActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}
                               title={isMediationActive ? 'Desativar Mediação' : 'Ativar Mediação'}
                           >
                               <Scale size={14} /> {isMediationActive ? 'ON' : 'OFF'}
                           </button>
                         )}
                         <button 
                             onClick={handleFinalizeConversation}
                             className="p-2 hover:bg-gray-200 rounded-full text-gray-500"
                             title="Finalizar Conversa"
                         >
                             <CheckCheck size={18} />
                         </button>
                     </div>
                 </div>

                 {/* Messages List */}
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-[#E5DDD5] relative" 
                      style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
                     <div className="absolute inset-0 bg-[#E5DDD5] opacity-90 -z-10"></div>
                     
                     {messages.map((msg, idx) => (
                         <div key={msg.message_id || idx} className={`flex ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-2 rounded-lg shadow-sm text-sm relative ${msg.is_from_me ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'} break-words`}>
                                  {msg.content}
                                  <div className="text-[10px] text-gray-500 text-right mt-1 flex justify-end gap-1 items-center">
                                      {new Date(msg.message_timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                      {msg.is_from_me && <CheckCheck size={12} className={msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'} />}
                                  </div>
                              </div>
                         </div>
                     ))}
                     <div ref={messagesEndRef} />
                 </div>

                 {/* Input Area */}
                 <div className="min-h-[62px] bg-[#F0F2F5] px-4 py-2 flex items-center gap-2 border-t border-gray-200 shrink-0">
                     <div className="flex-1 bg-white rounded-lg flex items-center px-4 py-2 shadow-sm">
                         <input 
                            type="text" 
                            className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400"
                            placeholder="Digite uma mensagem..."
                            onKeyDown={(e) => { 
                                if(e.key === 'Enter') { 
                                    handleSendMessage(e.currentTarget.value); 
                                    e.currentTarget.value = ''; 
                                } 
                            }}
                         />
                     </div>
                     <button className="p-3 bg-brand-600 text-white rounded-full hover:bg-brand-700 shadow-md flex items-center justify-center">
                         <Send size={18} />
                     </button>
                 </div>
              </>
          )}
      </div>

      {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
              {toast.message}
          </div>
      )}

      {/* Modal Finalizar */}
      <BaseModal isOpen={showFinalizeConfirm} onClose={() => setShowFinalizeConfirm(false)}>
           <div className="p-6">
               <h3 className="font-bold text-lg mb-2">Finalizar Conversa?</h3>
               <p className="text-gray-600 mb-6">Esta conversa será arquivada e sairá da lista principal.</p>
               <div className="flex justify-end gap-2">
                   <button onClick={() => setShowFinalizeConfirm(false)} className="px-4 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
                   <button onClick={confirmFinalizeConversation} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Confirmar</button>
               </div>
           </div>
      </BaseModal>
    </div>
  );
};

export default StoreDriversChat;
