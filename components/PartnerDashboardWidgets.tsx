import React, { useEffect, useState } from 'react';
import { Truck, ShoppingBag, Wallet, BarChart3, History, Map, Flame } from 'lucide-react';
import * as cloud from '../services/cloud';
import { PartnerRequest, UserRole } from '../types';
import { Skeleton } from './Skeleton';

interface PartnerDashboardWidgetsProps {
  onNavigate: (tab: any) => void;
  userRole: UserRole;
}

export const PartnerDashboardWidgets: React.FC<PartnerDashboardWidgetsProps> = ({ onNavigate, userRole }) => {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (userRole === 'delivery_partner') {
        try {
          const data = await cloud.getPartnerRequestsAvailable();
          setRequests(data.slice(0, 3));
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    load();
  }, [userRole]);

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Active Requests Widget (Only for Partners) */}
      {userRole === 'delivery_partner' && (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-600" /> Oportunidades
                </h3>
                <button onClick={() => onNavigate('partner')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">Ver todas</button>
            </div>
            
            {loading ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1,2].map(i => <Skeleton key={i} className="w-64 h-24 rounded-2xl flex-shrink-0" />)}
                </div>
            ) : requests.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                    {requests.map(req => (
                        <div key={req.id} onClick={() => onNavigate('partner')} className="snap-center flex-shrink-0 w-64 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-brand-200 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">R$ {req.net_value_partner.toFixed(2)}</span>
                                <span className="text-xs font-bold text-gray-400">{req.distance_km} km</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-800 dark:text-white truncate flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div> {req.pickup_address}</p>
                                <p className="text-xs font-bold text-gray-800 dark:text-white truncate flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0"></div> {req.delivery_address}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl text-center border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                    <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Nenhuma entrega disponível no momento.</p>
                    <button onClick={() => onNavigate('partner')} className="text-xs font-bold text-brand-600 mt-2">Ir para Área do Parceiro</button>
                </div>
            )}
        </div>
      )}

      {/* Quick Access Grid */}
      <div>
          <h3 className="font-bold text-gray-800 dark:text-white px-2 mb-3 text-sm">Acesso Rápido</h3>
          <div className="grid grid-cols-2 gap-3">
              
              {/* DELIVERY PARTNER OPTIONS */}
              {userRole === 'delivery_partner' && (
                  <>
                    <button onClick={() => onNavigate('partner')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Ganhos</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Carteira Digital</p>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('shop')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Peças</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Loja Oficial</p>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('heatmap')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-600 dark:text-red-400">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Mapa Calor</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Zonas Quentes</p>
                        </div>
                    </button>

                    {/* NEW: Offline Map Button */}
                    <button onClick={() => onNavigate('map')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600 dark:text-green-400">
                            <Map className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Mapa Offline</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Rota Smart</p>
                        </div>
                    </button>

                    {/* Partners can also see History (Cloud) */}
                    <button onClick={() => onNavigate('history')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600 dark:text-purple-400">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Histórico</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Entregas</p>
                        </div>
                    </button>
                  </>
              )}

              {/* NORMAL USER OPTIONS */}
              {userRole === 'user' && (
                  <>
                    <button onClick={() => onNavigate('history')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Histórico</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Suas Entregas</p>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('reports')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600 dark:text-purple-400">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Relatórios</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Seu desempenho</p>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('shop')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Peças</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Loja Oficial</p>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('map')} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600 dark:text-green-400">
                            <Map className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Mapa Offline</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Rota Smart</p>
                        </div>
                    </button>
                  </>
              )}

          </div>
      </div>

    </div>
  );
};