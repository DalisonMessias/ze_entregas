import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, MessageSquare, Zap, Loader2, AlertCircle } from 'lucide-react';
import * as cloud from '../../../services/cloud';
import { QuickReply } from '../../../types';
import { Button } from '../../Button';
import { CustomInput } from '../../CustomInput';
import { useDialog } from '../../../utils/dialogService';

interface ZeAssistantQuickRepliesProps {
    storeId: string;
}

export const ZeAssistantQuickReplies: React.FC<ZeAssistantQuickRepliesProps> = ({ storeId }) => {
    const [replies, setReplies] = useState<QuickReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [trigger, setTrigger] = useState('');
    const [message, setMessage] = useState('');

    const { alert, confirm } = useDialog();

    useEffect(() => {
        loadReplies();
    }, [storeId]);

    const loadReplies = async () => {
        setLoading(true);
        try {
            const data = await cloud.getQuickReplies(storeId);
            setReplies(data);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar respostas rápidas.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!trigger.trim() || !message.trim()) {
            alert({ title: 'Atenção', message: 'Preencha o gatilho (ex: /pix) e a mensagem.' });
            return;
        }

        if (!trigger.startsWith('/')) {
            alert({ title: 'Formato Inválido', message: 'O gatilho deve começar com "/" (ex: /ola).' });
            return;
        }

        setIsSaving(true);
        try {
            const newReply = await cloud.createQuickReply(storeId, trigger.trim().toLowerCase(), message.trim());
            if (newReply) {
                setReplies(prev => [...prev, newReply].sort((a, b) => a.trigger.localeCompare(b.trigger)));
                setTrigger('');
                setMessage('');
            }
        } catch (err) {
            console.error(err);
            alert({ title: 'Erro', message: 'Não foi possível salvar a resposta rápida. Verifique se o gatilho já existe.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Excluir Resposta',
            message: 'Tem certeza que deseja remover esta resposta rápida?',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar'
        });

        if (confirmed) {
            try {
                const success = await cloud.deleteQuickReply(id);
                if (success) {
                    setReplies(prev => prev.filter(r => r.id !== id));
                }
            } catch (err) {
                console.error(err);
                alert({ title: 'Erro', message: 'Erro ao excluir resposta rápida.' });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Info */}
            <div className="bg-brand-50 p-4 rounded-2xl flex gap-3 border border-brand-100">
                <div className="p-2 bg-brand-100 text-brand-600 rounded-xl h-fit">
                    <Zap size={20} />
                </div>
                <div>
                    <h3 className="font-black text-brand-900 text-sm uppercase">Atalhos de Teclado</h3>
                    <p className="text-xs text-brand-700 font-medium leading-relaxed">
                        Cadastre mensagens prontas que podem ser enviadas digitando <span className="font-bold">/gatilho</span> no chat.
                    </p>
                </div>
            </div>

            {/* Cadastro Form */}
            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <CustomInput
                            label="Gatilho"
                            placeholder="/pix"
                            value={trigger}
                            onChange={e => setTrigger(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <CustomInput
                            label="Mensagem Automática"
                            placeholder="Olá! Segue nossa chave PIX..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="rounded-xl px-6"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} className="mr-2" />}
                        Adicionar Atalho
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Suas Respostas Rápidas ({replies.length})</h4>

                {replies.length === 0 ? (
                    <div className="p-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-[32px]">
                        <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-bold text-sm">Nenhum atalho cadastrado.</p>
                        <p className="text-gray-400 text-xs mt-1">Crie atalhos para agilizar seu atendimento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {replies.map(reply => (
                            <div key={reply.id} className="group bg-white p-4 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-brand-100 text-brand-600 rounded text-[10px] font-black uppercase tracking-tighter">
                                            {reply.trigger}
                                        </span>
                                        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Atalho</span>
                                    </div>
                                    <p className="text-gray-700 text-sm font-medium line-clamp-2">{reply.message}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(reply.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
