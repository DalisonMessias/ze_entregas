import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Loader2, Trash2, StopCircle, PlayCircle, Edit2, X } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { Collaborator } from '../types';
import { useDialog } from '../utils/dialogService';

export const StoreCollaborators = () => {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form fields
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    const { alert, confirm } = useDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreCollaborators();
            setCollaborators(data);
        } finally { setLoading(false); }
    };

    const resetForm = () => {
        setEmail('');
        setName('');
        setPassword('');
        setEditingId(null);
        setShowAdd(false);
    };

    const handleSave = async () => {
        if (!email || !name || (!editingId && !password)) {
            await alert({ title: 'Atenção', message: 'Preencha todos os campos obrigatórios.' });
            return;
        }

        setProcessing(true);
        try {
            if (editingId) {
                await cloud.updateCollaborator(editingId, name, email, password || undefined);
                await alert({ title: 'Sucesso', message: 'Colaborador atualizado com sucesso!' });
            } else {
                await cloud.createCollaborator(email, name, password);
                await alert({ title: 'Sucesso', message: 'Colaborador criado com sucesso!' });
            }
            resetForm();
            load();
        } catch (e: any) {
            // console.error(e);
            await alert({
                title: 'Erro',
                message: e.message?.includes('unique_store_email')
                    ? 'Este e-mail já está em uso nesta loja.'
                    : 'Falha ao salvar. Verifique os dados e tente novamente.'
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleEdit = (collaborator: Collaborator) => {
        setName(collaborator.name || '');
        setEmail(collaborator.email || '');
        setPassword(''); // Always reset password on edit
        setEditingId(collaborator.id);
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, collaboratorName: string) => {
        const isConfirmed = await confirm({
            title: 'Excluir Colaborador',
            message: `Deseja realmente excluir permanentemente o acesso de ${collaboratorName}? Esta ação não pode ser desfeita.`,
            confirmButtonText: 'Sim, Excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        try {
            await cloud.deleteCollaborator(id);
            setCollaborators(prev => prev.filter(c => c.id !== id));
            await alert({ title: 'Sucesso', message: 'Colaborador excluído com sucesso.' });
        } catch {
            await alert({ title: 'Erro', message: 'Falha ao excluir colaborador.' });
        }
    };

    const toggleStatus = async (id: string, current: boolean) => {
        const newStatus = !current;
        try {
            await cloud.toggleCollaboratorStatus(id, newStatus);
            setCollaborators(prev => prev.map(c => c.id === id ? { ...c, active: newStatus } : c));
        } catch {
            await alert({ title: 'Erro', message: 'Falha ao alterar status.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-500" />
                        Colaboradores / Garçons
                    </h2>
                    <p className="text-xs text-gray-500">Gerencie o acesso e permissões da sua equipe.</p>
                </div>
                {!showAdd && (
                    <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Novo Colaborador
                    </Button>
                )}
            </div>

            {showAdd && (
                <div className="bg-white dark:bg-gray-800 border-2 border-brand-100 dark:border-brand-900/30 p-6 rounded-2xl shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
                        <p className="font-bold text-lg text-gray-800 dark:text-white">
                            {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
                        </p>
                        <button onClick={resetForm} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">NOME COMPLETO</label>
                            <CustomInput placeholder="Ex: João Silva" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">E-MAIL (LOGIN)</label>
                            <CustomInput placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">
                                {editingId ? 'SENHA (DEIXE EM BRANCO PARA MANTER)' : 'SENHA DE ACESSO'}
                            </label>
                            <CustomInput placeholder="******" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={resetForm} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={processing} className="px-10">
                            {processing ? <Loader2 className="animate-spin" /> : editingId ? 'Salvar Alterações' : 'Criar Acesso'}
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="animate-spin text-brand-600 w-10 h-10" />
                    <p className="text-gray-400 animate-pulse">Carregando equipe...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collaborators.map(c => (
                        <div key={c.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start group hover:shadow-md hover:border-brand-200 dark:hover:border-brand-900/50 transition-all duration-300">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden ${c.active ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                                    {c.avatar_url ? (
                                        <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                                    ) : (
                                        (c.name || c.email || '?').substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="font-bold text-gray-800 dark:text-white group-hover:text-brand-600 transition-colors truncate max-w-[150px]">
                                        {c.name || 'Sem Nome'}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{c.email}</div>

                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                        {c.active ? 'Ativo' : 'Inativo'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => handleEdit(c)}
                                    className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-400 hover:text-brand-500 transition-colors"
                                    title="Editar Dados"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => toggleStatus(c.id, c.active)}
                                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${c.active ? 'text-orange-400' : 'text-green-400'}`}
                                    title={c.active ? "Desativar" : "Ativar"}
                                >
                                    {c.active ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id, c.name || c.email || 'Colaborador')}
                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Excluir Permanentemente"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && collaborators.length === 0 && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Users className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-gray-500 font-bold">Sua equipe está vazia</h3>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">Comece adicionando garçons ou colaboradores para gerenciar seus pedidos de mesa.</p>
                    <Button onClick={() => setShowAdd(true)} variant="secondary" className="mt-6 border-brand-200 text-brand-600">
                        Adicionar Primeiro Colaborador
                    </Button>
                </div>
            )}
        </div>
    );
};
