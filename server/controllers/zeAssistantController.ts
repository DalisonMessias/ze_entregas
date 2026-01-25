import { Request, Response } from 'express';
import { zeAssistantService } from '../services/zeAssistantService.js';
import { zeAssistantRulesService } from '../services/zeAssistantRulesService.js';
import { zeAssistantKnowledgeService } from '../services/zeAssistantKnowledgeService.js';
import { zeAssistantOrderService } from '../services/zeAssistantOrderService.js';
import * as cloud from '../../services/cloud.js';

/**
 * Controller do Zé Assistente
 * Endpoints para gerenciar configurações e funcionalidades do assistente
 */

// GET /api/ze-assistant/config/:storeId - Buscar configuração
export async function getConfig(req: Request, res: Response) {
    try {
        const { storeId } = req.params;

        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { data, error } = await supabase
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .single();

        if (error || !data) {
            // Se não existir, criar configuração padrão
            const newConfig = await zeAssistantService.createDefaultConfig(storeId);
            return res.json(newConfig);
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
}

// PUT /api/ze-assistant/config/:storeId - Atualizar configuração
export async function updateConfig(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const updates = req.body;

        const success = await zeAssistantService.updateConfig(storeId, updates);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Erro ao atualizar configuração' });
        }
    } catch (error) {
        console.error('Erro ao atualizar config:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
}

// GET /api/ze-assistant/rules/:storeId - Listar regras
export async function getRules(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const rules = await zeAssistantRulesService.getActiveRules(storeId);
        res.json(rules);
    } catch (error) {
        console.error('Erro ao listar regras:', error);
        res.status(500).json({ error: 'Erro ao listar regras' });
    }
}

// POST /api/ze-assistant/rules - Criar regra personalizada
export async function createRule(req: Request, res: Response) {
    try {
        const { storeId, ...ruleData } = req.body;
        const rule = await zeAssistantRulesService.createCustomRule(storeId, ruleData);

        if (rule) {
            res.json(rule);
        } else {
            res.status(500).json({ error: 'Erro ao criar regra' });
        }
    } catch (error) {
        console.error('Erro ao criar regra:', error);
        res.status(500).json({ error: 'Erro ao criar regra' });
    }
}

// PUT /api/ze-assistant/rules/:ruleId - Editar regra
export async function updateRule(req: Request, res: Response) {
    try {
        const { ruleId } = req.params;
        const updates = req.body;

        const success = await zeAssistantRulesService.updateCustomRule(ruleId, updates);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Erro ao atualizar regra' });
        }
    } catch (error) {
        console.error('Erro ao atualizar regra:', error);
        res.status(500).json({ error: 'Erro ao atualizar regra' });
    }
}

// DELETE /api/ze-assistant/rules/:ruleId - Deletar regra
export async function deleteRule(req: Request, res: Response) {
    try {
        const { ruleId } = req.params;
        const success = await zeAssistantRulesService.deleteCustomRule(ruleId);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Erro ao deletar regra' });
        }
    } catch (error) {
        console.error('Erro ao deletar regra:', error);
        res.status(500).json({ error: 'Erro ao deletar regra' });
    }
}

