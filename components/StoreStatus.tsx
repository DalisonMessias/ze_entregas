import React, { useState, useEffect } from 'react';
import * as cloud from '../services/cloud';
import { supabase } from '../services/cloud';
import { Store, Lock, History, ChevronDown, ChevronUp, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import { StoreDailyReport, PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';

// Utilitário simples de formatação
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const StoreStatus: React.FC = () => {
    const dialog = useDialog();
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<StoreDailyReport[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Helpers de feedback
    const showSuccess = (msg: string) => dialog.alert({ title: "Sucesso", message: msg });
    const showError = (msg: string) => dialog.alert({ title: "Erro", message: msg });

    const loadProfile = async () => {
        setInitialLoading(true);
        try {
            const p = await cloud.getMyPartnerProfile();
            if (p) {
                setProfile(p);
                setIsOpen(!!p.is_open);
            }
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleToggleStore = async () => {
        if (!profile?.id) {
            // console.error("Tentativa de alterar status sem perfil carregado.");
            showError("Erro: Perfil não carregado. Recarregue a página.");
            return;
        }

        // Se estiver fechando, confirmar e gerar relatório
        if (isOpen) {
            const confirmed = await dialog.confirm({
                title: "Encerrar Expediente",
                message: "Deseja realmente encerrar o expediente? Um relatório diário será gerado.",
                confirmButtonText: "Sim, encerrar",
                cancelButtonText: "Não, continuar aberto"
            });

            if (!confirmed) return;
        }

        setIsLoading(true);
        try {
            const newState = !isOpen;

            // 1. Atualizar status no perfil
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ is_open: newState })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            // 2. Se fechou, gerar relatório
            if (!newState) {
                await generateDailyReport();
                showSuccess("Loja encerrada e relatório gerado com sucesso!");
            } else {
                showSuccess("Loja aberta com sucesso!");
            }

            // Atualizar estado local APENAS se sucesso
            setIsOpen(newState);

            // Atualizar perfil localmente sem re-fetch completo para evitar race condition
            // ou fazer o refetch com delay se necessário, mas o estado local manda por enquanto
            setProfile(prev => prev ? { ...prev, is_open: newState } : null);

        } catch (error) {
            // console.error("Erro ao alterar status da loja:", error);
            showError("Erro ao alterar status. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const generateDailyReport = async () => {
        if (!profile?.id) return;
        try {
            await cloud.generateDailyStoreReport(profile.id);
            // Recarregar histórico se estiver aberto
            if (showHistory) fetchHistory();
        } catch (err) {
            // console.error("Erro ao gerar relatório:", err);
            showError("Erro ao salvar relatório diário.");
        }
    };

    const fetchHistory = async () => {
        if (!profile?.id) return;
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('store_daily_reports')
                .select('*')
                .eq('store_id', profile.id)
                .order('report_date', { ascending: false })
                .limit(30); // Últimos 30 fechamentos

            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            // console.error("Erro ao buscar histórico:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) fetchHistory();
        setShowHistory(!showHistory);
    };

    if (initialLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Carregando informações da loja...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ops! Perfil não carregado</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Não conseguimos carregar os dados da sua loja. Verifique sua conexão.</p>
                <button
                    onClick={loadProfile}
                    className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
            <div className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isOpen ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isOpen ? <Store className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isOpen ? 'Loja Aberta' : 'Loja Fechada'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isOpen ? 'Sua loja está visível para clientes.' : 'Sua loja não está recebendo pedidos.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleToggleStore}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors w-full md:w-auto ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        {isLoading ? 'Processando...' : (isOpen ? 'Encerrar Dia' : 'Abrir Loja')}
                    </button>

                    <button
                        onClick={toggleHistory}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Histórico de Fechamentos"
                    >
                        {showHistory ? <ChevronUp className="w-5 h-5" /> : <History className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Área de Histórico (Expansível) */}
            {showHistory && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Histórico de Fechamentos
                    </h4>

                    {loadingHistory ? (
                        <div className="text-center py-4 text-gray-500">Carregando...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">Nenhum relatório encontrado.</div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {history.map((report) => (
                                <div key={report.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 text-sm">
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {new Date(report.report_date).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {new Date(report.report_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Package className="w-4 h-4 text-blue-400" />
                                            <span>{report.total_orders} peds</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                            <span>{formatCurrency(report.total_revenue)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
