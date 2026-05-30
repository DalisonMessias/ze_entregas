import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronUp, DollarSign, FileText, History, Lock, Package, Store, Clock } from 'lucide-react';
import * as cloud from '../services/cloud';
import { supabase } from '../services/cloud';
import { Button } from './Button';
import { Loading } from './Loading';
import { StoreDailyReport, PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';
import { getStoreOpenState } from '../utils/storeHours';
import { BaseModal } from './BaseModal';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const StoreStatus: React.FC = () => {
  const dialog = useDialog();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  // This state now reflects the manual toggle's intention.
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StoreDailyReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showDurationModal, setShowDurationModal] = useState(false);
  const [modalPendingState, setModalPendingState] = useState<boolean | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('30');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours'>('minutes');

  const showSuccess = (msg: string) => dialog.alert({ title: 'Sucesso', message: msg });
  const showError = (msg: string) => dialog.alert({ title: 'Erro', message: msg });

  const loadProfile = async () => {
    setInitialLoading(true);
    try {
      const p = await cloud.getMyPartnerProfile();
      if (p) {
        setProfile(p);
        // Initialize manual state from the database
        setIsManuallyOpen(p.is_open ?? false);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Timer to update the current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Runs every minute

    return () => clearInterval(timer);
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

  const handleToggleStore = () => {
    const currentEffectiveState = openState?.isOpen ?? false;
    const nextState = !currentEffectiveState;
    setModalPendingState(nextState);
    setShowDurationModal(true);
  };

  const applyToggleStoreStatus = async (
    newManualState: boolean,
    durationType: '1h' | '2h' | '3h' | '4h' | 'today' | 'indefinite' | 'custom',
    customMinutes?: number
  ) => {
    setShowDurationModal(false);
    
    if (!profile?.id) {
      showError('Erro: Perfil não carregado. Recarregue a página.');
      return;
    }

    // Se estiver FECHANDO a loja, confirmamos e geramos um relatório diário.
    const currentEffectiveState = openState?.isOpen ?? false;
    if (currentEffectiveState && !newManualState) {
      const confirmed = await dialog.confirm({
        title: 'Encerrar Expediente',
        message: 'Deseja realmente encerrar o expediente? Um relatório diário será gerado.',
        confirmButtonText: 'Sim, encerrar',
        cancelButtonText: 'Não, continuar aberto'
      });
      if (!confirmed) {
        return;
      }
    }

    setIsLoading(true);

    let success = false;
    let limitDate: Date | null = null;
    
    // Calcular manual_override_until com base no tipo de duração escolhido
    if (durationType === '1h') {
      limitDate = new Date(Date.now() + 60 * 60 * 1000);
    } else if (durationType === '2h') {
      limitDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    } else if (durationType === '3h') {
      limitDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
    } else if (durationType === '4h') {
      limitDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
    } else if (durationType === 'today') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      limitDate = endOfDay;
    } else if (durationType === 'custom' && customMinutes) {
      limitDate = new Date(Date.now() + customMinutes * 60 * 1000);
    }

    try {
      // Atualizar no banco de dados junto com a expiração do temporizador
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          is_open: newManualState,
          manual_override: true,
          manual_override_until: limitDate ? limitDate.toISOString() : null
        })
        .eq('id', profile.id);

      if (profileError) {
        throw profileError;
      }

      // Se a loja foi efetivamente fechada, gera relatório diário
      if (!newManualState) {
        await generateDailyReport();
      }

      // Atualizar o perfil localmente
      setProfile(prev => (prev ? {
        ...prev,
        is_open: newManualState,
        manual_override: true,
        manual_override_until: limitDate ? limitDate.toISOString() : null
      } as any : null));

      success = true;

    } catch (e) {
      console.error('[StoreStatus] Error in applyToggleStoreStatus:', e);
      showError('Erro ao alterar status. Tente novamente.');
    } finally {
      setIsLoading(false);

      if (success) {
        let msg = '';
        if (newManualState) {
          msg = durationType === 'indefinite'
            ? 'Loja aberta manualmente por tempo indeterminado. A automação foi pausada.'
            : `Loja aberta manualmente temporariamente. A automação será retomada em ${limitDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
        } else {
          msg = durationType === 'indefinite'
            ? 'Loja encerrada manualmente por tempo indeterminado. A automação foi pausada.'
            : `Loja encerrada manualmente temporariamente. A automação será retomada em ${limitDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
        }
        showSuccess(msg);
      }
    }
  };

  const handleCustomSubmit = () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError('Por favor, insira um tempo válido maior que zero.');
      return;
    }
    
    if (customUnit === 'hours' && amount > 24) {
      showError('O tempo máximo permitido é de 24 horas.');
      return;
    }
    
    if (customUnit === 'minutes' && amount > 1440) {
      showError('O tempo máximo permitido é de 1440 minutos (24 horas).');
      return;
    }

    const minutes = customUnit === 'hours' ? amount * 60 : amount;
    applyToggleStoreStatus(modalPendingState ?? false, 'custom', minutes);
  };

  const openState = useMemo(() => {
    if (!profile) return null;
    return getStoreOpenState({
      openingHours: profile.opening_hours,
      manualStatus: profile.is_open,
      manualOverride: profile.manual_override,
      now,
    });
  }, [profile, now]);

  const statusTitle = openState?.isOpen ? 'Loja Aberta' : 'Loja Fechada';
  const statusBadge = openState?.isOpen ? 'ABERTA' : 'FECHADA';

  const statusDescription = useMemo(() => {
    if (!openState) return '';
    if (openState.isOpen) {
      if (openState.isManualOpen && !openState.isAutoOpen) return 'Aberta manualmente fora do horário.';
      return 'Sua loja está visível para clientes.';
    }
    // if closed
    if (!openState.isManualOpen && !openState.isAutoOpen) return 'Fechada (automático e manual).';
    if (!openState.isManualOpen) return 'Fechada (seguindo horário automático).';
    // This case should not happen with the new logic, but as a fallback:
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
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${openState.isOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40'
                : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
                }`}
            >
              {openState.isOpen ? <Store className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${openState.isOpen
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                >
                  {statusBadge}
                </span>

                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${openState.isAutoOpen
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
              variant={openState.isOpen ? 'danger' : 'success'}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {openState.isOpen ? 'Fechar Loja' : 'Abrir Loja'}
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

        {/* Resume Automation Button */}
        {profile?.manual_override && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-700 dark:text-amber-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                  {profile.manual_override_until ? 'Controle Manual Temporário' : 'Controle Manual Ativo'}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {profile.manual_override_until ? (
                    `A automação está pausada temporariamente. A loja voltará ao automático e será ${openState.isOpen ? 'fechada' : 'aberta'} às ${new Date(profile.manual_override_until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} de hoje (${new Date(profile.manual_override_until).toLocaleDateString('pt-BR')}).`
                  ) : (
                    `A automação está pausada. A loja permanecerá ${openState.isOpen ? 'aberta' : 'fechada'} até que você retome o horário automático.`
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Recalculate state based on schedule immediately
                  const newState = getStoreOpenState({
                    openingHours: profile.opening_hours,
                    manualStatus: null, // Resetting manual overrides means we rely on schedule
                    manualOverride: false,
                    now: new Date()
                  });

                  console.log('[StoreStatus] Resume Automation - newState:', newState);

                  // CRITICAL: Update BOTH manual_override AND is_open in database
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({
                      manual_override: false,
                      is_open: newState.isOpen
                    })
                    .eq('id', profile.id);

                  if (error) {
                    console.error('[StoreStatus] Resume Automation error:', error);
                    throw error;
                  }

                  console.log('[StoreStatus] Database updated - is_open:', newState.isOpen, 'manual_override: false');

                  // Update profile state
                  setProfile(prev => (prev ? { ...prev, manual_override: false, is_open: newState.isOpen } : null));

                  showSuccess('Horário automático retomado!');
                } catch (e) {
                  console.error('[StoreStatus] Resume Automation exception:', e);
                  showError('Erro ao retomar automação.');
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="ghost"
              size="sm"
              className="whitespace-nowrap text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800"
            >
              Retomar Automático
            </Button>
          </div>
        )}

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

      <BaseModal
        isOpen={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        title={modalPendingState ? 'Definir Tempo de Abertura' : 'Definir Tempo de Fechamento'}
        icon={<Clock className="w-6 h-6 text-amber-500" />}
        maxWidth="md"
      >
        <div className="space-y-8 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-b border-gray-100 dark:border-gray-700/60 pb-6">
            Escolha por quanto tempo deseja manter a loja{' '}
            <strong className="text-gray-900 dark:text-white font-extrabold">
              {modalPendingState ? 'aberta' : 'fechada'}
            </strong>{' '}
            manualmente antes de retornar ao horário de funcionamento automático configurado.
          </p>

          <div className="border-b border-gray-100 dark:border-gray-700/60 pb-8">
            <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Opções Rápidas
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: '1 Hora', value: '1h' },
                { label: '2 Horas', value: '2h' },
                { label: '3 Horas', value: '3h' },
                { label: '4 Horas', value: '4h' },
                { label: 'Até Fim do Dia', value: 'today' },
                { label: 'Indeterminado', value: 'indefinite' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyToggleStoreStatus(modalPendingState ?? false, opt.value as any)}
                  className="p-4 text-sm font-black rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 hover:bg-gray-100/80 dark:bg-gray-900/30 dark:hover:bg-gray-900/70 text-gray-700 dark:text-gray-200 transition-all hover:scale-[1.02] flex items-center justify-center text-center shadow-sm animate-in fade-in"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Tempo Personalizado
            </h4>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              {/* Input elegante */}
              <div className="relative w-full sm:w-1/3">
                <input
                  type="number"
                  min="1"
                  max={customUnit === 'hours' ? 24 : 1440}
                  placeholder={customUnit === 'hours' ? '2' : '30'}
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full h-full p-3.5 text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Botões seletores para evitar Select nativo (Premium UI) */}
              <div className="flex w-full sm:w-2/3 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setCustomUnit('minutes');
                    setCustomAmount('30');
                  }}
                  className={`flex-1 py-3.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    customUnit === 'minutes'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-750'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  Minutos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomUnit('hours');
                    setCustomAmount('2');
                  }}
                  className={`flex-1 py-3.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    customUnit === 'hours'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-750'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  Horas
                </button>
              </div>
            </div>

            <div className="mt-2.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-between px-1 uppercase tracking-wider">
              <span>Mínimo: 1 {customUnit === 'hours' ? 'hora' : 'minuto'}</span>
              <span>Máximo: {customUnit === 'hours' ? '24 horas' : '1440 minutos'}</span>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700/60 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDurationModal(false)}
                className="rounded-2xl px-5 text-sm font-bold min-h-[44px] flex items-center justify-center"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={handleCustomSubmit}
                className="rounded-2xl px-6 text-sm font-bold min-h-[44px] flex items-center justify-center"
              >
                Aplicar Tempo
              </Button>
            </div>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};