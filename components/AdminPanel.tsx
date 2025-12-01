
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Search, MoreVertical, Edit, UserX, Trash2, Loader2, UserCheck, UserCog, Send, ListOrdered, Settings, Package, Power, PowerOff, X, CheckCircle, AlertTriangle, CreditCard, QrCode, Barcode, Plus, Grid, Tag, Headphones, MessageSquare, Phone, Key, Bot, Wallet, Smartphone, Upload, RefreshCw, Banknote, MapPin, Link2, FileCheck, FileX, ShieldCheck, ShieldOff, Star, Globe, Info, Briefcase, Newspaper, Mail, Save, Ban, Store, Lock, ShoppingBag } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ManagedUser, UserRole, UserStatus, GlobalNotification, Product, AdminOrder, ShopSettings, Category, Claim, PartnerFeeSettings, PWASettings, PWAIcon, PayoutSettings, City, CityRequest, PartnerDocument, PartnerProfile, PartnerLevelBenefit, CompanyInfo, AdminSubTab, BlacklistEntry, FraudAlert, IdentityVerification, PartnerRating, PlatformNews } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { AsaasWebhookManagement } from './AsaasWebhookManagement';
import { AdminDashboard } from './AdminDashboard';
import { AdminReferrals } from './AdminReferrals';
import { ChatWindow } from './ChatWindow';
import { AdminWalletControl } from './AdminWalletControl';
import { Switch } from './Switch';

// ... (keep existing helper functions like debounce, parseCurrency)
const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

