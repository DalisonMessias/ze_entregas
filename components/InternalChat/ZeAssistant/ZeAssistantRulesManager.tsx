import React, { useState, useEffect } from 'react';
import * as cloud from '../../../services/cloud';
import { Button } from '../../Button';
import { BaseModal } from '../../BaseModal';
import { useNotification } from '../../../contexts/NotificationContext';
import { useDialog } from '../../../utils/dialogService';
import { Plus, Trash2, Pencil, X, MessageSquare, Tag, Loader2 } from 'lucide-react';

interface ZeAssistantRule {
    id: string;
    name: string;
    description: string | null;
    trigger_keywords: string[];
    response_template: string;
    is_active: boolean;
    priority: number;
    rule_type: 'SYSTEM' | 'CUSTOM';
}

interface ZeAssistantRulesManagerProps {
    storeId: string;
}

export const ZeAssistantRulesManager: React.FC<ZeAssistantRulesManagerProps> = ({ storeId }) => {
    const [rules, setRules] = useState<ZeAssistantRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<ZeAssistantRule> | null>(null);
    const [error, setError] = useState(false);
    const { showNotification } = useNotification();
    const { confirm } = useDialog();
    const supabase = cloud.getClient();

    useEffect(() => {
        if (supabase) {
            fetchRules();
        }
    }, [storeId, supabase]);

    const fetchRules = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('ze_assistant_rules')
                .select('*')
                .or(`rule_type.eq.SYSTEM,store_id.eq.${storeId}`)
                .order('priority', { ascending: false });

            if (error) throw error;
            setRules(data || []);
            setError(false);
        } catch (error) {
            console.error('Erro ao buscar regras:', error);
            setError(true);
            showNotification('Erro ao carregar regras', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRule = async () => {
        if (!supabase) return;
        try {
            if (!editingRule?.name || !editingRule?.response_template) {
                showNotification('Preencha os campos obrigatórios', 'error');
                return;
            }

            const ruleData = {
                store_id: storeId,
                rule_type: 'CUSTOM',
                name: editingRule.name,
                description: editingRule.description,
                trigger_keywords: Array.isArray(editingRule.trigger_keywords)
                    ? editingRule.trigger_keywords.map(k => k.trim()).filter(k => k.length > 0)
                    : (editingRule.trigger_keywords as string).split(',').map(k => k.trim()).filter(k => k.length > 0),
                response_template: editingRule.response_template,
                priority: editingRule.priority || 100,
                is_active: true
            };

            // Se a regra que estamos editando era SYSTEM, devemos INSERIR como CUSTOM
            // Se já era CUSTOM e tinha ID, fazemos UPDATE
            if (editingRule.id && editingRule.rule_type === 'CUSTOM') {
                const { error } = await supabase
                    .from('ze_assistant_rules')
                    .update(ruleData)
                    .eq('id', editingRule.id);
                if (error) throw error;
                showNotification('Regra atualizada!', 'success');
            } else {
                const { error } = await supabase
                    .from('ze_assistant_rules')
                    .insert(ruleData);
                if (error) throw error;
                showNotification(editingRule.rule_type === 'SYSTEM' ? 'Regra do sistema personalizada!' : 'Regra criada!', 'success');
            }

            setIsModalOpen(false);
            fetchRules();
        } catch (error) {
            console.error('Erro ao salvar regra:', error);
            showNotification('Erro ao salvar regra', 'error');
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!supabase) return;
        const confirmed = await confirm({ title: 'Excluir Regra', message: 'Tem certeza que deseja excluir esta regra?' });
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('ze_assistant_rules')
                .delete()
                .eq('id', id)
                .eq('rule_type', 'CUSTOM'); // Segurança extra

            if (error) throw error;
            showNotification('Regra excluída!', 'success');
            fetchRules();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showNotification('Erro ao excluir regra', 'error');
        }
    };

    const openModal = (rule?: ZeAssistantRule) => {
        if (rule) {
            setEditingRule(rule);
        } else {
            setEditingRule({
                name: '',
                description: '',
                trigger_keywords: [],
                response_template: '',
                priority: 100
            });
        }
        setIsModalOpen(true);
    };

    if (loading) return (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 mt-6">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Carregando regras...</p>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-dashed border-red-200 dark:border-red-800/20 mt-6">
            <X className="w-6 h-6 mx-auto text-red-500 mb-2" />
            <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-widest">Falha ao carregar regras.</p>
            <button onClick={fetchRules} className="text-[10px] font-black text-red-600 underline mt-2 uppercase tracking-tighter">Tentar Novamente</button>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 mt-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Regras de Resposta</h2>
                    <p className="text-sm text-gray-500">Configure como o Zé deve responder a palavras-chave específicas</p>
                </div>
                <Button onClick={() => openModal()} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Regra
                </Button>
            </div>

            <div className="space-y-4">
                {rules.map((rule) => (
                    <div key={rule.id} className={`border rounded-lg p-4 transition-all hover:shadow-md ${rule.rule_type === 'SYSTEM' ? 'bg-gray-50 border-gray-200' : 'bg-white border-purple-100'}`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${rule.rule_type === 'SYSTEM' ? 'bg-gray-200 text-gray-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {rule.rule_type === 'SYSTEM' ? 'Sistema' : 'Personalizada'}
                                </span>
                                <h3 className="font-semibold text-gray-800">{rule.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openModal(rule)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title={rule.rule_type === 'SYSTEM' ? 'Personalizar Regra do Sistema' : 'Editar Regra'}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteRule(rule.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir Regra">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {rule.description && (
                            <p className="text-xs text-gray-500 mb-3">{rule.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                            <div className="space-y-1">
                                <p className="text-gray-500 font-medium flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5" />
                                    Palavras-chave:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {rule.trigger_keywords.map((k, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-white rounded text-gray-600 border border-gray-200 text-xs">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-500 font-medium flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Resposta:
                                </p>
                                <p className="text-gray-700 italic bg-gray-50 p-2 rounded border border-dashed border-gray-200">
                                    "{rule.response_template}"
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {rules.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
                        Nenhuma regra configurada.
                    </div>
                )}
            </div>

            {/* Modal Padrão do Sistema */}
            <BaseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRule?.id
                    ? (editingRule.rule_type === 'SYSTEM' ? 'Personalizar Regra do Sistema' : 'Editar Regra')
                    : 'Nova Regra'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome da Regra</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            value={editingRule?.name || ''}
                            onChange={e => setEditingRule(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                            placeholder="Ex: Saudações"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            value={editingRule?.description || ''}
                            onChange={e => setEditingRule(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                            placeholder="Ex: Responder quando o cliente disser oi"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Palavras-chave (separadas por vírgula)</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            value={Array.isArray(editingRule?.trigger_keywords) ? editingRule?.trigger_keywords.join(', ') : (editingRule?.trigger_keywords || '')}
                            onChange={e => {
                                const val = e.target.value;
                                // Mantemos como string no input visual, mas convertemos para array ao salvar? 
                                // Não, o state pede string[] na interface ZeAssistantRule, mas Partial pode ser tricky.
                                // Vamos converter na hora:
                                setEditingRule(prev => prev ? ({ ...prev, trigger_keywords: val.split(',') }) : null)
                            }}
                            placeholder="Ex: oi, olá, bom dia"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Separe as palavras por vírgula. Ex: pix, pagamento, conta
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Resposta do Assistente</label>
                        <textarea
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all min-h-[120px]"
                            rows={4}
                            value={editingRule?.response_template || ''}
                            onChange={e => setEditingRule(prev => prev ? ({ ...prev, response_template: e.target.value }) : null)}
                            placeholder="Olá {{customer_name}}, tudo bem?..."
                        />
                        <div className="flex gap-2 mt-2">
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 font-mono cursor-pointer hover:bg-gray-200" onClick={() => setEditingRule(prev => prev ? ({ ...prev, response_template: (prev.response_template || '') + ' {{customer_name}}' }) : null)}>{"{{customer_name}}"}</span>
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 font-mono cursor-pointer hover:bg-gray-200" onClick={() => setEditingRule(prev => prev ? ({ ...prev, response_template: (prev.response_template || '') + ' {{store_name}}' }) : null)}>{"{{store_name}}"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t dark:border-gray-700">
                    <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="px-6">Cancelar</Button>
                    <Button onClick={handleSaveRule} className="bg-purple-600 hover:bg-purple-700 text-white px-8 shadow-lg shadow-purple-200 dark:shadow-none">
                        {editingRule?.id ? 'Salvar Alterações' : 'Criar Regra'}
                    </Button>
                </div>
            </BaseModal>
        </div>
    );
};

