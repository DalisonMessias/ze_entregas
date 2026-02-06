
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { PayoutSettings, PayoutSummary, PartnerPayment, DriverPaymentInfo, PendingPayoutSummary, PayoutDayOfWeek, PayoutMethodType } from '../types';
import * as cloud from '../services/cloud';
import { Loader2, CheckCircle, AlertTriangle, Clock, CalendarDays, Settings, History, Banknote, X as CloseIcon } from 'lucide-react';
import { Switch } from './Switch';
import { MobileTabsSelect } from './MobileTabsSelect';
import { CustomSelect } from './CustomSelect';
// --- TOAST COMPONENT (copied from AdminPanel.tsx for consistency) ---

export const AdminPayouts: React.FC = () => {
    const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { alert, confirm } = useDialog();
    const [activeTab, setActiveTab] = useState<'general' | 'drivers' | 'pending'>('general'); // New state for tabs

    // New state for payout specific settings
    const [minPayoutAmount, setMinPayoutAmount] = useState<number>(0);
    const [automaticPayoutsEnabled, setAutomaticPayoutsEnabled] = useState<boolean>(false);
    const [payoutDayOfWeek, setPayoutDayOfWeek] = useState<PayoutDayOfWeek>('MONDAY');
    const [payoutTime, setPayoutTime] = useState<string>('09:00'); // e.g., '09:00', '17:00'
    const [drivers, setDrivers] = useState<DriverPaymentInfo[]>([]); // New state for drivers
    const [pendingPayouts, setPendingPayouts] = useState<PendingPayoutSummary[]>([]); // New state for pending payouts

    useEffect(() => {
        loadSettingsAndDrivers();
    }, []);

    useEffect(() => {
        const sb = cloud.getClient();
        if (!sb) return;
        const settingsChannel = sb
            .channel('public:payout_settings')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payout_settings' }, async (payload: any) => {
                const s = payload.new || {};
                setPayoutSettings(s);
                setAutomaticPayoutsEnabled(!!s.automatic_payouts_enabled);
                setMinPayoutAmount(s.min_payout_amount !== undefined ? s.min_payout_amount : 0);
                setPayoutDayOfWeek((s.payout_day_of_week || 'MONDAY') as PayoutDayOfWeek);
                setPayoutTime(s.payout_time || '09:00');
                try {
                    const fetchedDrivers = await cloud.adminGetDriversWithPaymentDetails();
                    setDrivers(fetchedDrivers);
                } catch { }
                // Excluído toast de sincronização para evitar poluição visual
            })
            .subscribe();

        const profilesChannel = sb
            .channel('public:user_profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (payload: any) => {
                const n = payload.new || {};
                if (!n.id) return;
                setDrivers(prev => prev.map(d => d.id === n.id ? { ...d, automatic_payouts_enabled: n.automatic_payouts_enabled, preferred_payout_method_type: n.preferred_payout_method_type, bank_details: n.bank_details } : d));
            })
            .subscribe();

        return () => {
            sb.removeChannel(settingsChannel);
            sb.removeChannel(profilesChannel);
        };
    }, []);

    const loadSettingsAndDrivers = async () => {
        setLoading(true);
        try {
            const settings: PayoutSettings = await cloud.adminGetPayoutSettings();
            if (settings) {
                setPayoutSettings(settings);
                // Ensure all payout settings are correctly initialized, including min_payout_amount
                setMinPayoutAmount(settings.min_payout_amount !== undefined ? settings.min_payout_amount : 0);
                setAutomaticPayoutsEnabled(settings.automatic_payouts_enabled || false);
                setPayoutDayOfWeek((settings.payout_day_of_week || 'MONDAY') as PayoutDayOfWeek);
                setPayoutTime(settings.payout_time || '09:00');
            }
            const fetchedDrivers = await cloud.adminGetDriversWithPaymentDetails();
            setDrivers(fetchedDrivers);

            const fetchedPendingPayouts = await cloud.adminGetPendingPayouts();
            setPendingPayouts(fetchedPendingPayouts);

        } catch (e: any) {
            console.error("Failed to load payout settings, drivers or pending payouts:", e);
            await alert("Erro ao carregar configurações de repasse, entregadores ou repasses pendentes.");
        } finally {
            setLoading(false);
        }
    };



    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const updatedSettings: PayoutSettings = {
                min_payout_amount: minPayoutAmount,
                automatic_payouts_enabled: automaticPayoutsEnabled,
                payout_day_of_week: payoutDayOfWeek,
                payout_time: payoutTime,
            };
            const prevEnabled = payoutSettings?.automatic_payouts_enabled || false;
            await cloud.adminUpdatePayoutSettings(updatedSettings);
            if (prevEnabled !== automaticPayoutsEnabled) {
                const affected = await cloud.adminBulkSetDriverAutomaticPayouts(automaticPayoutsEnabled);
                setDrivers(prev => prev.map(d => ({ ...d, automatic_payouts_enabled: automaticPayoutsEnabled })));
                await alert(automaticPayoutsEnabled ? `Repasses automáticos ativados para ${affected} entregadores.` : `Repasses automáticos desativados para ${affected} entregadores.`);
            } else {
                await alert("Configurações de repasse salvas com sucesso!");
            }
        } catch (e: any) {
            console.error("Failed to save payout settings:", e);
            await alert("Erro ao salvar configurações de repasse: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleDriverAutomaticPayouts = async (driverId: string, enabled: boolean) => {
        setIsSaving(true);
        try {
            await cloud.adminUpdateDriverAutomaticPayouts(driverId, enabled);
            setDrivers(prevDrivers =>
                prevDrivers.map(driver =>
                    driver.id === driverId ? { ...driver, automatic_payouts_enabled: enabled } : driver
                )
            );
            await alert(`Repasse automático para ${drivers.find(d => d.id === driverId)?.name} ${enabled ? 'ativado' : 'desativado'}!`);
        } catch (e: any) {
            console.error("Failed to update driver automatic payouts:", e);
            await alert("Erro ao atualizar repasse automático do entregador: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateDriverPreferredPayoutMethod = async (driverId: string, method: 'PIX' | 'BANK_TRANSFER') => {
        setIsSaving(true);
        try {
            await cloud.adminUpdateDriverPreferredPayoutMethod(driverId, method);
            setDrivers(prevDrivers =>
                prevDrivers.map(driver =>
                    driver.id === driverId ? { ...driver, preferred_payout_method_type: method } : driver
                )
            );
            await alert(`Preferência de repasse para ${drivers.find(d => d.id === driverId)?.name} atualizada para ${method}!`);
        } catch (e: any) {
            console.error("Failed to update driver preferred payout method:", e);
            await alert("Erro ao atualizar preferência de repasse do entregador: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsSaving(false);
        }
    };

    const dayOptions = [
        { label: 'Segunda-feira', value: 'MONDAY' },
        { label: 'Terça-feira', value: 'TUESDAY' },
        { label: 'Quarta-feira', value: 'WEDNESDAY' },
        { label: 'Quinta-feira', value: 'THURSDAY' },
        { label: 'Sexta-feira', value: 'FRIDAY' },
        { label: 'Sábado', value: 'SATURDAY' },
        { label: 'Domingo', value: 'SUNDAY' },
    ];

    const timeOptions = [
        { label: '09:00', value: '09:00' },
        { label: '12:00', value: '12:00' },
        { label: '15:00', value: '15:00' },
        { label: '17:00', value: '17:00' },
    ];

    const payoutMethodOptions = [
        { label: 'PIX', value: 'PIX' },
        { label: 'Transferência Bancária (TED/DOC)', value: 'BANK_TRANSFER' },
    ];

    if (loading) {
        return (
            <div className="text-center p-10">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" />
                <p className="text-gray-500 mt-2">Carregando configurações de repasse...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">

            {/* Header */}
            <div className="flex items-center gap-3">
                <Banknote className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-black dark:text-white">Gestão de Repasses</h2>
            </div>

            {/* Tab Navigation */}
            <MobileTabsSelect
                value={activeTab}
                onChange={(val) => setActiveTab(val as 'general' | 'drivers' | 'pending')}
                options={[
                    { value: 'general', label: 'Configurações Gerais' },
                    { value: 'drivers', label: 'Preferências por Entregador' },
                    { value: 'pending', label: 'Repasses Pendentes' }
                ]}
                label="Seção de Repasses"
                className="md:hidden"
            />
            <div className="hidden md:block border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        className={`
                            ${activeTab === 'general'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                        `}
                        onClick={() => setActiveTab('general')}
                    >
                        Configurações Gerais
                    </button>
                    <button
                        className={`
                            ${activeTab === 'drivers'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                        `}
                        onClick={() => setActiveTab('drivers')}
                    >
                        Preferências de Repasse por Entregador
                    </button>
                    <button
                        className={`
                            ${activeTab === 'pending'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                        `}
                        onClick={() => setActiveTab('pending')}
                    >
                        Repasses Pendentes
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'general' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configurações Gerais</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Mínimo para Repasse (R$)</label>
                                <input
                                    type="number"
                                    value={minPayoutAmount}
                                    onChange={(e) => setMinPayoutAmount(parseFloat(e.target.value))}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Ex: 50.00"
                                />
                            </div>

                            <Switch
                                checked={automaticPayoutsEnabled}
                                onChange={setAutomaticPayoutsEnabled}
                                label="Ativar Repasses Automáticos"
                            />
                            {automaticPayoutsEnabled && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Quando ativado, os repasses são processados automaticamente nos dias e horários agendados.</p>
                            )}

                            {automaticPayoutsEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia da Semana para Repasse</label>
                                        <CustomSelect
                                            value={payoutDayOfWeek}
                                            onChange={(value) => setPayoutDayOfWeek(value as PayoutDayOfWeek)}
                                            options={dayOptions}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário do Repasse</label>
                                        <CustomSelect
                                            value={payoutTime}
                                            onChange={setPayoutTime}
                                            options={timeOptions}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button onClick={handleSaveSettings} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                Salvar Configurações
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'drivers' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Banknote className="w-5 h-5 text-gray-500" /> Preferências de Repasse por Entregador</h3>

                        {drivers.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <p>Nenhum entregador encontrado ou cadastrado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Nome
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Telefone
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Preferência de Método
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Repasse Automático
                                            </th>
                                            <th scope="col" className="relative px-6 py-3">
                                                <span className="sr-only">Ações</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {drivers.map((driver) => (
                                            <tr key={driver.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {driver.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {driver.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {driver.phone_number || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <CustomSelect
                                                        value={driver.preferred_payout_method_type || payoutSettings?.default_payout_method_type || 'PIX'}
                                                        onChange={(value) => handleUpdateDriverPreferredPayoutMethod(driver.id, value as 'PIX' | 'BANK_TRANSFER')}
                                                        options={payoutMethodOptions}
                                                    />
                                                    {!driver.bank_details && (
                                                        <p className="text-xs text-red-500 mt-1">Preencha os dados bancários do entregador para configurar.</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <Switch
                                                        checked={driver.automatic_payouts_enabled || false}
                                                        onChange={(enabled) => handleToggleDriverAutomaticPayouts(driver.id, enabled)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {/* 'Editar' button removed as functionality moved to Switch */}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Banknote className="w-5 h-5 text-gray-500" /> Repasses Pendentes</h3>

                        {pendingPayouts.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <p>Nenhum repasse pendente encontrado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Entregador
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Ganhos Elegíveis
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Próximo Repasse
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Último Repasse
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Modo
                                            </th>
                                            <th scope="col" className="relative px-6 py-3">
                                                <span className="sr-only">Ações</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {pendingPayouts.map((payout) => (
                                            <tr key={payout.driver_id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {payout.driver_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payout.eligible_earnings)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {payout.next_payout_date ? new Date(payout.next_payout_date).toLocaleString('pt-BR') : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {payout.last_payout_date ? new Date(payout.last_payout_date).toLocaleString('pt-BR') : 'Nunca'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {payout.driver_automatic_payouts_enabled ? 'Automático' : 'Manual'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-brand-600 hover:text-brand-900">Pagar Agora</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
