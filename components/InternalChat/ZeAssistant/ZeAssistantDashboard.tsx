import React, { useState, useEffect } from 'react';
import * as cloud from '../../../services/cloud';
import {
    MessageCircle,
    ThumbsUp,
    Users,
    ShoppingCart,
    Clock,
    Activity
} from 'lucide-react';

interface DashboardStats {
    totalConversations: number;
    handoffCount: number;
    handoffRate: string;
    totalMessages: number;
    messagesByType: Record<string, number>;
    ordersCreated: number;
}

interface ZeAssistantDashboardProps {
    storeId: string;
}

export const ZeAssistantDashboard: React.FC<ZeAssistantDashboardProps> = ({ storeId }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');

    useEffect(() => {
        fetchStats();
    }, [storeId, period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const supabase = cloud.getClient();
            if (!supabase) return;

            const daysAgo = period === '30d' ? 30 : 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            const isoDate = startDate.toISOString();

            // Total de conversas ativas no período
            const { count: totalConv } = await supabase
                .from('ze_assistant_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .gte('last_message_at', isoDate);

            // Conversas processadas por IA vs Regras (simulado/estimado por enquanto)
            const { data: messages } = await supabase
                .from('ze_assistant_messages')
                .select('response_type')
                .eq('sender', 'assistant')
                .gte('created_at', isoDate)
                .limit(1000);

            // Buscar orders
            const { count: ordersCount } = await supabase
                .from('ze_assistant_orders')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .gte('created_at', isoDate);

            // Handoffs (status = handoff)
            const { count: handoffCount } = await supabase
                .from('ze_assistant_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .eq('status', 'handoff')
                .gte('updated_at', isoDate);

            setStats({
                totalConversations: totalConv || 0,
                handoffCount: handoffCount || 0,
                handoffRate: totalConv ? (((handoffCount || 0) / totalConv) * 100).toFixed(1) : '0',
                totalMessages: messages?.length || 0,
                messagesByType: {
                    AI: messages?.filter((m: any) => m.response_type === 'AI').length || 0,
                    RULE: messages?.filter((m: any) => m.response_type === 'RULE').length || 0,
                },
                ordersCreated: ordersCount || 0
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8 text-gray-400 gap-2">
            <Activity className="w-6 h-6 animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Carregando métricas...</span>
        </div>
    );

    if (!stats) return (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Nenhuma métrica disponível ainda.</p>
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Desempenho</h3>
                <div className="relative">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as '7d' | '30d')}
                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer hover:bg-gray-50"
                    >
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d">Últimos 30 dias</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-800 tracking-tight">{stats.totalConversations}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Conversas</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-800 tracking-tight">{stats.handoffRate}%</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Transbordo</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-800 tracking-tight">{stats.ordersCreated}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Pedidos</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Clock className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-800 tracking-tight">~2s</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Tempo Resp.</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    Distribuição de Respostas
                </h4>

                <div className="flex items-center gap-1 mb-2">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                            style={{ width: `${(stats.messagesByType.AI / (stats.totalMessages || 1)) * 100}%` }}
                            className="bg-gradient-to-r from-purple-500 to-purple-400 h-full relative group cursor-help"
                        >
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity">
                                {stats.messagesByType.AI} respostas IA
                            </div>
                        </div>
                        <div
                            style={{ width: `${(stats.messagesByType.RULE / (stats.totalMessages || 1)) * 100}%` }}
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-full relative group cursor-help"
                        >
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity">
                                {stats.messagesByType.RULE} regras fixas
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs font-medium text-gray-500 mt-2">
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                        IA ({Math.round((stats.messagesByType.AI / (stats.totalMessages || 1)) * 100)}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                        Regras ({Math.round((stats.messagesByType.RULE / (stats.totalMessages || 1)) * 100)}%)
                    </span>
                </div>
            </div>
        </div>
    );
};

