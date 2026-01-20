import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, History, ChevronRight, AlertCircle, Info, Trophy, Target } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';


interface ScoreEvent {
    id: string;
    event_key: string;
    reason: string;
    impact: number;
    previous_score: number;
    new_score: number;
    created_at: string;
}

export const ScorePanel: React.FC = () => {
    const [score, setScore] = useState<number | null>(null);
    const [history, setHistory] = useState<ScoreEvent[]>([]);
    const [stats, setStats] = useState<{ cancellations: number, refusals: number }>({ cancellations: 0, refusals: 0 });
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const loadScoreData = async () => {
            try {
                const client = cloud.getClient();
                if (!client) return;

                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                // Buscar score atual
                const { data: profile } = await client
                    .from('user_profiles')
                    .select('score, cancellation_count_monthly, refusal_count_monthly')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setScore(profile.score);
                    setStats({
                        cancellations: profile.cancellation_count_monthly || 0,
                        refusals: profile.refusal_count_monthly || 0
                    });
                }

                // Buscar histórico
                const { data: historyData } = await client
                    .from('score_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (historyData) setHistory(historyData);
            } catch (error) {
                console.error('Erro ao carregar score:', error);
            } finally {
                setLoading(false);
            }
        };

        loadScoreData();
    }, []);

    if (loading) return (
        <div className="animate-pulse bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 w-24 mb-4 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 w-full rounded"></div>
        </div>
    );

    const getScoreColor = (val: number) => {
        if (val >= 800) return 'text-green-500';
        if (val >= 500) return 'text-blue-500';
        if (val >= 300) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreLabel = (val: number) => {
        if (val >= 900) return 'Excelente';
        if (val >= 700) return 'Bom';
        if (val >= 500) return 'Médio';
        if (val >= 300) return 'Baixo';
        return 'Crítico';
    };

    return (
        <div id="driver-score-panel" className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Meu Score</h3>
                    <div className="flex items-end gap-2">
                        <span className={`text-4xl font-black ${getScoreColor(score || 0)}`}>{score ?? 0}</span>
                        <span className="text-gray-300 font-bold mb-1">/ 1000</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 ml-2 ${getScoreColor(score || 0).replace('text', 'bg')}/10`}>
                            {getScoreLabel(score || 0)}
                        </span>
                    </div>
                </div>
                <div className={`p-3 rounded-2xl ${getScoreColor(score || 0).replace('text', 'bg')}/10`}>
                    <Trophy className={`w-6 h-6 ${getScoreColor(score || 0)}`} />
                </div>
            </div>

            {/* Barra de Progresso */}
            <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-6 max-w-full overflow-hidden">
                <div
                    className={`absolute h-full rounded-full transition-all duration-1000 ${getScoreColor(score || 0).replace('text', 'bg')}`}
                    style={{ width: `${Math.min(100, (score ?? 0) / 10)}%` }}
                ></div>
            </div>

            {/* Dicas/Status */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</p>
                    <p className="text-xs font-bold dark:text-gray-200">
                        {score && score >= 700 ? 'Preferência em pedidos' : 'Score padrão'}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Cancelamentos (Mês)</p>
                    <p className="text-xs font-bold dark:text-gray-200">
                        {stats.cancellations}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Recusas (Mês)</p>
                    <p className="text-xs font-bold dark:text-gray-200">
                        {stats.refusals}
                    </p>
                </div>
            </div>

            <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="justify-between group"
            >
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Score
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            </Button>

            {showHistory && (
                <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 border-t dark:border-gray-700 pt-4">
                    {history.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4">Nenhum evento registrado ainda.</p>
                    ) : (
                        history.map((event) => (
                            <div key={event.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${event.impact > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                        {event.impact > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold dark:text-gray-200">{event.reason || event.event_key}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Intl.DateTimeFormat('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }).format(new Date(event.created_at))}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-black ${event.impact > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {event.impact > 0 ? '+' : ''}{event.impact}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Info Badge */}
            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                <Info className="w-3 h-3 text-blue-500" />
                <span>O score impacta sua prioridade no radar de entregas.</span>
            </div>
        </div>
    );
};
