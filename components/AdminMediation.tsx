
import React, { useEffect, useState } from 'react';
import { adminGetMediationSessions, adminGetMediationActions } from '../services/cloud';
import { MediationSession, MediationAction } from '../types';
import { Loader2, Scale, MessageSquare, CheckCircle, AlertTriangle, XCircle, Search, Eye } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';

export const AdminMediation: React.FC = () => {
    const [sessions, setSessions] = useState<MediationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<MediationSession | null>(null);
    const [actions, setActions] = useState<MediationAction[]>([]);
    const [actionsLoading, setActionsLoading] = useState(false);
    const { alert } = useDialog();

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await adminGetMediationSessions();
            setSessions(data || []);
        } catch (e: any) {
            console.error(e);
            alert('Erro ao carregar mediações: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = async (session: MediationSession) => {
        setSelectedSession(session);
        setActionsLoading(true);
        try {
            const data = await adminGetMediationActions(session.id);
            setActions(data || []);
        } catch (e: any) {
            console.error(e);
            alert('Erro ao carregar ações: ' + e.message);
        } finally {
            setActionsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'ESCALATED': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'CANCELLED': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Scale className="w-8 h-8 text-brand-600" /> Painel de Mediação
                    </h2>
                    <p className="text-sm text-gray-500">Gerencie e audite as intervenções da IA.</p>
                </div>
                <Button onClick={() => loadSessions()} variant="outline">
                    Atualizar
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de Sessões */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:h-[600px]">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase">Sessões Recentes</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center p-10 text-gray-400">Nenhuma mediação encontrada.</div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSelectSession(session)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedSession?.id === session.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-gray-600'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(session.status)}`}>
                                            {session.status}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(session.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Pedido #{session.order_id.slice(0, 8)}</h4>
                                    <p className="text-xs text-gray-500 truncate">Passo: {session.current_step}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detalhes e Logs */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col md:h-[600px]">
                    {selectedSession ? (
                        <>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        Detalhes da Mediação
                                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedSession.status)}`}>{selectedSession.status}</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">ID: {selectedSession.id}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-4 uppercase flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Histórico de Ações
                                </h4>

                                {actionsLoading ? (
                                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                                ) : actions.map((action, idx) => (
                                    <div key={action.id} className="relative pl-6 pb-6 last:pb-0 border-l-2 border-gray-200 dark:border-gray-700">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-500 border-4 border-white dark:border-gray-800"></div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-xs text-brand-600 uppercase">{action.action_type}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(action.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{action.description}</p>
                                            {action.payload && (
                                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] overflow-x-auto text-gray-500 font-mono">
                                                    {JSON.stringify(action.payload, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {actions.length === 0 && !actionsLoading && (
                                    <div className="text-center p-6 text-gray-400 border border-dashed rounded-xl">
                                        Nenhuma ação registrada nesta sessão.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
                            <Scale className="w-16 h-16 mb-4 opacity-20" />
                            <p>Selecione uma sessão à esquerda para ver os detalhes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
