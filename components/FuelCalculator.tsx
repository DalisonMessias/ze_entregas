import React, { useState } from 'react';
import { Fuel, X } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';

interface FuelCalculatorProps {
  onClose: () => void;
}

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

export const FuelCalculator: React.FC<FuelCalculatorProps> = ({ onClose }) => {
  const [distance, setDistance] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');

  const distVal = parseFloat(distance.replace(',', '.') || '0');
  const litersVal = parseFloat(liters.replace(',', '.') || '0');
  const priceVal = parseCurrency(price);

  const avgConsumption = litersVal > 0 ? distVal / litersVal : 0;
  const totalCost = litersVal * priceVal;
  const costPerKm = distVal > 0 ? totalCost / distVal : 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Fuel className="w-6 h-6 text-orange-500" />
            Cálculo de Combustível
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Distância (KM)</label>
            <CustomInput
              type="number" value={distance} onChange={(e) => setDistance(e.target.value)}
              placeholder="0" autoFocus
              className="text-lg font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Litros Abastecidos</label>
            <CustomInput
              type="number" value={liters} onChange={(e) => setLiters(e.target.value)}
              placeholder="0"
              className="text-lg font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Preço por Litro</label>
            <CustomInput
              mask="currency"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              className="text-lg font-bold"
            />
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-orange-600 dark:text-orange-300">Consumo Médio:</span>
              <span className="font-bold text-orange-800 dark:text-orange-200">{avgConsumption.toFixed(1)} km/L</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-orange-600 dark:text-orange-300">Custo Total:</span>
              <span className="font-bold text-orange-800 dark:text-orange-200">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-orange-600 dark:text-orange-300">Custo por KM:</span>
              <span className="font-bold text-orange-800 dark:text-orange-200">{formatCurrency(costPerKm)}</span>
            </div>
          </div>
        </div>

        <Button fullWidth onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
};