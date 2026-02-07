import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { BaseAddonGroup, BaseAddonOption } from '../types';
import * as cloud from '../services/cloud';
import { Toast } from './Toast';

interface AdminBaseAddonModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupToEdit?: BaseAddonGroup;
    onSave?: () => void;
}

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const AdminBaseAddonModal: React.FC<AdminBaseAddonModalProps> = ({
    isOpen,
    onClose,
    groupToEdit,
    onSave
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(1);
    const [options, setOptions] = useState<Partial<BaseAddonOption>[]>([]);
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState('');
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (groupToEdit) {
            setName(groupToEdit.name || '');
            setType(groupToEdit.type || 'SINGLE');
            setMin(groupToEdit.min || 0);
            setMax(groupToEdit.max || 1);
            setOptions(groupToEdit.options || []);
        } else {
            resetForm();
        }
    }, [groupToEdit, isOpen]);

    const resetForm = () => {
        setName('');
        setType('SINGLE');
        setMin(0);
        setMax(1);
        setOptions([]);
        setNewOptionName('');
        setNewOptionPrice('');
        setEditingOptionId(null);
    };

    const handleAddOption = () => {
        if (!newOptionName.trim()) {
            setToast({ message: 'Nome da opção é obrigatório.', type: 'warning' });
            return;
        }

        const price = parseFloat(newOptionPrice.replace(',', '.')) || 0;

        if (editingOptionId) {
            setOptions(prev => prev.map(opt =>
                opt.id === editingOptionId
                    ? { ...opt, name: newOptionName, price }
                    : opt
            ));
            setEditingOptionId(null);
        } else {
            setOptions(prev => [...prev, {
                id: crypto.randomUUID(),
                name: newOptionName,
                price,
                is_active: true
            }]);
        }

        setNewOptionName('');
        setNewOptionPrice('');
    };

    const handleEditOption = (option: Partial<BaseAddonOption>) => {
        setNewOptionName(option.name || '');
        setNewOptionPrice(option.price?.toString() || '');
        setEditingOptionId(option.id || null);
    };

    const handleCancelEdit = () => {
        setNewOptionName('');
        setNewOptionPrice('');
        setEditingOptionId(null);
    };

    const handleRemoveOption = (id: string) => {
        setOptions(prev => prev.filter(opt => opt.id !== id));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setToast({ message: 'Nome do grupo é obrigatório.', type: 'warning' });
            return;
        }

        if (options.length === 0) {
            setToast({ message: 'Adicione pelo menos uma opção.', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const groupData: Partial<BaseAddonGroup> = {
                name,
                type,
                min,
                max: type === 'SINGLE' ? 1 : max,
                options: options as BaseAddonOption[],
                is_active: true
            };

            if (groupToEdit && groupToEdit.id) {
                await cloud.updateBaseAddonGroup(groupToEdit.id, groupData);
                setToast({ message: 'Grupo atualizado com sucesso!', type: 'success' });
            } else {
                await cloud.createBaseAddonGroup(groupData);
                setToast({ message: 'Grupo criado com sucesso!', type: 'success' });
            }

            onSave?.();
            setTimeout(() => {
                onClose();
                resetForm();
            }, 1000);
        } catch (error: any) {
            console.error("Erro ao salvar grupo:", error);
            setToast({ message: error.message || 'Erro ao salvar grupo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh] scrollbar-none [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-black dark:text-white">
                                {groupToEdit ? 'Editar Grupo de Adicionais' : 'Novo Grupo de Adicionais'}
                            </h3>
                            <p className="text-gray-500 text-sm">Configure as opções disponíveis para os lojistas</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Nome do Grupo */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nome do Grupo *</label>
                            <CustomInput
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Molhos, Bordas, Bebidas..."
                            />
                        </div>

                        {/* Tipo de Escolha com Switch */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Tipo de Escolha *</label>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        onClick={() => setType('SINGLE')}
                                        className={`relative h-6 w-12 rounded-full transition-all ${type === 'SINGLE' ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${type === 'SINGLE' ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">Escolha Única</p>
                                        <p className="text-xs text-gray-500">Cliente escolhe apenas 1 opção</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        onClick={() => setType('MULTIPLE')}
                                        className={`relative h-6 w-12 rounded-full transition-all ${type === 'MULTIPLE' ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${type === 'MULTIPLE' ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">Escolha Múltipla</p>
                                        <p className="text-xs text-gray-500">Cliente pode escolher várias</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mín/Máx - apenas para MULTIPLE */}
                        {type === 'MULTIPLE' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text- gray-700 dark:text-gray-300 mb-2">Mínimo de Escolhas</label>
                                    <CustomInput
                                        type="number"
                                        value={min}
                                        onChange={(e) => setMin(Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Máximo de Escolhas</label>
                                    <CustomInput
                                        type="number"
                                        value={max}
                                        onChange={(e) => setMax(Number(e.target.value))}
                                        min={1}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Adicionar Opção */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl space-y-3">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                {editingOptionId ? 'Editar Opção' : 'Adicionar Opção'}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-1">
                                    <CustomInput
                                        value={newOptionName}
                                        onChange={(e) => setNewOptionName(e.target.value)}
                                        placeholder="Nome da opção"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <CustomInput
                                        value={newOptionPrice}
                                        onChange={(e) => setNewOptionPrice(e.target.value)}
                                        placeholder="Preço (R$)"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                        type="currency"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {editingOptionId ? (
                                        <>
                                            <Button onClick={handleAddOption} variant="success" className="flex-1">
                                                Salvar
                                            </Button>
                                            <Button onClick={handleCancelEdit} variant="secondary">
                                                Cancelar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={handleAddOption} variant="primary" fullWidth>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Adicionar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lista de Opções */}
                        {options.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Opções ({options.length})</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                                    {options.map((option) => (
                                        <div key={option.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm dark:text-white">{option.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {option.price && option.price > 0
                                                        ? option.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                        : 'Grátis'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditOption(option)}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-xl transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveOption(option.id!)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
                        <Button onClick={onClose} variant="secondary" disabled={isSaving} fullWidth>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} variant="primary" disabled={isSaving} fullWidth>
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="spinning" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};
