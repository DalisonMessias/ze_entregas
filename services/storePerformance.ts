import { getClient } from './cloud';

export interface PerformanceMetrics {
    total_orders: number;
    total_revenue: number;
    avg_ticket: number;
    cancelled_count?: number;
    completed_count?: number;
    avg_delivery_time_min?: number;
}

export interface TimelinePoint {
    date: string;
    revenue: number;
    count: number;
}

export interface TopProduct {
    name: string;
    quantity: number;
    total: number;
}

export interface PeakHour {
    hour: number;
    count: number;
}

export interface StorePerformanceData {
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    timeline: TimelinePoint[];
    top_products: TopProduct[];
    peak_hours: PeakHour[];
}

export interface PerformanceParams {
    store_id: string; // Para uso futuro ou se o client exigir
    start_date: string;
    end_date: string;
    granularity: 'day' | 'week' | 'month';
}

export const getStorePerformance = async (params: PerformanceParams): Promise<StorePerformanceData | null> => {
    const sb = getClient();
    if (!sb) return null;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    // Se store_id não for passado, usa o do usuário autenticado (que deve ser lojista)
    const storeId = params.store_id || user.id;

    const { data, error } = await sb.rpc('get_store_performance_dashboard', {
        p_store_id: storeId,
        p_start_date: params.start_date,
        p_end_date: params.end_date,
        p_granularity: params.granularity
    });

    if (error) {
        console.error('Error fetching store performance:', JSON.stringify(error, null, 2), error.message, error.details, error.hint);
        return null;
    }

    return data as StorePerformanceData;
};
