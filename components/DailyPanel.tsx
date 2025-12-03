
import React, { useState, useEffect } from 'react';
import { Play, Plus, Calculator, TrendingDown, Target, Trash2, Edit2, Share2, MapPin, Gauge, Package, DollarSign, X, Check, Coffee, Wrench, Fuel, AlertCircle, Sparkles, ChevronRight, Settings, Zap, Siren, Map as MapIcon, Loader2, History, ClipboardList, ListPlus, Megaphone, ShoppingBag } from 'lucide-react';
import { Button } from './Button';
import { DailyTransaction, DailySummary, BlitzAlert, PartnerProfile } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { ShareCard } from './ShareCard';
import { PartnerDocumentation } from './PartnerDocumentation';
import { FuelCalculator } from './FuelCalculator';
import { RouteCalculator } from './RouteCalculator';
import { Maintenance } from './Maintenance';
import { Switch } from './Switch';

// Helper for currency
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) {
    setter("");
    return;
  }
  const amount = Number(value) / 100;
  const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  setter(formatted);
};

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

interface DailyPanelProps {
    onNavigate: (tab: any) => void;
}

export const DailyPanel: React.FC<DailyPanelProps> = ({ onNavigate }) => {
    // State
    const [fixedValue, setFixedValue] = useState<number | null>(null);
    const [dailyGoal, setDailyGoal] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    
    // Modals
    const [showStartModal, setShowStartModal] = useState(false);
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const [showEditConfig, setShowEditConfig] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Blitz Modal
    const [showBlitzModal, setShowBlitzModal] = useState(false);
    const [blitzType, setBlitzType] = useState<BlitzAlert['type']>('BLITZ');
    const [blitzLoading, setBlitzLoading] = useState(false);
    
    // Utility Modals
    const [showFuelCalc, setShowFuelCalc] = useState(false);
    const [showRouteCalc, setShowRouteCalc] = useState(false);
    const [showMaintenance, setShowMaintenance] = useState(false);
    
    // Forms
    const [startForm, setStartForm] = useState({ fixed: '', goal: '' });
    const [editForm, setEditForm] = useState({ fixed: '', goal: '' });
    const [extraForm, setExtraForm] = useState({ value: '', km: '', desc: '' });
    const [expenseForm, setExpenseForm] = useState({ value: '', type: 'fuel', desc: '' });
    
    const [isQuickStart, setIsQuickStart] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const storedFixed = storage.getFixedValue();
        const storedGoal = storage.getDailyGoal();
        
        setFixedValue(storedFixed);
        setDailyGoal(storedGoal);
        setTransactions(storage.getTodayTransactions());

        // Pre-fill edit form
        if (storedFixed !== null) {
            setEditForm({ 
                fixed: storedFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
                goal: storedGoal ? storedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' 
            });
        } else {
            // New user: Default to Quick Start ACTIVE (skip inputs)
            setIsQuickStart(true);
        }
        
        // Fetch profile for upgrade flow
        cloud.getMyPartnerProfile().then(p => setProfile(p)).catch(console.error);
    };

    // --- LOGIC ---

    const handleStartDay = () => {
        let fixed = 0;
        let goal = 0;

        if (!isQuickStart) {
             fixed = parseCurrency(startForm.fixed);
             goal = parseCurrency(startForm.goal);
        }
        
        storage.setFixedValue(fixed);
        storage.setDailyGoal(goal);
        
        setFixedValue(fixed);
        setDailyGoal(goal);
        setEditForm({ 
            fixed: fixed > 0 ? fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '', 
            goal: goal > 0 ? goal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' 
        });
        setShowStartModal(false);
    };

    const handleSaveConfig = () => {
        const fixed = parseCurrency(editForm.fixed);
        const goal = parseCurrency(editForm.goal);

        storage.setFixedValue(fixed);
        storage.setDailyGoal(goal);

        setFixedValue(fixed);
        setDailyGoal(goal);
        setShowEditConfig(false);
    };

    const addTransaction = (tx: DailyTransaction) => {
        const updated = [tx, ...transactions];
        setTransactions(updated);
        storage.saveTodayTransactions(updated);
    };

    const handleAddStandard = () => {
        if (fixedValue === null) return setShowStartModal(true);
        addTransaction({
            id: crypto.randomUUID(),
            type: 'standard',
            value: fixedValue,
            timestamp: Date.now(),
            description: 'Entrega Padrão',
            paymentMethod: 'cash' 
        });
    };

    const handleAddExtra = () => {
        const val = parseCurrency(extraForm.value);
        const km = parseFloat(extraForm.km.replace(',', '.'));
        
        if (!val) return alert("Informe o valor.");

        addTransaction({
            id: crypto.randomUUID(),
            type: 'extra',
            value: val,
            km: km || 0,
            timestamp: Date.now(),
            description: extraForm.desc || 'Entrega Extra',
            paymentMethod: 'cash'
        });
        setExtraForm({ value: '', km: '', desc: '' });
        setShowExtraModal(false);
    };

    const handleAddExpense = () => {
        const val = parseCurrency(expenseForm.value);
        if (!val) return alert("Informe o valor.");

        addTransaction({
            id: crypto.randomUUID(),
            type: 'expense',
            value: -val, 
            timestamp: Date.now(),
            description: expenseForm.desc,
            category: expenseForm.type
        });
        setExpenseForm({ value: '', type: 'fuel', desc: '' });
        setShowExpenseModal(false);
    };

    const handleConfirmDelete = () => {
        if (!deleteId) return;
        const updated = transactions.filter(t => t.id !== deleteId);
        setTransactions(updated);
        storage.saveTodayTransactions(updated);
        setDeleteId(null);
    };

    const handleFinishDay = async () => {
        setIsSaving(true);
        try {
            // Save history logic
            const summary = calculateSummary();
            const today = new Date();
            
            const record = {
                id: crypto.randomUUID(),
                date: today.toISOString(),
                formattedDate: today.toLocaleDateString('pt-BR'),
                formattedTime: today.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                count: summary.count,
                totalValue: summary.profit,
                totalKm: summary.km,
                timestamp: Date.now(),
                transactions: transactions,
                expenseBreakdown: {}, 
                paymentBreakdown: { cash: summary.profit, digital: 0 } 
            };

            const history = storage.getHistory();
            storage.saveHistory([record, ...history]);
            
            // Sync to Cloud
            await cloud.saveManualHistory(record);
            
            setShowEndConfirm(false);
            setShowShareCard(true);
        } catch(e) {
            console.error("Error saving day", e);
            alert("Erro ao salvar. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReportBlitz = () => {
        if (!navigator.geolocation) return alert("Geolocalização necessária.");
        setBlitzLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Reverse geocode for address
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const address = data.address ? `${data.address.road || ''}, ${data.address.suburb || ''}` : 'Localização Atual';
                    const city = data.address?.city || data.address?.town || 'Desconhecida';

                    await cloud.reportBlitz({
                        lat: latitude,
                        lng: longitude,
                        type: blitzType,
                        city: city,
                        address: address
                    });
                    
                    alert("Alerta enviado! Obrigado por ajudar a comunidade.");
                    setShowBlitzModal(false);
                } catch(e) {
                    alert("Erro ao enviar alerta.");
                } finally {
                    setBlitzLoading(false);
                }
            },
            () => {
                alert("Erro ao obter localização.");
                setBlitzLoading(false);
            }
        );
    };

    const resetDay = () => {
        storage.saveTodayTransactions([]);
        setTransactions([]);
        setShowShareCard(false);
    };

    // --- CALCULATIONS ---
    const calculateSummary = (): { profit: number, count: number, km: number, expenses: number } => {
        let profit = 0;
        let count = 0;
        let km = 0;
        let expenses = 0;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                expenses += Math.abs(t.value);
                profit -= Math.abs(t.value);
            } else {
                profit += t.value;
                count += 1;
                if (t.km) km += t.km;
            }
        });

        return { profit, count, km, expenses };
    };

    const summary = calculateSummary();
    const progress = dailyGoal && dailyGoal > 0 ? Math.min(100, (summary.profit / dailyGoal) * 100) : 0;

    // --- RENDER ---

    if (showUpgradeFlow) {
        return (
            <div className="space-y-4">
                <button onClick={() => setShowUpgradeFlow(false)} className="flex items-center text-sm font-bold text-gray-500 hover:text-brand-600 mb-2">
                    <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Voltar
                </button>
                <PartnerDocumentation profile={profile} onProfileUpdate={setProfile} />
            </div>
        );
    }

    if (fixedValue === null) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center animate-in fade-in">
                <div className="bg-brand-100 dark:bg-brand-900/30 p-6 rounded-full mb-6 text-brand-600 dark:text-brand-400">
                    <Play className="w-12 h-12 fill-current" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Começar o Dia</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
                    Defina o valor da sua entrega padrão e sua meta para hoje.
                </p>
                
                <div className="w-full max-w-sm space-y-4">
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Início Rápido</span>
                        <Switch checked={isQuickStart} onChange={setIsQuickStart} />
                    </div>

                    {!isQuickStart ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Valor Entrega Padrão (R$)</label>
                                <input 
                                    type="tel" 
                                    value={startForm.fixed}
                                    onChange={e => handleCurrencyMask(e, val => setStartForm({...startForm, fixed: val}))}
                                    placeholder="Ex: 8,00"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 mt-1 rounded-xl text-xl font-bold outline-none dark:text-white"
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Meta do Dia (R$)</label>
                                <input 
                                    type="tel" 
                                    value={startForm.goal}
                                    onChange={e => handleCurrencyMask(e, val => setStartForm({...startForm, goal: val}))}
                                    placeholder="Ex: 150,00"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 mt-1 rounded-xl text-xl font-bold outline-none dark:text-white"
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500 px-4">
                            Você poderá configurar os valores a qualquer momento no menu de Ajustes.
                        </p>
                    )}

                    <Button fullWidth onClick={handleStartDay} className="py-4 text-lg shadow-xl shadow-brand-500/20">
                        Iniciar Jornada
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            
            {/* Header Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Target className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lucro Líquido</p>
                                <button onClick={() => setShowEditConfig(true)} className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{formatCurrency(summary.profit)}</h2>
                        </div>
                        {dailyGoal && (
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Meta: {formatCurrency(dailyGoal)}</p>
                                <p className={`text-sm font-bold ${progress >= 100 ? 'text-green-500' : 'text-brand-500'}`}>
                                    {progress.toFixed(0)}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {dailyGoal && (
                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-brand-400 to-brand-600'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center">
                            <Package className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                            <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{summary.count}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Entregas</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center">
                            <Gauge className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                            <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{summary.km}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">KM</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center">
                            <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                            <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{summary.expenses}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Gastos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Actions (MOVED UP) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                    onClick={handleAddStandard}
                    className="sm:col-span-2 bg-brand-600 active:bg-brand-700 text-white p-5 rounded-2xl shadow-lg shadow-brand-500/30 flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-lg leading-none">Entrega Padrão</p>
                            <p className="text-xs text-brand-100 opacity-80 mt-1">Adicionar {formatCurrency(fixedValue || 0)}</p>
                        </div>
                    </div>
                    <div className="bg-white text-brand-600 p-2 rounded-lg font-black text-sm">
                        +1
                    </div>
                </button>

                <button 
                    onClick={() => setShowExtraModal(true)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-2 rounded-xl">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Entrega Extra</p>
                        <p className="text-[10px] text-gray-500">Valor variável</p>
                    </div>
                </button>

                <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-600 p-2 rounded-xl">
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Registrar Gasto</p>
                        <p className="text-xs text-gray-500">Combustível/Outros</p>
                    </div>
                </button>
            </div>

            {/* Quick Tools Grid (MOVED DOWN & EXPANDED) */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm px-2">Ferramentas Rápidas</h3>
                <div className="grid grid-cols-3 gap-2">
                    {/* NEW: Route List */}
                    <button onClick={() => onNavigate('route_list')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <ListPlus className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Lista Rotas</span>
                    </button>
                    
                    <button onClick={() => setShowFuelCalc(true)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Fuel className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Combustível</span>
                    </button>
                    <button onClick={() => setShowRouteCalc(true)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Calculator className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Calc. Rota</span>
                    </button>
                    <button onClick={() => setShowMaintenance(true)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            <Wrench className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Manutenção</span>
                    </button>
                    <button onClick={() => setShowBlitzModal(true)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <Siren className="w-5 h-5 fill-current"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Alertas</span>
                    </button>
                    
                    {/* New 4 Added Items */}
                    <button onClick={() => onNavigate('history')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <History className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Histórico</span>
                    </button>
                    <button onClick={() => onNavigate('addresses')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400">
                            <MapPin className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Endereços</span>
                    </button>
                    <button onClick={() => onNavigate('tasks')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-600 dark:text-pink-400">
                            <ClipboardList className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Tarefas</span>
                    </button>
                    
                    {/* NEW: Driver Marketing */}
                    <button onClick={() => onNavigate('driver_marketing')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <Megaphone className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Divulgação</span>
                    </button>

                    {/* NEW: Shop Link */}
                    <button onClick={() => onNavigate('shop')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                            <ShoppingBag className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Peças</span>
                    </button>

                    <button onClick={() => setShowEditConfig(true)} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                            <Settings className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Ajustes</span>
                    </button>
                </div>
            </div>

            {/* Banner Promocional (UPDATED) */}
            <div 
                onClick={() => setShowUpgradeFlow(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-transform"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-32 h-32 text-white rotate-12" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
                            Modo Parceiro
                        </div>
                        <h2 className="text-xl font-black leading-tight">Seja um Entregador Parceiro</h2>
                        <p className="text-xs text-orange-100 mt-1 max-w-[200px]">Ative sua conta e receba pedidos da plataforma.</p>
                    </div>
                    <div className="bg-white text-orange-600 p-3 rounded-full shadow-lg">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" /> Extrato do Dia
                    </h3>
                    <button onClick={() => setShowEndConfirm(true)} className="text-xs font-bold text-brand-600 hover:underline">
                        Encerrar Dia
                    </button>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-sm">Nenhuma atividade hoje.</p>
                        </div>
                    ) : (
                        transactions.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        t.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                        {t.type === 'expense' ? <TrendingDown className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{t.description || (t.type === 'standard' ? 'Entrega Padrão' : 'Extra')}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {t.km ? ` • ${t.km} km` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                                        {t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.value))}
                                    </span>
                                    <button onClick={() => setDeleteId(t.id)} className="text-gray-300 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Blitz Report Modal */}
            {showBlitzModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Siren className="w-6 h-6 text-red-500" /> Alerta Relâmpago
                            </h3>
                            <button onClick={() => setShowBlitzModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Reporte um incidente para alertar outros motoristas na região.</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => setBlitzType('BLITZ')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${blitzType === 'BLITZ' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <Siren className="w-6 h-6"/> <span className="text-xs font-bold">Blitz</span>
                            </button>
                            <button onClick={() => setBlitzType('ACCIDENT')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${blitzType === 'ACCIDENT' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <AlertCircle className="w-6 h-6"/> <span className="text-xs font-bold">Acidente</span>
                            </button>
                            <button onClick={() => setBlitzType('TRAFFIC')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${blitzType === 'TRAFFIC' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <TrendingDown className="w-6 h-6"/> <span className="text-xs font-bold">Trânsito</span>
                            </button>
                            <button onClick={() => setBlitzType('DANGER')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${blitzType === 'DANGER' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <Zap className="w-6 h-6"/> <span className="text-xs font-bold">Perigo</span>
                            </button>
                        </div>

                        <Button fullWidth onClick={handleReportBlitz} disabled={blitzLoading} className="py-4 shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700 border-none">
                            {blitzLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar Alerta Local'}
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center mt-3">* Sua localização atual será enviada.</p>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showExtraModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold dark:text-white">Entrega Extra</h3>
                            <button onClick={() => setShowExtraModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        <div className="space-y-3">
                            <input 
                                type="tel" 
                                placeholder="Valor (R$)" 
                                value={extraForm.value} 
                                onChange={e=>handleCurrencyMask(e, val => setExtraForm({...extraForm, value: val}))} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border border-transparent focus:border-brand-500 dark:text-white font-bold" 
                                autoFocus 
                            />
                            <input type="number" placeholder="KM (Opcional)" value={extraForm.km} onChange={e=>setExtraForm({...extraForm, km: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white" />
                            <input type="text" placeholder="Descrição (Opcional)" value={extraForm.desc} onChange={e=>setExtraForm({...extraForm, desc: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white text-sm" />
                            <Button fullWidth onClick={handleAddExtra}>Adicionar</Button>
                        </div>
                    </div>
                </div>
            )}

            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold dark:text-white">Registrar Gasto</h3>
                            <button onClick={() => setShowExpenseModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => setExpenseForm({...expenseForm, type: 'fuel'})} className={`flex-1 p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 ${expenseForm.type === 'fuel' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Fuel className="w-4 h-4"/> Combustível
                                </button>
                                <button onClick={() => setExpenseForm({...expenseForm, type: 'food'})} className={`flex-1 p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 ${expenseForm.type === 'food' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Coffee className="w-4 h-4"/> Alimentação
                                </button>
                                <button onClick={() => setExpenseForm({...expenseForm, type: 'maintenance'})} className={`flex-1 p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 ${expenseForm.type === 'maintenance' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <Wrench className="w-4 h-4"/> Manutenção
                                </button>
                            </div>
                            <input 
                                type="tel" 
                                placeholder="Valor (R$)" 
                                value={expenseForm.value} 
                                onChange={e=>handleCurrencyMask(e, val => setExpenseForm({...expenseForm, value: val}))} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-red-200 focus:border-red-500 border font-bold text-red-500 dark:bg-gray-700" 
                                autoFocus 
                            />
                            <input type="text" placeholder="Detalhes (Opcional)" value={expenseForm.desc} onChange={e=>setExpenseForm({...expenseForm, desc: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white text-sm" />
                            <Button fullWidth onClick={handleAddExpense} variant="danger">Registrar Saída</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Config Modal */}
            {showEditConfig && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold dark:text-white">Configurar Dia</h3>
                            <button onClick={() => setShowEditConfig(false)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Valor Entrega Padrão (R$)</label>
                                <input 
                                    type="tel" 
                                    value={editForm.fixed}
                                    onChange={e => handleCurrencyMask(e, val => setEditForm({...editForm, fixed: val}))}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 mt-1 rounded-xl text-lg font-bold outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Meta do Dia (R$)</label>
                                <input 
                                    type="tel" 
                                    value={editForm.goal}
                                    onChange={e => handleCurrencyMask(e, val => setEditForm({...editForm, goal: val}))}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 mt-1 rounded-xl text-lg font-bold outline-none dark:text-white"
                                />
                            </div>
                            <Button fullWidth onClick={handleSaveConfig}>Salvar Alterações</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="font-bold text-lg dark:text-white mb-2">Excluir Item?</h3>
                        <p className="text-sm text-gray-500 mb-6">Essa ação não pode ser desfeita.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDeleteId(null)} fullWidth>Cancelar</Button>
                            <Button variant="danger" onClick={handleConfirmDelete} fullWidth>Excluir</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Day Confirmation Modal */}
            {showEndConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center">Resumo do Dia</h3>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl mb-6 space-y-2 border border-gray-100 dark:border-gray-600">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Total Bruto</span>
                                <span className="font-bold dark:text-white">{formatCurrency(summary.profit + summary.expenses)}</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                                <span className="text-sm">Gastos</span>
                                <span className="font-bold">-{formatCurrency(summary.expenses)}</span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between">
                                <span className="font-bold text-gray-900 dark:text-white">Lucro Líquido</span>
                                <span className="font-black text-green-600 text-lg">{formatCurrency(summary.profit)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-center text-gray-400 mb-6">Ao confirmar, os dados serão salvos no histórico, sincronizados com a nuvem e a tela será limpa para o próximo dia.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowEndConfirm(false)} fullWidth>Voltar</Button>
                            <Button onClick={handleFinishDay} fullWidth disabled={isSaving}>
                                {isSaving ? 'Salvando...' : 'Confirmar Encerramento'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showShareCard && (
                <ShareCard 
                    data={{
                        value: summary.profit,
                        count: summary.count,
                        km: summary.km,
                        date: new Date().toLocaleDateString('pt-BR')
                    }}
                    onClose={() => {
                        setShowShareCard(false);
                        resetDay(); // Auto-reset after sharing/closing
                    }}
                />
            )}

            {/* Utility Modals */}
            {showFuelCalc && <FuelCalculator onClose={() => setShowFuelCalc(false)} />}
            {showRouteCalc && <RouteCalculator onClose={() => setShowRouteCalc(false)} />}
            {showMaintenance && <Maintenance onClose={() => setShowMaintenance(false)} />}
        </div>
    );
};
