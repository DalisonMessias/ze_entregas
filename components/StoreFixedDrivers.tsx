import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Clock, Star, Activity, UserPlus, Phone, Bike, Truck, 
  MapPin, ShieldAlert, AlertCircle, X, Check, Award, Banknote, RefreshCw
} from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { supabase } from '../services/cloud';
import { Skeleton } from './Skeleton';

interface StoreDriverCard {
  assignmentId: string;
  driverId: string;
  name: string;
  phone: string;
  vehicleType: string;
  assignmentType: deliveryFixed.AssignmentType;
  status: 'ONLINE' | 'OFFLINE' | 'IN_DELIVERY';
  lastActivity: string | null;
  totalDeliveries: number;
  totalEarnings: number;
  acceptanceRate: number;
  cancellationRate: number;
}

export const StoreFixedDrivers = ({ storeId }: { storeId?: string }) => {
  const { t } = useTranslation();
  const dialog = useDialog();

  const [drivers, setDrivers] = useState<StoreDriverCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [targetReplaceDriver, setTargetReplaceDriver] = useState<StoreDriverCard | null>(null);

  // Dados para populacao de dropdowns
  const [systemDrivers, setSystemDrivers] = useState<any[]>([]);

  // Formulário de Solicitação
  const [reqDriverId, setReqDriverId] = useState('');
  const [reqAssignmentType, setReqAssignmentType] = useState<deliveryFixed.AssignmentType>('PRIORITY');
  const [reqReason, setReqReason] = useState('');

  // Formulário de Substituição
  const [replaceReason, setReplaceReason] = useState('');

  useEffect(() => {
    if (storeId) {
      loadStoreDrivers();
      fetchSystemDrivers();
    }
  }, [storeId]);

  const loadStoreDrivers = async () => {
    setLoading(true);
    try {
      const assignments = await deliveryFixed.getFixedAssignments({ store_id: storeId, status: 'ACTIVE' });
      
      const mappedList: StoreDriverCard[] = [];
      for (const assignment of assignments) {
        // Obter estatisticas reais de cada vinculo
        let stats = { total_deliveries: 0, total_earnings: 0, acceptance_rate: 100, cancellation_rate: 0, last_activity: null };
        if (assignment.id) {
          try {
            const fetchedStats = await deliveryFixed.getFixedStatistics(assignment.id);
            if (fetchedStats) {
              stats = {
                total_deliveries: fetchedStats.total_deliveries || 0,
                total_earnings: Number(fetchedStats.total_earnings || 0),
                acceptance_rate: Number(fetchedStats.acceptance_rate || 100),
                cancellation_rate: Number(fetchedStats.cancellation_rate || 0),
                last_activity: fetchedStats.last_activity
              };
            }
          } catch (e) {
            console.error('Erro ao buscar estatísticas do vínculo:', assignment.id, e);
          }
        }

        // Simular status online baseando-se na atividade recente (menos de 15 minutos = ONLINE/IN_DELIVERY)
        let simulatedStatus: 'ONLINE' | 'OFFLINE' | 'IN_DELIVERY' = 'OFFLINE';
        if (stats.last_activity) {
          const diffMinutes = (new Date().getTime() - new Date(stats.last_activity).getTime()) / 60000;
          if (diffMinutes <= 15) {
            simulatedStatus = diffMinutes <= 5 ? 'ONLINE' : 'IN_DELIVERY';
          }
        }

        mappedList.push({
          assignmentId: assignment.id!,
          driverId: assignment.driver_id,
          name: assignment.driver?.full_name || 'Desconhecido',
          phone: assignment.driver?.phone || 'Sem celular',
          vehicleType: assignment.driver?.vehicle_type || 'moto',
          assignmentType: assignment.assignment_type,
          status: simulatedStatus,
          lastActivity: stats.last_activity,
          totalDeliveries: stats.total_deliveries,
          totalEarnings: stats.total_earnings,
          acceptanceRate: stats.acceptance_rate,
          cancellationRate: stats.cancellation_rate
        });
      }

      setDrivers(mappedList);
    } catch (error) {
      console.error('Error loading store fixed drivers:', error);
      dialog.toast({ message: 'Erro ao carregar seus entregadores fixos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .or('role.eq.delivery_person,role.eq.delivery_partner,role.eq.driver');

      if (error) throw error;
      setSystemDrivers(data || []);
    } catch (err) {
      console.error('Erro ao buscar motoristas da plataforma:', err);
    }
  };

  const handleOpenRequestModal = () => {
    setReqDriverId('');
    setReqAssignmentType('PRIORITY');
    setReqReason('');
    setIsRequestModalOpen(true);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    try {
      await deliveryFixed.createFixedRequest({
        store_id: storeId,
        driver_id: reqDriverId || undefined,
        request_type: 'VINCULO',
        assignment_type: reqAssignmentType,
        reason: reqReason,
        status: 'PENDING'
      });

      dialog.toast({ message: 'Solicitação de vínculo enviada ao administrador!', type: 'success' });
      setIsRequestModalOpen(false);
      loadStoreDrivers();
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      dialog.toast({ message: 'Erro ao enviar solicitação.', type: 'error' });
    }
  };

  const handleOpenReplaceModal = (driver: StoreDriverCard) => {
    setTargetReplaceDriver(driver);
    setReplaceReason('');
    setIsReplaceModalOpen(true);
  };

  const handleSendReplaceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !targetReplaceDriver || !replaceReason.trim()) {
      dialog.toast({ message: 'Por favor, informe a justificativa.', type: 'warning' });
      return;
    }

    try {
      await deliveryFixed.createFixedRequest({
        store_id: storeId,
        driver_id: targetReplaceDriver.driverId,
        request_type: 'SUBSTITUICAO',
        reason: replaceReason,
        status: 'PENDING'
      });

      dialog.toast({ message: 'Solicitação de substituição registrada com sucesso.', type: 'success' });
      setIsReplaceModalOpen(false);
      setReplaceReason('');
      loadStoreDrivers();
    } catch (err) {
      console.error('Erro ao solicitar substituição:', err);
      dialog.toast({ message: 'Erro ao solicitar substituição.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-500" />
            Meus Entregadores Fixos
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gerencie o desempenho e o status dos entregadores preferenciais vinculados à sua loja.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStoreDrivers} variant="outline" className="p-3 border-gray-200 dark:border-gray-750 hover:border-brand-550 rounded-2xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-650 dark:text-gray-300" />
          </Button>
          <Button onClick={handleOpenRequestModal} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 duration-150">
            <UserPlus className="w-4.5 h-4.5" />
            Solicitar Novo Vínculo
          </Button>
        </div>
      </div>

      {/* Grid de Cards dos Entregadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl mt-4" />
              </div>
            </div>
          ))
        ) : drivers.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-16 h-16 bg-gray-55/40 dark:bg-gray-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum Entregador Fixo Vinculado</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Sua loja ainda não possui motoristas vinculados para prioridade de pedidos. Solicite um vínculo para ter mais previsibilidade na expedição.
            </p>
            <Button onClick={handleOpenRequestModal} className="px-5 py-3 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white shadow">
              Solicitar Agora
            </Button>
          </div>
        ) : (
          drivers.map((driver) => (
            <div key={driver.assignmentId} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              
              {/* Badge do Status Online */}
              <div className="absolute top-0 right-0 p-4">
                <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                  driver.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20' :
                  driver.status === 'IN_DELIVERY' ? 'bg-blue-105 text-blue-800 dark:bg-blue-950/20' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/60 dark:text-gray-350'
                }`}>
                  {driver.status === 'ONLINE' ? 'Online' : driver.status === 'IN_DELIVERY' ? 'Em Corrida' : 'Offline'}
                </span>
              </div>
              
              <div className="space-y-5">
                {/* Nome e Veículo */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 text-brand-650 dark:text-brand-400 rounded-2xl flex items-center justify-center font-black text-xl border border-brand-100/40">
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">{driver.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      {driver.vehicleType === 'carro' ? <Truck className="w-3.5 h-3.5 text-gray-450" /> : <Bike className="w-3.5 h-3.5 text-gray-450" />}
                      <span>{driver.vehicleType === 'carro' ? 'Carro' : 'Motocicleta'}</span>
                    </p>
                  </div>
                </div>

                {/* Info Vínculo */}
                <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-150/10 p-3 rounded-2xl flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-bold">Modalidade:</span>
                  <span className="font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    {driver.assignmentType === 'EXCLUSIVE' ? 'Exclusivo' :
                     driver.assignmentType === 'PRIORITY' ? 'Prioritário' : 'Compartilhado'}
                  </span>
                </div>

                {/* Métricas do Vínculo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50/50 dark:bg-gray-900/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-750">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Entregas</span>
                    <span className="font-black text-base text-gray-800 dark:text-white block mt-0.5">{driver.totalDeliveries}</span>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-900/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-750">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Faturamento</span>
                    <span className="font-black text-base text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      R$ {driver.totalEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Taxas operacionais de aceite */}
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold font-mono">
                  <span>Aceite: {driver.acceptanceRate.toFixed(0)}%</span>
                  <span>Recusas: {driver.cancellationRate.toFixed(0)}%</span>
                </div>
              </div>

              {/* Ações */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-5 flex gap-2">
                <a href={`tel:${driver.phone}`} className="p-3 border border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300 hover:border-brand-550 hover:text-brand-550 rounded-2xl flex items-center justify-center transition-all">
                  <Phone className="w-4.5 h-4.5" />
                </a>
                <Button variant="outline" className="flex-1 text-xs font-black uppercase tracking-wider py-3 border border-gray-200 dark:border-gray-750 text-red-550 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-2xl" onClick={() => handleOpenReplaceModal(driver)}>
                  Solicitar Substituição
                </Button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modal de Solicitação de Vínculo */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[28px] w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-150 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-500" />
                  Solicitar Entregador Fixo
                </h3>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="p-6 space-y-5">
              
              {/* Selecionar Entregador */}
              <CustomSelect
                label="Indicar Entregador (Opcional)"
                placeholder="Selecione um motoboy se preferir"
                value={reqDriverId}
                onChange={setReqDriverId}
                options={systemDrivers.map(d => ({
                  label: d.full_name,
                  value: d.id
                }))}
              />

              {/* Tipo de Vinculo */}
              <CustomSelect
                label="Modalidade Operacional Solicitada"
                value={reqAssignmentType}
                onChange={(val) => setReqAssignmentType(val as any)}
                options={[
                  { label: 'Exclusivo (Atende só minha loja)', value: 'EXCLUSIVE' },
                  { label: 'Prioritário (Minha prioridade, fallback geral)', value: 'PRIORITY' },
                  { label: 'Compartilhado (Multiloja)', value: 'SHARED' }
                ]}
              />

              {/* Justificativa */}
              <div className="w-full">
                <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">
                  Justificativa ou Observações
                </label>
                <textarea
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl outline-none text-gray-750 dark:text-white placeholder-gray-400 text-base resize-none"
                  rows={3}
                  placeholder="Ex: Gostaria de vincular o motoboy por fazer bom atendimento aos meus clientes."
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold flex items-center justify-center">
                  Enviar Solicitação
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Substituição */}
      {isReplaceModalOpen && targetReplaceDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[28px] w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-150 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Solicitar Substituição
                </h3>
              </div>
              <button onClick={() => setIsReplaceModalOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSendReplaceRequest} className="p-6 space-y-5">
              
              <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl text-xs text-red-700 dark:text-red-305 flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  Você está solicitando a substituição de <strong>{targetReplaceDriver.name}</strong>. A equipe administrativa revisará sua solicitação para alocar outro motorista.
                </p>
              </div>

              {/* Justificativa */}
              <div className="w-full">
                <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">
                  Justificativa (Obrigatório)
                </label>
                <textarea
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl outline-none text-gray-750 dark:text-white placeholder-gray-400 text-base resize-none"
                  rows={3}
                  placeholder="Ex: Atrasos constantes nos turnos ou indisponibilidade."
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <Button type="button" variant="outline" onClick={() => setIsReplaceModalOpen(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={!replaceReason.trim()} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center justify-center disabled:opacity-50">
                  Confirmar Substituição
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
