import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronUp, DollarSign, FileText, History, Lock, Package, Store } from 'lucide-react';
import * as cloud from '../services/cloud';
import { supabase } from '../services/cloud';
import { Button } from './Button';
import { Loading } from './Loading';
import { StoreDailyReport, PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';
import { getStoreOpenState } from '../utils/storeHours';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const StoreStatus: React.FC = () => {
  const dialog = useDialog();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  // Manual flag (used by getStoreOpenState and for the action button).
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StoreDailyReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showSuccess = (msg: string) => dialog.alert({ title: 'Sucesso', message: msg });
  const showError = (msg: string) => dialog.alert({ title: 'Erro', message: msg });

  const loadProfile = async () => {
    setInitialLoading(true);
    try {
      const p = await cloud.getMyPartnerProfile();
      if (p) {
        setProfile(p);
        setIsOpen(p.is_currently_open ?? p.is_open ?? false);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const fetchHistory = async () => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('store_daily_reports')
        .select('*')
        .eq('store_id', profile.id)
        .order('report_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    setShowHistory(prev => {
      const next = !prev;
      if (next) fetchHistory();
      return next;
    });
  };

  const generateDailyReport = async () => {
    if (!profile?.id) return;
    try {
      await cloud.generateDailyStoreReport(profile.id);
      if (showHistory) fetchHistory();
    } catch {
      showError('Erro ao salvar relatório diário.');
    }
  };

  const handleToggleStore = async () => {
    if (!profile?.id) {
      showError('Erro: Perfil não carregado. Recarregue a página.');
      return;
    }

    // If closing, confirm and generate a report.
    if (isOpen) {
      const confirmed = await dialog.confirm({
        title: 'Encerrar Expediente',
        message: 'Deseja realmente encerrar o expediente? Um relatório diário será gerado.',
        confirmButtonText: 'Sim, encerrar',
        cancelButtonText: 'Não, continuar aberto'
      });
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      const newState = !isOpen;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_open: newState, is_currently_open: newState })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      if (!newState) {
        await generateDailyReport();
        showSuccess('Loja encerrada e relatório gerado com sucesso!');
      } else {
        showSuccess('Loja aberta com sucesso!');
      }

      setIsOpen(newState);
      setProfile(prev => (prev ? { ...prev, is_open: newState, is_currently_open: newState } : null));
    } catch {
      showError('Erro ao alterar status. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const openState = useMemo(() => {
    if (!profile) return null;
    return getStoreOpenState({
      openingHours: profile.opening_hours,
      isOpen: profile.is_open,
      isCurrentlyOpen: isOpen
    });
  }, [profile, isOpen]);

  const statusTitle = openState?.isOpen ? 'Loja Aberta' : 'Loja Fechada';
  const statusBadge = openState?.isOpen ? 'ABERTA' : 'FECHADA';

  const statusDescription = useMemo(() => {
    if (!openState) return '';
    if (openState.isOpen) return 'Sua loja está visível para clientes.';
    if (openState.isManualOpen && !openState.isAutoOpen) return 'Fora do horário automático.';
    return 'Loja fechada manualmente.';
  }, [openState]);

  if (initialLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <Loading variant="container" size="md" message="Carregando status da loja..." />
      </div>
    );
  }

  if (!profile || !openState) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Perfil não carregado</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Não conseguimos carregar os dados da sua loja. Verifique sua conexão e tente novamente.
            </p>
            <div className="mt-5">
              <Button onClick={loadProfile} variant="outline">
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Status da Loja</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Abra ou feche sua loja manualmente. O horário automático continua valendo.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                openState.isOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40'
                  : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
              }`}
            >
              {openState.isOpen ? <Store className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    openState.isOpen
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}
                >
                  {statusBadge}
                </span>

                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    openState.isAutoOpen
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}
                >
                  {openState.isAutoOpen ? 'DENTRO DO HORÁRIO' : 'FORA DO HORÁRIO'}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {statusTitle}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{statusDescription}</p>

              {profile.opening_hours && (
                <p className="text-xs text-gray-400 mt-3">
                  Horário automático: <span className="font-mono">{profile.opening_hours}</span>
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleToggleStore}
              loading={isLoading}
              variant={isOpen ? 'danger' : 'success'}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isOpen ? 'Fechar Loja' : 'Abrir Loja'}
            </Button>

            <Button
              onClick={toggleHistory}
              variant="outline"
              className="w-full sm:w-auto min-w-[170px] justify-center"
            >
              {showHistory ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Ocultar Histórico
                </>
              ) : (
                <>
                  <History className="w-4 h-4" /> Ver Histórico
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Histórico de Fechamentos
              </h3>
            </div>
            {loadingHistory && <Loading variant="inline" size="xs" className="text-gray-400" />}
          </div>

          <div className="p-5 md:p-6">
            {loadingHistory ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Carregando histórico...
              </div>
            ) : history.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum relatório encontrado.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {history.map(report => (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold">
                        {new Date(report.report_date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(report.report_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-5 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span>{report.total_orders} pedidos</span>
                      </div>
                      <div className="flex items-center gap-1 font-black text-gray-900 dark:text-white">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span>{formatCurrency(report.total_revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