// --- SHOP MANAGEMENT MODULE (UPDATED) ---
const ShopManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Product Editing State
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Category Editing State
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, c, s] = await Promise.all([
                cloud.adminGetProducts(),
                cloud.adminGetCategories(),
                cloud.getShopSettings()
            ]);
            setProducts(p);
            setCategories(c);
            setShopSettings(s || { id: true, is_shop_enabled: false });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Product Handlers ---
    const handleSaveProduct = async () => {
        if (!editingProduct?.name || !editingProduct?.price) return alert("Nome e preço são obrigatórios.");
        setIsSaving(true);
        try {
            if (editingProduct.id) {
                await cloud.adminUpdateProduct(editingProduct.id, editingProduct);
            } else {
                await cloud.adminAddProduct(editingProduct);
            }
            setEditingProduct(null);
            loadData();
        } catch (e: any) {
            alert("Erro ao salvar produto: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Deletar produto?")) return;
        try {
            await cloud.adminDeleteProduct(id);
            loadData();
        } catch (e: any) {
            alert("Erro ao deletar: " + e.message);
        }
    };

    // --- Category Handlers ---
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await cloud.adminAddCategory(newCategoryName);
            setNewCategoryName('');
            loadData();
        } catch (e: any) {
            alert("Erro ao adicionar categoria: " + e.message);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Deletar categoria?")) return;
        try {
            await cloud.adminDeleteCategory(id);
            loadData();
        } catch (e: any) {
            alert("Erro ao deletar categoria: " + e.message);
        }
    };

    // --- Settings Handlers ---
    const handleSaveSettings = async () => {
        if (!shopSettings) return;
        setIsSaving(true);
        try {
            await cloud.adminUpdateShopSettings(shopSettings);
            alert("Configurações da loja salvas!");
        } catch (e: any) {
            alert("Erro ao salvar configurações: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const updatePaymentMethod = (method: 'pix' | 'boleto' | 'credit_card') => {
        setShopSettings(prev => {
            if (!prev) return null;
            const current = prev.payment_methods || { pix: false, boleto: false, credit_card: false };
            return { ...prev, payment_methods: { ...current, [method]: !current[method] } };
        });
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Tabs */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Produtos</button>
                <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'categories' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Categorias</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Configurações</button>
            </div>

            {/* --- PRODUCTS TAB --- */}
            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setEditingProduct({ is_active: true })}>
                            <Plus className="w-4 h-4 mr-2"/> Novo Produto
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Preço</th>
                                    <th className="px-4 py-3">Estoque</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-bold dark:text-white">{p.name}</td>
                                        <td className="px-4 py-3">R$ {p.price.toFixed(2)}</td>
                                        <td className="px-4 py-3">{p.stock_quantity ?? '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {p.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-500"><Edit className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && <tr><td colSpan={5} className="text-center p-4 text-gray-400">Nenhum produto cadastrado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CATEGORIES TAB --- */}
            {activeTab === 'categories' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Nova Categoria" 
                            value={newCategoryName} 
                            onChange={e => setNewCategoryName(e.target.value)} 
                            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <Button onClick={handleAddCategory}>Adicionar</Button>
                    </div>
                    <div className="space-y-2">
                        {categories.map(c => (
                            <div key={c.id} className="flex justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-bold dark:text-white">{c.name}</span>
                                <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && shopSettings && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div>
                            <h4 className="font-bold dark:text-white">Status da Loja</h4>
                            <p className="text-xs text-gray-500">Defina se a loja está aberta para receber pedidos.</p>
                        </div>
                        <Switch checked={shopSettings.is_shop_enabled || false} onChange={c => setShopSettings({...shopSettings, is_shop_enabled: c})} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome da Loja (Exibição)</label>
                            <input 
                                type="text" 
                                value={shopSettings.shop_name || ''} 
                                onChange={e => setShopSettings({...shopSettings, shop_name: e.target.value})} 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Cidade Principal</label>
                            <input 
                                type="text" 
                                value={shopSettings.shop_city || ''} 
                                onChange={e => setShopSettings({...shopSettings, shop_city: e.target.value})} 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-3">Métodos de Pagamento</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shopSettings.payment_methods?.pix} onChange={() => updatePaymentMethod('pix')} className="rounded text-brand-600"/>
                                <span className="dark:text-white">PIX</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shopSettings.payment_methods?.boleto} onChange={() => updatePaymentMethod('boleto')} className="rounded text-brand-600"/>
                                <span className="dark:text-white">Boleto</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shopSettings.payment_methods?.credit_card} onChange={() => updatePaymentMethod('credit_card')} className="rounded text-brand-600"/>
                                <span className="dark:text-white">Cartão de Crédito</span>
                            </label>
                        </div>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={isSaving} fullWidth>
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Configurações'}
                    </Button>
                </div>
            )}

            {/* --- PRODUCT MODAL --- */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg dark:text-white">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setEditingProduct(null)}><X className="w-5 h-5"/></button>
                        </div>
                        
                        <input type="text" placeholder="Nome do Produto" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <textarea placeholder="Descrição" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24 resize-none" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500">Preço (R$)</label>
                                <input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Estoque</label>
                                <input type="number" value={editingProduct.stock_quantity || ''} onChange={e => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500">Categoria</label>
                            <select 
                                value={editingProduct.category_id || ''} 
                                onChange={e => setEditingProduct({...editingProduct, category_id: e.target.value})} 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">Selecione...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500">URL da Imagem</label>
                            <input type="text" placeholder="https://..." value={editingProduct.images?.[0] || ''} onChange={e => setEditingProduct({...editingProduct, images: [e.target.value]})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={editingProduct.is_active ?? true} onChange={e => setEditingProduct({...editingProduct, is_active: e.target.checked})} className="rounded text-brand-600" />
                            <span className="text-sm dark:text-white">Produto Ativo</span>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setEditingProduct(null)} fullWidth>Cancelar</Button>
                            <Button onClick={handleSaveProduct} disabled={isSaving} fullWidth>
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PARTNER VERIFICATION MODULE ---
const PartnerVerification: React.FC = () => {
    const [partners, setPartners] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<ManagedUser | null>(null);
    const [partnerDetails, setPartnerDetails] = useState<{ profile: PartnerProfile, documents: PartnerDocument[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        loadPendingPartners();
    }, []);

    const loadPendingPartners = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPendingPartners();
            setPartners(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openPartnerDetails = async (partner: ManagedUser) => {
        setSelectedPartner(partner);
        setDetailLoading(true);
        try {
            const details = await cloud.adminGetPartnerDetails(partner.id);
            setPartnerDetails(details);
        } catch (e) { console.error(e); } finally { setDetailLoading(false); }
    };

    const handleUpdateDocStatus = async (docId: string, status: 'APPROVED' | 'REJECTED') => {
        const notes = status === 'REJECTED' ? prompt("Motivo da rejeição (opcional):") : '';
        if (status === 'REJECTED' && notes === null) return; // User cancelled prompt

        try {
            await cloud.adminUpdateDocumentStatus(docId, status, notes || '');
            // Refresh details
            if (selectedPartner) openPartnerDetails(selectedPartner);
        } catch (e: any) { alert("Erro: " + e.message); }
    };
    
    const handleUpdatePartnerStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
        if (!confirm(`Tem certeza que deseja alterar o status deste parceiro para ${status}?`)) return;
        try {
            await cloud.adminUpdatePartnerStatus(userId, status);
            alert("Status do parceiro atualizado!");
            if (selectedPartner) openPartnerDetails(selectedPartner); // Refresh
            loadPendingPartners(); // Refresh list in case status changes
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Parceiro</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={4} className="text-center p-6"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>}
                        {!loading && partners.map(p => (
                            <tr key={p.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3 font-bold dark:text-white">{p.name || p.email}</td>
                                <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">{p.verification_status}</span></td>
                                <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right"><Button onClick={() => openPartnerDetails(p)} className="py-1 px-3 text-xs">Analisar</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {selectedPartner && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPartner(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold dark:text-white">Análise: {selectedPartner.name}</h3>
                            <button onClick={() => setSelectedPartner(null)}><X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {detailLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                                <>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                        <p><strong>Veículo:</strong> {partnerDetails?.profile.vehicle_type}</p>
                                        <p><strong>Placa:</strong> {partnerDetails?.profile.vehicle_plate || 'N/A'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'APPROVED')} variant="success"><ShieldCheck className="w-4 h-4 mr-2"/> Aprovar Cadastro</Button>
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'BLOCKED')} variant="danger"><ShieldOff className="w-4 h-4 mr-2"/> Bloquear Parceiro</Button>
                                    </div>
                                    {partnerDetails?.documents.map(doc => (
                                        <div key={doc.id} className="p-3 border dark:border-gray-700 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{doc.document_type}</p>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">Ver anexo</a>
                                                {doc.admin_notes && <p className="text-xs text-red-500 italic">Obs: {doc.admin_notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.status === 'APPROVED' ? 'bg-green-100 text-green-600' : doc.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{doc.status}</span>
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'APPROVED')} className="p-2 bg-green-100 hover:bg-green-200 rounded"><FileCheck className="w-4 h-4 text-green-600"/></button>
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')} className="p-2 bg-red-100 hover:bg-red-200 rounded"><FileX className="w-4 h-4 text-red-600"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};


// --- CITY MANAGEMENT MODULE ---
const CityManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cities' | 'requests'>('cities');
    const [cities, setCities] = useState<City[]>([]);
    const [requests, setRequests] = useState<CityRequest[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Add City Form
    const [newName, setNewName] = useState('');
    const [newState, setNewState] = useState('');

    // Edit City Modal
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [editName, setEditName] = useState('');
    const [editState, setEditState] = useState('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'cities') {
                const data = await cloud.adminGetCities();
                setCities(data);
            } else {
                const data = await cloud.adminGetCityRequests();
                setRequests(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCity = async () => {
        if (!newName || !newState) return alert("Preencha nome e estado.");
        try {
            await cloud.adminAddCity(newName, newState);
            setNewName('');
            setNewState('');
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleToggleStatus = async (city: City) => {
        const action = city.is_active ? "desativar" : "ativar";
        if (!confirm(`Tem certeza que deseja ${action} a cidade ${city.name}?`)) return;
        try {
            await cloud.adminUpdateCityStatus(city.id, !city.is_active);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const openEditModal = (city: City) => {
        setEditingCity(city);
        setEditName(city.name);
        setEditState(city.state);
    };

    const handleSaveChanges = async () => {
        if (!editingCity || !editName || !editState) return;
        try {
            await cloud.adminEditCity(editingCity.id, editName, editState);
            setEditingCity(null);
            loadData();
        } catch (e: any) {
            alert("Erro ao editar: " + e.message);
        }
    };

    const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await cloud.adminProcessCityRequest(id, status);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 w-fit">
                <button onClick={() => setActiveTab('cities')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'cities' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Cidades Ativas</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Solicitações</button>
            </div>

            {activeTab === 'cities' && (
                <div className="space-y-6">
                    {/* Add Form */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 items-center">
                        <input type="text" placeholder="Cidade" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" placeholder="UF" maxLength={2} value={newState} onChange={e => setNewState(e.target.value.toUpperCase())} className="w-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <Button onClick={handleAddCity} className="whitespace-nowrap px-4">
                            <Plus className="w-4 h-4 mr-2"/> Adicionar
                        </Button>
                    </div>

                    {/* List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cities.map(city => (
                                    <tr key={city.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <td className="px-4 py-3 font-bold dark:text-white">{city.name}</td>
                                        <td className="px-4 py-3">{city.state}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${city.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                                                {city.is_active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(city)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded">
                                                <Edit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleToggleStatus(city)} className={`${city.is_active ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'} p-2 rounded`}>
                                                {city.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {requests.length === 0 && <p className="text-gray-400 text-center">Nenhuma solicitação pendente.</p>}
                    {requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-lg dark:text-white">{req.city_name} - {req.state}</div>
                                <div className="text-xs text-gray-500">{req.user_email || 'Anônimo'} • {req.status}</div>
                            </div>
                            {req.status === 'PENDING' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleProcessRequest(req.id, 'APPROVED')} className="bg-green-100 text-green-600 p-2 rounded hover:bg-green-200"><CheckCircle className="w-5 h-5"/></button>
                                    <button onClick={() => handleProcessRequest(req.id, 'REJECTED')} className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200"><X className="w-5 h-5"/></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editingCity && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl p-6 space-y-4">
                        <h3 className="font-bold dark:text-white">Editar Cidade</h3>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} maxLength={2} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setEditingCity(null)} fullWidth>Cancelar</Button>
                            <Button onClick={handleSaveChanges} fullWidth>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- INSTITUTIONAL MANAGEMENT ---
const InstitutionalManagement: React.FC = () => {
    const [info, setInfo] = useState<CompanyInfo>({
        about_text: '',
        careers_email: '',
        careers_text: '',
        press_email: '',
        press_text: '',
        contact_address: '',
        contact_support_email: '',
        contact_commercial_email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Controls which modal is being edited
    const [editingSection, setEditingSection] = useState<'about' | 'careers' | 'press' | 'contact' | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = await cloud.getShopSettings();
            if (settings?.company_info) {
                setInfo(prev => ({ ...prev, ...settings.company_info }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdateShopSettings({ company_info: info });
            alert("Dados institucionais atualizados!");
            setEditingSection(null);
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    const sections = [
        { id: 'about', title: 'Sobre Nós', icon: Info, color: 'bg-blue-100 text-blue-600', description: 'História e missão da empresa' },
        { id: 'careers', title: 'Carreiras', icon: Briefcase, color: 'bg-green-100 text-green-600', description: 'Vagas e cultura' },
        { id: 'press', title: 'Imprensa', icon: Newspaper, color: 'bg-purple-100 text-purple-600', description: 'Mídia e releases' },
        { id: 'contact', title: 'Contato', icon: Mail, color: 'bg-orange-100 text-orange-600', description: 'Endereços e emails' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-500"/> Dados Institucionais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => setEditingSection(s.id as any)}
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4 group"
                    >
                        <div className={`p-3 rounded-xl ${s.color} group-hover:scale-110 transition-transform`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{s.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.description}</p>
                        </div>
                        <div className="ml-auto self-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-gray-400 group-hover:text-brand-500 transition-colors">
                            <Edit className="w-4 h-4" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Edit Modal */}
            {editingSection && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setEditingSection(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-xl dark:text-white flex items-center gap-2">
                                <Edit className="w-5 h-5 text-brand-500"/> 
                                Editar: {sections.find(s => s.id === editingSection)?.title}
                            </h3>
                            <button onClick={() => setEditingSection(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {editingSection === 'about' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Texto Institucional (Sobre Nós)</label>
                                    <textarea 
                                        value={info.about_text} 
                                        onChange={e => setInfo({...info, about_text: e.target.value})} 
                                        className="w-full p-4 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white h-64 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="Escreva sobre a história, missão e valores da empresa..."
                                    />
                                </div>
                            )}

                            {editingSection === 'careers' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Descrição da Área de Carreiras</label>
                                        <textarea 
                                            value={info.careers_text} 
                                            onChange={e => setInfo({...info, careers_text: e.target.value})} 
                                            className="w-full p-4 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white h-40 text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Texto convidativo para novos talentos..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Email para Envio de Currículo</label>
                                        <input 
                                            type="email" 
                                            value={info.careers_email} 
                                            onChange={e => setInfo({...info, careers_email: e.target.value})} 
                                            className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="vagas@exemplo.com"
                                        />
                                    </div>
                                </>
                            )}

                            {editingSection === 'press' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Texto para Imprensa/Mídia</label>
                                        <textarea 
                                            value={info.press_text} 
                                            onChange={e => setInfo({...info, press_text: e.target.value})} 
                                            className="w-full p-4 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white h-40 text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Informações para jornalistas e parceiros de mídia..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Email da Assessoria</label>
                                        <input 
                                            type="email" 
                                            value={info.press_email} 
                                            onChange={e => setInfo({...info, press_email: e.target.value})} 
                                            className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="imprensa@exemplo.com"
                                        />
                                    </div>
                                </>
                            )}

                            {editingSection === 'contact' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Endereço da Sede</label>
                                        <input 
                                            type="text" 
                                            value={info.contact_address} 
                                            onChange={e => setInfo({...info, contact_address: e.target.value})} 
                                            className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Rua, Número, Bairro, Cidade - UF"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Email de Suporte</label>
                                            <input 
                                                type="email" 
                                                value={info.contact_support_email} 
                                                onChange={e => setInfo({...info, contact_support_email: e.target.value})} 
                                                className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="suporte@..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Email Comercial</label>
                                            <input 
                                                type="email" 
                                                value={info.contact_commercial_email} 
                                                onChange={e => setInfo({...info, contact_commercial_email: e.target.value})} 
                                                className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="comercial@..."
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pt-6 mt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                            <Button variant="outline" onClick={() => setEditingSection(null)} fullWidth>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} fullWidth>
                                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-4 h-4 mr-2"/> Salvar</>}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PAYOUTS MANAGEMENT MODULE ---
const PayoutsManagement: React.FC = () => {
    const [settings, setSettings] = useState<PayoutSettings | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const s = await cloud.adminGetPayoutSettings();
            setSettings(s);
            const h = await cloud.adminGetPayoutHistory();
            setHistory(h || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await cloud.adminUpdatePayoutSettings(settings);
            alert("Configurações de repasse atualizadas!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto my-10 text-brand-500"/>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Configuration Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-500"/> Regras de Repasse
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Dia do Repasse Semanal</label>
                        <select 
                            value={settings?.weekday} 
                            onChange={e => setSettings(prev => prev ? {...prev, weekday: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        >
                            <option value="1">Segunda-feira</option>
                            <option value="2">Terça-feira</option>
                            <option value="3">Quarta-feira</option>
                            <option value="4">Quinta-feira</option>
                            <option value="5">Sexta-feira</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Horário (Ex: 10:00)</label>
                        <input 
                            type="time" 
                            value={settings?.hour} 
                            onChange={e => setSettings(prev => prev ? {...prev, hour: e.target.value} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Limite Saque Emergencial (%)</label>
                        <input 
                            type="number" 
                            value={settings?.emergency_percentage} 
                            onChange={e => setSettings(prev => prev ? {...prev, emergency_percentage: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cooldown (Horas entre saques)</label>
                        <input 
                            type="number" 
                            value={settings?.emergency_cooldown_hours} 
                            onChange={e => setSettings(prev => prev ? {...prev, emergency_cooldown_hours: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                    <input 
                        type="checkbox" 
                        checked={settings?.emergency_enabled} 
                        onChange={e => setSettings(prev => prev ? {...prev, emergency_enabled: e.target.checked} : null)}
                        className="w-5 h-5 rounded text-brand-600"
                    />
                    <span className="text-sm font-bold dark:text-white">Permitir Saque Emergencial</span>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} fullWidth>
                    {saving ? 'Salvando...' : 'Salvar Regras'}
                </Button>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-500"/> Histórico de Repasses
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3">Parceiro</th>
                                <th className="px-4 py-3">Valor</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(h => (
                                <tr key={h.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium dark:text-white">{h.partner_email}</td>
                                    <td className="px-4 py-3 font-bold text-green-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {h.is_emergency 
                                            ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">EMERGÊNCIA</span> 
                                            : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">SEMANAL</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">{h.status}</td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- PARTNER LEVELS MANAGEMENT ---
const PartnerLevelsManagement: React.FC = () => {
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadLevels();
    }, []);

    const loadLevels = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPartnerLevels();
            setLevels(data);
        } catch (e) {
            console.error(e);
            alert("Erro ao carregar níveis.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (levelName: string, field: keyof PartnerLevelBenefit, value: string) => {
        setLevels(prev =>
            prev.map(l => {
                if (l.level === levelName) {
                    // Check field type before parsing
                    if (field === 'display_name' || field === 'level') {
                        return { ...l, [field]: value };
                    } else {
                        return { ...l, [field]: parseFloat(value) || 0 };
                    }
                }
                return l;
            })
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(levels.map(level => cloud.adminUpdatePartnerLevel(level)));
            alert("Níveis de parceiro salvos com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Gerenciar Níveis de Parceiro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Defina os critérios e benefícios para cada nível. O sistema reclassificará os parceiros automaticamente com base nestas regras (diariamente).</p>
                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.level} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                            <h4 className="font-bold text-md text-brand-600 dark:text-brand-400 mb-3">{level.level}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                     <label className="text-xs font-bold text-gray-500">Nome de Exibição (Divertido)</label>
                                     <input type="text" value={level.display_name} onChange={e => handleUpdate(level.level, 'display_name', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div className="col-span-1 md:col-span-2"><p className="text-xs font-bold text-gray-400 uppercase">Critérios para atingir</p></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Mínimo de Entregas</label>
                                    <input type="number" value={level.min_deliveries} onChange={e => handleUpdate(level.level, 'min_deliveries', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Avaliação Média Mínima (0-5)</label>
                                    <input type="number" step="0.1" value={level.min_rating} onChange={e => handleUpdate(level.level, 'min_rating', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div className="col-span-1 md:col-span-2 mt-2"><p className="text-xs font-bold text-gray-400 uppercase">Benefícios</p></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Desconto Lojista (%)</label>
                                    <input type="number" step="0.1" value={level.store_discount_percent} onChange={e => handleUpdate(level.level, 'store_discount_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Redução Taxa de Serviço (%)</label>
                                    <input type="number" step="0.1" value={level.service_fee_reduction_percent} onChange={e => handleUpdate(level.level, 'service_fee_reduction_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full mt-6">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
};

// --- FEES MANAGEMENT ---
const FeesManagement: React.FC = () => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        cloud.adminGetFeeSettings().then(f => {
            setFees(f);
            setLoading(false);
        });
    }, []);

    const handleChange = (field: keyof PartnerFeeSettings, value: number) => {
        setFees(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdateFeeSettings(fees);
            alert("Taxas atualizadas!");
        } catch(e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto"/>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="font-bold dark:text-white">Taxas e Preços</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-500">Taxa Fixa da Loja</label>
                    <input type="number" value={fees?.global_tax_fixed} onChange={e => handleChange('global_tax_fixed', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Comissão (%)</label>
                    <input type="number" value={fees?.global_tax_percent} onChange={e => handleChange('global_tax_percent', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Valor Base Entrega</label>
                    <input type="number" value={fees?.base_delivery_value} onChange={e => handleChange('base_delivery_value', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Valor por KM Extra</label>
                    <input type="number" value={fees?.extra_km_value} onChange={e => handleChange('extra_km_value', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Taxa por Ponto Adicional</label>
                    <input type="number" value={fees?.additional_stop_fee} onChange={e => handleChange('additional_stop_fee', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Mensalidade Super Loja</label>
                    <input type="number" value={fees?.super_store_monthly_fee} onChange={e => handleChange('super_store_monthly_fee', parseFloat(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>
            </div>
            <Button onClick={handleSave} disabled={saving} fullWidth>{saving ? <Loader2 className="animate-spin"/> : "Salvar"}</Button>
        </div>
    );
};

// --- USER MANAGEMENT ---
const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await cloud.getAllUsers();
            setUsers(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = users.filter(u => 
        (u.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
        (u.email?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleToggleStatus = async (user: ManagedUser) => {
        const newStatus = user.status === 'active' ? 'banned' : 'active';
        if (!confirm(`Confirmar alteração de status para ${newStatus}?`)) return;
        try {
            await cloud.updateUserStatus(user.id, newStatus);
            loadUsers();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="Buscar usuários..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:text-white"
                />
                <Button onClick={loadUsers}><RefreshCw className="w-4 h-4"/></Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Usuário</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={4} className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></td></tr>}
                        {!loading && filtered.map(u => (
                            <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                                    <p className="font-bold dark:text-white">{u.name || 'Sem nome'}</p>
                                    <p className="text-xs text-gray-500">{u.email}</p>
                                </td>
                                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{u.role}</span></td>
                                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span></td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleToggleStatus(u)} className="text-red-500 hover:underline text-xs font-bold">
                                        {u.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- BLACKLIST MANAGEMENT ---
const BlacklistManagement: React.FC = () => {
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPhone, setNewPhone] = useState('');
    const [newReason, setNewReason] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetBlacklist();
            setBlacklist(data);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAdd = async () => {
        if (!newPhone || !newReason) return alert("Preencha telefone e motivo.");
        try {
            await cloud.adminAddToBlacklist('', newPhone, newReason);
            setNewPhone(''); setNewReason('');
            load();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Remover da lista negra?")) return;
        await cloud.adminRemoveFromBlacklist(id);
        load();
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><Ban className="w-5 h-5 text-red-500"/> Lista Negra</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Telefone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                    <input type="text" placeholder="Motivo" value={newReason} onChange={e => setNewReason(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                    <Button onClick={handleAdd}>Adicionar</Button>
                </div>
                <div className="space-y-2">
                    {blacklist.map(b => (
                        <div key={b.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded flex justify-between items-center">
                            <div>
                                <p className="font-bold text-red-700 dark:text-red-300">{b.phone_number || b.email}</p>
                                <p className="text-xs text-red-500">{b.reason}</p>
                            </div>
                            <button onClick={() => handleRemove(b.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SECURITY MONITOR ---
const SecurityMonitor: React.FC = () => {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
    const [activeTab, setActiveTab] = useState<'alerts' | 'verifications'>('alerts');

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        if (activeTab === 'alerts') {
            const a = await cloud.adminGetFraudAlerts();
            setAlerts(a);
        } else {
            const v = await cloud.adminGetVerifications();
            setVerifications(v);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'alerts' ? 'bg-white dark:bg-gray-700 shadow text-red-600' : 'text-gray-500'}`}>Alertas de Fraude</button>
                <button onClick={() => setActiveTab('verifications')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'verifications' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}>Verificações</button>
            </div>

            {activeTab === 'alerts' && (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                            <div className="flex justify-between">
                                <span className="font-bold text-red-600">{alert.type}</span>
                                <span className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm mt-1 dark:text-gray-300">{alert.description}</p>
                            <p className="text-xs text-gray-400 mt-2">Usuário: {alert.user_email}</p>
                        </div>
                    ))}
                    {alerts.length === 0 && <p className="text-gray-400">Nenhum alerta.</p>}
                </div>
            )}

            {activeTab === 'verifications' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {verifications.map(v => (
                        <div key={v.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <img src={v.photo_url} alt="Selfie" className="w-full h-48 object-cover rounded-lg mb-3 bg-gray-100"/>
                            <p className="font-bold text-sm dark:text-white">Confiança: {(v.confidence_score * 100).toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">Usuário: {v.user_email}</p>
                            <p className="text-xs text-gray-500">Data: {new Date(v.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                    {verifications.length === 0 && <p className="text-gray-400">Nenhuma verificação recente.</p>}
                </div>
            )}
        </div>
    );
};

// --- RATING MONITOR ---
const RatingMonitor: React.FC = () => {
    const [ratings, setRatings] = useState<PartnerRating[]>([]);
    
    useEffect(() => {
        cloud.adminGetAllRatings().then(setRatings);
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in">
            <h3 className="font-bold dark:text-white mb-4">Monitor de Avaliações</h3>
            <div className="space-y-3">
                {ratings.map(r => (
                    <div key={r.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between">
                            <span className="font-bold text-sm dark:text-white">{r.evaluator_name} &rarr; {r.evaluated_name}</span>
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-3 h-3 fill-current"/>
                                <span className="text-xs font-bold">{r.rating}</span>
                            </div>
                        </div>
                        {r.comment && <p className="text-sm text-gray-500 mt-1">"{r.comment}"</p>}
                    </div>
                ))}
                {ratings.length === 0 && <p className="text-gray-400">Nenhuma avaliação.</p>}
            </div>
        </div>
    );
};

// --- SUPPORT CLAIMS MANAGEMENT ---
const ClaimsManagement: React.FC = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [response, setResponse] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetClaims();
            setClaims(data);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const handleResolve = async () => {
        if (!selectedClaim || !response) return;
        try {
            await cloud.adminResolveClaim(selectedClaim.id, response);
            alert("Chamado respondido.");
            setSelectedClaim(null);
            setResponse('');
            load();
        } catch(e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Usuário</th>
                            <th className="px-4 py-3">Assunto</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={4} className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></td></tr>}
                        {claims.map(c => (
                            <tr key={c.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3">{c.user_email}</td>
                                <td className="px-4 py-3">{c.type}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span></td>
                                <td className="px-4 py-3"><button onClick={() => setSelectedClaim(c)} className="text-blue-500">Ver</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedClaim && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold dark:text-white">Responder Chamado</h3>
                            <button onClick={() => setSelectedClaim(null)}><X className="w-5 h-5"/></button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4 text-sm">
                            <p className="font-bold mb-1">Descrição do Usuário:</p>
                            <p>{selectedClaim.description}</p>
                        </div>
                        <textarea 
                            value={response} 
                            onChange={e => setResponse(e.target.value)} 
                            placeholder="Sua resposta..." 
                            className="w-full p-3 border rounded-xl dark:bg-gray-700 h-32 mb-4"
                        />
                        <Button fullWidth onClick={handleResolve}>Enviar Resposta e Fechar</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PLATFORM NEWS MANAGEMENT ---
const NewsManagement: React.FC = () => {
    const [news, setNews] = useState<PlatformNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<PlatformNews>>({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await cloud.adminGetPlatformNews();
        setNews(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentItem.title || !currentItem.description || !currentItem.icon_name) return alert("Preencha todos os campos.");
        await cloud.adminUpsertPlatformNews(currentItem);
        setIsEditing(false);
        setCurrentItem({});
        load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deletar notícia?")) return;
        await cloud.adminDeletePlatformNews(id);
        load();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold dark:text-white">Novidades da Plataforma</h3>
                <Button onClick={() => setIsEditing(true)}><Plus className="w-4 h-4"/> Nova</Button>
            </div>

            {isEditing && (
                <div className="p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 space-y-3">
                    <input type="text" placeholder="Título" value={currentItem.title || ''} onChange={e => setCurrentItem({...currentItem, title: e.target.value})} className="w-full p-2 rounded border"/>
                    <textarea placeholder="Descrição" value={currentItem.description || ''} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full p-2 rounded border"/>
                    <input type="text" placeholder="Ícone (Lucide Name)" value={currentItem.icon_name || ''} onChange={e => setCurrentItem({...currentItem, icon_name: e.target.value})} className="w-full p-2 rounded border"/>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={currentItem.is_active ?? true} onChange={e => setCurrentItem({...currentItem, is_active: e.target.checked})} />
                        <span className="text-sm">Ativo</span>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSave}>Salvar</Button>
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {news.map(item => (
                    <div key={item.id} className="p-4 border rounded-xl flex justify-between items-center bg-white dark:bg-gray-800">
                        <div>
                            <p className="font-bold dark:text-white">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setCurrentItem(item); setIsEditing(true); }} className="p-2 text-blue-500"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- SUPPORT CHAT THREADS ---
const SupportThreads: React.FC = () => {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedUserName, setSelectedUserName] = useState('');

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        const data = await cloud.adminGetSupportThreads();
        setThreads(data);
        setLoading(false);
    };

    return (
        <div className="h-[600px] flex gap-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 font-bold dark:text-white">Conversas</div>
                <div className="flex-1 overflow-y-auto">
                    {loading && <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></div>}
                    {threads.map(t => (
                        <div 
                            key={t.userId} 
                            onClick={() => { setSelectedUser(t.userId); setSelectedUserName(t.userName); }}
                            className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedUser === t.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                            <p className="font-bold text-sm dark:text-white truncate">{t.userName}</p>
                            <p className="text-xs text-gray-500 truncate">{t.lastMessage}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(t.lastDate).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 relative">
                {selectedUser ? (
                    <div className="absolute inset-0">
                        <ChatWindow 
                            type="SUPPORT" 
                            adminTargetUserId={selectedUser} 
                            onClose={() => setSelectedUser(null)} 
                            title={`Suporte: ${selectedUserName}`} 
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">Selecione uma conversa</div>
                )}
            </div>
        </div>
    );
};

// --- AI CONFIG ---
const AIConfig: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const settings = await cloud.getShopSettings();
                if (settings?.google_gemini_api_key) {
                    setApiKey(settings.google_gemini_api_key);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdateShopSettings({ google_gemini_api_key: apiKey });
            alert("Configurações de IA salvas!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in space-y-4">
            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500"/> Inteligência Artificial</h3>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Google Gemini API Key</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={apiKey} 
                        onChange={e => setApiKey(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                        placeholder="sk-..."
                    />
                    <Key className="absolute right-3 top-2.5 w-4 h-4 text-gray-400"/>
                </div>
                <p className="text-xs text-gray-400 mt-1">Chave necessária para o funcionamento do Chat Assistente.</p>
            </div>

            <Button onClick={handleSave} disabled={saving} fullWidth>
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Chave'}
            </Button>
        </div>
    );
};

// --- PWA SETTINGS ---
const PWASettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<PWASettings>({
        display_name: 'Zé Entregas',
        short_name: 'Zé',
        theme_color: '#ed2b05',
        background_color: '#f9fafb',
        start_url: '/',
        orientation: 'portrait',
        language: 'pt-BR',
        app_version: 1
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await cloud.adminGetPWASettings();
                if (data) setSettings(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdatePWASettings(settings);
            alert("Configurações do PWA atualizadas! Usuários receberão a atualização em breve.");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in space-y-4">
            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-green-500"/> Configuração do App (PWA)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nome do App</label>
                    <input 
                        type="text" 
                        value={settings.display_name} 
                        onChange={e => setSettings({...settings, display_name: e.target.value})} 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nome Curto (Ícone)</label>
                    <input 
                        type="text" 
                        value={settings.short_name} 
                        onChange={e => setSettings({...settings, short_name: e.target.value})} 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cor do Tema (Hex)</label>
                    <div className="flex gap-2">
                        <input 
                            type="color" 
                            value={settings.theme_color} 
                            onChange={e => setSettings({...settings, theme_color: e.target.value})} 
                            className="h-10 w-10 p-0 border-0 rounded"
                        />
                        <input 
                            type="text" 
                            value={settings.theme_color} 
                            onChange={e => setSettings({...settings, theme_color: e.target.value})} 
                            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cor de Fundo (Hex)</label>
                    <div className="flex gap-2">
                        <input 
                            type="color" 
                            value={settings.background_color} 
                            onChange={e => setSettings({...settings, background_color: e.target.value})} 
                            className="h-10 w-10 p-0 border-0 rounded"
                        />
                        <input 
                            type="text" 
                            value={settings.background_color} 
                            onChange={e => setSettings({...settings, background_color: e.target.value})} 
                            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                        />
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving} fullWidth>
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Publicar Alterações'}
            </Button>
        </div>
    );
};

// --- MAIN ADMIN PANEL ---
export const AdminPanel: React.FC<{ activeSubTab: AdminSubTab }> = ({ activeSubTab }) => {
  const [activeTab, setActiveTab] = useState(activeSubTab);
  
  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  return (
    <div className="space-y-4 pb-16">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'validation' && <PartnerVerification />}
      {activeTab === 'notifications' && <div className="text-center text-gray-500">Gestão de Notificações (Em Breve)</div>}
      {activeTab === 'shop' && <ShopManagement />}
      {activeTab === 'support' && <SupportThreads />}
      {activeTab === 'claims' && <ClaimsManagement />}
      {activeTab === 'ai_config' && <AIConfig />}
      {activeTab === 'fees' && <FeesManagement />}
      {activeTab === 'pwa' && <PWASettingsPanel />}
      {activeTab === 'payouts' && <PayoutsManagement />}
      {activeTab === 'cities' && <CityManagement />}
      {activeTab === 'asaas_webhook' && <AsaasWebhookManagement />}
      {activeTab === 'levels' && <PartnerLevelsManagement />}
      {activeTab === 'ratings' && <RatingMonitor />}
      {activeTab === 'security' && <SecurityMonitor />}
      {activeTab === 'blacklist' && <BlacklistManagement />}
      {activeTab === 'referrals' && <AdminReferrals />}
      {activeTab === 'institutional' && <InstitutionalManagement />}
      {activeTab === 'platform_news' && <NewsManagement />}
      {activeTab === 'store_finance' && <div className="text-center text-gray-500">Financeiro Lojista (Use Controle de Saldo)</div>}
      {activeTab === 'wallet_control' && <AdminWalletControl />}
    </div>
  );
};
