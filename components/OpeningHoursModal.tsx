
import React, { useState } from 'react';
import { Clock, X, Check, Calendar } from 'lucide-react';
import { Button } from './Button';

interface OpeningHoursModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (formattedHours: string) => void;
    initialValue?: string;
}

const DAYS_OF_WEEK = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' },
    { id: 'sab', label: 'Sábado' },
    { id: 'dom', label: 'Domingo' }
];

export const OpeningHoursModal: React.FC<OpeningHoursModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialValue = ''
}) => {
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('23:00');

    const normalizeTime = (value: string) => {
        const [h, m] = value.split(':');
        if (!h || !m) return value;
        return `${h.padStart(2, '0')}:${m}`;
    };

    const normalizeKey = (value: string) => {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    };

    const fixCommonMojibake = (value: string) => {
        // Handle legacy values that may have been saved with mojibake.
        return value
            .replace(/Ã¡/g, 'á')
            .replace(/Ã /g, 'à')
            .replace(/Ã¢/g, 'â')
            .replace(/Ã£/g, 'ã')
            .replace(/Ã§/g, 'ç')
            .replace(/Ã©/g, 'é')
            .replace(/Ãª/g, 'ê')
            .replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã´/g, 'ô')
            .replace(/Ãµ/g, 'õ')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã‰/g, 'É')
            .replace(/Ã“/g, 'Ó')
            .replace(/Ãš/g, 'Ú')
            .replace(/Ã‡/g, 'Ç');
    };

    const parseDaysFromLabel = (dayPart: string) => {
        const normalized = normalizeKey(dayPart);

        // Match only explicit shortcuts. Using "includes" here causes false-positives
        // (e.g. "Ter, Qua, Qui, Sex, Sáb, Dom" contains "sabdom" at the end).
        if (normalized === 'todososdias') return DAYS_OF_WEEK.map(d => d.id);
        if (normalized === 'segsex' || normalized === 'segasex' || normalized === 'segundaasexta' || normalized === 'segundasexta') {
            return ['seg', 'ter', 'qua', 'qui', 'sex'];
        }
        if (normalized === 'sabdom' || normalized === 'sabadoadomingo' || normalized === 'sabadoedomingo' || normalized === 'sabadodomingo') {
            return ['sab', 'dom'];
        }

        const tokens = dayPart
            .replace(/[–—]/g, '-')
            .replace(/\./g, '')
            .split(/[,/\s-]+/g)
            .map(t => t.trim())
            .filter(Boolean);

        const ids = new Set<string>();

        for (const token of tokens) {
            const key = normalizeKey(token);
            if (!key || key === 'e') continue;

            if (key.startsWith('seg') || key === 'segunda' || key === 'segundafeira') ids.add('seg');
            else if (key.startsWith('ter') || key === 'terca' || key === 'tercafeira') ids.add('ter');
            else if (key.startsWith('qua') || key === 'quarta' || key === 'quartafeira') ids.add('qua');
            else if (key.startsWith('qui') || key === 'quinta' || key === 'quintafeira') ids.add('qui');
            else if (key.startsWith('sex') || key === 'sexta' || key === 'sextafeira') ids.add('sex');
            else if (key.startsWith('sab') || key === 'sabado') ids.add('sab');
            else if (key.startsWith('dom') || key === 'domingo') ids.add('dom');
        }

        const order = new Map(DAYS_OF_WEEK.map((d, i) => [d.id, i]));
        return Array.from(ids).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    };

    // Initialize state from existing value (when opening).
    React.useEffect(() => {
        if (!isOpen) return;

        const raw = fixCommonMojibake(initialValue || '').trim();
        if (!raw) {
            setSelectedDays([]);
            setStartTime('18:00');
            setEndTime('23:00');
            return;
        }

        const timeMatch = raw.match(/(\d{1,2}:\d{2})\s*(?:às|as|até|[-–—])\s*(\d{1,2}:\d{2})/i);
        if (timeMatch) {
            setStartTime(normalizeTime(timeMatch[1]));
            setEndTime(normalizeTime(timeMatch[2]));
        }

        const dayPart = timeMatch && timeMatch.index !== undefined ? raw.slice(0, timeMatch.index).trim() : raw;
        setSelectedDays(parseDaysFromLabel(dayPart));
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const toggleDay = (id: string) => {
        setSelectedDays(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        if (selectedDays.length === 0) {
            alert('Selecione pelo menos um dia.');
            return;
        }

        // Simple formatting logic
        const dayLabels = selectedDays.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.id === 'sab' ? 'Sáb' : DAYS_OF_WEEK.find(d => d.id === id)?.id === 'dom' ? 'Dom' : (DAYS_OF_WEEK.find(d => d.id === id)?.label.substring(0, 3) + '.'));

        let formattedDays = '';
        const sortedIds = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.id)).map(d => d.id);

        if (sortedIds.length === 7) {
            formattedDays = 'Todos os dias';
        } else if (sortedIds.join(',') === 'seg,ter,qua,qui,sex') {
            formattedDays = 'Seg-Sex';
        } else if (sortedIds.join(',') === 'sab,dom') {
            formattedDays = 'Sáb-Dom';
        } else {
            formattedDays = sortedIds.map(id => {
                const day = DAYS_OF_WEEK.find(d => d.id === id);
                if (id === 'sab') return 'Sáb';
                if (id === 'dom') return 'Dom';
                return day?.label.substring(0, 3);
            }).join(', ');
        }

        const result = `${formattedDays} ${startTime} às ${endTime}`;
        onConfirm(result);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-gray-900 dark:text-white">Horário de Funcionamento</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Days Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" /> Selecione os Dias
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                                <button
                                    key={day.id}
                                    onClick={() => toggleDay(day.id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${selectedDays.includes(day.id)
                                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-brand-300'
                                        }`}
                                >
                                    {day.label.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Abre às</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Fecha às</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button fullWidth onClick={handleConfirm} className="py-4 shadow-xl shadow-brand-500/20">
                            <Check className="w-5 h-5 mr-2" /> Confirmar Horário
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
