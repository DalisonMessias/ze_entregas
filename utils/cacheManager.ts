/**
 * Gerenciador de Cache em Memória
 * Armazena dados temporariamente para reduzir buscas ao banco
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live em milissegundos
}

class CacheManager {
    private cache: Map<string, CacheEntry<any>>;
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

    constructor() {
        this.cache = new Map();
    }

    /**
     * Armazena dados no cache
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.DEFAULT_TTL
        };
        this.cache.set(key, entry);
    }

    /**
     * Recupera dados do cache se ainda válidos
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Verificar se expirou
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Verifica se uma entrada expirou
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Remove uma entrada do cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Retorna todas as chaves no cache
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Verifica se existe uma chave no cache e se ainda é válida
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Invalida cache por prefixo (útil para invalidar grupo de chaves)
     */
    invalidateByPrefix(prefix: string): void {
        const keysToDelete = Array.from(this.cache.keys())
            .filter(key => key.startsWith(prefix));

        keysToDelete.forEach(key => this.cache.delete(key));
    }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Utilitário para criar chaves de cache consistentes
 */
export const CacheKeys = {
    userProfile: (userId: string) => `user_profile_${userId}`,
    userCity: (userId: string) => `user_city_${userId}`,
    userPermissions: (userId: string) => `user_permissions_${userId}`,
    shopSettings: () => 'shop_settings',
    apiKeys: () => 'api_keys'
};
