import React, { useState, useEffect } from 'react';
import { X, Send, Users, AlertTriangle, CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/apiConfig';
import * as cloud from '../../services/cloud';

const API_BASE_URL = getApiBaseUrl();

interface BroadcastModalProps {
    storeId: string;
    attendantId?: string;
    onClose: () => void;
}

type AudienceType = 'recent_conversations' | 'all_contacts' | 'visitors';

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ storeId, attendantId, onClose }) => {
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<AudienceType>('recent_conversations');
    const [isLoadingCount, setIsLoadingCount] = useState(false);
    const [contactCount, setContactCount] = useState(0);
    const [targetContacts, setTargetContacts] = useState<{ id: string, name: string }[]>([]);

    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ sent: number, failed: number }>({ sent: 0, failed: 0 });
    const [step, setStep] = useState<'compose' | 'sending' | 'finished'>('compose');

    // Buscar estimativa de público
    useEffect(() => {
        const fetchTargetIndices = async () => {
            setIsLoadingCount(true);
            try {
                let contacts: { id: string, name: string }[] = [];

                if (audience === 'recent_conversations') {
                    // Busca conversas do Chat (endpoint existente)
                    const res = await axios.get(`${API_BASE_URL}/conversations?storeId=${storeId}`);
                    // Filtra apenas números válidos
                    contacts = res.data.map((c: any) => ({
                        id: c.conversation_id,
                        name: c.contact_name || c.conversation_id.split('@')[0]
                    })).filter((c: any) => !c.id.includes('@g.us')); // Ignora grupos por segurança inicial

                } else if (audience === 'all_contacts') {
                    // Busca todos os contatos salvos (endpoint contacts)
                    const res = await axios.get(`${API_BASE_URL}/contacts?storeId=${storeId}`);
                    // Assumindo que endpoint retorna lista
                    if (Array.isArray(res.data)) {
                        contacts = res.data.map((c: any) => ({
                            id: c.phone.includes('@') ? c.phone : `${c.phone}@s.whatsapp.net`, // Garante formato de ID válido
                            name: c.name
                        }));
                    }
                } else if (audience === 'visitors') {
                    // Visitantes seriam conversas iniciadas como 'visitor' se tivéssemos essa distinção clara no front
                    // Por hora, vamos simular que visitantes são conversas sem nome salvo
                    const res = await axios.get(`${API_BASE_URL}/conversations?storeId=${storeId}`);
                    contacts = res.data
                        .filter((c: any) => !c.contact_name && !c.conversation_id.includes('@g.us'))
                        .map((c: any) => ({
                            id: c.conversation_id,
                            name: 'Visitante'
                        }));
                }

                // Remover duplicatas
                const unique = new Map();
                contacts.forEach(c => unique.set(c.id, c));
                setTargetContacts(Array.from(unique.values()));
                setContactCount(unique.size);

            } catch (error) {
                console.error("Erro ao estimar público:", error);
                setContactCount(0);
            } finally {
                setIsLoadingCount(false);
            }
        };

        const timeout = setTimeout(fetchTargetIndices, 500);
        return () => clearTimeout(timeout);
    }, [audience, storeId]);

    const handleSendBroadcast = async () => {
        if (!message.trim() || targetContacts.length === 0) return;

        setStep('sending');
        setIsSending(true);
        setResults({ sent: 0, failed: 0 });
        setProgress(0);

        let sent = 0;
        let failed = 0;

        // Loop de envio com delay para evitar bloqueio e sobrecarga
        for (let i = 0; i < targetContacts.length; i++) {
            const contact = targetContacts[i];
            try {
                await axios.post(`${API_BASE_URL}/send/text`, {
                    to: contact.id,
                    text: message,
                    storeId,
                    attendantId,
                    isBroadcast: true // Flag opcional para backend saber
                });
                sent++;
            } catch (e) {
                console.error(`Falha ao enviar para ${contact.id}`, e);
                failed++;
            }

            setResults({ sent, failed });
            setProgress(Math.round(((i + 1) / targetContacts.length) * 100));

            // Delay de 1 a 3 segundos aleatório para parecer humano
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }

        setIsSending(false);
        setStep('finished');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 rounded-full text-brand-600">
                            <Send size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Disparo em Massa</h3>
                    </div>
                    {!isSending && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {step === 'compose' && (
                        <>
                            {/* Seleção de Público */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Para quem enviar?</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setAudience('recent_conversations')}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${audience === 'recent_conversations' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                    >
                                        <MessageCircle size={20} />
                                        <div className="text-left">
                                            <div className="font-bold">Conversas Recentes</div>
                                            <div className="text-xs opacity-80">Clientes com quem você já falou</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setAudience('all_contacts')}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${audience === 'all_contacts' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                    >
                                        <Users size={20} />
                                        <div className="text-left">
                                            <div className="font-bold">Todos os Contatos Salvos</div>
                                            <div className="text-xs opacity-80">Lista completa da agenda</div>
                                        </div>
                                    </button>

                                    {/* <button 
                                        onClick={() => setAudience('visitors')}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${audience === 'visitors' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                    >
                                        <Ghost size={20} />
                                        <div className="text-left">
                                            <div className="font-bold">Apenas Visitantes</div>
                                            <div className="text-xs opacity-80">Números não salvos</div>
                                        </div>
                                    </button> */}
                                </div>
                                <div className="mt-2 text-sm text-gray-500 flex items-center gap-2 h-6">
                                    {isLoadingCount ? (
                                        <><Loader2 size={12} className="animate-spin" /> Calculando destinatários...</>
                                    ) : (
                                        <><Users size={12} /> Estimativa: <strong>{contactCount} destinatários</strong></>
                                    )}
                                </div>
                            </div>

                            {/* Mensagem */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mensagem</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Olá! Temos novidades incríveis na loja hoje..."
                                    className="w-full h-32 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{message.length} caracteres</p>
                            </div>

                        </>
                    )}

                    {step === 'sending' && (
                        <div className="text-center py-10">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-gray-200 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                                    <circle className="text-brand-600 progress-ring__circle stroke-current transition-all duration-300" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * progress) / 100}></circle>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-brand-600">
                                    {progress}%
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-2">Enviando mensagens...</h3>
                            <p className="text-gray-500 mb-4">Por favor, não feche esta janela.</p>
                            <div className="flex justify-center gap-8 text-sm">
                                <div className="text-green-600 font-bold">
                                    Enviados: {results.sent}
                                </div>
                                <div className="text-red-500 font-bold">
                                    Falhas: {results.failed}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'finished' && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Envio Concluído!</h3>
                            <p className="text-gray-600 mb-6">
                                Sua campanha foi enviada para {results.sent} contatos com sucesso.
                                {results.failed > 0 && <span className="block text-red-500 text-sm mt-1">({results.failed} falhas)</span>}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 flex justify-end gap-3">
                    {step === 'compose' ? (
                        <>
                            <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendBroadcast}
                                disabled={!message.trim() || contactCount === 0}
                                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                            >
                                <Send size={18} /> Disparar para {contactCount} contatos
                            </button>
                        </>
                    ) : step === 'finished' ? (
                        <button onClick={onClose} className="px-8 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
                            Fechar
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
