
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Search, Layers, Edit2 } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { AddonModal } from './AddonModal';
import { StoreAddonGroup } from '../types';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

export const AddonManager: React.FC = () => {
    const [groups, setGroups] = useState<StoreAddonGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<StoreAddonGroup | undefined>(undefined);
    const { confirm } = useDialog();
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setIsLoading(true);
        try {
            const [data, profile] = await Promise.all([
                cloud.getStoreAddonGroups(),
                cloud.getMyPartnerProfile()
            ]);
            setGroups(data);

            // Validar perfil
            if (profile && profile.city) {
                setProfileValid(true);
            } else {
                setProfileValid(false);
            }
        } catch (error) {
            console.error("Erro ao carregar grupos de adicionais:", error);
            setProfileValid(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingGroup(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (group: StoreAddonGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Grupo?',
            message: `Tem certeza que deseja excluir o grupo "${name}"?`,
            confirmButtonText: 'Excluir'
        });

        if (confirmed) {
            try {
                await cloud.deleteStoreAddonGroup(id);
                await loadGroups();
            } catch (error) {
                console.error("Erro ao excluir grupo:", error);
            }
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Validação de perfil
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar grupos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-brand-500"
                    />
                </div>
                <Button onClick={handleCreate} className="w-full md:w-auto rounded-2xl">
                    <Plus className="w-5 h-5 mr-2" />
                    Novo Grupo
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Layers className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nenhum grupo encontrado</h3>
                    <p className="text-gray-500">
                        {searchTerm ? 'Tente buscar com outro termo.' : 'Crie grupos de adicionais para seus produtos (ex: "Molhos", "Bordas").'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGroups.map((group) => (
                        <div
                            key={group.id}
                            className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-900 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{group.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {group.type === 'SINGLE' ? 'Escolha Única' : 'Múltipla Escolha'} • {group.options.length} opções
                                    </p>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {group.min} - {group.max}
                                </div>
                            </div>

                            {/* Options Preview */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 space-y-2">
                                {group.options.slice(0, 4).map((opt, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{opt.name}</span>
                                        <span className="text-gray-500 font-medium whitespace-nowrap">
                                            {opt.price > 0
                                                ? `+ ${opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                : 'Grátis'}
                                        </span>
                                    </div>
                                ))}
                                {group.options.length > 4 && (
                                    <div className="text-xs text-center text-gray-400 font-medium pt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                                        + {group.options.length - 4} opções
                                    </div>
                                )}
                                {group.options.length === 0 && (
                                    <div className="text-xs text-center text-gray-400 italic">
                                        Nenhuma opção adicionada
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => handleEdit(group)}
                                    className="flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-700 dark:text-gray-300 hover:text-brand-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(group.id, group.name)}
                                    className="py-2 px-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                    }
                </div >
            )}

            <AddonModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                groupToEdit={editingGroup}
                onSave={loadGroups}
            />
        </div >
    );
};
