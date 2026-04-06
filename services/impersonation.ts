import { ManagedUser } from '../types';

const IMPERSONATION_KEY = 'ze_impersonation_mode';
const MAX_IMPERSONATION_DURATION_MS = 30 * 60 * 1000;

export interface ImpersonationState {
    isActive: boolean;
    storeId: string;
    storeName: string;
    adminId: string;
    reason: string;
    startedAt: number;
    logId?: string;
}

type RawImpersonationState = Partial<ImpersonationState> & {
    isActive?: boolean;
};

const normalizeTextField = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const normalizeImpersonationState = (value: unknown): ImpersonationState | null => {
    if (!value || typeof value !== 'object') return null;

    const rawState = value as RawImpersonationState;
    const storeId = normalizeTextField(rawState.storeId);
    const startedAt = rawState.startedAt;

    if (!storeId) return null;
    if (rawState.isActive === false) return null;
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt <= 0) return null;
    if (Date.now() - startedAt > MAX_IMPERSONATION_DURATION_MS) return null;

    const logId = normalizeTextField(rawState.logId);

    return {
        isActive: true,
        storeId,
        storeName: normalizeTextField(rawState.storeName),
        adminId: normalizeTextField(rawState.adminId),
        reason: normalizeTextField(rawState.reason),
        startedAt,
        ...(logId ? { logId } : {})
    };
};

const persistNormalizedState = (state: ImpersonationState) => {
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
};

const clearStoredImpersonationState = (notify = false) => {
    localStorage.removeItem(IMPERSONATION_KEY);
    if (notify && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('impersonation_change'));
    }
};

export const getImpersonationState = (): ImpersonationState | null => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return null;

    let parsedState: unknown;
    try {
        parsedState = JSON.parse(stored);
    } catch {
        clearStoredImpersonationState();
        return null;
    }

    const normalizedState = normalizeImpersonationState(parsedState);
    if (!normalizedState) {
        clearStoredImpersonationState();
        return null;
    }

    const normalizedRaw = JSON.stringify(normalizedState);
    if (stored !== normalizedRaw) {
        persistNormalizedState(normalizedState);
    }

    return normalizedState;
};

export const getImpersonationStoreId = (): string | null => {
    return getImpersonationState()?.storeId || null;
};

export const isImpersonating = (): boolean => {
    return !!getImpersonationStoreId();
};

export const startImpersonation = async (
    adminId: string,
    store: ManagedUser,
    reason: string
): Promise<boolean> => {
    try {
        const { adminLogImpersonationStart } = await import('./cloud');
        const logId = await adminLogImpersonationStart(store.id, reason);

        if (!logId) {
            console.error('Falha ao criar log de auditoria. Acesso negado.');
            return false;
        }

        const state: ImpersonationState = {
            isActive: true,
            storeId: store.id,
            storeName: store.name,
            adminId,
            reason,
            startedAt: Date.now(),
            logId
        };

        persistNormalizedState(state);
        window.dispatchEvent(new Event('impersonation_change'));

        return true;
    } catch (error) {
        console.error('Erro ao iniciar impersonation:', error);
        return false;
    }
};

export const stopImpersonation = async (): Promise<void> => {
    const state = getImpersonationState();

    if (state?.logId) {
        try {
            const { adminLogImpersonationEnd } = await import('./cloud');
            await adminLogImpersonationEnd(state.logId);
        } catch (error) {
            console.warn('Nao foi possivel finalizar log de auditoria:', error);
        }
    }

    clearStoredImpersonationState(true);
};
