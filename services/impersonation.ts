import { ManagedUser } from '../types';
import { adminLogImpersonationStart, adminLogImpersonationEnd } from './cloud';

const IMPERSONATION_KEY = 'ze_impersonation_mode';

export interface ImpersonationState {
    isActive: boolean;
    storeId: string;
    storeName: string;
    adminId: string;
    reason: string;
    startedAt: number;
    logId?: string;
}

export const getImpersonationState = (): ImpersonationState | null => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(IMPERSONATION_KEY);
        if (!stored) return null;

        const state: ImpersonationState = JSON.parse(stored);

        // Validação básica de expiração (30 minutos) - Opcional, mas boa prática
        const MAX_DURATION = 30 * 60 * 1000;
        if (Date.now() - state.startedAt > MAX_DURATION) {
            clearImpersonationState();
            return null;
        }

        return state;
    } catch {
        return null;
    }
};

export const isImpersonating = (): boolean => {
    return !!getImpersonationState();
};

export const startImpersonation = async (
    adminId: string,
    store: ManagedUser,
    reason: string
): Promise<boolean> => {
    try {
        // 1. Log no banco (Cloud)
        const logId = await adminLogImpersonationStart(store.id, reason);

        if (!logId) {
            console.error("Falha ao criar log de auditoria. Acesso negado.");
            return false;
        }

        // 2. Salvar estado local
        const state: ImpersonationState = {
            isActive: true,
            storeId: store.id,
            storeName: store.name,
            adminId: adminId,
            reason,
            startedAt: Date.now(),
            logId
        };

        localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));

        // 3. Disparar evento para atualizar UI instantaneamente
        window.dispatchEvent(new Event('impersonation_change'));

        return true;
    } catch (error) {
        console.error("Erro ao iniciar impersonation:", error);
        return false;
    }
};

export const stopImpersonation = async (): Promise<void> => {
    const state = getImpersonationState();

    // 1. Tentar finalizar log no banco (não bloqueante)
    if (state?.logId) {
        try {
            await adminLogImpersonationEnd(state.logId);
        } catch (e) {
            console.warn("Não foi possível finalizar log de auditoria:", e);
        }
    }

    // 2. Limpar estado
    clearImpersonationState();
};

const clearImpersonationState = () => {
    localStorage.removeItem(IMPERSONATION_KEY);
    window.dispatchEvent(new Event('impersonation_change'));
};
