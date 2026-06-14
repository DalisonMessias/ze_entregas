import { supabase } from './cloud';

export type AssignmentType = 'EXCLUSIVE' | 'PRIORITY' | 'SHARED';
export type AssignmentStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export interface DeliveryFixedAssignment {
  id?: string;
  driver_id: string;
  store_id: string;
  assignment_type: AssignmentType;
  status: AssignmentStatus;
  priority_level: number;
  bonus_fixed_amount?: number;
  bonus_per_km?: number;
  max_simultaneous_deliveries?: number;
  custom_delivery_fee?: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  driver?: {
    id: string;
    full_name: string;
    phone: string;
    vehicle_type: string;
  };
  store?: {
    id: string;
    name: string;
  };
}

export const getFixedAssignments = async (filters?: { store_id?: string; driver_id?: string; status?: AssignmentStatus }) => {
  let query = supabase
    .from('delivery_fixed_assignments')
    .select(`
      *,
      driver:user_profiles!driver_id ( id, full_name:name, phone:phone_number, vehicle_type ),
      store:user_profiles!store_id ( id, name:store_name )
    `);

  if (filters?.store_id) query = query.eq('store_id', filters.store_id);
  if (filters?.driver_id) query = query.eq('driver_id', filters.driver_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as DeliveryFixedAssignment[];
};

export const createFixedAssignment = async (assignment: Partial<DeliveryFixedAssignment>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_assignments')
    .insert(assignment)
    .select()
    .single();

  if (error) throw error;
  
  // Log history
  if (data) {
    await logFixedHistory(data.driver_id, data.store_id, 'CREATED', 'Vínculo criado pelo administrador');
  }

  return data;
};

export const updateFixedAssignment = async (id: string, updates: Partial<DeliveryFixedAssignment>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  if (data && updates.status) {
     await logFixedHistory(data.driver_id, data.store_id, 'STATUS_CHANGED', `Status alterado para ${updates.status}`);
  }

  return data;
};

export const logFixedHistory = async (driver_id: string, store_id: string, action: string, reason: string) => {
  const { error } = await supabase
    .from('delivery_fixed_history')
    .insert({ driver_id, store_id, action, reason });

  if (error) console.error('Error logging fixed driver history:', error);
};

export const getFixedHistory = async (filters: { driver_id?: string; store_id?: string }) => {
  let query = supabase.from('delivery_fixed_history').select('*');
  
  if (filters.driver_id) query = query.eq('driver_id', filters.driver_id);
  if (filters.store_id) query = query.eq('store_id', filters.store_id);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

/**
 * Intelligent Distribution Logic
 * Tentativa de alocar o pedido primeiro para os entregadores fixos (Exclusivos/Prioritários) online.
 * Caso nenhum aceite ou esteja disponível, o sistema não atribui e deixa para distribuição geral (fallback).
 */
export const distributeOrder = async (orderId: string, storeId: string) => {
  // 1. Obter entregadores fixos ativos desta loja, ordenados por prioridade
  const { data: assignments, error } = await supabase
    .from('delivery_fixed_assignments')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'ACTIVE')
    .order('priority_level', { ascending: false });

  if (error || !assignments || assignments.length === 0) {
    // Fallback: Nenhum entregador fixo. O pedido vai para distribuição geral.
    return false;
  }

  // 2. Extrair driver_ids
  const driverIds = assignments.map(a => a.driver_id);

  // 3. Verificar quais estão online (mock para status online por agora)
  // A lógica ideal checaria a tabela user_profiles (is_online, etc)
  const { data: onlineDrivers } = await supabase
    .from('user_profiles')
    .select('id')
    .in('id', driverIds)
    .eq('role', 'driver'); 
    // Em um cenário real adicionaríamos .eq('is_online', true) se a coluna existir

  if (!onlineDrivers || onlineDrivers.length === 0) {
     return false; // Todos offline. Fallback para geral.
  }

  const availableDriverIds = onlineDrivers.map(d => d.id);

  // 4. Filtrar o primeiro entregador disponível com base na prioridade configurada
  const bestDriverAssignment = assignments.find(a => availableDriverIds.includes(a.driver_id));

  if (bestDriverAssignment) {
    // 5. Atribuir o pedido ao entregador fixo selecionado
    const { error: updateError } = await supabase
      .from('orders')
      .update({ driver_id: bestDriverAssignment.driver_id })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error dispatching to fixed driver:', updateError);
      return false;
    }

    // O entregador fixo foi definido
    return true;
  }

  return false;
};

