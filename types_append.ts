
export interface StoreDeliverySettings {
    id: string;
    store_id: string;
    delivery_mode: 'FIXED' | 'NEIGHBORHOOD';
    fixed_fee: number;
    allow_outside_city: boolean;
    created_at: string;
    updated_at: string;
}

export interface StoreNeighborhoodFee {
    id: string;
    store_id: string;
    neighborhood_name: string;
    fee: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
