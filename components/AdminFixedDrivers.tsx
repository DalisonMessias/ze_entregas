import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, Plus, Edit2, Trash2, Power, PauseCircle, PlayCircle, 
  ShieldAlert, Clock, Award, Check, X, Calendar, FileText, ChevronRight,
  TrendingUp, Activity, CheckCircle2, AlertTriangle, UserCheck
} from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { CustomDateInput } from './CustomDateInput';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { supabase } from '../services/cloud';
import { Skeleton } from './Skeleton';

export const AdminFixedDrivers = () => {
  const { t } = useTranslation();
  const dialog = useDialog();

  // Estados principais
  const [activeTab, setActiveTab] = useState<'assignments' | 'requests'>('assignments');
  const [assignments, setAssignments] = useState<deliveryFixed.DeliveryFixedAssignment[]>([]);
  const [requests, setRequests] = useState<deliveryFixed.DeliveryFixedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de busca
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dados para populacao de dropdowns
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [modalCities, setModalCities] = useState<any[]>([]);
  const [modalSelectedCity, setModalSelectedCity] = useState('');

  // Estado do Modal de Vínculo (Criação/Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<deliveryFixed.DeliveryFixedAssignment | null>(null);
  
  // Formulário de Vínculo
  const [formDriverId, setFormDriverId] = useState('');
  const [formStoreId, setFormStoreId] = useState('');
  const [formAssignmentType, setFormAssignmentType] = useState<deliveryFixed.AssignmentType>('PRIORITY');
  const [formPriorityLevel, setFormPriorityLevel] = useState(1);
  const [formMaxSimultaneous, setFormMaxSimultaneous] = useState(3);
  const [formCustomFee, setFormCustomFee] = useState('');
  const [formStartDate, setFormStartDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState<string | null>(null);

  // Estados da Edição Detalhada (Sub-abas do Modal)
  const [modalSubTab, setModalSubTab] = useState<'details' | 'schedule' | 'bonus'>('details');
  const [schedules, setSchedules] = useState<deliveryFixed.DeliveryFixedSchedule[]>([]);
  const [bonuses, setBonuses] = useState<deliveryFixed.DeliveryFixedBonus[]>([]);

  // Formulário de Escala Semanal
  const [schedDayOfWeek, setSchedDayOfWeek] = useState('0');
  const [schedStartTime, setSchedStartTime] = useState('08:00');
  const [schedEndTime, setSchedEndTime] = useState('18:00');
  const [schedIsHoliday, setSchedIsHoliday] = useState(false);
  const [schedIsSpecial, setSchedIsSpecial] = useState(false);

  // Formulário de Bonificações
  const [bonusType, setBonusType] = useState<deliveryFixed.DeliveryFixedBonus['bonus_type']>('FIXED_FEE');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusStatus, setBonusStatus] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAssignments(),
        loadRequests(),
        fetchDriversAndStores(),
        fetchCities()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('available_cities')
        .select('id, name, state')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setModalCities(data || []);
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const data = await deliveryFixed.getFixedAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
      dialog.toast({ message: 'Erro ao carregar vínculos.', type: 'error' });
    }
  };

  const loadRequests = async () => {
    try {
      const data = await deliveryFixed.getFixedRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      dialog.toast({ message: 'Erro ao carregar solicitações.', type: 'error' });
    }
  };

  const fetchDriversAndStores = async (selectedCity?: string) => {
    try {
      const cityToFilter = selectedCity !== undefined ? selectedCity : modalSelectedCity;

      // Obter entregadores do sistema da tabela user_profiles
      let driversQuery = supabase
        .from('user_profiles')
        .select('id, name, phone_number, vehicle_type, city')
        .in('role', ['delivery_person', 'delivery_partner']);

      if (cityToFilter) {
        driversQuery = driversQuery.eq('city', cityToFilter);
      }

      const { data: driversData, error: dError } = await driversQuery;
      if (dError) throw dError;

      // Adaptar o formato dos dados para coincidir com o esperado pelo select (full_name -> name, phone -> phone_number)
      const mappedDrivers = (driversData || []).map(d => ({
        id: d.id,
        full_name: d.name || 'Sem nome',
        phone: d.phone_number,
        vehicle_type: d.vehicle_type
      }));
      setDrivers(mappedDrivers);

      // Obter lojas do sistema da tabela user_profiles
      let storesQuery = supabase
        .from('user_profiles')
        .select('id, name, store_name, city')
        .eq('role', 'store_partner');

      if (cityToFilter) {
        storesQuery = storesQuery.eq('city', cityToFilter);
      }

      const { data: storesData, error: sError } = await storesQuery;
      if (sError) throw sError;

      const mappedStores = (storesData || []).map(s => ({
        id: s.id,
        name: s.store_name || s.name || 'Loja sem nome'
      }));
      setStores(mappedStores);
    } catch (error) {
      console.error('Erro ao buscar motoristas/lojas:', error);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchDriversAndStores(modalSelectedCity);
    }
  }, [modalSelectedCity, isModalOpen]);

  const handleAdd = () => {
    setEditingAssignment(null);
    setFormDriverId('');
    setFormStoreId('');
    setFormAssignmentType('PRIORITY');
    setFormPriorityLevel(1);
    setFormMaxSimultaneous(3);
    setFormCustomFee('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(null);
    setModalSubTab('details');
    setModalSelectedCity('');
    setIsModalOpen(true);
  };

  const handleEdit = async (assignment: deliveryFixed.DeliveryFixedAssignment) => {
    setEditingAssignment(assignment);
    setFormDriverId(assignment.driver_id);
    setFormStoreId(assignment.store_id);
    setFormAssignmentType(assignment.assignment_type);
    setFormPriorityLevel(assignment.priority_level);
    setFormMaxSimultaneous(assignment.max_simultaneous_deliveries || 3);
    setFormCustomFee(assignment.custom_delivery_fee ? String(assignment.custom_delivery_fee) : '');
    setFormStartDate(assignment.start_date ? new Date(assignment.start_date).toISOString().split('T')[0] : null);
    setFormEndDate(assignment.end_date ? new Date(assignment.end_date).toISOString().split('T')[0] : null);
    setModalSubTab('details');
    setModalSelectedCity('');
    setIsModalOpen(true);

    // Carregar escalas e bonus em background
    if (assignment.id) {
      try {
        const [schedData, bonusData] = await Promise.all([
          deliveryFixed.getFixedSchedules(assignment.id),
          deliveryFixed.getFixedBonuses(assignment.id)
        ]);
        setSchedules(schedData);
        setBonuses(bonusData);
      } catch (err) {
        console.error('Erro ao carregar detalhes do vínculo:', err);
      }
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDriverId || !formStoreId) {
      dialog.toast({ message: 'Selecione um entregador e uma loja.', type: 'warning' });
      return;
    }

    const payload: Partial<deliveryFixed.DeliveryFixedAssignment> = {
      driver_id: formDriverId,
      store_id: formStoreId,
      assignment_type: formAssignmentType,
      priority_level: Number(formPriorityLevel),
      max_simultaneous_deliveries: Number(formMaxSimultaneous),
      custom_delivery_fee: formCustomFee ? Number(formCustomFee) : undefined,
      start_date: formStartDate ? new Date(formStartDate).toISOString() : undefined,
      end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
      status: editingAssignment?.status || 'ACTIVE'
    };

    try {
      const isEdit = !!editingAssignment?.id;
      if (isEdit) {
        await deliveryFixed.updateFixedAssignment(editingAssignment.id!, payload);
        dialog.toast({ message: 'Vínculo atualizado com sucesso!', type: 'success' });
      } else {
        await deliveryFixed.createFixedAssignment(payload);
        dialog.toast({ message: 'Vínculo criado com sucesso!', type: 'success' });
      }
      setIsModalOpen(false);
      loadAssignments();
    } catch (error: any) {
      console.error('Erro ao salvar vínculo:', error);
      dialog.toast({ message: error.message || 'Erro ao salvar vínculo.', type: 'error' });
    }
  };

  const handleSuspend = async (assignment: deliveryFixed.DeliveryFixedAssignment) => {
    const action = assignment.status === 'SUSPENDED' ? 'Reativar' : 'Suspender';
    const newStatus = assignment.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    
    const confirmed = await dialog.confirm({
      title: `${action} Vínculo`,
      message: `Tem certeza que deseja ${action.toLowerCase()} o vínculo de ${assignment.driver?.full_name} com ${assignment.store?.name}?`,
      confirmButtonText: action,
      cancelButtonText: 'Cancelar'
    });

    if (confirmed) {
      try {
        const success = await deliveryFixed.updateFixedAssignment(assignment.id!, { status: newStatus });
        if (success) {
          dialog.toast({ message: `Vínculo ${action.toLowerCase()}do com sucesso.`, type: 'success' });
          loadAssignments();
        } else {
          dialog.toast({ message: `Erro ao ${action.toLowerCase()} vínculo.`, type: 'error' });
        }
      } catch (error) {
        dialog.toast({ message: `Erro ao ${action.toLowerCase()} vínculo.`, type: 'error' });
      }
    }
  };

  const handleRemove = async (assignment: deliveryFixed.DeliveryFixedAssignment) => {
    const confirmed = await dialog.confirm({
      title: 'Remover Vínculo',
      message: `Tem certeza que deseja remover permanentemente o vínculo de ${assignment.driver?.full_name} com ${assignment.store?.name}?`,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar'
    });

    if (confirmed) {
      try {
        const success = await deliveryFixed.updateFixedAssignment(assignment.id!, { status: 'REMOVED' });
        if (success) {
          dialog.toast({ message: 'Vínculo removido com sucesso.', type: 'success' });
          loadAssignments();
        } else {
          dialog.toast({ message: 'Erro ao remover vínculo.', type: 'error' });
        }
      } catch (error) {
        dialog.toast({ message: 'Erro ao remover vínculo.', type: 'error' });
      }
    }
  };

  // Funções de Escala
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment?.id) return;

    try {
      await deliveryFixed.saveFixedSchedule({
        assignment_id: editingAssignment.id,
        day_of_week: Number(schedDayOfWeek),
        start_time: schedStartTime + ':00',
        end_time: schedEndTime + ':00',
        is_holiday: schedIsHoliday,
        is_special_shift: schedIsSpecial
      });

      dialog.toast({ message: 'Escala adicionada!', type: 'success' });
      const schedData = await deliveryFixed.getFixedSchedules(editingAssignment.id);
      setSchedules(schedData);
      
      // Reset form
      setSchedIsHoliday(false);
      setSchedIsSpecial(false);
    } catch (error) {
      dialog.toast({ message: 'Erro ao salvar escala.', type: 'error' });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Excluir Horário',
      message: 'Deseja realmente excluir este turno da escala semanal?',
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar'
    });

    if (confirmed && editingAssignment?.id) {
      try {
        await deliveryFixed.deleteFixedSchedule(id);
        dialog.toast({ message: 'Horário removido.', type: 'success' });
        const schedData = await deliveryFixed.getFixedSchedules(editingAssignment.id);
        setSchedules(schedData);
      } catch (error) {
        dialog.toast({ message: 'Erro ao remover escala.', type: 'error' });
      }
    }
  };

  // Funções de Bônus
  const handleAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment?.id || !bonusAmount) return;

    try {
      await deliveryFixed.saveFixedBonus({
        assignment_id: editingAssignment.id,
        bonus_type: bonusType,
        amount: Number(bonusAmount),
        status: bonusStatus ? 'ACTIVE' : 'INACTIVE'
      });

      dialog.toast({ message: 'Bônus adicionado!', type: 'success' });
      const bonusData = await deliveryFixed.getFixedBonuses(editingAssignment.id);
      setBonuses(bonusData);
      setBonusAmount('');
    } catch (error) {
      dialog.toast({ message: 'Erro ao salvar bônus.', type: 'error' });
    }
  };

  const handleDeleteBonus = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Excluir Configuração',
      message: 'Tem certeza que deseja remover esta regra de bonificação?',
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar'
    });

    if (confirmed && editingAssignment?.id) {
      try {
        await deliveryFixed.deleteFixedBonus(id);
        dialog.toast({ message: 'Bônus removido.', type: 'success' });
        const bonusData = await deliveryFixed.getFixedBonuses(editingAssignment.id);
        setBonuses(bonusData);
      } catch (error) {
        dialog.toast({ message: 'Erro ao remover bônus.', type: 'error' });
      }
    }
  };

  // Funções de Solicitação (Aprovação/Recusa)
  const handleApproveRequest = async (req: deliveryFixed.DeliveryFixedRequest) => {
    const confirmed = await dialog.confirm({
      title: 'Aprovar Solicitação',
      message: `Deseja aprovar a solicitação de vínculo da loja ${req.store?.name} com o entregador ${req.driver?.full_name}?`,
      confirmButtonText: 'Aprovar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmed) {
      try {
        const success = await deliveryFixed.updateFixedRequest(req.id!, { status: 'APPROVED' });
        if (success) {
          dialog.toast({ message: 'Solicitação aprovada e vínculo criado!', type: 'success' });
          loadRequests();
          loadAssignments();
        } else {
          dialog.toast({ message: 'Erro ao aprovar solicitação.', type: 'error' });
        }
      } catch (error) {
        dialog.toast({ message: 'Erro ao aprovar solicitação.', type: 'error' });
      }
    }
  };

  const handleRejectRequest = async (req: deliveryFixed.DeliveryFixedRequest) => {
    const confirmed = await dialog.confirm({
      title: 'Recusar Solicitação',
      message: `Tem certeza que deseja recusar a solicitação de vínculo da loja ${req.store?.name}?`,
      confirmButtonText: 'Recusar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmed) {
      try {
        const success = await deliveryFixed.updateFixedRequest(req.id!, { status: 'REJECTED' });
        if (success) {
          dialog.toast({ message: 'Solicitação recusada.', type: 'success' });
          loadRequests();
        } else {
          dialog.toast({ message: 'Erro ao recusar solicitação.', type: 'error' });
        }
      } catch (error) {
        dialog.toast({ message: 'Erro ao recusar solicitação.', type: 'error' });
      }
    }
  };

  const getDayOfWeekLabel = (day: number) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[day] || '';
  };

  const getBonusTypeLabel = (type: string) => {
    switch (type) {
      case 'FIXED_FEE': return 'Taxa Fixa';
      case 'PER_KM': return 'Bônus por Km';
      case 'PRODUCTIVITY': return 'Produtividade';
      case 'PEAK_HOUR': return 'Horário de Pico';
      case 'RAIN': return 'Adicional Chuva';
      case 'WEEKEND': return 'Final de Semana';
      case 'GOALS': return 'Meta Batida';
      default: return type;
    }
  };

  // Filtragem
  const filteredAssignments = assignments.filter(a => {
    if (a.status === 'REMOVED') return false;
    
    const matchesSearch = 
      searchTerm.trim() === '' || 
      a.driver?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.store?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || a.assignment_type === filterType;
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in select-none font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-500" />
            Vínculo de Entregadores Fixos
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure motoristas com prioridade ou exclusividade dedicados a estabelecimentos específicos.
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 duration-150">
          <Plus className="w-4.5 h-4.5" />
          Novo Vínculo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-150 dark:border-gray-700/60 max-w-md">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'assignments'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Vínculos Ativos ({assignments.filter(a => a.status !== 'REMOVED').length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Solicitações ({requests.filter(r => r.status === 'PENDING').length})
        </button>
      </div>

      {activeTab === 'assignments' ? (
        <>
          {/* Barra de Filtro e Busca */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por loja ou entregador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            
            <div className="md:col-span-3">
              <CustomSelect
                value={filterType}
                onChange={setFilterType}
                options={[
                  { label: 'Todos os Tipos', value: 'ALL' },
                  { label: 'Exclusivo', value: 'EXCLUSIVE' },
                  { label: 'Prioritário', value: 'PRIORITY' },
                  { label: 'Compartilhado', value: 'SHARED' }
                ]}
              />
            </div>

            <div className="md:col-span-3">
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { label: 'Todos os Status', value: 'ALL' },
                  { label: 'Ativos', value: 'ACTIVE' },
                  { label: 'Suspensos', value: 'SUSPENDED' }
                ]}
              />
            </div>
          </div>

          {/* Listagem */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-150 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-3"><Skeleton className="h-5 w-3/4 rounded-md" /></div>
                    <div className="md:col-span-3"><Skeleton className="h-5 w-3/4 rounded-md" /></div>
                    <div className="md:col-span-2"><Skeleton className="h-6 w-1/2 rounded-full" /></div>
                    <div className="md:col-span-2"><Skeleton className="h-6 w-1/2 rounded-full" /></div>
                    <div className="md:col-span-2"><Skeleton className="h-9 w-20 ml-auto rounded-xl" /></div>
                  </div>
                ))
              ) : filteredAssignments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
                  <p className="text-sm font-bold">Nenhum entregador fixo encontrado.</p>
                </div>
              ) : (
                filteredAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                    
                    {/* Entregador */}
                    <div className="md:col-span-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Entregador</span>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white block mt-0.5">
                        {assignment.driver?.full_name || 'Desconhecido'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block font-mono">{assignment.driver?.phone || 'Sem Telefone'}</span>
                    </div>

                    {/* Loja */}
                    <div className="md:col-span-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">Estabelecimento</span>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-300 block mt-0.5">
                        {assignment.store?.name || 'Desconhecido'}
                      </span>
                    </div>

                    {/* Tipo */}
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono mb-1">Modalidade</span>
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                        assignment.assignment_type === 'EXCLUSIVE' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                        assignment.assignment_type === 'PRIORITY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/60 dark:text-gray-300'
                      }`}>
                        {assignment.assignment_type === 'EXCLUSIVE' ? 'Exclusivo' :
                         assignment.assignment_type === 'PRIORITY' ? 'Prioritário' : 'Compartilhado'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono mb-1">Status</span>
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                        assignment.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        'bg-orange-100 text-orange-850 dark:bg-orange-950/30 dark:text-orange-400'
                      }`}>
                        {assignment.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="md:col-span-2 flex justify-end gap-2.5">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(assignment)} className="p-2 border-gray-200 hover:border-brand-500 rounded-xl" title="Editar Vínculo & Configurações">
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSuspend(assignment)} className="p-2 border-gray-200 hover:border-orange-500 rounded-xl" title={assignment.status === 'SUSPENDED' ? 'Reativar' : 'Suspender'}>
                        {assignment.status === 'SUSPENDED' ? <PlayCircle className="w-4 h-4 text-emerald-500 animate-pulse" /> : <PauseCircle className="w-4 h-4 text-orange-500" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemove(assignment)} className="p-2 border-gray-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl" title="Remover Vínculo">
                        <Trash2 className="w-4 h-4 text-red-550" />
                      </Button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* Solicitações enviadas pelas lojas */
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-150 dark:divide-gray-700/50">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 space-y-3">
                  <Skeleton className="h-5 w-1/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
                <p className="text-sm font-bold">Nenhuma solicitação pendente.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-gray-100 dark:bg-gray-900 border border-gray-150/10 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                        {req.request_type}
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20' : 'bg-red-105 text-red-700'
                      }`}>
                        {req.status === 'PENDING' ? 'Pendente' : req.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                        Loja: {req.store?.name || 'Desconhecida'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                        Entregador solicitado: <strong className="text-gray-800 dark:text-white font-bold">{req.driver?.full_name || 'Qualquer'}</strong>
                      </p>
                      {req.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-150/10 mt-2">
                          Justificativa: "{req.reason}"
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-gray-400 block font-mono font-semibold">
                      Solicitado em: {new Date(req.created_at || '').toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => handleRejectRequest(req)} className="flex items-center justify-center p-3 border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl font-bold text-xs uppercase tracking-wider">
                        <X className="w-4.5 h-4.5 mr-1" />
                        Recusar
                      </Button>
                      <Button onClick={() => handleApproveRequest(req)} className="flex items-center justify-center p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow">
                        <Check className="w-4.5 h-4.5 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Novo Vínculo / Configurações (Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[32px] w-full max-w-3xl shadow-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-gray-150 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5.5 h-5.5 text-brand-500" />
                  {editingAssignment ? 'Configurar Vínculo' : 'Criar Novo Vínculo'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Defina prioridades, vigência, escala horária e bonificações extras.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas Internas (Apenas Modo Edição) */}
            {editingAssignment && (
              <div className="flex border-b border-gray-100 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-900/20 px-4">
                {[
                  { id: 'details', label: 'Dados de Vigência', icon: FileText },
                  { id: 'schedule', label: 'Escala Horária', icon: Clock },
                  { id: 'bonus', label: 'Bonificações', icon: Award }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setModalSubTab(sub.id as any)}
                    className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                      modalSubTab === sub.id
                        ? 'border-brand-600 text-brand-600 font-extrabold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <sub.icon className="w-4 h-4" />
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* SUB TAB 1: Detalhes e Vigência */}
              {modalSubTab === 'details' && (
                <form onSubmit={handleSaveAssignment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Filtro de Cidades (apenas na criação) */}
                    {!editingAssignment && (
                      <div className="col-span-1 md:col-span-2">
                        <CustomSelect
                          label="Filtrar por Cidade"
                          value={modalSelectedCity}
                          onChange={setModalSelectedCity}
                          options={[
                            { label: 'Todas as cidades', value: '' },
                            ...modalCities.map(c => ({
                              label: `${c.name} - ${c.state}`,
                              value: c.name
                            }))
                          ]}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Entregador */}
                    <div>
                      <CustomSelect
                        label="Entregador / Motoboy"
                        value={formDriverId}
                        onChange={setFormDriverId}
                        placeholder="Selecione o Entregador"
                        options={drivers.map(d => ({
                          label: `${d.full_name} (${d.phone || 'Sem celular'})`,
                          value: d.id
                        }))}
                        className="w-full"
                      />
                    </div>

                    {/* Loja */}
                    <div>
                      <CustomSelect
                        label="Loja Vinculada"
                        value={formStoreId}
                        onChange={setFormStoreId}
                        placeholder="Selecione o Estabelecimento"
                        options={stores.map(s => ({
                          label: s.name,
                          value: s.id
                        }))}
                        className="w-full"
                      />
                    </div>

                    {/* Tipo de Vinculo */}
                    <div>
                      <CustomSelect
                        label="Modalidade"
                        value={formAssignmentType}
                        onChange={(val) => setFormAssignmentType(val as any)}
                        options={[
                          { label: 'Exclusivo (Apenas essa loja)', value: 'EXCLUSIVE' },
                          { label: 'Prioritário (Prioridade, fallback geral)', value: 'PRIORITY' },
                          { label: 'Compartilhado (Multiloja)', value: 'SHARED' }
                        ]}
                      />
                    </div>

                    {/* Taxa de entrega personalizada (opcional) */}
                    <CustomInput
                      label="Taxa de Entrega Customizada (R$)"
                      placeholder="Deixe em branco para usar a da loja"
                      value={formCustomFee}
                      onChange={(e) => setFormCustomFee(e.target.value)}
                      type="number"
                      step="0.01"
                    />

                    {/* Prioridade do motorista */}
                    <CustomInput
                      label="Nível de Prioridade (Ex: 1 a 10)"
                      value={formPriorityLevel}
                      onChange={(e) => setFormPriorityLevel(Number(e.target.value))}
                      type="number"
                      min="1"
                    />

                    {/* Limite de entregas simultâneas */}
                    <CustomInput
                      label="Limite de Entregas Simultâneas"
                      value={formMaxSimultaneous}
                      onChange={(e) => setFormMaxSimultaneous(Number(e.target.value))}
                      type="number"
                      min="1"
                      max="10"
                    />

                    {/* Vigência Inicial */}
                    <CustomDateInput
                      id="start-date"
                      label="Início do Vínculo"
                      value={formStartDate}
                      onChange={setFormStartDate}
                    />

                    {/* Vigência Final */}
                    <CustomDateInput
                      id="end-date"
                      label="Término do Vínculo (Opcional)"
                      value={formEndDate}
                      onChange={setFormEndDate}
                      allowClear={true}
                    />

                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl px-5">
                      Cancelar
                    </Button>
                    <Button type="submit" className="rounded-xl px-6 bg-brand-600 hover:bg-brand-700 text-white font-extrabold flex items-center justify-center">
                      Salvar Vínculo
                    </Button>
                  </div>
                </form>
              )}

              {/* SUB TAB 2: Escala Horária */}
              {modalSubTab === 'schedule' && editingAssignment?.id && (
                <div className="space-y-6">
                  {/* Novo Turno Form */}
                  <form onSubmit={handleAddSchedule} className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-150 dark:border-gray-750 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                      <CustomSelect
                        label="Dia da Semana"
                        value={schedDayOfWeek}
                        onChange={setSchedDayOfWeek}
                        options={[
                          { label: 'Segunda-feira', value: '1' },
                          { label: 'Terça-feira', value: '2' },
                          { label: 'Quarta-feira', value: '3' },
                          { label: 'Quinta-feira', value: '4' },
                          { label: 'Sexta-feira', value: '5' },
                          { label: 'Sábado', value: '6' },
                          { label: 'Domingo', value: '0' }
                        ]}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <CustomInput
                        label="Hora Início"
                        type="time"
                        value={schedStartTime}
                        onChange={(e) => setSchedStartTime(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <CustomInput
                        label="Hora Fim"
                        type="time"
                        value={schedEndTime}
                        onChange={(e) => setSchedEndTime(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-2 pb-1.5 pl-2">
                      <Switch label="Feriado" checked={schedIsHoliday} onChange={setSchedIsHoliday} />
                      <Switch label="Especial" checked={schedIsSpecial} onChange={setSchedIsSpecial} />
                    </div>

                    <div className="md:col-span-12 flex justify-end">
                      <Button type="submit" className="rounded-xl px-5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-1.5" /> Adicionar Turno
                      </Button>
                    </div>
                  </form>

                  {/* Listagem de Escala */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Escala Semanal Configurada</h4>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-850">
                      {schedules.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400 italic">Nenhum horário definido. Atendimento livre 24h.</div>
                      ) : (
                        schedules.map((sc) => (
                          <div key={sc.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                            <div className="flex items-center gap-4">
                              <Calendar className="w-5 h-5 text-brand-500" />
                              <div>
                                <span className="font-extrabold text-sm text-gray-800 dark:text-white">{getDayOfWeekLabel(sc.day_of_week)}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 block font-mono">
                                  {sc.start_time.slice(0, 5)} às {sc.end_time.slice(0, 5)}
                                  {sc.is_holiday && ' • Feriado'}
                                  {sc.is_special_shift && ' • Especial'}
                                </span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteSchedule(sc.id!)} className="p-2 border border-gray-100 hover:border-red-500 hover:bg-red-50 dark:border-gray-750 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 3: Bonificações */}
              {modalSubTab === 'bonus' && editingAssignment?.id && (
                <div className="space-y-6">
                  {/* Novo Bonus Form */}
                  <form onSubmit={handleAddBonus} className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-150 dark:border-gray-750 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <CustomSelect
                        label="Tipo de Bônus"
                        value={bonusType}
                        onChange={(val) => setBonusType(val as any)}
                        options={[
                          { label: 'Taxa Adicional por Pedido', value: 'FIXED_FEE' },
                          { label: 'Bônus por Km Rodado', value: 'PER_KM' },
                          { label: 'Bônus de Produtividade', value: 'PRODUCTIVITY' },
                          { label: 'Horário de Pico (+ Pedidos)', value: 'PEAK_HOUR' },
                          { label: 'Adicional de Chuva', value: 'RAIN' },
                          { label: 'Fim de Semana Especial', value: 'WEEKEND' },
                          { label: 'Metas (Ganhos ao atingir)', value: 'GOALS' }
                        ]}
                      />
                    </div>

                    <div className="md:col-span-4">
                      <CustomInput
                        label="Valor (R$)"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 5.00"
                        value={bonusAmount}
                        onChange={(e) => setBonusAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div className="md:col-span-4 flex items-center justify-between pb-1.5 pl-2">
                      <Switch label="Bônus Ativo" checked={bonusStatus} onChange={setBonusStatus} />
                      
                      <Button type="submit" className="rounded-xl px-5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-1.5" /> Adicionar
                      </Button>
                    </div>
                  </form>

                  {/* Listagem de Bônus */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Regras de Bonificações Ativas</h4>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-850">
                      {bonuses.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400 italic">Nenhum bônus extra cadastrado.</div>
                      ) : (
                        bonuses.map((bo) => (
                          <div key={bo.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                            <div className="flex items-center gap-4">
                              <Award className="w-5 h-5 text-brand-500" />
                              <div>
                                <span className="font-extrabold text-sm text-gray-855 dark:text-white">{getBonusTypeLabel(bo.bonus_type)}</span>
                                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                  + R$ {bo.amount.toFixed(2)}
                                  <span className={`ml-2.5 inline-block text-[9px] px-2 py-0.2 rounded-full uppercase ${bo.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20' : 'bg-gray-100 text-gray-550'}`}>
                                    {bo.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteBonus(bo.id!)} className="p-2 border border-gray-100 hover:border-red-500 hover:bg-red-50 dark:border-gray-750 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};