// --- NOVAS FUNÇÕES PARA ESCALAS, BÔNUS E SOLICITAÇÕES ---

export interface DeliveryFixedSchedule {
  id?: string;
  assignment_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_holiday?: boolean;
  is_special_shift?: boolean;
}

export interface DeliveryFixedBonus {
  id?: string;
  assignment_id: string;
  bonus_type: 'FIXED_FEE' | 'PER_KM' | 'PRODUCTIVITY' | 'PEAK_HOUR' | 'RAIN' | 'WEEKEND' | 'GOALS';
  amount: number;
  conditions?: any;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface DeliveryFixedRequest {
  id?: string;
  store_id: string;
  driver_id?: string;
  request_type: 'VINCULO' | 'SUBSTITUICAO';
  assignment_type?: AssignmentType;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at?: string;
  store?: {
    id: string;
    name: string;
  };
  driver?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

export const getFixedSchedules = async (assignmentId: string) => {
  const { data, error } = await supabase
    .from('delivery_fixed_schedules')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data as DeliveryFixedSchedule[];
};

export const saveFixedSchedule = async (schedule: Partial<DeliveryFixedSchedule>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_schedules')
    .upsert(schedule)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFixedSchedule = async (id: string) => {
  const { error } = await supabase
    .from('delivery_fixed_schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const getFixedBonuses = async (assignmentId: string) => {
  const { data, error } = await supabase
    .from('delivery_fixed_bonuses')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DeliveryFixedBonus[];
};

export const saveFixedBonus = async (bonus: Partial<DeliveryFixedBonus>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_bonuses')
    .upsert(bonus)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFixedBonus = async (id: string) => {
  const { error } = await supabase
    .from('delivery_fixed_bonuses')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const getFixedRequests = async (filters?: { store_id?: string; driver_id?: string; status?: string }) => {
  let query = supabase
    .from('delivery_fixed_requests')
    .select(`
      *,
      store:user_profiles!store_id ( id, name:store_name ),
      driver:user_profiles!driver_id ( id, full_name:name, phone:phone_number )
    `);

  if (filters?.store_id) query = query.eq('store_id', filters.store_id);
  if (filters?.driver_id) query = query.eq('driver_id', filters.driver_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as DeliveryFixedRequest[];
};

export const createFixedRequest = async (request: Partial<DeliveryFixedRequest>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_requests')
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateFixedRequest = async (id: string, updates: Partial<DeliveryFixedRequest>) => {
  const { data, error } = await supabase
    .from('delivery_fixed_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  // Se aprovado, cria o vínculo real no banco
  if (data && updates.status === 'APPROVED') {
    await createFixedAssignment({
      driver_id: data.driver_id,
      store_id: data.store_id,
      assignment_type: data.assignment_type || 'PRIORITY',
      status: 'ACTIVE',
      priority_level: 50, // default prioridade
      max_simultaneous_deliveries: 3
    });
  }

  return data;
};

export const rejectFixedOffer = async (requestId: string) => {
  const { data, error } = await supabase.rpc('reject_fixed_partner_offer', {
    p_request_id: requestId
  });

  if (error) throw error;
  return data;
};

export const getFixedStatistics = async (assignmentId: string) => {
  const { data, error } = await supabase
    .from('delivery_fixed_statistics')
    .select('*')
    .eq('assignment_id', assignmentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 é no-rows-returned
  return data;
};

