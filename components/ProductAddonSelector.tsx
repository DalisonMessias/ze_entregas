import React, { useState, useEffect } from 'react';
import { StoreAddonGroup, StoreAddonOption } from '../types';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Button } from './Button';

interface ProductAddonSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    group: StoreAddonGroup;
    onConfirm: (selectedOptions: { optionId: string; optionName: string; optionPrice: number; quantity: number }[]) => void;
    initialSelection?: { optionId: string; optionName: string; optionPrice: number; quantity: number }[];
}

export const ProductAddonSelector: React.FC<ProductAddonSelectorProps> = ({
    isOpen,
    onClose,
    group,
    onConfirm,
    initialSelection = []
}) => {
    const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: number }>(() => {
        const initialMap: { [key: string]: number } = {};
        initialSelection.forEach(item => {
            initialMap[item.optionId] = item.quantity;
        });
        return initialMap;
    });

    const totalSelected = Object.values(selectedOptions).reduce((sum, qty) => sum + qty, 0);

    const handleToggleOption = (option: StoreAddonOption) => {
        if (group.type === 'SINGLE') {
            setSelectedOptions({ [option.id]: 1 });
        } else {
            const currentQty = selectedOptions[option.id] || 0;
            if (currentQty > 0) {
                const newMap = { ...selectedOptions };
                delete newMap[option.id];
                setSelectedOptions(newMap);
            } else {
                if (group.max > 0 && totalSelected >= group.max) return;
                setSelectedOptions({ ...selectedOptions, [option.id]: 1 });
            }
        }
    };

    const handleUpdateQuantity = (optionId: string, delta: number) => {
        if (group.type === 'SINGLE') return;

        const currentQty = selectedOptions[optionId] || 0;
        const newQty = Math.max(0, currentQty + delta);

        if (newQty > 0) {
            if (delta > 0 && group.max > 0 && totalSelected >= group.max) return;
            setSelectedOptions({ ...selectedOptions, [optionId]: newQty });
        } else {
            const newMap = { ...selectedOptions };
            delete newMap[optionId];
            setSelectedOptions(newMap);
        }
    };

    const handleConfirm = () => {
        const result = group.options
            .filter(opt => selectedOptions[opt.id] > 0)
            .map(opt => ({
                optionId: opt.id,
                optionName: opt.name,
                optionPrice: opt.price,
                quantity: selectedOptions[opt.id]
            }));
        onConfirm(result);
        onClose();
    };

    const isValid = totalSelected >= group.min && (group.max === 0 || totalSelected <= group.max);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 border-x border-t sm:border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">
                            {group.name}
                        </h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                            {group.type === 'SINGLE' ? 'Escolha 1' : `Escolha de ${group.min} a ${group.max > 0 ? group.max : 'ilimitado'}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-6">
                    {group.options.map(option => {
                        const isSelected = !!selectedOptions[option.id];
                        const quantity = selectedOptions[option.id] || 0;

                        return (
                            <div
                                key={option.id}
                                onClick={() => group.type === 'SINGLE' && handleToggleOption(option)}
                                className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}
                            >
                                <div className="flex-1" onClick={(e) => {
                                    if (group.type === 'MULTIPLE') {
                                        e.stopPropagation();
                                        handleToggleOption(option);
                                    }
                                }}>
                                    <p className="font-bold text-gray-900 dark:text-white">{option.name}</p>
                                    <p className="text-sm font-black text-brand-600">
                                        {option.price === 0 ? 'Grátis' : `+ R$ ${option.price.toFixed(2).replace('.', ',')}`}
                                    </p>
                                </div>

                                {group.type === 'MULTIPLE' ? (
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(option.id, -1); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-4 text-center font-bold text-sm dark:text-white">{quantity}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(option.id, 1); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-brand-500 hover:scale-110 transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-200 dark:border-gray-700'}`}>
                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        fullWidth
                        size="lg"
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className="rounded-2xl py-4 font-black tracking-tight shadow-xl shadow-brand-500/20"
                    >
                        Confirmar Seleção
                    </Button>
                    {!isValid && (
                        <p className="text-[10px] text-center text-red-500 font-bold uppercase tracking-widest mt-3">
                            {totalSelected < group.min ? `Selecione pelo menos ${group.min} item(s)` : `Máximo de ${group.max} item(s) atingido`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
