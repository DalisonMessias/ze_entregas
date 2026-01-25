import React, { useState } from 'react';
import { BaseModal } from '../../BaseModal';
import { Button } from '../../Button';
import { BarChart2, Plus, Trash2, Send } from 'lucide-react';

interface PollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (poll: { question: string; options: string[]; allowMultiple: boolean }) => void;
}

export const PollModal: React.FC<PollModalProps> = ({ isOpen, onClose, onSend }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(true);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        if (options.length < 12) setOptions([...options, '']);
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleSend = () => {
        const validOptions = options.filter(o => o.trim() !== '');
        if (question.trim() && validOptions.length >= 2) {
            onSend({
                question,
                options: validOptions,
                allowMultiple
            });
            onClose();
            // Reset state
            setQuestion('');
            setOptions(['', '']);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Criar Enquete"
            icon={<BarChart2 className="w-6 h-6 text-yellow-500" />}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pergunta</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Faça uma pergunta..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Opções</label>
                    {options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                value={opt}
                                onChange={e => handleOptionChange(i, e.target.value)}
                                placeholder={`Opção ${i + 1}`}
                            />
                            {options.length > 2 && (
                                <button
                                    onClick={() => removeOption(i)}
                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {options.length < 12 && (
                        <button
                            onClick={addOption}
                            className="flex items-center gap-2 text-sm font-bold text-yellow-600 hover:text-yellow-700 mt-2 p-2 hover:bg-yellow-50 rounded-lg transition-colors w-full justify-center border-2 border-dashed border-yellow-200"
                        >
                            <Plus className="w-4 h-4" /> Adicionar Opção
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="allowMultiple"
                        checked={allowMultiple}
                        onChange={e => setAllowMultiple(e.target.checked)}
                        className="w-4 h-4 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                    />
                    <label htmlFor="allowMultiple" className="text-sm text-gray-600 dark:text-gray-400 select-none">Permitir múltiplas respostas</label>
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                    <Button onClick={handleSend} className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-200 dark:shadow-none flex gap-2">
                        <Send className="w-4 h-4" /> Enviar Enquete
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};