// POST /api/ze-assistant/process-message - Processar mensagem (uso interno)
export async function processMessage(req: Request, res: Response) {
    try {
        const payload = req.body;
        const response = await zeAssistantService.processMessage(payload);
        res.json(response);
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
}

// POST /api/ze-assistant/handoff - Transferir para humano
export async function handoffToHuman(req: Request, res: Response) {
    try {
        const { conversationId, reason } = req.body;
        await zeAssistantService.handoffToHuman(conversationId, reason);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao fazer handoff:', error);
        res.status(500).json({ error: 'Erro ao transferir conversa' });
    }
}

// POST /api/ze-assistant/return-to-assistant - Retornar para assistente
export async function returnToAssistant(req: Request, res: Response) {
    try {
        const { conversationId } = req.body;
        await zeAssistantService.returnToAssistant(conversationId);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao retornar para assistente:', error);
        res.status(500).json({ error: 'Erro ao retornar para assistente' });
    }
}

// GET /api/ze-assistant/conversations/:storeId - Histórico de conversas
export async function getConversations(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { data, error } = await supabase
            .from('ze_assistant_conversations')
            .select('*')
            .eq('store_id', storeId)
            .order('last_interaction_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) {
            return res.status(500).json({ error: 'Erro ao buscar conversas' });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
}

// GET /api/ze-assistant/analytics/:storeId - Métricas do assistente
export async function getAnalytics(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const { period = '7d' } = req.query;

        // Calcular data de início baseado no período
        const daysAgo = period === '30d' ? 30 : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        // Total de conversas
        const { count: totalConversations } = await supabase
            .from('ze_assistant_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gte('created_at', startDate.toISOString());

        // Conversas transferidas para humano
        const { count: handoffCount } = await supabase
            .from('ze_assistant_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('handoff_to_human', true)
            .gte('created_at', startDate.toISOString());

        // Total de mensagens processadas
        const { count: totalMessages } = await supabase
            .from('ze_assistant_messages')
            .select('*, ze_assistant_conversations!inner(store_id)', { count: 'exact', head: true })
            .eq('ze_assistant_conversations.store_id', storeId)
            .gte('created_at', startDate.toISOString());

        // Mensagens por tipo de resposta
        const { data: messagesByType } = await supabase
            .from('ze_assistant_messages')
            .select('response_type, ze_assistant_conversations!inner(store_id)')
            .eq('ze_assistant_conversations.store_id', storeId)
            .gte('created_at', startDate.toISOString());

        const typeCount = messagesByType?.reduce((acc: any, msg: any) => {
            acc[msg.response_type] = (acc[msg.response_type] || 0) + 1;
            return acc;
        }, {}) || {};

        // Pedidos criados
        const { count: ordersCreated } = await supabase
            .from('ze_assistant_orders')
            .select('*, ze_assistant_conversations!inner(store_id)', { count: 'exact', head: true })
            .eq('ze_assistant_conversations.store_id', storeId)
            .gte('created_at', startDate.toISOString());

        res.json({
            period,
            totalConversations: totalConversations || 0,
            handoffCount: handoffCount || 0,
            handoffRate: totalConversations ? ((handoffCount || 0) / totalConversations * 100).toFixed(1) : 0,
            totalMessages: totalMessages || 0,
            messagesByType: typeCount,
            ordersCreated: ordersCreated || 0
        });
    } catch (error) {
        console.error('Erro ao buscar analytics:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
}

// POST /api/ze-assistant/sync-knowledge/:storeId - Sincronizar base de conhecimento
export async function syncKnowledge(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        await zeAssistantKnowledgeService.fullSync(storeId);
        res.json({ success: true, message: 'Base de conhecimento sincronizada' });
    } catch (error) {
        console.error('Erro ao sincronizar conhecimento:', error);
        res.status(500).json({ error: 'Erro ao sincronizar base de conhecimento' });
    }
}

// GET /api/ze-assistant/knowledge/:storeId - Listar base de conhecimento
export async function getKnowledge(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const data = await zeAssistantKnowledgeService.listAll(storeId);
        res.json(data);
    } catch (error) {
        console.error('Erro ao listar conhecimento:', error);
        res.status(500).json({ error: 'Erro ao listar base de conhecimento' });
    }
}

// POST /api/ze-assistant/knowledge/:storeId - Adicionar entrada na base de conhecimento
export async function addKnowledge(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const { question, answer } = req.body;
        const data = await zeAssistantKnowledgeService.addFAQ(storeId, question, answer);

        if (data) {
            res.json(data);
        } else {
            res.status(500).json({ error: 'Erro ao adicionar conhecimento' });
        }
    } catch (error) {
        console.error('Erro ao adicionar conhecimento:', error);
        res.status(500).json({ error: 'Erro ao adicionar conhecimento' });
    }
}

// DELETE /api/ze-assistant/knowledge/:id - Remover entrada da base de conhecimento
export async function deleteKnowledge(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await zeAssistantKnowledgeService.deleteKnowledge(id);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Erro ao deletar conhecimento' });
        }
    } catch (error) {
        console.error('Erro ao deletar conhecimento:', error);
        res.status(500).json({ error: 'Erro ao deletar conhecimento' });
    }
}

// GET /api/ze-assistant/orders/:storeId - Listar pedidos pendentes
export async function getPendingOrders(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const orders = await zeAssistantOrderService.getPendingOrders(storeId);
        res.json(orders);
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
}

// POST /api/ze-assistant/orders/:orderId/confirm - Confirmar pedido
export async function confirmOrder(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        const success = await zeAssistantOrderService.confirmOrder(orderId);

        if (success) {
            res.json({ success: true, message: 'Pedido confirmado' });
        } else {
            res.status(500).json({ error: 'Erro ao confirmar pedido' });
        }
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        res.status(500).json({ error: 'Erro ao confirmar pedido' });
    }
}
// PATCH /api/ze-assistant/conversations/:storeId/:conversationId/toggle-assistant
export async function toggleAssistant(req: Request, res: Response) {
    try {
        const { storeId, conversationId } = req.params;
        const { active } = req.body;

        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { error } = await supabase
            .from('ze_assistant_conversations')
            .update({ is_assistant_active: active })
            .eq('store_id', storeId)
            .eq('conversation_id', conversationId);

        if (error) {
            console.error('Erro ao alternar assistente:', error);
            return res.status(500).json({ error: 'Erro ao alternar assistente na conversa' });
        }

        res.json({ success: true, active });
    } catch (error) {
        console.error('Erro ao alternar assistente:', error);
        res.status(500).json({ error: 'Erro ao alternar assistente' });
    }
}

// GET /api/ze-assistant/quick-replies/:storeId
export async function getQuickReplies(req: Request, res: Response) {
    try {
        const { storeId } = req.params;
        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { data, error } = await supabase
            .from('store_quick_replies')
            .select('*')
            .eq('store_id', storeId)
            .order('title', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar quick replies:', error);
        res.status(500).json({ error: 'Erro ao buscar respostas rápidas' });
    }
}

// POST /api/ze-assistant/quick-replies
export async function upsertQuickReply(req: Request, res: Response) {
    try {
        const { storeId, reply } = req.body;
        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { data, error } = await supabase
            .from('store_quick_replies')
            .upsert({
                store_id: storeId,
                title: reply.title,
                message: reply.message,
                id: reply.id // Se tiver ID, atualiza
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao salvar quick reply:', error);
        res.status(500).json({ error: 'Erro ao salvar resposta rápida' });
    }
}

// DELETE /api/ze-assistant/quick-replies/:id
export async function deleteQuickReply(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const supabase = cloud.getClient();
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

        const { error } = await supabase
            .from('store_quick_replies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar quick reply:', error);
        res.status(500).json({ error: 'Erro ao deletar resposta rápida' });
    }
}
