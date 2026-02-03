import React, { useState, useEffect } from 'react';
import * as cloud from '../../services/cloud';
import { Button } from '../Button';
import { Loader2, Trash2, Shield, Eye, Activity, Terminal } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase (assumindo que já existe em cloud service, mas aqui instanciamos para acesso direto ou usamos cloud functions)
// Por consistência, vamos usar cloud service methods se existissem, mas como são novos, vamos fazer queries diretas aqui com RLS ou adicionar ao cloud service.
// Dado a estrutura, vou adicionar os métodos aqui mesmo usando um client local ou supondo que 'cloud' tenha método genérico.
// Vou usar supabase direto aqui com as credenciais do ambiente client-side.
const supabase = createClient((import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_ANON_KEY);

interface ApiKey {
    id: string;
    name: string;
    key_token: string;
    permissions: any;
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
    user_id: string;
    user_profiles?: {
        name: string;
        email: string;
        store_name?: string;
    }
}

interface ApiLog {
    id: string;
    endpoint: string;
    method: string;
    status_code: number;
    created_at: string;
    duration_ms: number;
    user_profiles?: {
        name: string;
    }
}

export const ApiManagement: React.FC = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [logs, setLogs] = useState<ApiLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'keys' | 'logs'>('keys');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'keys') {
                const { data, error } = await supabase
                    .from('api_keys')
                    .select('*, user_profiles(name, email, store_name)')
                    .order('created_at', { ascending: false });
                if (data) setKeys(data);
            } else {
                const { data, error } = await supabase
                    .from('api_logs')
                    .select('*, user_profiles(name)')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (data) setLogs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (key: ApiKey) => {
        if (!confirm(`Deseja ${key.is_active ? 'desativar' : 'ativar'} esta chave?`)) return;
        try {
            await supabase.from('api_keys').update({ is_active: !key.is_active }).eq('id', key.id);
            loadData();
        } catch (e) { alert('Erro ao atualizar'); }
    };

    const deleteKey = async (id: string) => {
        if (!confirm('Tem certeza? Isso quebrará a integração do lojista.')) return;
        try {
            await supabase.from('api_keys').delete().eq('id', id);
            loadData();
        } catch (e) { alert('Erro ao deletar'); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 w-full overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('keys')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'keys' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>
                    <Shield className="w-4 h-4" /> Chaves de API
                </button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>
                    <Activity className="w-4 h-4" /> Logs de Uso
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                <>
                    {activeTab === 'keys' && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Lojista</th>
                                        <th className="px-4 py-3">Nome da Chave</th>
                                        <th className="px-4 py-3">Token (Parcial)</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Último Uso</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {keys.map(k => (
                                        <tr key={k.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3">
                                                <div className="font-bold dark:text-white">{k.user_profiles?.store_name || k.user_profiles?.name}</div>
                                                <div className="text-xs text-gray-500">{k.user_profiles?.email}</div>
                                            </td>
                                            <td className="px-4 py-3">{k.name}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{k.key_token.substring(0, 10)}...</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {k.is_active ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Nunca'}
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button onClick={() => toggleStatus(k)} className="text-blue-500 hover:bg-blue-50 p-2 rounded">
                                                    {k.is_active ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {keys.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-gray-400">Nenhuma chave encontrada.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs h-[360px] sm:h-[440px] md:h-[500px] overflow-y-auto">
                            {logs.map(l => (
                                <div key={l.id} className="border-b border-gray-800 py-2 flex gap-4">
                                    <span className="text-gray-500">[{new Date(l.created_at).toLocaleTimeString()}]</span>
                                    <span className={`font-bold ${l.status_code >= 400 ? 'text-red-400' : 'text-green-400'}`}>{l.method}</span>
                                    <span className="text-white">{l.endpoint}</span>
                                    <span className="text-yellow-500">{l.status_code}</span>
                                    <span className="text-gray-400 ml-auto">{l.duration_ms}ms</span>
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-center text-gray-600 mt-10">... Sem logs recentes ...</div>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
