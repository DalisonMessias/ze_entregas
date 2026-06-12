import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, Plus, Edit2, Trash2, Power, PauseCircle, PlayCircle, ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { Skeleton } from './Skeleton';

export const AdminFixedDrivers = () => {
    const { t } = useTranslation();
    const [assignments, setAssignments] = useState<deliveryFixed.DeliveryFixedAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const dialog = useDialog();

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const data = await deliveryFixed.getFixedAssignments();
            setAssignments(data);
        } catch (error) {
            console.error('Error loading assignments:', error);
            dialog.toast('Erro ao carregar entregadores fixos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        dialog.toast('Funcionalidade de adicionar em desenvolvimento', 'info');
    };

    const handleSuspend = async (assignment: deliveryFixed.DeliveryFixedAssignment) => {
        const action = assignment.status === 'SUSPENDED' ? 'Reativar' : 'Suspender';
        const newStatus = assignment.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        
        dialog.confirm({
            title: `${action} Vínculo`,
            message: `Tem certeza que deseja ${action.toLowerCase()} o vínculo de ${assignment.driver?.full_name} com ${assignment.store?.name}?`,
            confirmLabel: action,
            cancelLabel: 'Cancelar',
            onConfirm: async () => {
                try {
                    await deliveryFixed.updateFixedAssignment(assignment.id!, { status: newStatus });
                    dialog.toast(`Vínculo ${action.toLowerCase()}do com sucesso.`, 'success');
                    loadAssignments();
                } catch (error) {
                    dialog.toast(`Erro ao ${action.toLowerCase()} vínculo.`, 'error');
                }
            }
        });
    };

    const handleRemove = async (assignment: deliveryFixed.DeliveryFixedAssignment) => {
        dialog.confirm({
            title: 'Remover Vínculo',
            message: `Tem certeza que deseja remover permanentemente o vínculo de ${assignment.driver?.full_name} com ${assignment.store?.name}?`,
            confirmLabel: 'Remover',
            cancelLabel: 'Cancelar',
            onConfirm: async () => {
                try {
                    await deliveryFixed.updateFixedAssignment(assignment.id!, { status: 'REMOVED' });
                    dialog.toast('Vínculo removido com sucesso.', 'success');
                    loadAssignments();
                } catch (error) {
                    dialog.toast('Erro ao remover vínculo.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-500" />
                        Entregadores Fixos
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gerencie os vínculos de entregadores exclusivos e prioritários das lojas.
                    </p>
                </div>
                <Button onClick={handleAdd} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Vínculo
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por loja ou entregador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 grid grid-cols-12 gap-4">
                    <div className="col-span-3">Entregador</div>
                    <div className="col-span-3">Loja</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Ações</div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-4 grid grid-cols-12 gap-4">
                                <div className="col-span-3"><Skeleton className="h-5 w-3/4" /></div>
                                <div className="col-span-3"><Skeleton className="h-5 w-3/4" /></div>
                                <div className="col-span-2"><Skeleton className="h-5 w-1/2" /></div>
                                <div className="col-span-2"><Skeleton className="h-5 w-1/2" /></div>
                                <div className="col-span-2"><Skeleton className="h-8 w-8 ml-auto" /></div>
                            </div>
                        ))
                    ) : assignments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum vínculo encontrado.
                        </div>
                    ) : (
                        assignments.filter(a => a.status !== 'REMOVED').map((assignment) => (
                            <div key={assignment.id} className="p-4 grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-3 font-medium text-gray-900 dark:text-white">{assignment.driver?.full_name || 'N/A'}</div>
                                <div className="col-span-3 text-gray-600 dark:text-gray-400">{assignment.store?.name || 'N/A'}</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        {assignment.assignment_type}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                        assignment.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        assignment.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {assignment.status}
                                    </span>
                                </div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleSuspend(assignment)}>
                                        {assignment.status === 'SUSPENDED' ? <PlayCircle className="w-4 h-4 text-green-500" /> : <PauseCircle className="w-4 h-4 text-orange-500" />}
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleRemove(assignment)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};