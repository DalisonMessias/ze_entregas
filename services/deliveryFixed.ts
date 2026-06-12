import { supabase } from '../supabase/client';

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
      driver:users!driver_id ( id, full_name, phone, vehicle_type ),
      store:stores!store_id ( id, name )
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
