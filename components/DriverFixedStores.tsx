import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Store, Clock, Award, Activity, Banknote, Navigation, Coffee, AlertTriangle, 
  X, Check, RefreshCw, Sparkles, Navigation2, ShieldAlert
} from 'lucide-react';
import { Button } from './Button';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { supabase } from '../services/cloud';
import { Skeleton } from './Skeleton';

interface DriverStoreCard {
  assignmentId: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  assignmentType: deliveryFixed.AssignmentType;
  status: 'ACTIVE' | 'SUSPENDED';
  startDate: string;
  deliveriesCompleted: number;
  earningsGenerated: number;
  schedules: deliveryFixed.DeliveryFixedSchedule[];
}

interface ActiveOffer {
  id: string;
  orderId: string;
  storeName: string;
  createdAt: string;
}

export const DriverFixedStores = ({ driverId }: { driverId?: string }) => {
  const { t } = useTranslation();
  const dialog = useDialog();

  const [stores, setStores] = useState<DriverStoreCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Status de Descanso do Motorista
  const [isResting, setIsResting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Ofertas Pendentes Ativas para recusar
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [checkingOffers, setCheckingOffers] = useState(false);

  useEffect(() => {
    if (driverId) {
      loadDriverData();
      checkActiveOffers();
      
      // Polling a cada 20 segundos para verificar novas ofertas de corrida
      const interval = setInterval(() => {
        checkActiveOffers();
      }, 20000);

      return () => clearInterval(interval);
    }
  }, [driverId]);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStoresAndSchedules(),
        loadDriverRestingStatus()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do entregador:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoresAndSchedules = async () => {
    try {
      const assignments = await deliveryFixed.getFixedAssignments({ driver_id: driverId, status: 'ACTIVE' });
      
      const mappedStores: DriverStoreCard[] = [];
      for (const assignment of assignments) {
        // Buscar escalas semanais do vinculo
        let schedulesData: deliveryFixed.DeliveryFixedSchedule[] = [];
        try {
          if (assignment.id) {
            schedulesData = await deliveryFixed.getFixedSchedules(assignment.id);
          }
        } catch (e) {
          console.error('Erro ao carregar escala para vínculo:', assignment.id, e);
        }

        // Buscar estatisticas do vinculo
        let totalDeliveries = 0;
        let totalEarnings = 0;
        try {
          if (assignment.id) {
            const stats = await deliveryFixed.getFixedStatistics(assignment.id);
            if (stats) {
              totalDeliveries = stats.total_deliveries || 0;
              totalEarnings = Number(stats.total_earnings || 0);
            }
          }
        } catch (e) {
          console.error('Erro ao carregar estatísticas do vínculo:', assignment.id, e);
        }

        mappedStores.push({
          assignmentId: assignment.id!,
          storeId: assignment.store_id,
          storeName: assignment.store?.name || 'Loja Desconhecida',
          storeAddress: 'Endereço da Loja', // Simplificado
          assignmentType: assignment.assignment_type,
          status: assignment.status as 'ACTIVE' | 'SUSPENDED',
          startDate: assignment.created_at || new Date().toISOString(),
          deliveriesCompleted: totalDeliveries,
          earningsGenerated: totalEarnings,
          schedules: schedulesData
        });
      }

      setStores(mappedStores);
    } catch (error) {
      console.error('Error loading fixed stores:', error);
      dialog.toast({ message: 'Erro ao carregar suas lojas vinculadas.', type: 'error' });
    }
  };

  const loadDriverRestingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('delivery_status')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      setIsResting(data?.delivery_status === 'resting');
    } catch (err) {
      console.error('Erro ao buscar status de descanso:', err);
    }
  };

  const checkActiveOffers = async () => {
    if (!driverId) return;
    setCheckingOffers(true);
    try {
      // Buscar no partner_requests
      const { data, error } = await supabase
        .from('partner_requests')
        .select(`
          id,
          order_id,
          status,
          created_at,
          orders!inner (
            id,
            store_id,
            stores ( name )
          )
        `)
        .eq('driver_id', driverId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const offers: ActiveOffer[] = (data || []).map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        storeName: item.orders?.stores?.name || 'Loja Parceira',
        createdAt: item.created_at
      }));

      setActiveOffers(offers);
    } catch (err) {
      console.error('Erro ao checar ofertas de corrida:', err);
    } finally {
      setCheckingOffers(false);
    }
  };

  // Alternar Modo de Descanso / Pausa
  const handleToggleResting = async (checked: boolean) => {
    if (!driverId) return;
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          delivery_status: checked ? 'resting' : 'active',
          is_available: !checked
        })
        .eq('id', driverId);

      if (error) throw error;
      setIsResting(checked);
      dialog.toast({ message: checked ? 'Modo descanso ativado. Você não receberá novas corridas.' : 'Você está ativo de volta! Aguardando corridas.', type: 'success' });
    } catch (error) {
      dialog.toast({ message: 'Erro ao alterar modo operacional.', type: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Recusar Oferta Ativa
  const handleRejectOffer = async (offer: ActiveOffer) => {
    const confirmed = await dialog.confirm({
      title: 'Recusar Corrida',
      message: `Tem certeza que deseja recusar a corrida da loja ${offer.storeName}? Ela será direcionada ao próximo entregador prioritário.`,
      confirmButtonText: 'Recusar',
      cancelButtonText: 'Voltar'
    });

    if (confirmed) {
      try {
        const success = await deliveryFixed.rejectFixedOffer(offer.id);
        if (success) {
          dialog.toast({ message: 'Corrida recusada com sucesso.', type: 'success' });
          checkActiveOffers();
        } else {
          dialog.toast({ message: 'Erro ao processar recusa.', type: 'error' });
        }
      } catch (err) {
        console.error('Erro ao recusar corrida:', err);
        dialog.toast({ message: 'Erro ao processar recusa.', type: 'error' });
      }
    }
  };

  const getDayOfWeekLabel = (day: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[day] || '';
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none font-sans">
      
      {/* Banner Superior com Estado Operacional */}
      <div className="bg-gradient-to-r from-brand-650 to-brand-500 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg border border-brand-500/25">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 shrink-0">
            <Award className="w-9 h-9 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black mb-1">Entregador Fixo</h2>
            <p className="text-xs text-brand-100 font-medium leading-relaxed max-w-md">
              Você possui vínculos preferenciais com estabelecimentos parceiros. Desfrute de prioridade absoluta nas corridas enviadas por eles.
            </p>
          </div>
        </div>

        {/* Switch de Descanso */}
        <div className="bg-black/10 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 w-full md:w-auto shrink-0 select-none">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">Modo Descanso</span>
            <span className="text-[10px] text-brand-200">Pausar recebimento</span>
          </div>
          <Switch 
            checked={isResting} 
            onChange={handleToggleResting} 
            disabled={updatingStatus}
          />
        </div>
      </div>

      {/* Alertas de Ofertas Pendentes (Com Ação de Recusa Rápida) */}
      {activeOffers.length > 0 && (
        <div className="space-y-3">
          {activeOffers.map(offer => (
            <div key={offer.id} className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-bounce">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-snug">Corrida Prioritária Disponível</h4>
                  <p className="text-xs text-gray-650 dark:text-gray-400 mt-0.5">
                    Você possui uma oferta de entrega pendente da loja <strong className="text-gray-805 dark:text-white font-bold">{offer.storeName}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5 sm:shrink-0 justify-end">
                <Button onClick={() => handleRejectOffer(offer)} className="px-5 py-2.5 border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl font-bold text-xs uppercase tracking-wider">
                  Recusar
                </Button>
                <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow">
                  Ver no Mapa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Listagem de Lojas Vinculadas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Minhas Lojas Vinculadas ({stores.length})</h3>
          <button onClick={loadDriverData} className="p-2 border border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300 hover:border-brand-550 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-750 shadow-sm space-y-4">
                <Skeleton className="h-6 w-1/3 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))
          ) : stores.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-750 shadow-sm">
              <div className="w-16 h-16 bg-gray-55/40 dark:bg-gray-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma loja vinculada</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Você ainda não está vinculado a nenhuma loja como entregador fixo. Preste serviços de excelência para receber convites dos estabelecimentos.
              </p>
            </div>
          ) : (
            stores.map((store) => (
              <div key={store.assignmentId} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-brand-100 dark:border-brand-900/20 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                
                {/* Badge da Modalidade */}
                <div className="absolute top-0 right-0 bg-brand-600 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl">
                  {store.assignmentType === 'EXCLUSIVE' ? 'Exclusivo' :
                   store.assignmentType === 'PRIORITY' ? 'Prioritário' : 'Compartilhado'}
                </div>

                <div className="space-y-5">
                  
                  {/* Nome da Loja */}
                  <div className="flex items-start gap-3.5 max-w-[80%]">
                    <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 text-brand-650 dark:text-brand-400 rounded-xl flex items-center justify-center border border-brand-100/30 shrink-0">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">{store.storeName}</h4>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-1">Início: {new Date(store.startDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Escala de Horários */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Escala Horária Semanal</span>
                    <div className="flex flex-wrap gap-1.5">
                      {store.schedules.length === 0 ? (
                        <span className="text-xs text-gray-500 italic">Disponibilidade livre 24h</span>
                      ) : (
                        store.schedules.map(sc => (
                          <span key={sc.id} className="text-[10px] font-extrabold bg-gray-50 dark:bg-gray-900/40 border border-gray-150/15 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-mono">
                            {getDayOfWeekLabel(sc.day_of_week)}: {sc.start_time.slice(0, 5)}-{sc.end_time.slice(0, 5)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Estatísticas Acumuladas */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-gray-50/50 dark:bg-gray-900/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-750">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Corridas Concluídas</span>
                      <span className="font-black text-sm text-gray-800 dark:text-white block mt-0.5">{store.deliveriesCompleted}</span>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-gray-900/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-750">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Ganhos Gerados</span>
                      <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        R$ {store.earningsGenerated.toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-5">
                  <Button className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black uppercase tracking-wider bg-brand-600 hover:bg-brand-700 text-white shadow">
                    <Navigation2 className="w-4 h-4" /> Rota até a Loja
                  </Button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
