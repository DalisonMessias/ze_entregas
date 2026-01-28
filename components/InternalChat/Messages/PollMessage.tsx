import React, { useState, useEffect } from 'react';
import { Circle, CheckCircle2, Users, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrl } from '../../../utils/apiConfig';
import { BaseModal } from '../../BaseModal';

interface PollMessageProps {
    messageId: string;
    question: string;
    options: string[];
    allowMultiple: boolean;
    visitorId: string;
    visitorName?: string;
}

interface PollVote {
    voter_name: string;
    option_index: number;
    created_at: string;
}

export const PollMessage: React.FC<PollMessageProps> = ({ messageId, question, options, allowMultiple, visitorId, visitorName }) => {
    const [votes, setVotes] = useState<number[]>([]);
    const [allVotes, setAllVotes] = useState<PollVote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showVotesModal, setShowVotesModal] = useState(false);

    useEffect(() => {
        loadVotes();
    }, [messageId]);

    const loadVotes = async () => {
        try {
            const response = await axios.get(`${getApiBaseUrl()}/polls/${messageId}/votes`);
            const data = response.data as PollVote[];
            setAllVotes(data);

            // Minhas escolhas baseadas no visitorId
            const myChoices = data
                .filter(v => (v as any).voter_id === visitorId)
                .map(v => v.option_index);
            setVotes(myChoices);
        } catch (e) {
            console.error("Erro ao carregar votos", e);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleVote = async (index: number) => {
        const isSelected = votes.includes(index);
        let newVotes = [...votes];

        if (isSelected) {
            newVotes = newVotes.filter(v => v !== index);
        } else {
            if (allowMultiple) {
                newVotes.push(index);
            } else {
                newVotes = [index];
            }
        }

        setVotes(newVotes);

        try {
            await axios.post(`${getApiBaseUrl()}/polls/${messageId}/vote`, {
                optionIndex: index,
                visitorId,
                visitorName: visitorName || 'Visitante',
                action: isSelected ? 'remove' : 'add',
                allowMultiple
            });
            loadVotes(); // Recarregar para sincronizar com outros votos
        } catch (e) {
            console.error("Erro ao votar", e);
            // Reverter em caso de erro? 
        }
    };

    const getVoteCount = (idx: number) => {
        return allVotes.filter(v => v.option_index === idx).length;
    };

    const getTotalVotes = () => allVotes.length;

    return (
        <div className="min-w-[250px] max-w-sm bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm select-none border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 leading-snug">{question}</h3>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-green-500" size={24} />
                </div>
            ) : (
                <div className="space-y-3">
                    {options.map((opt, idx) => {
                        const isSelected = votes.includes(idx);
                        const count = getVoteCount(idx);
                        const total = getTotalVotes();
                        const percentage = total > 0 ? (count / total) * 100 : 0;

                        return (
                            <div
                                key={idx}
                                onClick={() => toggleVote(idx)}
                                className="group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-green-50 dark:hover:bg-green-900/10 border border-transparent hover:border-green-100 dark:hover:border-green-800/30">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'}`}>
                                        {isSelected && <CheckCircle2 size={16} className="text-white" />}
                                    </div>
                                    <span className={`text-sm flex-1 font-medium ${isSelected ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>{opt}</span>
                                </div>
                                {/* Barra de progresso real */}
                                <div className="flex items-center gap-2 px-2 mt-1">
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-700 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tabular-nums min-w-[20px]">{count}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowVotesModal(true); }}
                    className="w-full py-2 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-black uppercase tracking-widest hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all active:scale-95"
                >
                    <Users size={16} /> Ver votos
                </button>
            </div>

            {/* Modal de Detalhes dos Votos */}
            <BaseModal isOpen={showVotesModal} onClose={() => setShowVotesModal(false)} title="Detalhes da Enquete" icon={<Users className="w-6 h-6 text-green-500" />}>
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Pergunta</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{question}</p>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {allVotes.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 italic text-sm">Nenhum voto registrado ainda.</div>
                        ) : (
                            allVotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((v, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-bold text-xs uppercase">
                                            {v.voter_name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{v.voter_name}</p>
                                            <p className="text-[10px] text-gray-500">{new Date(v.created_at).toLocaleDateString('pt-BR')} às {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 px-2 py-1 rounded-full font-bold uppercase truncate max-w-[100px]">
                                        {options[v.option_index]}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => setShowVotesModal(false)}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-500/20"
                    >
                        Fechar
                    </button>
                </div>
            </BaseModal>
        </div>
    );
};
