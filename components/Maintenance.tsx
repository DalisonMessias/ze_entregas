import React, { useState, useEffect } from 'react';
import { Wrench, X, Save, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import * as storage from '../services/storage';
import { MaintenanceData, MaintenanceItem } from '../types';
import { useDialog } from '../utils/dialogService';

interface MaintenanceProps {
  onClose: () => void;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ onClose }) => {
  const { confirm } = useDialog();
  const [data, setData] = useState<MaintenanceData>({
    currentKm: 0,
    items: [
      { id: '1', name: 'Troca de Óleo', lastChangedKm: 0, intervalKm: 5000 },
      { id: '2', name: 'Pneu Traseiro', lastChangedKm: 0, intervalKm: 15000 },
      { id: '3', name: 'Kit Relação', lastChangedKm: 0, intervalKm: 20000 },
    ]
  });
  
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MaintenanceItem>>({ name: '', intervalKm: 5000 });

  useEffect(() => {
    const savedData = storage.getMaintenanceData();
    if (savedData) {
      // Ensure we have at least one item if empty
      if (!savedData.items || savedData.items.length === 0) {
        savedData.items = [{ id: '1', name: 'Troca de Óleo', lastChangedKm: 0, intervalKm: 5000 }];
      }
      setData(savedData);
    }
  }, []);

  const handleSave = () => {
    storage.saveMaintenanceData(data);
    onClose();
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.intervalKm) return;
    
    const item: MaintenanceItem = {
      id: crypto.randomUUID(),
      name: newItem.name,
      intervalKm: Number(newItem.intervalKm),
      lastChangedKm: data.currentKm // Assume changed now or recently
    };

    setData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
    setNewItem({ name: '', intervalKm: 5000 });
    setShowForm(false);
    storage.saveMaintenanceData({ ...data, items: [...data.items, item] });
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await confirm({ title: 'Remover Item', message: 'Remover este item?' });
    if (!ok) return;
    const updated = data.items.filter(i => i.id !== id);
    const newData = { ...data, items: updated };
    setData(newData);
    storage.saveMaintenanceData(newData);
  };

  const updateItem = (id: string, field: keyof MaintenanceItem, value: any) => {
    const updated = data.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: Number(value) };
      }
      return item;
    });
    const newData = { ...data, items: updated };
    setData(newData);
    // Don't auto-save on every keystroke to avoid lag, but useful for blur. 
    // Here we rely on the main Save button for persistence of edits.
  };

  const handleResetItem = async (id: string) => {
    const ok = await confirm({ title: 'Marcar como realizado', message: 'Marcar como realizado agora? (Atualizará KM da última troca)' });
    if (!ok) return;
    const updated = data.items.map(item => {
      if (item.id === id) {
        return { ...item, lastChangedKm: data.currentKm };
      }
      return item;
    });
    const newData = { ...data, items: updated };
    setData(newData);
    storage.saveMaintenanceData(newData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-gray-500" />
            Manutenção
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="overflow-y-auto pr-1 custom-scrollbar space-y-4 flex-1">
          
          {/* Odometer */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Hodômetro Atual (KM)</label>
            <input 
              type="number" inputMode="numeric"
              value={data.currentKm || ''} 
              onChange={e => setData(prev => ({ ...prev, currentKm: Number(e.target.value) }))}
              className="w-full p-2 bg-white dark:bg-gray-600 rounded-lg font-black text-2xl dark:text-white border border-gray-200 dark:border-gray-500 text-center"
            />
          </div>

          <div className="flex justify-between items-center">
             <h4 className="text-sm font-bold text-gray-400 uppercase">Itens Monitorados</h4>
             <button 
               onClick={() => setShowForm(!showForm)} 
               className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded"
             >
               <Plus className="w-3 h-3" /> Adicionar
             </button>
          </div>

          {/* Add Form */}
          {showForm && (
            <div className="bg-brand-50 dark:bg-brand-900/10 p-3 rounded-xl border border-brand-100 dark:border-brand-900 space-y-2 animate-in slide-in-from-top-2">
               <input 
                 type="text" placeholder="Nome (Ex: Pastilha Freio)" 
                 className="w-full p-2 text-sm rounded border border-brand-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                 value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
               />
               <div className="flex gap-2">
                 <input 
                   type="number" placeholder="Intervalo KM" 
                   className="w-full p-2 text-sm rounded border border-brand-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                   value={newItem.intervalKm} onChange={e => setNewItem({...newItem, intervalKm: Number(e.target.value)})}
                 />
                 <Button onClick={handleAddItem} className="py-1 px-3 text-sm">Salvar</Button>
               </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-4">
            {data.items.map(item => {
              const kmSince = data.currentKm - item.lastChangedKm;
              const remaining = item.intervalKm - kmSince;
              const percent = Math.min(100, Math.max(0, (kmSince / item.intervalKm) * 100));
              
              let statusColor = "bg-green-500";
              let statusText = "OK";
              if (percent > 75) statusColor = "bg-yellow-500";
              if (percent >= 100) {
                 statusColor = "bg-red-500";
                 statusText = "VENCIDO";
              }

              return (
                <div key={item.id} className="bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                       <div className="font-bold text-gray-800 dark:text-gray-200">{item.name}</div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                          Trocar a cada {item.intervalKm / 1000}k km
                       </div>
                     </div>
                     <div className="flex gap-1">
                        <button 
                          onClick={() => handleResetItem(item.id)}
                          className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40" 
                          title="Realizar Manutenção"
                        >
                           <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-lg"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                        <span>{kmSince} km rodados</span>
                        <span className={percent >= 100 ? "text-red-500" : ""}>{remaining > 0 ? `${remaining} km restam` : `${Math.abs(remaining)} km vencido`}</span>
                     </div>
                     <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${statusColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                     </div>
                  </div>
                  
                  {/* Quick Edit for Last KM */}
                  <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700 flex items-center gap-2">
                     <span className="text-[10px] text-gray-400">Última troca (KM):</span>
                     <input 
                       type="number" 
                       className="bg-transparent text-xs border-b border-gray-300 dark:border-gray-600 w-20 text-center outline-none dark:text-gray-300 focus:border-brand-500"
                       value={item.lastChangedKm}
                       onChange={(e) => updateItem(item.id, 'lastChangedKm', e.target.value)}
                     />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <Button fullWidth onClick={handleSave}>Salvar e Fechar</Button>
        </div>

      </div>
    </div>
  );
};