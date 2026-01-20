import { supabaseAdmin } from './supabaseClient.js';
import type { ZeAssistantRule, ConversationContext } from '../../types/zeAssistant.js';

/**
 * Serviço de Regras Fixas do Zé Assistente
 * Gerencia regras do sistema e personalizadas por loja
 */
export class ZeAssistantRulesService {

    /**
     * Busca todas as regras ativas (sistema + personalizadas da loja)
     */
    async getActiveRules(storeId: string): Promise<ZeAssistantRule[]> {
        const supabase = supabaseAdmin;
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('ze_assistant_rules')
            .select('*')
            .eq('is_active', true)
            .or(`rule_type.eq.SYSTEM,store_id.eq.${storeId}`)
            .order('priority', { ascending: false });

        if (error) {
            console.error('Erro ao buscar regras:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Encontra a melhor regra para uma mensagem
     */
    async findMatchingRule(
        messageText: string,
        storeId: string
    ): Promise<{ rule: ZeAssistantRule | null; confidence: number }> {
        const rules = await this.getActiveRules(storeId);
        const normalizedMessage = this.normalizeText(messageText);

        let bestMatch: ZeAssistantRule | null = null;
        let bestScore = 0;

        for (const rule of rules) {
            const score = this.calculateMatchScore(normalizedMessage, rule);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = rule;
            }
        }

        // Só retorna se confiança for > 50%
        return {
            rule: bestScore > 0.5 ? bestMatch : null,
            confidence: bestScore
        };
    }

    /**
     * Calcula score de correspondência entre mensagem e regra
     */
    private calculateMatchScore(normalizedMessage: string, rule: ZeAssistantRule): number {
        const keywords = rule.trigger_keywords.map(k => this.normalizeText(k));
        let matchCount = 0;

        for (const keyword of keywords) {
            if (rule.match_mode === 'exact') {
                if (normalizedMessage === keyword) return 1.0;
            } else if (rule.match_mode === 'starts_with') {
                if (normalizedMessage.startsWith(keyword)) matchCount++;
            } else if (rule.match_mode === 'contains') {
                if (normalizedMessage.includes(keyword)) matchCount++;
            } else if (rule.match_mode === 'regex') {
                try {
                    const regex = new RegExp(keyword, 'i');
                    if (regex.test(normalizedMessage)) matchCount++;
                } catch (e) {
                    console.error('Regex inválido:', keyword);
                }
            }
        }

        // Score baseado na proporção de keywords encontradas
        return matchCount > 0 ? matchCount / keywords.length : 0;
    }

    /**
     * Aplica template de resposta com substituição de variáveis
     */
    async applyTemplate(
        rule: ZeAssistantRule,
        storeId: string,
        context: ConversationContext
    ): Promise<string> {
        let response = rule.response_template;

        // Buscar dados da loja para variáveis
        const storeData = await this.getStoreData(storeId);

        // Substituir variáveis do tipo {{variable}}
        const variables = {
            ...rule.variables,
            ...context.variables,
            store_name: storeData.store_name,
            store_address: storeData.store_address,
            store_phone: storeData.phone_number,
            store_hours: storeData.opening_hours
        };

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            response = response.replace(new RegExp(placeholder, 'g'), String(value));
        }

        return response;
    }

    /**
     * Busca dados da loja para substituição em templates
     */
    private async getStoreData(storeId: string): Promise<any> {
        const supabase = supabaseAdmin;
        if (!supabase) return {};

        const { data } = await supabase
            .from('user_profiles')
            .select('store_name, phone_number, opening_hours, store_address_street, store_address_number, store_address_city, store_address_state')
            .eq('id', storeId)
            .single();

        return {
            store_name: data?.store_name || 'Nossa loja',
            phone_number: data?.phone_number || '',
            opening_hours: data?.opening_hours || 'Consulte nossos horários',
            store_address: data?.store_address_street
                ? `${data.store_address_street}, ${data.store_address_number} - ${data.store_address_city}/${data.store_address_state}`
                : 'Consulte nosso endereço'
        };
    }

    /**
     * Normaliza texto para comparação
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .trim();
    }

    /**
     * Cria regra personalizada
     */
    async createCustomRule(storeId: string, rule: Partial<ZeAssistantRule>): Promise<ZeAssistantRule | null> {
        const supabase = supabaseAdmin;
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('ze_assistant_rules')
            .insert({
                rule_type: 'CUSTOM',
                store_id: storeId,
                ...rule
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar regra:', error);
            return null;
        }

        return data;
    }

    /**
     * Atualiza regra personalizada
     */
    async updateCustomRule(ruleId: string, updates: Partial<ZeAssistantRule>): Promise<boolean> {
        const supabase = supabaseAdmin;
        if (!supabase) return false;

        const { error } = await supabase
            .from('ze_assistant_rules')
            .update(updates)
            .eq('id', ruleId)
            .eq('rule_type', 'CUSTOM'); // Só permite editar regras customizadas

        return !error;
    }

    /**
     * Deleta regra personalizada
     */
    async deleteCustomRule(ruleId: string): Promise<boolean> {
        const supabase = supabaseAdmin;
        if (!supabase) return false;

        const { error } = await supabase
            .from('ze_assistant_rules')
            .delete()
            .eq('id', ruleId)
            .eq('rule_type', 'CUSTOM');

        return !error;
    }
}

export const zeAssistantRulesService = new ZeAssistantRulesService();
