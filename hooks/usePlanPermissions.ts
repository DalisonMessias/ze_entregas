/**
 * usePlanPermissions — Hook centralizado de permissões por plano.
 *
 * Retorna um objeto com as permissões disponíveis para o lojista com base no plano atual.
 * Centraliza a lógica de acesso para evitar verificações duplicadas nos componentes.
 */

import { useState, useEffect } from 'react';
import { getMyPlanStatus, checkAndDowngradeExpiredPlan } from '../services/cloud';
import { PlanStatus, PlanLevel } from '../types';

export interface PlanPermissions {
    /** Nível do plano atual: GRATUITO, COMISSAO ou MENSALIDADE */
    planLevel: PlanLevel;
    /** Status do plano: GRATUITO, ATIVO ou EXPIRADO */
    planStatus: 'GRATUITO' | 'ATIVO' | 'EXPIRADO';
    /** Se o plano está ativo e não expirado */
    isActive: boolean;
    /** Se o plano é o gratuito */
    isFree: boolean;
    /** Se o plano é o pago por pedido (COMISSAO) */
    isPerOrder: boolean;
    /** Se o plano é o pago mensal (MENSALIDADE) */
    isMonthly: boolean;
    /** Se o plano expirou */
    isExpired: boolean;
    /** Data de expiração do plano mensal */
    expirationDate: Date | null;
    /** Texto formatado da data de expiração */
    expirationDateFormatted: string | null;

    // --- Permissões de Funcionalidades ---
    /** Acesso ao WhatsBot (automação de mensagens) */
    canAccessWhatsBot: boolean;
    /** Acesso a relatórios avançados */
    canAccessAdvancedReports: boolean;
    /** Acesso ao módulo de promoções */
    canAccessPromotions: boolean;
    /** Acesso à IA (Ze AI) */
    canAccessAI: boolean;
    /** Acesso ao ZéPay (financeiro avançado) */
    canAccessZePay: boolean;
    /** Acesso ao módulo de empréstimos */
    canAccessLoans: boolean;
    /** Acesso a regras de frete avançadas */
    canAccessShippingRules: boolean;
    /** Acesso à equipe / gerentes adicionais */
    canAccessTeamManagement: boolean;
    /** Acesso ao módulo de marketing */
    canAccessMarketing: boolean;
    /** Acesso a destaque na cidade */
    canAccessHighlight: boolean;
    /** Número máximo de produtos (-1 = ilimitado) */
    maxProducts: number;
    /** Zero comissão nas vendas */
    hasZeroCommission: boolean;

    /** Flag indicando se os dados ainda estão carregando */
    loading: boolean;
}

const FREE_PERMISSIONS: Omit<PlanPermissions, 'planLevel' | 'planStatus' | 'isActive' | 'isFree' | 'isPerOrder' | 'isMonthly' | 'isExpired' | 'expirationDate' | 'expirationDateFormatted' | 'loading'> = {
    canAccessWhatsBot: false,
    canAccessAdvancedReports: false,
    canAccessPromotions: false,
    canAccessAI: false,
    canAccessZePay: false,
    canAccessLoans: false,
    canAccessShippingRules: false,
    canAccessTeamManagement: false,
    canAccessMarketing: false,
    canAccessHighlight: false,
    maxProducts: 10,
    hasZeroCommission: false,
};

const PER_ORDER_PERMISSIONS: Omit<PlanPermissions, 'planLevel' | 'planStatus' | 'isActive' | 'isFree' | 'isPerOrder' | 'isMonthly' | 'isExpired' | 'expirationDate' | 'expirationDateFormatted' | 'loading'> = {
    canAccessWhatsBot: true,
    canAccessAdvancedReports: true,
    canAccessPromotions: true,
    canAccessAI: true,
    canAccessZePay: true,
    canAccessLoans: true,
    canAccessShippingRules: true,
    canAccessTeamManagement: true,
    canAccessMarketing: true,
    canAccessHighlight: false, // Destaque apenas no mensal
    maxProducts: -1, // Ilimitado
    hasZeroCommission: false, // Cobra % por pedido
};

const MONTHLY_PERMISSIONS: Omit<PlanPermissions, 'planLevel' | 'planStatus' | 'isActive' | 'isFree' | 'isPerOrder' | 'isMonthly' | 'isExpired' | 'expirationDate' | 'expirationDateFormatted' | 'loading'> = {
    canAccessWhatsBot: true,
    canAccessAdvancedReports: true,
    canAccessPromotions: true,
    canAccessAI: true,
    canAccessZePay: true,
    canAccessLoans: true,
    canAccessShippingRules: true,
    canAccessTeamManagement: true,
    canAccessMarketing: true,
    canAccessHighlight: true,
    maxProducts: -1, // Ilimitado
    hasZeroCommission: true, // Zero comissão — já paga mensalidade
};

export const usePlanPermissions = (): PlanPermissions => {
    const [planData, setPlanData] = useState<PlanStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchPlan = async () => {
            try {
                // Primeiro verifica se há planos expirados para fazer downgrade
                await checkAndDowngradeExpiredPlan();

                // Depois busca o status atual do plano
                const status = await getMyPlanStatus();
                if (!cancelled) {
                    setPlanData(status);
                }
            } catch (e) {
                console.error('[usePlanPermissions] Erro ao buscar plano:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchPlan();

        return () => { cancelled = true; };
    }, []);

    if (loading || !planData) {
        return {
            planLevel: 'GRATUITO',
            planStatus: 'GRATUITO',
            isActive: false,
            isFree: true,
            isPerOrder: false,
            isMonthly: false,
            isExpired: false,
            expirationDate: null,
            expirationDateFormatted: null,
            loading,
            ...FREE_PERMISSIONS,
        };
    }

    const { plan_level, plan_status, is_expired, super_store_expiration } = planData;

    const expirationDate = super_store_expiration ? new Date(super_store_expiration) : null;
    const expirationDateFormatted = expirationDate
        ? expirationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;

    const isFree = plan_level === 'GRATUITO' || is_expired;
    const isPerOrder = plan_level === 'COMISSAO' && !is_expired;
    const isMonthly = plan_level === 'MENSALIDADE' && !is_expired;
    const isActive = (isPerOrder || isMonthly);

    let specificPermissions = FREE_PERMISSIONS;
    if (isMonthly) specificPermissions = MONTHLY_PERMISSIONS;
    else if (isPerOrder) specificPermissions = PER_ORDER_PERMISSIONS;

    return {
        planLevel: isFree ? 'GRATUITO' : plan_level,
        planStatus: plan_status,
        isActive,
        isFree,
        isPerOrder,
        isMonthly,
        isExpired: is_expired,
        expirationDate,
        expirationDateFormatted,
        loading: false,
        ...specificPermissions,
    };
};
