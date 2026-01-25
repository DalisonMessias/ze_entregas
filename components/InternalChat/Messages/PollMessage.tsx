import React, { useState } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';

interface PollMessageProps {
    question: string;
    options: string[];
    allowMultiple: boolean;
    onVote?: (optionIndex: number) => void;
}

export const PollMessage: React.FC<PollMessageProps> = ({ question, options, allowMultiple }) => {
    // Estado local para simular a votação visualmente (já que o backend pode não persistir)
    // Em um cenário real, isso viria das props da mensagem atualizada via websocket
    const [votes, setVotes] = useState<number[]>([]);

    const toggleVote = (index: number) => {
        if (votes.includes(index)) {
            setVotes(votes.filter(v => v !== index));
        } else {
            if (allowMultiple) {
                setVotes([...votes, index]);
            } else {
                setVotes([index]);
            }
        }
    };

    return (
        <div className="min-w-[250px] max-w-sm bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm select-none">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4 leading-snug">{question}</h3>
            <div className="space-y-2">
                {options.map((opt, idx) => {
                    const isSelected = votes.includes(idx);
                    return (
                        <div
                            key={idx}
                            onClick={() => toggleVote(idx)}
                            className="group cursor-pointer"
                        >
                            <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-500 group-hover:border-gray-400'}`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{opt}</span>
                            </div>
                            {/* Barra de progresso simulada */}
                            <div className="flex items-center gap-2 px-2 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-500"
                                        style={{ width: isSelected ? '100%' : '0%' }} // Simulação: 1 voto = 100% ou 0 se ninguém votou (local)
                                    />
                                </div>
                                <span className="text-xs text-gray-400 tabular-nums">{isSelected ? 1 : 0}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                <button className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
                    Ver votos
                </button>
            </div>
        </div>
    );
};
