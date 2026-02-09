import React from 'react';
import { Smartphone, Signal, Battery, Wifi, ArrowLeft, Store, Heart, Star, Navigation, ArrowRight, Home, ChevronRight, Image as ImageIcon, Timer, MapPin } from 'lucide-react';

interface MobileBannerPreviewProps {
    imageUrl: string;
    storeName?: string;
}

export const MobileBannerPreview: React.FC<MobileBannerPreviewProps> = ({ imageUrl, storeName }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-[300px] h-[600px] bg-slate-950 rounded-[3rem] border-[10px] border-slate-900 shadow-2xl overflow-hidden ring-4 ring-slate-800/50">
                {/* Speaker/Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center gap-1.5">
                    <div className="w-8 h-1 bg-slate-800 rounded-full" />
                    <div className="w-2 h-2 bg-slate-800 rounded-full" />
                </div>

                {/* Status Bar */}
                <div className="absolute top-0 w-full h-12 flex items-center justify-between px-6 pt-2 text-[10px] font-bold text-white z-30">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3" />
                        <Wifi className="w-3 h-3" />
                        <Battery className="w-3 h-3 rotate-90" />
                    </div>
                </div>

                {/* Screen Content */}
                <div className="w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {/* Red Header (App Style) */}
                    <div className="bg-brand-600 pt-10 pb-4 px-4 text-white">
                        <div className="flex items-center gap-3">
                            <ArrowLeft className="w-5 h-5" />
                            <div className="flex-1">
                                <p className="text-sm font-black leading-tight">Lojas em Sto. Antonio...</p>
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">2 ESTABELECIMENTOS</p>
                            </div>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Home className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* NEW: City Banner Slider (Real Top Page Banner) */}
                    <div className="px-4 pt-4">
                        <div className="relative aspect-[16/6] bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-500 group">
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="City Banner" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Banner da Cidade</p>
                                </div>
                            )}
                            {/* Slider Dots */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                <div className="w-3 h-1 bg-white rounded-full" />
                                <div className="w-1 h-1 bg-white/40 rounded-full" />
                                <div className="w-1 h-1 bg-white/40 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
                        <div className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20">
                            Todos
                        </div>
                        <div className="px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Store className="w-3 h-3" /> Bebidas
                        </div>
                        <div className="px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-800">
                            Mercearia
                        </div>
                    </div>

                    {/* Store List Container */}
                    <div className="px-4 pb-6 space-y-4">
                        {/* Store Card (Standard Layout - No Banner Inside) */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden group">
                            {/* Mock Cover (Generic or static) */}
                            <div className="relative h-24 bg-slate-100 dark:bg-slate-800/50 overflow-hidden flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-200" />

                                {/* Badge Status */}
                                <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                    Aberto
                                </div>

                                {/* Logo Overlay */}
                                <div className="absolute -bottom-6 left-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-950 shadow-xl flex items-center justify-center p-2 transform group-hover:-translate-y-1 transition-transform">
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                                            <Store className="w-6 h-6 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="pt-8 pb-5 px-5 space-y-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                        {storeName || 'Sua Loja'}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                            <Timer className="w-3 h-3" />
                                            <span>20-30 min</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span>Novo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                        <MapPin className="w-3 h-3" />
                                        <span>Bairro do Centro</span>
                                    </div>
                                    <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        Ver Loja <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Second Mock Card (Simplified) */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-4 opacity-40">
                            <div className="flex gap-4">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                                    <div className="w-16 h-2 bg-slate-50 dark:bg-slate-900 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>
            </div>
            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mockup App Realista</p>
        </div>
    );
};
