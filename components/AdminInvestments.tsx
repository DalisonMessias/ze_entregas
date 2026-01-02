import React, { useEffect, useState } from 'react';
import { Settings, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { CofrinhoSettings } from '../types';

export const AdminInvestments: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<CofrinhoSettings | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const s = await cloud.getCofrinhoSettings();
            setSettings(s || {
                yield_frequency: 'daily',
                interest_type: 'compound',
                rate_percent: 0,
                min_lock_days: 0,
                allow_early_withdrawal: true,
                penalty_percent: 0,
                min_deposit: 0,
                formula_script: null,
                change_policy: 'keep_previous'
            });
        } catch {
            setSettings(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const updateField = <K extends keyof CofrinhoSettings>(key: K, value: CofrinhoSettings[K]) => {
        if (!settings) return;
        setSettings({ ...settings, [key]: value });
    };

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        setFeedback(null);
        try {
            await cloud.adminUpdateCofrinhoSettings(settings);
            setFeedback({ type: 'success', text: 'Configurações atualizadas e usuários notificados.' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: e?.message || 'Falha ao atualizar configurações' });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !settings) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500"/> Zé de Investimentos (Cofrinho)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Gerencie regras de rendimento, carência e resgates do Cofrinho.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Frequência de rendimento</label>
                        <select value={settings.yield_frequency} onChange={e => updateField('yield_frequency', e.target.value as CofrinhoSettings['yield_frequency'])} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600">
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de juros</label>
                        <select value={settings.interest_type} onChange={e => updateField('interest_type', e.target.value as CofrinhoSettings['interest_type'])} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600">
                            <option value="simple">Simples</option>
                            <option value="compound">Compostos</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Taxa de rendimento (%)</label>
                        <input type="number" step="0.01" value={settings.rate_percent} onChange={e => updateField('rate_percent', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Carência (dias)</label>
                        <input type="number" value={settings.min_lock_days} onChange={e => updateField('min_lock_days', parseInt(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depósito mínimo (R$)</label>
                        <input type="number" step="0.01" value={settings.min_deposit} onChange={e => updateField('min_deposit', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permitir resgate antecipado</label>
                        <select value={settings.allow_early_withdrawal ? 'yes' : 'no'} onChange={e => updateField('allow_early_withdrawal', e.target.value === 'yes')} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600">
                            <option value="yes">Sim</option>
                            <option value="no">Não</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Multa de resgate antecipado (%)</label>
                        <input type="number" step="0.01" value={settings.penalty_percent} onChange={e => updateField('penalty_percent', parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Política de mudanças</label>
                        <select value={settings.change_policy} onChange={e => updateField('change_policy', e.target.value as CofrinhoSettings['change_policy'])} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600">
                            <option value="keep_previous">Manter configuração anterior</option>
                            <option value="migrate_new">Migrar para nova configuração</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fórmula personalizada (opcional)</label>
                        <textarea value={settings.formula_script || ''} onChange={e => updateField('formula_script', e.target.value)} rows={4} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border dark:border-gray-600" placeholder="Use para cálculos avançados (apenas informativo por enquanto)"></textarea>
                    </div>
                </div>

                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                        <button onClick={() => setFeedback(null)} className="ml-auto text-gray-400 hover:text-gray-600"><span className="text-xs">Fechar</span></button>
                    </div>
                )}

                <Button fullWidth onClick={save} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    );
};

