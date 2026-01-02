import React, { useState } from 'react';
import { Send, Loader2, Megaphone, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';

export const AdminNotifications: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            setFeedback({ type: 'error', text: 'Preencha o título e a mensagem.' });
            return;
        }

        setSending(true);
        setFeedback(null);
        try {
            await cloud.adminSendGlobalNotification(title, message);
            setFeedback({ type: 'success', text: 'Notificação global enviada com sucesso!' });
            setTitle('');
            setMessage('');
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao enviar notificação: ' + e.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Megaphone className="w-6 h-6 text-brand-600" /> Notificações Globais
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Envie mensagens importantes para todos os usuários do aplicativo.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Notificação</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                            placeholder="Ex: Nova atualização do app!"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                        <textarea 
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            rows={5}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-y"
                            placeholder="Descreva aqui o conteúdo da notificação..."
                        />
                    </div>
                </div>
                
                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                        <button onClick={() => setFeedback(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                    </div>
                )}

                <Button fullWidth onClick={handleSendNotification} disabled={sending} className="mt-6 py-4 text-lg shadow-lg">
                    {sending ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Send className="w-5 h-5 mr-2"/> Enviar Notificação</>}
                </Button>
            </div>
        </div>
    );
};