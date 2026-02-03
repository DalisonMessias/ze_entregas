import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import * as cloud from '../services/cloud';

export const TransitionMonitor: React.FC = () => {
  const [latency, setLatency] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        const start = performance.now();
        await cloud.getPWASettings();
        const end = performance.now();
        setLatency(Math.round(end - start));
        const r = await cloud.getUserRole();
        setRole(r);
      } catch (e: any) {
        setErrors(prev => [...prev, e?.message || 'Erro desconhecido']);
      }
    };
    run();
    const id = setInterval(run, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold">Monitoramento da Transição Financeira</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Latência (ms)</p>
          <p className="text-2xl font-black">{latency ?? '---'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3"/> Papel atual</p>
          <p className="text-2xl font-black uppercase">{role || '---'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Erros</p>
          <p className="text-2xl font-black">{errors.length}</p>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
          <ul className="text-xs font-bold text-red-600 space-y-1">
            {errors.slice(-5).map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-green-600"/> Atualiza a cada 30s
      </div>
    </div>
  );
};
