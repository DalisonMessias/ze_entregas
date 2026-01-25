import React, { useState, useEffect } from 'react';
import * as cloud from '../../../services/cloud';
import { Switch } from '../../Switch';
import { Button } from '../../Button';
import { useNotification } from '../../../contexts/NotificationContext';
import { Sparkles, Settings, MessageCircle, ShoppingBag, Loader2, Activity } from 'lucide-react';

interface ZeAssistantConfigProps {
    storeId: string;
}

export const ZeAssistantConfig: React.FC<ZeAssistantConfigProps> = ({ storeId }) => {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showNotification } = useNotification();
    const supabase = cloud.getClient();

    useEffect(() => {
        if (supabase) {
            fetchConfig();
        }
    }, [storeId, supabase]);

    const fetchConfig = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('ze_assistant_config')
                .select('*')
                .eq('store_id', storeId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setConfig(data);
            } else {
                // Criar config padrão se não existir
                const { data: newConfig, error: createError } = await supabase
                    .from('ze_assistant_config')
                    .insert({
                        store_id: storeId,
                        is_enabled: false,
                        ai_enabled: true,
                        rules_enabled: true
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                setConfig(newConfig);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            showNotification('Erro ao carregar configurações do Zé Assistente', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!supabase) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ze_assistant_config')
                .update({
                    is_enabled: config.is_enabled,
                    ai_enabled: config.ai_enabled,
                    rules_enabled: config.rules_enabled,
                    can_create_orders: config.can_create_orders,
                    can_delivery: config.can_delivery,
                    can_pickup: config.can_pickup,
                    greeting_message: config.greeting_message,
                    fallback_message: config.fallback_message,
                    instruction_closed_store: config.instruction_closed_store
                })
                .eq('store_id', storeId);

            if (error) throw error;
            showNotification('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showNotification('Erro ao salvar configurações', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Carregando configurações...</p>
        </div>
    );

    if (!config) return (
        <div className="p-12 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-dashed border-red-200 dark:border-red-800/20">
            <Activity className="w-8 h-8 mx-auto text-red-500 mb-4" />
            <p className="text-sm text-red-600 dark:text-red-400 font-bold uppercase tracking-widest">Falha ao carregar configurações.</p>
            <Button onClick={fetchConfig} className="mt-4 bg-red-600 hover:bg-red-700 text-white text-xs uppercase tracking-widest font-black">Tentar Novamente</Button>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 space-y-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Zé Assistente</h2>
                        <p className="text-sm text-gray-500">Seu assistente virtual inteligente para WhatsApp</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${config.is_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {config.is_enabled ? 'ATIVADO' : 'DESATIVADO'}
                    </span>
                    <Switch
                        checked={config.is_enabled}
                        onChange={(checked) => setConfig({ ...config, is_enabled: checked })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modos de Operação */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Modos de Operação
                    </h3>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Inteligência Artificial (IA)</p>
                                <p className="text-xs text-gray-500">Responder perguntas usando IA avançada</p>
                            </div>
                            <Switch
                                checked={config.ai_enabled}
                                onChange={(checked) => setConfig({ ...config, ai_enabled: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Regras Fixas</p>
                                <p className="text-xs text-gray-500">Usar respostas pré-definidas para palavras-chave</p>
                            </div>
                            <Switch
                                checked={config.rules_enabled}
                                onChange={(checked) => setConfig({ ...config, rules_enabled: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* Funcionalidades */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Funcionalidades
                    </h3>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Criação de Pedidos</p>
                                <p className="text-xs text-gray-500">Permitir que o Zé monte pedidos no chat</p>
                            </div>
                            <Switch
                                checked={config.can_create_orders}
                                onChange={(checked) => setConfig({ ...config, can_create_orders: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Agendar Entrega</p>
                                <p className="text-xs text-gray-500">Permitir pedidos para entrega</p>
                            </div>
                            <Switch
                                checked={config.can_delivery}
                                disabled={!config.can_create_orders}
                                onChange={(checked) => setConfig({ ...config, can_delivery: checked })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mensagens Personalizadas */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Personalização
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensagem de Saudação
                        </label>
                        <textarea
                            value={config.greeting_message || ''}
                            onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
                            className="w-full p-2 border rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                            rows={2}
                            placeholder="Ex: Olá! Sou o Zé, assistente virtual..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensagem de Fallback (Não entendeu)
                        </label>
                        <textarea
                            value={config.fallback_message || ''}
                            onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })}
                            className="w-full p-2 border rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                            rows={2}
                            placeholder="Ex: Desculpe, não entendi. Vou chamar um humano..."
                        />
                    </div>

                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                        <label className="block text-sm font-bold text-brand-700 mb-1">
                            Instrução para Loja Fechada
                        </label>
                        <p className="text-[10px] text-brand-600 mb-2 font-medium">Esta mensagem será enviada automaticamente pelo Zé quando a loja estiver fechada, mesmo que ele esteja pausado.</p>
                        <textarea
                            value={config.instruction_closed_store || ''}
                            onChange={(e) => setConfig({ ...config, instruction_closed_store: e.target.value })}
                            className="w-full p-2 border border-brand-200 rounded-md text-sm focus:ring-brand-500 focus:border-brand-500 bg-white"
                            rows={3}
                            placeholder="Ex: Olá! No momento estamos fechados..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    );
};

