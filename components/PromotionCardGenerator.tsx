
import React, { useState, useEffect, useRef } from 'react';
import { Download, Loader2, Wand2, Check, Layout, Bike, Store, Sparkles, Crown, Briefcase, Palette, Map, Zap, Star, ShieldCheck, MapPin, Leaf, Coffee, Moon, Heart, Sun } from 'lucide-react';
import * as storage from '../services/storage';
import { PromotionDetails } from '../types';
import { Button } from './Button';
import { formatPhoneNumber } from '../utils/mapHelpers';
import { Logo } from './Logo';
import html2canvas from 'html2canvas';

// Declare globals from CDN scripts
declare const QRious: any;

// --- HOOK PARA GERAR QR CODE ---
const useQRCode = (phone: string, color: string = 'black') => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const phoneDigits = phone.replace(/\D/g, '');
        const qrValue = `https://wa.me/55${phoneDigits}`;

        if (canvasRef.current && typeof QRious !== 'undefined' && phoneDigits.length > 9) {
             new QRious({
                element: canvasRef.current,
                value: qrValue,
                size: 256,
                background: 'transparent',
                foreground: color,
                level: 'H'
            });
        }
    }, [phone, color]);

    return canvasRef;
};

// --- MODELO 1: PADRÃO (Modern Brand) ---
const DeliveryCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#ed2b05'); // Brand Color
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-gray-50 relative overflow-hidden flex flex-col ${className}`}>
            {/* Header Curvo com Brand Color */}
            <div className="bg-brand-600 h-40 rounded-b-[50px] relative shrink-0">
                <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '12px 12px' }}></div>
                <div className="flex flex-col items-center justify-center h-full pb-4">
                    <div className="bg-white p-3 rounded-2xl shadow-lg mb-2">
                        <Logo className="h-8 w-auto text-brand-600" />
                    </div>
                    <div className="flex items-center gap-1 bg-brand-700/50 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border border-brand-500">
                        <ShieldCheck className="w-3 h-3" /> Parceiro Verificado
                    </div>
                </div>
            </div>

            {/* Conteúdo em Card Flutuante */}
            <div className="px-6 -mt-10 flex-1 flex flex-col pb-6 relative z-10">
                <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col flex-1 border border-gray-100">
                    <h2 className="text-2xl font-black text-gray-900 text-center mb-2 leading-tight">
                        {details.name || "SEU NOME"}
                    </h2>
                    <div className="w-12 h-1 bg-brand-500 rounded-full mx-auto mb-4"></div>
                    
                    <p className="text-center text-gray-500 text-sm mb-6 font-medium leading-relaxed">
                        {details.description || "Soluções ágeis com excelência e segurança."}
                    </p>

                    <div className="flex-1 space-y-3 mb-6">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 text-brand-600" strokeWidth={3} />
                                </div>
                                <span className="text-sm font-bold text-gray-700 leading-tight">{service}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto border-t border-dashed border-gray-200 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Chame no Zap</p>
                                <p className="text-lg font-black text-brand-600 tracking-tight">{details.phone || "(00) 00000-0000"}</p>
                            </div>
                            <canvas ref={qrRef} className="w-12 h-12"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer Decorativo */}
            <div className="h-4 bg-brand-600 w-full shrink-0"></div>
        </div>
    );
};

// --- MODELO 2: LOJA (Business Blue) ---
const StoreCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#1e3a8a'); // Dark Blue
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-white relative overflow-hidden flex flex-col ${className}`}>
            {/* Header Sólido */}
            <div className="bg-slate-900 text-white p-8 pt-10 text-center shrink-0 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500 rounded-full blur-[50px] opacity-20"></div>
                <div className="relative z-10">
                    <div className="flex justify-center mb-4">
                        <Logo className="h-8 w-auto text-white" variant="full-white" />
                    </div>
                    <h2 className="text-2xl font-black mb-1 tracking-tight">{details.name || "NOME DA LOJA"}</h2>
                    <div className="flex items-center justify-center gap-2 text-blue-200 text-xs font-medium">
                        <Store className="w-3 h-3" /> Loja Oficial
                        <span>•</span>
                        <Star className="w-3 h-3 fill-current text-yellow-400" /> 5.0
                    </div>
                </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 p-8 flex flex-col">
                <div className="bg-blue-50/50 rounded-xl p-4 mb-6 border border-blue-100 text-center">
                    <p className="text-slate-600 text-sm font-medium italic">
                        "{details.description || "Qualidade e confiança em cada pedido."}"
                    </p>
                </div>

                <div className="flex-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Nossos Serviços</h3>
                    <div className="space-y-4">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center group">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center mr-3 shadow-sm group-hover:border-blue-500 transition-colors shrink-0">
                                    <Zap className="w-4 h-4 text-blue-600" fill="currentColor" />
                                </div>
                                <span className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1 w-full">{service}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 shrink-0">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-4 shadow-sm">
                    <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                        <canvas ref={qrRef} className="w-10 h-10 block mix-blend-multiply"></canvas>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Atendimento / Delivery</p>
                        <p className="text-lg font-black text-slate-900">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 3: PREMIUM (Luxury Gold) ---
const PremiumCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#D4AF37'); // Gold
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-[#0a0a0a] relative overflow-hidden flex flex-col border border-gray-900 ${className}`}>
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}></div>
            
            {/* Gold Accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

            <div className="relative z-10 flex flex-col h-full p-8">
                <div className="text-center mb-8 pt-4">
                    <div className="inline-block p-4 rounded-full border border-[#D4AF37]/30 mb-4 bg-black/50 backdrop-blur-sm">
                        <Logo className="h-8 w-auto text-[#D4AF37]" variant="white" />
                    </div>
                    <h2 className="text-2xl font-serif text-white tracking-widest uppercase mb-2">
                        {details.name || "PREMIUM"}
                    </h2>
                    <div className="flex justify-center items-center gap-2">
                        <div className="h-px w-8 bg-[#D4AF37]"></div>
                        <Crown className="w-4 h-4 text-[#D4AF37]" />
                        <div className="h-px w-8 bg-[#D4AF37]"></div>
                    </div>
                </div>

                <div className="flex-1">
                    <p className="text-center text-[#D4AF37]/80 text-xs italic mb-8 font-light tracking-wide px-4 border-l-2 border-r-2 border-[#D4AF37]/20 py-2">
                        "{details.description || "Excelência e exclusividade em cada serviço prestado."}"
                    </p>

                    <ul className="space-y-5 pl-2">
                        {services.map((service, i) => (
                            <li key={i} className="flex items-center text-gray-200 text-sm font-light tracking-wide">
                                <span className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37] mr-4 shrink-0"></span>
                                <span className="border-b border-gray-800 pb-2 w-full">{service}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-auto pt-8">
                    <div className="bg-gradient-to-r from-gray-900 to-black border border-[#D4AF37]/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                        <div>
                            <p className="text-[9px] text-[#D4AF37] uppercase tracking-[0.2em] mb-1">Contato VIP</p>
                            <p className="text-lg font-serif text-white">{details.phone || "(00) 00000-0000"}</p>
                        </div>
                        <div className="bg-black p-1 border border-[#D4AF37]/20">
                            <canvas ref={qrRef} className="w-12 h-12 block"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 4: MINIMAL CLEAN (Minimalista) ---
const MinimalCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#000000');
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-white relative overflow-hidden flex flex-col border border-gray-100 ${className}`}>
            <div className="p-10 h-full flex flex-col items-center text-center">
                {/* Logo Minimal */}
                <div className="mb-8 opacity-80 pt-4">
                    <Logo className="h-6 w-auto text-gray-900" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{details.name || "Seu Nome"}</h2>
                <div className="w-8 h-1 bg-gray-900 mb-6"></div>
                <p className="text-gray-500 text-sm mb-10 leading-relaxed max-w-[260px] font-medium">
                    {details.description || "Descrição clara e objetiva do seu trabalho."}
                </p>

                <div className="w-full flex-1 mb-8">
                    <ul className="space-y-4 text-left border-t border-gray-100 pt-6">
                        {services.map((service, i) => (
                            <li key={i} className="flex items-center text-gray-800 text-sm font-medium justify-between group">
                                {service}
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full group-hover:bg-gray-900 transition-colors"></div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="w-full border-t-2 border-gray-900 pt-6 flex items-center justify-between mt-auto">
                    <div className="text-left">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Contato</p>
                        <p className="text-xl font-bold text-gray-900">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <canvas ref={qrRef} className="w-12 h-12"></canvas>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 5: EXECUTIVO DARK (Moderno) ---
const ModernDarkCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#ffffff');
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-slate-900 relative overflow-hidden flex flex-col ${className}`}>
            {/* Subtle Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 pointer-events-none"></div>
            
            <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="flex justify-between items-start mb-10 pt-4">
                    <Logo className="h-6 w-auto" variant="white" />
                    <div className="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center text-white bg-slate-800">
                        <Briefcase className="w-5 h-5"/>
                    </div>
                </div>

                <h2 className="text-3xl font-light text-white mb-3 tracking-wide leading-tight">
                    {details.name || "Executivo"}
                </h2>
                <p className="text-slate-400 text-sm mb-10 border-l-2 border-brand-500 pl-4 py-1">
                    {details.description || "Soluções corporativas e logística."}
                </p>

                <div className="flex-1 mb-8">
                    <div className="grid grid-cols-1 gap-3">
                        {services.map((service, i) => (
                            <div key={i} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-slate-200 text-sm flex items-center hover:bg-slate-800 transition-colors">
                                <div className="w-1 h-4 bg-brand-500 rounded mr-3"></div>
                                {service}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto bg-brand-600 rounded-xl p-5 flex items-center justify-between shadow-lg shadow-brand-900/20">
                    <div className="text-white">
                        <p className="text-[10px] uppercase opacity-80 mb-1 tracking-wider">Fale Conosco</p>
                        <p className="text-lg font-bold">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg">
                        <canvas ref={qrRef} className="w-10 h-10 block"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 6: VIBRANT FLOW (Colorido) ---
const VibrantCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#ffffff');
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-white relative overflow-hidden flex flex-col ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 h-[300px]"></div>
            
            <div className="relative z-10 flex flex-col h-full p-6">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center mb-6 border border-white/30 shadow-lg mt-4">
                    <div className="flex justify-center mb-4">
                        <Logo className="h-8 w-auto" variant="full-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white drop-shadow-sm leading-tight">{details.name || "Vibrante"}</h2>
                </div>

                <div className="flex-1 bg-white rounded-[32px] p-6 shadow-2xl flex flex-col mb-4">
                    <p className="text-center text-gray-500 text-sm mb-8 font-medium px-2">
                        {details.description || "Energia e rapidez para seu negócio."}
                    </p>
                    
                    <div className="space-y-2.5 flex-1 mb-6">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 flex-shrink-0"></div>
                                <span className="text-sm font-bold text-gray-700 leading-tight">{service}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-5 border-t border-gray-100 flex items-center justify-between mt-auto">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">WhatsApp</p>
                            <p className="text-lg font-black text-gray-800">{details.phone || "(00) 00000-0000"}</p>
                        </div>
                        <div className="bg-gray-900 p-1.5 rounded-xl shadow-lg transform rotate-3">
                            <canvas ref={qrRef} className="w-10 h-10 block"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 7: LOGISTIC PRO (Logístico/Rastro) ---
const LogisticCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#1e3a8a');
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-blue-50 relative overflow-hidden flex flex-col ${className}`}>
            {/* Background Map Pattern (Simulated) */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#1e40af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full border-r-2 border-dashed border-blue-200"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="bg-blue-900 text-white p-10 rounded-b-[40px] shadow-lg text-center mb-6 shrink-0">
                    <Logo className="h-8 w-auto mb-4 mx-auto" variant="full-white" />
                    <h2 className="text-2xl font-black uppercase tracking-wider leading-tight">{details.name || "LOGÍSTICA"}</h2>
                    <p className="text-blue-200 text-xs mt-2 font-mono bg-blue-800/50 inline-block px-3 py-1 rounded-full">ROTA OTIMIZADA • ENTREGA SEGURA</p>
                </div>

                <div className="flex-1 px-8 pb-8 flex flex-col justify-start pt-2">
                    <p className="text-center text-blue-800/70 text-sm mb-8 font-medium">
                        {details.description || "Descrição logística..."}
                    </p>

                    <div className="space-y-4">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center gap-4 relative group">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-600 z-10 flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <MapPin className="w-4 h-4 text-blue-800" />
                                </div>
                                <div className="bg-white p-3.5 rounded-r-xl border-l-4 border-blue-600 shadow-sm flex-1 hover:shadow-md transition-shadow">
                                    <p className="text-sm font-bold text-gray-800 leading-tight">{service}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-blue-100 flex items-center justify-between mt-auto relative z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] shrink-0">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Central</p>
                        <p className="text-xl font-black text-blue-900 font-mono">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <canvas ref={qrRef} className="w-14 h-14"></canvas>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 8: ECO (Natural/Verde) ---
const EcoCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#065f46'); // Emerald 800
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-emerald-50 relative overflow-hidden flex flex-col ${className}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-[80px] -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-100 rounded-full blur-[80px] -ml-20 -mb-20"></div>

            <div className="relative z-10 flex flex-col h-full p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-4 border border-emerald-100">
                        <Leaf className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-900 text-center leading-tight mb-2 font-serif">{details.name || "Eco Delivery"}</h2>
                    <div className="h-1 w-10 bg-emerald-300 rounded-full"></div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white mb-6">
                    <p className="text-emerald-800 text-sm font-medium text-center leading-relaxed italic">
                        "{details.description || "Entregas sustentáveis e conscientes."}"
                    </p>
                </div>

                <div className="flex-1 space-y-3">
                    {services.map((service, i) => (
                        <div key={i} className="flex items-center gap-3 text-emerald-800">
                            <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm font-medium border-b border-emerald-100 w-full pb-1">{service}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-auto bg-emerald-800 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-emerald-900/10">
                    <div>
                        <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Contato</p>
                        <p className="text-lg font-bold">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <div className="bg-white p-1 rounded-lg">
                        <canvas ref={qrRef} className="w-10 h-10 block"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 9: RETRO (Vintage/Café) ---
const RetroCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#78350f'); // Amber 900
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-amber-50 relative overflow-hidden flex flex-col border-4 border-amber-900/10 ${className}`}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#78350f 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}></div>
            
            <div className="relative z-10 flex flex-col h-full p-6">
                <div className="border-b-2 border-dashed border-amber-900/20 pb-6 mb-6 text-center">
                    <div className="inline-block p-3 rounded-full border-2 border-amber-900/20 mb-3 text-amber-800">
                        <Coffee className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-amber-900 tracking-tighter uppercase mb-1">{details.name || "Retrô"}</h2>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-900/20">EST. 2024</span>
                </div>

                <div className="flex-1 px-2">
                    <p className="text-center text-amber-800 font-serif italic text-sm mb-8 leading-relaxed">
                        {details.description || "Serviço clássico com qualidade garantida."}
                    </p>

                    <div className="space-y-4">
                        {services.map((service, i) => (
                            <div key={i} className="bg-white border-2 border-amber-900/10 rounded-lg p-3 shadow-[2px_2px_0px_rgba(120,53,15,0.1)] flex items-center justify-between">
                                <span className="font-bold text-amber-900 text-sm">{service}</span>
                                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto border-t-2 border-dashed border-amber-900/20 pt-6 text-center">
                    <p className="text-xs font-bold text-amber-800 uppercase mb-2">Fale Conosco</p>
                    <p className="text-2xl font-black text-amber-900 mb-4 tracking-tight">{details.phone || "(00) 00000-0000"}</p>
                    <div className="inline-block bg-white p-2 border-2 border-amber-900/10 rounded-xl">
                        <canvas ref={qrRef} className="w-24 h-24 block"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 10: STREET (Urbano/Alto Contraste) ---
const StreetCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#000000');
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-gray-900 relative overflow-hidden flex flex-col ${className}`}>
            <div className="absolute top-0 right-0 w-full h-[60%] bg-yellow-400 -skew-y-12 transform origin-top-left -mt-20 border-b-8 border-white"></div>

            <div className="relative z-10 flex flex-col h-full p-6">
                <div className="mb-10 pt-8 pl-2">
                    <div className="bg-black text-yellow-400 inline-block p-2 mb-2 transform -rotate-3">
                        <Zap className="w-8 h-8 fill-current" />
                    </div>
                    <h2 className="text-4xl font-black text-black leading-[0.9] uppercase italic transform -skew-x-6 drop-shadow-sm">
                        {details.name || "URBANO"}
                    </h2>
                </div>

                <div className="bg-black p-6 flex-1 shadow-[8px_8px_0px_#ffffff] border border-gray-700 ml-2 mb-6">
                    <p className="text-gray-300 font-mono text-xs mb-6 border-l-2 border-yellow-400 pl-3">
                        // {details.description || "Rapidez e eficiência nas ruas da cidade."}
                    </p>

                    <div className="space-y-4">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-yellow-400 transform rotate-45 shrink-0"></div>
                                <span className="text-white font-bold text-sm uppercase tracking-wide">{service}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto bg-white p-4 flex items-center justify-between ml-2 shadow-[8px_8px_0px_#facc15]">
                    <div className="text-black">
                        <p className="text-[10px] font-black uppercase bg-yellow-400 inline-block px-1">Contato</p>
                        <p className="text-lg font-black">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <canvas ref={qrRef} className="w-12 h-12 block"></canvas>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 11: NIGHT (Noturno/Escuro) ---
const NightCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#818cf8'); // Indigo 400
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-indigo-950 relative overflow-hidden flex flex-col ${className}`}>
            <div className="absolute top-10 right-10 w-20 h-20 bg-indigo-500 rounded-full blur-[60px] opacity-50"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-purple-600 rounded-full blur-[80px] opacity-40"></div>
            
            {/* Stars */}
            <div className="absolute top-20 left-10 w-1 h-1 bg-white rounded-full opacity-70"></div>
            <div className="absolute top-40 right-20 w-1 h-1 bg-white rounded-full opacity-50"></div>
            <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-white rounded-full opacity-30"></div>

            <div className="relative z-10 flex flex-col h-full p-8">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 mb-4 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <Moon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-light text-white tracking-[0.1em] uppercase">{details.name || "Midnight"}</h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-4"></div>
                </div>

                <div className="flex-1">
                    <p className="text-center text-indigo-200/80 text-sm font-light mb-10 px-4">
                        {details.description || "Serviços noturnos com segurança e discrição."}
                    </p>

                    <div className="space-y-6 pl-4 border-l border-indigo-900">
                        {services.map((service, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-indigo-950 border border-indigo-500 rounded-full"></div>
                                <span className="text-indigo-100 text-sm tracking-wide block">{service}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto border-t border-indigo-900/50 pt-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">WhatsApp</p>
                        <p className="text-lg text-white font-mono">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                    <div className="bg-white p-1 rounded">
                        <canvas ref={qrRef} className="w-12 h-12 block"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODELO 12: FRIENDLY (Amigável/Pastel) ---
const FriendlyCardDesign = ({ details, id, className = "" }: { details: PromotionDetails, id?: string, className?: string }) => {
    const qrRef = useQRCode(details.phone, '#e11d48'); // Rose 600
    const services = details.services.split('\n').filter(s => s.trim());

    return (
        <div id={id} className={`w-[350px] min-h-[600px] h-auto bg-rose-50 relative overflow-hidden flex flex-col ${className}`}>
            {/* Background Shapes */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-bl-[100px] opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-100 rounded-tr-[100px] opacity-50"></div>

            <div className="relative z-10 flex flex-col h-full p-8">
                <div className="bg-white rounded-[40px] p-8 shadow-sm border border-rose-100 text-center mb-6">
                    <div className="inline-block p-3 bg-rose-100 rounded-full text-rose-500 mb-3">
                        <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-1">{details.name || "Amigável"}</h2>
                    <p className="text-xs text-rose-400 font-bold uppercase tracking-wide">Com Carinho</p>
                </div>

                <div className="flex-1 px-2">
                    <p className="text-center text-gray-600 text-sm mb-8 font-medium leading-relaxed bg-white/50 p-3 rounded-xl">
                        {details.description || "Feito com amor para você."}
                    </p>

                    <div className="space-y-3">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm text-gray-700">
                                <Sun className="w-5 h-5 text-orange-400" />
                                <span className="text-sm font-bold">{service}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto bg-white rounded-[30px] p-5 flex items-center gap-4 shadow-sm border border-rose-100">
                    <div className="bg-rose-50 p-2 rounded-xl">
                        <canvas ref={qrRef} className="w-12 h-12 block mix-blend-multiply"></canvas>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 font-bold">Fale Comigo</p>
                        <p className="text-lg font-black text-rose-600">{details.phone || "(00) 00000-0000"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PromotionCardGenerator: React.FC = () => {
    const [details, setDetails] = useState<PromotionDetails>({
        name: '',
        phone: '',
        description: '',
        services: '',
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<'delivery' | 'store' | 'premium' | 'minimal' | 'modern' | 'vibrant' | 'logistic' | 'eco' | 'retro' | 'street' | 'night' | 'friendly'>('delivery');

    useEffect(() => {
        const savedDetails = storage.getPromotionDetails();
        if (savedDetails) {
            setDetails(savedDetails);
        } else {
            setDetails({
                name: 'Seu Nome',
                phone: '(99) 99999-9999',
                description: 'Serviços rápidos e de confiança.',
                services: 'Entregas Rápidas\nColetas\nServiços Bancários'
            });
        }
    }, []);
    
    useEffect(() => {
        storage.savePromotionDetails(details);
    }, [details]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setDetails(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
        } else {
            setDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        setTimeout(async () => {
            try {
                // Seleciona o template correto baseado no estilo escolhido
                const templateId = `export-card-${selectedStyle}`;
                const element = document.getElementById(templateId);
                
                if (!element) throw new Error("Template not found");

                await document.fonts.ready;

                const canvas = await html2canvas(element, {
                    scale: 3, // High Res
                    useCORS: true,
                    backgroundColor: null,
                    logging: false,
                    windowHeight: element.scrollHeight // Ensure full height capture
                });

                const link = document.createElement('a');
                link.download = `cartao_${details.name.replace(/\s+/g, '_').toLowerCase()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (error) {
                console.error(error);
                alert("Erro ao gerar a imagem. Tente novamente.");
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    const ActiveCardComponent = {
        'delivery': DeliveryCardDesign,
        'store': StoreCardDesign,
        'premium': PremiumCardDesign,
        'minimal': MinimalCardDesign,
        'modern': ModernDarkCardDesign,
        'vibrant': VibrantCardDesign,
        'logistic': LogisticCardDesign,
        'eco': EcoCardDesign,
        'retro': RetroCardDesign,
        'street': StreetCardDesign,
        'night': NightCardDesign,
        'friendly': FriendlyCardDesign,
    }[selectedStyle];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Controls */}
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-800">
                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg text-blue-600 dark:text-blue-300">
                            <Wand2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Personalize seu Cartão</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                O tamanho do cartão se ajusta automaticamente à quantidade de texto.
                            </p>
                        </div>
                    </div>

                    {/* Style Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Escolha o Modelo</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button 
                                onClick={() => setSelectedStyle('delivery')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'delivery' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Bike className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Padrão</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('store')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'store' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Store className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Loja</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('premium')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'premium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Crown className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Gold</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('minimal')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'minimal' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Layout className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Clean</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('modern')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'modern' ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Briefcase className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Executivo</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('vibrant')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'vibrant' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Palette className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Vibrante</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('logistic')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'logistic' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Map className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Logístico</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('eco')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'eco' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Leaf className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Eco</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('retro')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'retro' ? 'border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Coffee className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Retrô</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('street')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'street' ? 'border-yellow-400 bg-gray-900 text-yellow-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Zap className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Urbano</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('night')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'night' ? 'border-indigo-500 bg-indigo-950 text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Moon className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Noite</span>
                            </button>
                            <button 
                                onClick={() => setSelectedStyle('friendly')}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === 'friendly' ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <Heart className="w-5 h-5"/>
                                <span className="text-[9px] font-bold">Soft</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Nome em Destaque</label>
                            <input name="name" value={details.name} onChange={handleInputChange} className="ifood-input w-full p-3 text-sm font-bold" placeholder="Ex: João Entregas" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">WhatsApp / Telefone</label>
                            <input name="phone" type="tel" maxLength={15} value={details.phone} onChange={handleInputChange} className="ifood-input w-full p-3 text-sm font-mono" placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Frase de Impacto / Descrição</label>
                            <textarea name="description" value={details.description} onChange={handleInputChange} rows={2} className="ifood-input w-full p-3 text-sm resize-none" placeholder="Ex: Entregas rápidas e seguras..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Lista de Serviços (Um por linha)</label>
                            <textarea name="services" value={details.services} onChange={handleInputChange} rows={6} className="ifood-input w-full p-3 text-sm resize-none" placeholder="Ex: Entregas Expressas&#10;Coletas&#10;Serviços Bancários" />
                        </div>
                    </div>

                    <Button fullWidth onClick={handleDownload} disabled={isGenerating} className="py-4 text-lg shadow-lg">
                        {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                        {isGenerating ? 'Criando Arte...' : 'BAIXAR IMAGEM HD'}
                    </Button>
                </div>

                {/* Right Column: Live Preview */}
                <div className="flex flex-col items-center justify-start bg-gray-100 dark:bg-gray-950 p-4 lg:p-8 rounded-3xl shadow-inner border border-gray-200 dark:border-gray-800 relative overflow-y-auto max-h-[800px] custom-scrollbar">
                    <p className="absolute top-4 left-6 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 z-20">
                        <Sparkles className="w-3 h-3"/> Pré-visualização
                    </p>
                    
                    {/* Live Card Render */}
                    <div className="scale-[0.80] sm:scale-90 lg:scale-100 origin-top transition-all duration-500 shadow-2xl rounded-none overflow-visible mt-12 lg:mt-8">
                        <ActiveCardComponent details={details} />
                    </div>
                </div>
            </div>

            {/* Hidden Export Templates (Fixed High-Res Layouts) */}
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                <DeliveryCardDesign details={details} id="export-card-delivery" />
                <StoreCardDesign details={details} id="export-card-store" />
                <PremiumCardDesign details={details} id="export-card-premium" />
                <MinimalCardDesign details={details} id="export-card-minimal" />
                <ModernDarkCardDesign details={details} id="export-card-modern" />
                <VibrantCardDesign details={details} id="export-card-vibrant" />
                <LogisticCardDesign details={details} id="export-card-logistic" />
                <EcoCardDesign details={details} id="export-card-eco" />
                <RetroCardDesign details={details} id="export-card-retro" />
                <StreetCardDesign details={details} id="export-card-street" />
                <NightCardDesign details={details} id="export-card-night" />
                <FriendlyCardDesign details={details} id="export-card-friendly" />
            </div>
        </div>
    );
};
