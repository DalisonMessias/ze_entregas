import React, { useState, useEffect } from 'react';
import { Send, Loader2, Megaphone, CheckCircle, AlertTriangle, X, User, Search } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

type NotifType = 'global' | 'individual';

export const AdminNotifications: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const { alert } = useDialog();
    const [sending, setSending] = useState(false);
    const [activeType, setActiveType] = useState<NotifType>('global');

    // State for Individual Notification
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Debounced search for users
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 3) {
                setSearching(true);
                try {
                    const users = await cloud.adminSearchUsers(searchQuery);
                    setSearchResults(users);
                } catch (e) {
                    console.error('Error searching users:', e);
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            await alert('Preencha o título e a mensagem.');
            return;
        }

        if (activeType === 'individual' && !selectedUser) {
            await alert('Selecione um usuário para a notificação individual.');
            return;
        }

        setSending(true);
        try {
            if (activeType === 'global') {
                await cloud.adminSendGlobalNotification(title, message);
                await alert('Notificação global enviada com sucesso!');
            } else {
                await cloud.adminSendIndividualNotification(selectedUser.id, title, message);
                await alert(`Notificação enviada para ${selectedUser.name}!`);
            }

            // Força o App a recarregar a lista de notificações localmente se o admin for o próprio destinatário
            window.dispatchEvent(new CustomEvent('refreshNotifications'));

            setTitle('');
            setMessage('');
            if (activeType === 'individual') {
                setSelectedUser(null);
                setSearchQuery('');
            }
        } catch (e: any) {
            await alert('Erro ao enviar notificação: ' + (e.message || 'Erro desconhecido'));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Tabs for switching mode */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full overflow-x-auto no-scrollbar">
                <button
                    onClick={() => {
                        setActiveType('global');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeType === 'global' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <Megaphone className="w-4 h-4" /> Global
                </button>
                <button
                    onClick={() => {
                        setActiveType('individual');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeType === 'individual' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <User className="w-4 h-4" /> Individual
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    {activeType === 'global' ? <Megaphone className="w-6 h-6 text-brand-600" /> : <User className="w-6 h-6 text-brand-600" />}
                    {activeType === 'global' ? 'Notificações Globais' : 'Notificação Individual'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {activeType === 'global'
                        ? 'Envie mensagens importantes para todos os usuários do aplicativo.'
                        : 'Busque um usuário pelo Nome, E-mail, Telefone ou CPF para enviar uma mensagem exclusiva.'}
                </p>

                {activeType === 'individual' && (
                    <div className="mb-6 relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Usuário</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white font-medium"
                                placeholder="Nome, E-mail, Telefone ou CPF..."
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && !selectedUser && (
                            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="w-full px-4 py-3 flex flex-col items-start hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="font-bold text-gray-900 dark:text-white">{user.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full uppercase font-black ml-auto">
                                                {user.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <span>{user.email}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>{user.phone_number}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected User Badge */}
                        {selectedUser && (
                            <div className="mt-3 p-4 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-800/50 flex items-center gap-3 animate-in slide-in-from-top-2">
                                <div className="p-2.5 bg-brand-100 dark:bg-brand-900/40 rounded-xl text-brand-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-brand-900 dark:text-brand-100 truncate">{selectedUser.name}</p>
                                    <p className="text-xs text-brand-600 dark:text-brand-400 truncate font-medium">{selectedUser.email}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 text-brand-400 hover:text-brand-600 transition-colors"
                                    title="Remover seleção"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Mensagem</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white font-medium"
                            placeholder={activeType === 'global' ? 'Ex: Manutenção agendada' : 'Ex: Documento aprovado!'}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo da Notificação</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={5}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-y font-medium"
                            placeholder="Escreva aqui os detalhes da mensagem..."
                        />
                    </div>
                </div>


                <Button
                    fullWidth
                    onClick={handleSendNotification}
                    disabled={sending || (activeType === 'individual' && !selectedUser)}
                    className="mt-6 py-4 text-lg shadow-xl shadow-brand-500/20"
                >
                    {sending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Send className="w-5 h-5" />
                            {activeType === 'global' ? 'Enviar Notificação Geral' : 'Enviar Mensagem Individual'}
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
};
