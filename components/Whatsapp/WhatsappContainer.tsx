import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { WhatsappConversation, WhatsappMessage } from './types';
import { useWhatsappWebSocket } from './useWhatsappWebSocket';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import QrCodeModal from './QrCodeModal';
import SearchBar from './SearchBar';
import ContactsManager from './ContactsManager';
import { MessageSquare, ArrowLeft, Users, MessageCircle, AlertTriangle, MoreVertical, LogOut } from 'lucide-react';

import { getApiBaseUrl } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

type TabType = 'conversations' | 'contacts';

const WhatsappContainer: React.FC = () => {
  const { status, lastMessage } = useWhatsappWebSocket();
  const [conversations, setConversations] = useState<WhatsappConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsappConversation | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [apiError, setApiError] = useState<string | null>(null);

  // TODO: Obter storeId do contexto de autenticação
  const storeId = 'default-store-id';

  // Filtrar mensagens com base na busca
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const fetchConversations = useCallback(async () => {
    // Permitir buscar conversas mesmo sem conexão ativa (para ver histórico)
    // if (status.status !== 'CONNECTED') return;
    try {
      const response = await axios.get<WhatsappConversation[]>(`${API_BASE_URL}/conversations`);
      setConversations(response.data);
      setApiError(null);
    } catch (error: any) {
      console.error('Erro ao buscar conversas:', error);
      const msg = error.response?.data?.details || error.response?.data?.message || error.message;
      setApiError(msg);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await axios.get<WhatsappMessage[]>(`${API_BASE_URL}/messages/${conversationId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleSelectConversation = (conversation: WhatsappConversation) => {
    setSelectedConversation(conversation);
    setActiveTab('conversations'); // Voltar para aba de conversas ao selecionar
    fetchMessages(conversation.conversation_id);
  };

  const handleStartChatFromContact = (phoneNumber: string, contactName: string) => {
    // Criar ou buscar conversa existente
    const existingConv = conversations.find(c => c.conversation_id === phoneNumber);

    if (existingConv) {
      handleSelectConversation(existingConv);
    } else {
      // Criar nova conversa temporária
      const newConv: WhatsappConversation = {
        conversation_id: phoneNumber,
        contact_name: contactName,
        unread_count: 0,
        last_message_content: '',
        last_message_timestamp: new Date().toISOString(),
        profile_pic_url: null,
      };
      setSelectedConversation(newConv);
      setMessages([]);
      setActiveTab('conversations');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) return;

    const tempId = Date.now().toString();
    const newMessage: WhatsappMessage = {
      message_id: tempId,
      conversation_id: selectedConversation.conversation_id,
      sender_id: 'me',
      content: text,
      status: 'sent',
      message_timestamp: new Date().toISOString(),
      is_from_me: true,
      media_url: null,
      media_type: null,
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);

    try {
      await axios.post(`${API_BASE_URL}/send/text`, {
        to: selectedConversation.conversation_id,
        text,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const handleSendMedia = async (file: File) => {
    if (!selectedConversation) return;

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('to', selectedConversation.conversation_id);

      const fileType = file.type.split('/')[0];
      let endpoint = '';

      if (fileType === 'image') {
        endpoint = `${API_BASE_URL}/send/image`;
      } else if (fileType === 'audio') {
        endpoint = `${API_BASE_URL}/send/audio`;
      } else if (fileType === 'video') {
        endpoint = `${API_BASE_URL}/send/video`;
      } else {
        endpoint = `${API_BASE_URL}/send/document`;
      }

      await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Recarregar mensagens após envio
      setTimeout(() => fetchMessages(selectedConversation.conversation_id), 1000);
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      alert('Erro ao enviar mídia: ' + (error as any).message);
    }
  };

  const handleRestart = async () => {
    try {
      // Tenta rota de restart se existir, ou apenas logout
      try {
        await axios.post(`${API_BASE_URL}/logout`);
      } catch (e) {
        // Ignora erro de logout se já estiver desconectado
      }
      window.location.reload();
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/logout`);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Buscar conversas inicialmente e periodicamente
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []); // Removido fetchConversations das deps para evitar loop, embora useCallback previna isso

  // Atualizar mensagens quando chegar uma nova via WebSocket
  useEffect(() => {
    if (lastMessage && selectedConversation) {
      const isForCurrentChat = (lastMessage as any).conversationId === selectedConversation.conversation_id;
      if (isForCurrentChat) {
        // Verificar se a mensagem já existe
        const exists = messages.some(m => m.message_id === (lastMessage as any).messageId);
        if (!exists) {
          // Se for uma mensagem que acabamos de enviar (ja adicionada otimisticamente), podemos ignorar ou atualizar status
          // Por simplicidade, vamos dar fetchMessages
          fetchMessages(selectedConversation.conversation_id);
        }
      }

      // Atualizar lista de conversas para mostrar mensagem recente
      fetchConversations();
    }
  }, [lastMessage, selectedConversation, messages]);

  // Carregar fotos de perfil
  useEffect(() => {
    const loadProfilePics = async () => {
      const newPics: Record<string, string> = {};
      const pending = conversations.filter(c => !profilePictures[c.conversation_id]);

      for (const conv of pending) {
        try {
          const res = await axios.get(`${API_BASE_URL}/profile-picture/${conv.conversation_id}`);
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
    <div className="flex w-full h-[calc(100vh-90px)] bg-white font-sans overflow-hidden animate-in fade-in duration-300 shadow-md rounded-lg border border-gray-100 relative">
      {/* Container Full Screen */}
      <div className="z-10 flex w-full h-full">
        {/* Sidebar */}
        <div className="w-full md:w-[400px] bg-white flex flex-col h-full border-r border-gray-200">
          {/* Sidebar Header */}
          <div className="h-16 bg-[#F0F2F5] flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center cursor-pointer">
                <Users className="text-gray-600" size={24} />
              </div>
              {/* Status Indicator (Compact) */}
              {status.status !== 'CONNECTED' && (
                <div className="flex items-center gap-1 bg-yellow-100 flex-col px-2 py-0.5 rounded">
                  <span className="text-[10px] text-yellow-800 font-bold">
                    {status.status === 'WAITING_QR' ? 'ESCANEIE O QR' : 'CONECTANDO...'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4 text-[#54656F]">
              <button
                onClick={() => setActiveTab('conversations')}
                title="Conversas"
                className={`p-2 rounded-full transition-colors ${activeTab === 'conversations' ? 'bg-[#dcf8c6]' : 'hover:bg-gray-200'}`}
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                title="Contatos"
                className={`p-2 rounded-full transition-colors ${activeTab === 'contacts' ? 'bg-[#dcf8c6]' : 'hover:bg-gray-200'}`}
              >
                <Users size={20} />
              </button>
              <button
                title="Mais opções"
                className="p-2 hover:bg-gray-200 rounded-full transition-colors relative group"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Connection Alert Bar */}
          {status.status === 'CONNECTED' && (
            <div className="bg-green-100 px-4 py-1 flex justify-between items-center">
              <span className="text-xs text-green-800">Conectado ao WhatsApp</span>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                <LogOut size={10} /> Sair
              </button>
            </div>
          )}

          {[
            activeTab === 'contacts' && (
              <ContactsManager
                storeId={storeId}
                onStartChat={handleStartChatFromContact}
                onClose={() => setActiveTab('conversations')}
              />
            )
          ]}

          {/* Search Bar Container */}
          {activeTab === 'conversations' && (
            <div className="p-2 bg-white border-b border-gray-100">
              <div className="bg-[#F0F2F5] rounded-lg px-4 py-1.5 flex items-center">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.conversation_id}
              onSelectConversation={handleSelectConversation}
              profilePictures={profilePictures}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 bg-[#ECE5DD] ${(!selectedConversation && activeTab === 'conversations') ? 'hidden md:flex' : (!selectedConversation ? 'hidden' : 'flex')} flex-col relative overflow-hidden`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-[#F0F2F5] flex items-center px-4 border-b border-gray-200 flex-shrink-0 z-20 justify-between">
                <div className="flex items-center gap-4 flex-1 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
                    {selectedConversation.profile_pic_url ? (
                      <img src={selectedConversation.profile_pic_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h2 className="text-[#111B21] font-normal text-base leading-tight">
                      {selectedConversation.contact_name || selectedConversation.conversation_id}
                    </h2>
                    <span className="text-xs text-gray-500 truncate">
                      clique para dados do contato
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-[#54656F]">
                  <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-gray-200 rounded-full"><ArrowLeft size={20} /></button>
                  <button className="p-2 hover:bg-gray-200 rounded-full"><Users size={20} /></button>
                  <button className="p-2 hover:bg-gray-200 rounded-full"><AlertTriangle size={20} /></button>
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
                <MessageArea messages={filteredMessages} />
              </div>

              {/* Input Area */}
              <div className="bg-[#F0F2F5] p-0 z-20 min-h-[62px]">
                <MessageInput onSend={handleSendMessage} onSendMedia={handleSendMedia} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] border-b-[6px] border-[#25D366] text-center px-10 h-full">
              <div className="mb-8">
                <div className="flex items-center justify-center mb-5 mx-auto">
                  <MessageCircle size={80} className="text-[#d1d7db]" />
                </div>
                <h1 className="text-3xl font-light text-[#41525d] mb-4">WhatsApp Web</h1>
                <p className="text-[#667781] text-sm">
                  Envie e receba mensagens sem precisar manter seu celular conectado.<br />
                  Use o WhatsApp em até 4 aparelhos e 1 celular ao mesmo tempo.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[#8696a0] text-xs mt-10">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
                <span>Protegido com criptografia de ponta a ponta</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal QR Code */}
        {status.status === 'WAITING_QR' && status.qrCode && (
          <QrCodeModal
            qrCode={status.qrCode}
            status={status.status}
            onClose={handleLogout}
          />
        )}
      </div>
    </div>
  );
};

export default WhatsappContainer;
