import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Loader2, Trash2, StopCircle, PlayCircle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { Collaborator } from '../types';
import { useDialog } from '../utils/dialogService';

export const StoreCollaborators = () => {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);

    const { alert } = useDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreCollaborators();
            setCollaborators(data);
        } finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!email || !name || !password) return;
        setCreating(true);
        try {
            await cloud.createCollaborator(email, name, password);
            await alert({ title: 'Sucesso', message: 'Colaborador criado!' });
            setShowAdd(false);
            setEmail('');
            setName('');
            setPassword('');
            load();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao criar. Verifique os dados.' });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, collaboratorName: string) => {
        const confirm = window.confirm(`Deseja realmente excluir o colaborador ${collaboratorName}? Esta ação é permanente.`);
        if (!confirm) return;

        try {
            await cloud.deleteCollaborator(id);
            setCollaborators(prev => prev.filter(c => c.id !== id));
            await alert({ title: 'Sucesso', message: 'Colaborador excluído.' });
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
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div>
                    <h2 className="font-bold text-lg dark:text-white">Colaboradores / Garçons</h2>
                    <p className="text-xs text-gray-500">Gerencie o acesso ao Módulo Mesa.</p>
                </div>
                <Button onClick={() => setShowAdd(!showAdd)}>
                    {showAdd ? 'Cancelar' : 'Adicionar Novo'}
                </Button>
            </div>

            {showAdd && (
                <div className="bg-white dark:bg-gray-800 border-l-4 border-brand-500 p-6 rounded-r-xl shadow-lg space-y-4 animate-in slide-in-from-top-2">
                    <p className="font-bold text-gray-800 dark:text-white">Novo Colaborador</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CustomInput placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} />
                        <CustomInput placeholder="E-mail de Login" value={email} onChange={e => setEmail(e.target.value)} />
                        <CustomInput placeholder="Senha de Acesso" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleCreate} disabled={creating} className="px-8">
                            {creating ? <Loader2 className="animate-spin" /> : 'Salvar Acesso'}
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {collaborators.map(c => (
                        <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group hover:border-brand-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {(c.name || c.email || (c as any).username || '?').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold dark:text-white">{c.name || (c as any).username || 'Sem Nome'}</div>
                                    <div className="text-xs text-gray-500">{c.email || (c as any).username}</div>

                                    <div className={`text-xs flex items-center gap-1 mt-1 ${c.active ? 'text-green-500' : 'text-red-500'}`}>
                                        <span className={`w-2 h-2 rounded-full ${c.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {c.active ? 'Ativo' : 'Inativo'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => toggleStatus(c.id, c.active)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                                    title={c.active ? "Desativar" : "Ativar"}
                                >
                                    {c.active ? <StopCircle className="w-5 h-5 text-red-400" /> : <PlayCircle className="w-5 h-5 text-green-400" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id, c.name || c.email || (c as any).username || 'Colaborador')}
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
                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400">Nenhum colaborador cadastrado.</p>
                </div>
            )}
        </div>
    );
};
