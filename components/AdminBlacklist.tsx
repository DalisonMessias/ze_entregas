import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, UserX, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { BlacklistEntry } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';

const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('pt-BR');

export const AdminBlacklist: React.FC = () => {
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Entry State
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [reason, setReason] = useState('');
    const [adding, setAdding] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const { confirm, alert } = useDialog();

    const loadBlacklist = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetBlacklist();
            setBlacklist(data);
        } catch (e) {
            console.error("Error loading blacklist:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBlacklist();
    }, [loadBlacklist]);

    const handleAddEntry = async () => {
        if (!email.trim() && !phoneNumber.trim()) {
            await alert('Preencha email ou telefone.');
            return;
        }
        if (!reason.trim()) {
            await alert('Preencha o motivo.');
            return;
        }

        setAdding(true);
        try {
            const entry: Partial<BlacklistEntry> = {
                email: email.trim() === '' ? undefined : email.trim(),
                phone_number: phoneNumber.trim() === '' ? undefined : phoneNumber.trim(),
                reason: reason.trim(),
                punishment_type: 'BAN', // Default for now, could be selectable
                status: 'active'
            };
            await cloud.adminAddToBlacklist(entry);
            await alert('Usuário adicionado à lista negra com sucesso!');
            setEmail('');
            setPhoneNumber('');
            setReason('');
            loadBlacklist();
        } catch (e: any) {
            await alert('Erro ao adicionar à lista negra: ' + (e.message || 'Erro desconhecido'));
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveEntry = async (id: string) => {
        const ok = await confirm('Tem certeza que deseja remover este usuário da lista negra?');
        if (!ok) return;
        setIsRemoving(true);
        try {
            await cloud.adminRemoveFromBlacklist(id);
            await alert('Usuário removido da lista negra com sucesso!');
            loadBlacklist();
        } catch (e: any) {
            await alert('Erro ao remover da lista negra: ' + (e.message || 'Erro desconhecido'));
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <UserX className="w-6 h-6 text-red-500" /> Lista Negra de Usuários
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Gerencie usuários que foram banidos ou suspensos da plataforma.</p>

                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Adicionar Novo Usuário</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="usuario@email.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone (Opcional)</label>
                        <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo (Obrigatório)</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y" placeholder="Ex: Fraude, Comportamento inadequado..." />
                    </div>


                    <Button fullWidth onClick={handleAddEntry} disabled={adding} className="py-4 text-lg shadow-lg">
                        {adding ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Adicionar à Lista Negra</>}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Usuários Banidos</h3>
                    <button onClick={loadBlacklist} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Identificador</th>
                                <th className="px-4 py-3">Motivo</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>}
                            {!loading && blacklist.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum usuário na lista negra.</td></tr>}
                            {!loading && blacklist.map(entry => (
                                <tr key={entry.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{entry.email || entry.phone_number || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{entry.email ? 'Email' : 'Telefone'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{entry.reason}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(entry.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleRemoveEntry(entry.id)}
                                            disabled={isRemoving}
                                            className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};