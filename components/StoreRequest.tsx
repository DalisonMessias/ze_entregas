



import React, { useState, useEffect } from 'react';
import { MapPin, Calculator, Loader2, DollarSign, Navigation, Info, Plus, Trash2, ArrowDown, UserX, Phone, Star, X } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, OfflineDriver } from '../types';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const StoreRequest: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [storeCity, setStoreCity] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState(0);

    // Form Inputs
    const [pickup, setPickup] = useState('');
    const [deliveries, setDeliveries] = useState<string[]>(['']); // Array of delivery addresses
    
    // Calculation State
    const [calculating, setCalculating] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [cost, setCost] = useState<number | null>(null);
    const [partnerNet, setPartnerNet] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Offline Drivers Modal
    const [offlineDrivers, setOfflineDrivers] = useState<OfflineDriver[]>([]);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [f, w, user] = await Promise.all([
                    cloud.adminGetFeeSettings(),
                    cloud.getMyWallet(),
                    cloud.getClient()?.auth.getUser()
                ]);
                
                setFees(f);
                setWalletBalance(w?.balance_decimal || 0);
                
                // Extract City from Metadata or Profile
                if (user?.data.user?.user_metadata?.city) {
                    setStoreCity(user.data.user.user_metadata.city);
                } else {
                    alert("Cidade não configurada no perfil. Atualize seus dados.");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const addDelivery = () => setDeliveries([...deliveries, '']);
    const removeDelivery = (index: number) => {
        if (deliveries.length > 1) {
            setDeliveries(deliveries.filter((_, i) => i !== index));
        }
    };
    const updateDelivery = (index: number, val: string) => {
        const newD = [...deliveries];
        newD[index] = val;
        setDeliveries(newD);
    };

    const geocode = async (address: string) => {
        const query = `${address}, ${storeCity}, Brasil`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (!data || data.length === 0) throw new Error(`Endereço não encontrado: ${address}`);
        return { lat: data[0].lat, lon: data[0].lon };
    };

    const handleCalculate = async () => {
        if (!pickup || deliveries.some(d => !d.trim())) return alert("Preencha todos os endereços.");
        if (!storeCity) return alert("Cidade da loja não identificada.");
        
        setCalculating(true);
        setDistanceKm(null);
        setCost(null);

        try {
            // 1. Geocode Pickup & Deliveries
            const pickupCoords = await geocode(pickup);
            const deliveryCoords = await Promise.all(deliveries.map(d => geocode(d)));

            // 2. Build Route Query (Pickup -> D1 -> D2 ...)
            const coords = [pickupCoords, ...deliveryCoords];
            const coordString = coords.map(c => `${c.lon},${c.lat}`).join(';');
            
            // OSRM Call
            const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
            const resRoute = await fetch(url);
            const dataRoute = await resRoute.json();

            if (dataRoute.code !== 'Ok' || !dataRoute.routes || dataRoute.routes.length === 0) {
                throw new Error("Não foi possível calcular a rota.");
            }

            const dist = dataRoute.routes[0].distance / 1000; // Meters to KM
            setDistanceKm(dist);

            // 3. Calculate Cost
            if (fees) {
                // Base Cost + Extra KM
                let partnerVal = fees.base_delivery_value;
                if (dist > fees.base_delivery_km) {
                    partnerVal += (dist - fees.base_delivery_km) * fees.extra_km_value;
                }
                
                // Add Multi-Stop Fee (Fee per EXTRA stop)
                // If 1 delivery = 0 extra stops. If 2 deliveries = 1 extra stop.
                const extraStops = Math.max(0, deliveries.length - 1);
                const stopsFee = extraStops * (fees.additional_stop_fee || 0);
                
                partnerVal += stopsFee;

                // Apply Global Store Fee (Admin Cut)
                const totalCharged = partnerVal + fees.global_tax_fixed + (partnerVal * fees.global_tax_percent);
                
                setPartnerNet(partnerVal);
                setCost(totalCharged);
            }

        } catch (e: any) {
            alert(e.message);
        } finally {
            setCalculating(false);
        }
    };

    const handleConfirmRequest = async (force: boolean = false) => {
        if (!distanceKm || !cost || !partnerNet || !fees) return;
        if (walletBalance < cost) return alert("Saldo insuficiente. Faça uma recarga na sua carteira.");

        setCheckingAvailability(true);
        setIsSubmitting(true);

        try {
            // Check for online drivers first (simulated by checking city radius or just active in city)
            // Ideally we pass coords, but simplified check:
            const pickupCoords = await geocode(pickup);
            const onlineDrivers = await cloud.getOnlineDrivers(parseFloat(pickupCoords.lat), parseFloat(pickupCoords.lon), 15); // 15km radius

            if (onlineDrivers.length === 0 && !force) {
                // No online drivers, check for offline contacts
                const offlineContacts = await cloud.getOfflineDriversForContact(storeCity);
                
                if (offlineContacts.length > 0) {
                    setOfflineDrivers(offlineContacts);
                    setShowOfflineModal(true);
                    setCheckingAvailability(false);
                    setIsSubmitting(false);
                    return; // Stop here, show modal
                }
                // If no offline contacts either, proceed to create request anyway (maybe someone comes online)
            }

            const fullPickup = `${pickup} - ${storeCity}`;
            const fullDelivery = deliveries.map(d => `${d} - ${storeCity}`).join(' -> ');
            
            await cloud.createPartnerRequest(fullPickup, fullDelivery, distanceKm, cost, partnerNet, fees);
            alert("Solicitação enviada com sucesso! Aguarde um entregador aceitar.");
            
            // Reset
            setPickup('');
            setDeliveries(['']);
            setDistanceKm(null);
            setCost(null);
            setShowOfflineModal(false);
            
            setWalletBalance(prev => prev - cost);

        } catch (e: any) {
            alert("Erro ao criar solicitação: " + e.message);
        } finally {
            setIsSubmitting(false);
            setCheckingAvailability(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Solicitar Entregador</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> Cidade base: <strong>{storeCity}</strong>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Seu Saldo</p>
                        <p className={`font-bold text-lg ${walletBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(walletBalance)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Pickup */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Onde buscar? (Coleta)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Ex: Rua das Flores, 123" 
                                value={pickup}
                                onChange={e => setPickup(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Deliveries */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Onde levar? (Entregas)</label>
                        <div className="space-y-3">
                            {deliveries.map((addr, idx) => (
                                <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2">
                                    <div className="flex-1 relative">
                                        <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 text-gray-300">
                                            <ArrowDown className="w-4 h-4"/>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={`Ponto de entrega ${idx + 1}`} 
                                            value={addr}
                                            onChange={e => updateDelivery(idx, e.target.value)}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        />
                                    </div>
                                    {deliveries.length > 1 && (
                                        <button onClick={() => removeDelivery(idx)} className="p-3 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                            <Trash2 className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={addDelivery} 
                            className="mt-3 text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline"
                        >
                            <Plus className="w-4 h-4"/> Adicionar parada
                        </button>
                    </div>

                    {!distanceKm && (
                        <Button 
                            fullWidth 
                            onClick={handleCalculate} 
                            disabled={calculating || !pickup || deliveries.some(d => !d.trim())}
                            variant="outline"
                            className="py-3 mt-4"
                        >
                            {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Calculator className="w-4 h-4 mr-2"/>}
                            {calculating ? 'Calculando Rota...' : 'Calcular Valor'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Result Card */}
            {distanceKm !== null && cost !== null && (
                <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white shadow-lg animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="text-brand-100 text-xs font-bold uppercase mb-1">Rota Total</p>
                            <div className="flex items-center gap-2">
                                <Navigation className="w-5 h-5 text-white"/>
                                <span className="text-2xl font-bold">{distanceKm.toFixed(1)} km</span>
                            </div>
                            <p className="text-xs text-white/70 mt-1">{deliveries.length} entrega(s)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-brand-100 text-xs font-bold uppercase mb-1">Valor Final</p>
                            <div className="flex items-center justify-end gap-1">
                                <span className="text-3xl font-black">{formatCurrency(cost)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-3 mb-4 text-xs text-brand-50 flex items-start gap-2">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>O valor inclui taxas de serviço e adicional por parada extra (se houver).</p>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="ghost" 
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                            onClick={() => { setDistanceKm(null); setCost(null); }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            className="flex-[2] bg-white text-brand-700 hover:bg-gray-100 border-none"
                            onClick={() => handleConfirmRequest(false)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar e Chamar'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Offline Drivers Modal */}
            {showOfflineModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <UserX className="w-6 h-6 text-orange-500"/> Ninguém Online
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Não encontramos entregadores online agora. Tente ligar para estes parceiros:</p>
                            </div>
                            <button onClick={() => setShowOfflineModal(false)}><X className="w-6 h-6 text-gray-400"/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                            {offlineDrivers.map((driver, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{driver.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1 text-yellow-600 font-bold bg-yellow-100 px-1.5 py-0.5 rounded"><Star className="w-3 h-3 fill-current"/> {driver.average_rating.toFixed(1)}</span>
                                            <span className="uppercase font-mono bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{driver.vehicle_type}</span>
                                        </div>
                                    </div>
                                    <a href={`tel:${driver.phone_number}`} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95">
                                        <Phone className="w-5 h-5"/>
                                    </a>
                                </div>
                            ))}
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-200 mb-4">
                            <strong>Atenção:</strong> Ao negociar diretamente, o pagamento e a responsabilidade são exclusivos entre você e o entregador. A plataforma não monitora essa entrega.
                        </div>

                        <Button variant="outline" fullWidth onClick={() => handleConfirmRequest(true)}>
                            Criar pedido no sistema mesmo assim
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};