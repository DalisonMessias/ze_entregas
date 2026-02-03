
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Play, Pause, Save, X, Lightbulb } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { SystemTip, UserRole } from '../types';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';

export const AdminTips: React.FC = () => {
    const [tips, setTips] = useState<SystemTip[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTip, setEditingTip] = useState<SystemTip | null>(null);

    // Form state
    const [formMessage, setFormMessage] = useState('');
    const [formRole, setFormRole] = useState<UserRole | 'all'>('all');

    const { confirm, alert } = useDialog();

    const loadTips = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetSystemTips();
            setTips(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTips();
    }, []);

    const handleSubmit = async () => {
        if (!formMessage.trim()) {
            await alert({ title: 'Mensagem Obrigatória', message: 'A mensagem da dica não pode estar vazia.' });
            return;
        }

        setLoading(true);
        try {
            if (editingTip) {
                await cloud.adminUpdateSystemTip(editingTip.id, { message: formMessage, target_role: formRole });
                await alert({ title: 'Sucesso', message: 'Dica atualizada com sucesso!' });
            } else {
                await cloud.adminCreateSystemTip(formMessage, formRole);
                await alert({ title: 'Sucesso', message: 'Nova dica criada com sucesso!' });
            }
            setShowModal(false);
            resetForm();
            await loadTips();
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro ao Salvar', message: 'Falha ao salvar dica: ' + (e.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'Excluir Dica', message: 'Tem certeza que deseja excluir esta dica? Esta ação não pode ser desfeita.' });
        if (!ok) return;

        setLoading(true);
        try {
            await cloud.adminDeleteSystemTip(id);
            await alert({ title: 'Sucesso', message: 'Dica excluída com sucesso!' });
            await loadTips();
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro ao Excluir', message: 'Falha ao excluir dica: ' + (e.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (tip: SystemTip) => {
        setLoading(true);
        try {
            await cloud.adminUpdateSystemTip(tip.id, { is_active: !tip.is_active });
            await loadTips();
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro', message: 'Falha ao alterar status da dica:' + (e.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (tip: SystemTip) => {
        setEditingTip(tip);
        setFormMessage(tip.message);
        setFormRole(tip.target_role as any);
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingTip(null);
        setFormMessage('');
        setFormRole('all');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-in fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Lightbulb className="w-8 h-8 text-yellow-500" />
                        Dicas do Dia
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie as mensagens rotativas dos dashboards.</p>
                </div>
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Dica
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Mensagem</th>
                            <th className="p-4">Público Alvo</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Carregando...</td></tr>
                        ) : tips.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhuma dica cadastrada.</td></tr>
                        ) : (
                            tips.map(tip => (
                                <tr key={tip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="p-4 font-medium dark:text-white max-w-md truncate" title={tip.message}>
                                        {tip.message}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${tip.target_role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            tip.target_role === 'store_partner' ? 'bg-blue-100 text-blue-700' :
                                                tip.target_role === 'delivery_partner' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {tip.target_role === 'admin' ? 'Administrador' :
                                                tip.target_role === 'store_partner' ? 'Lojista' :
                                                    tip.target_role === 'delivery_partner' ? 'Entregador' : 'Todos'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleToggleActive(tip)}
                                            className={`p-1.5 rounded-full transition-colors ${tip.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                            title={tip.is_active ? "Desativar" : "Ativar"}
                                        >
                                            {tip.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openEdit(tip)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(tip.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl dark:text-white">{editingTip ? 'Editar Dica' : 'Nova Dica'}</h3>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mensagem</label>
                                <textarea
                                    value={formMessage}
                                    onChange={e => setFormMessage(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 mt-1 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-32 resize-none"
                                    placeholder="Digite a dica aqui..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Público Alvo</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormRole('all')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${formRole === 'all' ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-500'}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormRole('delivery_partner')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${formRole === 'delivery_partner' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-gray-500'}`}
                                    >
                                        Entregadores
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormRole('store_partner')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${formRole === 'store_partner' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-gray-500'}`}
                                    >
                                        Lojistas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormRole('admin')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${formRole === 'admin' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-gray-500'}`}
                                    >
                                        Admins
                                    </button>
                                </div>
                            </div>

                            <Button fullWidth onClick={handleSubmit} className="mt-4">
                                <Save className="w-4 h-4 mr-2" /> Salvar Dica
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
