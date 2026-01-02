import React, { useState, useEffect } from 'react';
import { Loader2, Info, Save, Mail, MapPin, Briefcase, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { ShopSettings, CompanyInfo } from '../types';

export const AdminInstitutional: React.FC = () => {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const settings = await cloud.getShopSettings();
                setCompanyInfo(settings?.company_info || {});
            } catch (e) {
                console.error("Error loading institutional settings:", e);
                setFeedback({ type: 'error', text: 'Erro ao carregar informações institucionais.' });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof CompanyInfo, value: string) => {
        setCompanyInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await cloud.adminUpdateShopSettings({ company_info: companyInfo });
            setFeedback({ type: 'success', text: 'Informações institucionais salvas com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar informações: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Info className="w-6 h-6 text-brand-600" /> Institucional da Empresa
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Gerencie as informações "Sobre Nós", "Carreiras", "Imprensa" e "Contato" exibidas no aplicativo.</p>

                <div className="space-y-4">
                    {/* About Us */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Sobre Nós</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto "Sobre Nós"</label>
                        <textarea 
                            value={companyInfo.about_text || ''} 
                            onChange={e => handleChange('about_text', e.target.value)} 
                            rows={5} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y" 
                            placeholder="Descreva a missão e visão da empresa..."
                        />
                    </div>

                    {/* Careers */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 mt-8 flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-500"/> Carreiras</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email para Vagas</label>
                        <input type="email" value={companyInfo.careers_email || ''} onChange={e => handleChange('careers_email', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="vagas@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto "Carreiras"</label>
                        <textarea 
                            value={companyInfo.careers_text || ''} 
                            onChange={e => handleChange('careers_text', e.target.value)} 
                            rows={3} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y" 
                            placeholder="Mensagem para candidatos..."
                        />
                    </div>

                    {/* Press */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 mt-8 flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-500"/> Imprensa</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email para Imprensa</label>
                        <input type="email" value={companyInfo.press_email || ''} onChange={e => handleChange('press_email', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="imprensa@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto "Imprensa"</label>
                        <textarea 
                            value={companyInfo.press_text || ''} 
                            onChange={e => handleChange('press_text', e.target.value)} 
                            rows={3} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y" 
                            placeholder="Mensagem para jornalistas..."
                        />
                    </div>

                    {/* Contact */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 mt-8 flex items-center gap-2"><Mail className="w-5 h-5 text-green-500"/> Contato</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço Físico</label>
                        <input type="text" value={companyInfo.contact_address || ''} onChange={e => handleChange('contact_address', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="Av. Principal, 123" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Suporte</label>
                        <input type="email" value={companyInfo.contact_support_email || ''} onChange={e => handleChange('contact_support_email', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="suporte@empresa.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Comercial</label>
                        <input type="email" value={companyInfo.contact_commercial_email || ''} onChange={e => handleChange('contact_commercial_email', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" placeholder="comercial@empresa.com" />
                    </div>
                </div>
                
                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveSettings} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Save className="w-5 h-5 mr-2"/> Salvar Tudo</>}
                </Button>
            </div>
        </div>
    );
};