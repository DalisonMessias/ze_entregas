
export interface BrasilAbertoDistrict {
    id: number;
    name: string;
}

export interface BrasilAbertoResponse<T> {
    meta: {
        currentPage: number;
        itemsPerPage: number;
        totalOfItems: number;
        totalOfPages: number;
        timestamp: string;
    };
    result: T;
}

export interface CityDistrict {
    id: string;
    city_id: string;
    name: string;
    created_at: string;
}
