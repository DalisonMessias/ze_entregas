
import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { Button } from './Button';

interface RouteCalculatorProps {
  onClose: () => void;
}

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) {
    setter("");
    return;
  }
  const amount = Number(value) / 100;
  const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  setter(formatted);
};

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

export const RouteCalculator: React.FC<RouteCalculatorProps> = ({ onClose }) => {
  const [km, setKm] = useState('');
  const [rate, setRate] = useState('');

  const total = (parseFloat(km.replace(',', '.') || '0') * parseCurrency(rate));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-500" />
            Calculadora Rápida
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Distância (KM)</label>
            <div className="relative">
              <input 
                type="number" 
                inputMode="decimal"
                value={km} 
                onChange={(e) => setKm(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full pl-3 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:text-white"
              />
              <span className="absolute right-3 top-3.5 text-gray-400 font-medium text-sm">km</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Valor por KM</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400 font-medium text-sm">R$</span>
              <input 
                type="tel" 
                inputMode="numeric"
                value={rate} 
                onChange={(e) => handleCurrencyMask(e, setRate)}
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
            <div className="text-sm text-blue-600 dark:text-blue-300 font-medium uppercase tracking-wider mb-1">Valor a Cobrar</div>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </div>
          </div>
        </div>

        <Button fullWidth onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
};