
import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';

interface RouteCalculatorProps {
  onClose: () => void;
}

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
              <CustomInput
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="0"
                autoFocus
                className="pl-3 pr-10 text-lg font-bold"
              />
              <span className="absolute right-3 top-3.5 text-gray-400 font-medium text-sm">km</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Valor por KM</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400 font-medium text-sm z-10">R$</span>
              <CustomInput
                mask="currency"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0,00"
                className="pl-10 pr-3 text-lg font-bold"
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