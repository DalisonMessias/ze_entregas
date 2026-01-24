import React from 'react';
import { Store, Clock, MapPin, ChevronRight, Star } from 'lucide-react';
import { PublicStoreProfile } from '../types';

interface StoreCardProps {
    store: PublicStoreProfile;
    onClick: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onClick }) => {
    const isOpen = store.is_open;

    return (
        <div
            onClick={onClick}
            className="group bg-white dark:bg-gray-800 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
            {/* Cover Image */}
            <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {store.cover_url ? (
                    <img
                        src={store.cover_url}
                        alt={store.store_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-50 dark:bg-brand-900/20">
                        <Store className="w-12 h-12 text-brand-200 dark:text-brand-800" />
                    </div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${isOpen
                        ? 'bg-green-500/90 text-white'
                        : 'bg-gray-500/90 text-white'
                    }`}>
                    {isOpen ? 'Aberto' : 'Fechado'}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex gap-4 mb-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md -mt-12 relative z-10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {store.store_logo_url ? (
                            <img src={store.store_logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-8 h-8 text-brand-500" />
                        )}
                    </div>

                    <div className="flex-1 pt-2">
                        <h3 className="font-black text-xl text-gray-900 dark:text-white leading-tight group-hover:text-brand-600 transition-colors">
                            {store.store_name}
                        </h3>
                        {store.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                {store.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                            <Clock className="w-4 h-4 text-brand-500" />
                            <span>{store.preparation_time_min}-{store.preparation_time_max} min</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>Novo</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="line-clamp-1">{store.store_address_district || store.city || 'Bairro indefinido'}</span>
                        </div>
                        <div className="p-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-xl group-hover:bg-brand-600 group-hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
