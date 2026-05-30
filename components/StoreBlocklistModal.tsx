import React, { useState, useEffect } from 'react';
import { supabase } from '../services/cloud';
import { X, Shield, Plus, Trash2, Search, Smartphone, Mail, Globe } from 'lucide-react';
import { Button } from './Button';
import { Loading } from './Loading';

interface BlockedUser {
    id: string;
    block_type: 'phone' | 'email' | 'ip';
    block_value: string;
    reason: string | null;
    created_at: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
}

export function StoreBlocklistModal({ isOpen, onClose, storeId }: Props) {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newBlockType, setNewBlockType] = useState<'phone' | 'email' | 'ip'>('phone');
    const [newBlockValue, setNewBlockValue] = useState('');
    const [newBlockReason, setNewBlockReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && storeId) {
            loadBlockedUsers();
        }
    }, [isOpen, storeId]);

    const loadBlockedUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('store_blocked_users')
                .select('*')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setBlockedUsers(data || []);
        } catch (err: any) {
            setError('Erro ao carregar lista de bloqueios: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlockValue.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            let formattedValue = newBlockValue.trim();
            if (newBlockType === 'phone') {
                formattedValue = formattedValue.replace(/\D/g, '');
            } else if (newBlockType === 'email') {
                formattedValue = formattedValue.toLowerCase();
            }

            const { data, error: insertError } = await supabase
                .from('store_blocked_users')
                .insert({
                    store_id: storeId,
                    block_type: newBlockType,
                    block_value: formattedValue,
                    reason: newBlockReason.trim() || 'Adicionado pelo painel Gestor'
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('Este contato já está bloqueado.');
                }
                throw insertError;
            }

            setBlockedUsers(prev => [data, ...prev]);
            setNewBlockValue('');
            setNewBlockReason('');
        } catch (err: any) {
            setError(err.message || 'Erro ao adicionar bloqueio');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveBlock = async (id: string) => {
        try {
            const { error: delError } = await supabase
                .from('store_blocked_users')
                .delete()
                .eq('id', id);

            if (delError) throw delError;
            setBlockedUsers(prev => prev.filter(b => b.id !== id));
        } catch (err: any) {
            setError('Erro ao remover bloqueio: ' + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Gerenciar Bloqueios</h2>
                            <p className="text-xs text-gray-500 font-semibold">Impeça spam e pedidos de clientes específicos</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold rounded-2xl border border-red-100 dark:border-red-900/50">
                            {error}
                        </div>
                    )}

                    {/* Formulário de Adição */}
                    <form onSubmit={handleAddBlock} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Adicionar novo bloqueio</h3>
                        
                        <div className="flex flex-col md:flex-row gap-3">
                            <select 
                                value={newBlockType}
                                onChange={(e) => setNewBlockType(e.target.value as any)}
                                className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                            >
                                <option value="phone">Telefone (WhatsApp)</option>
                                <option value="email">E-mail</option>
                                <option value="ip">Endereço IP</option>
                            </select>

                            <input
                                type={newBlockType === 'email' ? 'email' : 'text'}
                                placeholder={newBlockType === 'phone' ? 'Ex: 11999999999' : newBlockType === 'email' ? 'email@cliente.com' : '192.168.0.1'}
                                value={newBlockValue}
                                onChange={(e) => setNewBlockValue(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                required
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Motivo (opcional)"
                                value={newBlockReason}
                                onChange={(e) => setNewBlockReason(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <Button 
                                type="submit" 
                                variant="danger" 
                                disabled={isSubmitting || !newBlockValue.trim()}
                                loading={isSubmitting}
                                icon={<Plus className="w-4 h-4" />}
                            >
                                Bloquear
                            </Button>
                        </div>
                    </form>

                    {/* Lista de Bloqueados */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Lista de Bloqueados ({blockedUsers.length})</h3>
                        
                        {loading ? (
                            <div className="py-10 flex justify-center"><Loading /></div>
                        ) : blockedUsers.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-gray-500">Nenhum bloqueio cadastrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {blockedUsers.map(block => (
                                    <div key={block.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                {block.block_type === 'phone' && <Smartphone className="w-5 h-5 text-gray-500" />}
                                                {block.block_type === 'email' && <Mail className="w-5 h-5 text-gray-500" />}
                                                {block.block_type === 'ip' && <Globe className="w-5 h-5 text-gray-500" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {block.block_type === 'phone' && '+'}
                                                    {block.block_value}
                                                </p>
                                                {block.reason && (
                                                    <p className="text-xs text-gray-500">{block.reason}</p>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    Bloqueado em {new Date(block.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveBlock(block.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                                            title="Remover bloqueio"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
