
import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock, ShieldCheck, User, RefreshCw, Server, Wifi, ArrowLeft } from 'lucide-react';
import * as cloud from '../services/cloud';
import { PartnerProfile, PartnerLevelBenefit } from '../types';
import { Button } from './Button';

interface StatusPageProps {
    onBack: () => void;
}

export const StatusPage: React.FC<StatusPageProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [userRole, setUserRole] = useState<string>('');
    const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('online');
    const [lastSync, setLastSync] = useState<string>('');
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const [p, role, l] = await Promise.all([
                cloud.getMyPartnerProfile(),
                cloud.getUserRole(),
                cloud.adminGetPartnerLevels()
            ]);
            setProfile(p);
            setUserRole(role);
            setLevels(l || []);
            setLastSync(new Date().toLocaleTimeString());
            
            // Simulação de check de sistema
            const client = cloud.getClient();
            if (client) setSystemStatus('online');
            else setSystemStatus('offline');

        } catch (e) {
            console.error(e);
            setSystemStatus('offline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
            case 'APPROVED': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
            case 'pending': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
            case 'PENDING_REVIEW': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
            case 'banned': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
            case 'REJECTED': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
            default: return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
        }
    };

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case 'active': 
            case 'APPROVED': return <CheckCircle className="w-6 h-6" />;
            case 'pending': 
            case 'PENDING_REVIEW': return <Clock className="w-6 h-6" />;
            case 'banned': 
            case 'REJECTED': return <XCircle className="w-6 h-6" />;
            default: return <AlertTriangle className="w-6 h-6" />;
        }
    };

    const translateStatus = (status: string | undefined) => {
        if (!status) return 'Desconhecido';
        const map: Record<string, string> = {
            'active': 'Ativa',
            'banned': 'Suspensa',
            'pending': 'Pendente',
            'APPROVED': 'Aprovada',
            'PENDING_REVIEW': 'Em Análise',
            'REJECTED': 'Rejeitada',
            'NOT_SUBMITTED': 'Não Enviada'
        };
        return map[status] || status;
    };

    const getRoleLabel = (role: string) => {
        const map: Record<string, string> = {
            'delivery_partner': 'Entregador Parceiro',
            'delivery_person': 'Entregador',
            'store_partner': 'Lojista',
            'admin': 'Administrador'
        };
        return map[role] || role;
    };

    const getLevelDisplayName = (levelKey: string | undefined) => {
        if (!levelKey) return 'Iniciante';
        const level = levels.find(l => l.level === levelKey);
        return level ? level.display_name : levelKey;
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-6 h-6 text-brand-600" /> Status da Conta
                </h1>
            </div>

            {/* System Health Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-500"/> Sistema
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${systemStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <Wifi className="w-3 h-3"/> {systemStatus === 'online' ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>Última sincronização:</span>
                    <span className="font-mono">{lastSync || '--:--:--'}</span>
                </div>
                <Button onClick={loadStatus} variant="outline" fullWidth className="mt-4" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </div>

            {/* Account Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-3 ${getStatusColor(profile?.is_active ? 'active' : 'banned')}`}>
                        {getStatusIcon(profile?.is_active ? 'active' : 'banned')}
                    </div>
                    <h3 className="font-bold text-lg dark:text-white">Situação Cadastral</h3>
                    <p className={`text-lg font-black mt-1 ${profile?.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        {profile?.is_active ? 'REGULAR' : 'BLOQUEADA'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Permissão de acesso à plataforma</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-3 ${getStatusColor(profile?.verification_status)}`}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg dark:text-white">Documentação</h3>
                    <p className="text-lg font-black mt-1 dark:text-white">
                        {translateStatus(profile?.verification_status)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Validação de documentos</p>
                </div>
            </div>

            {/* Role Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                        <User className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">TIPO DE CONTA</p>
                        <p className="font-bold text-gray-900 dark:text-white uppercase">{getRoleLabel(userRole)}</p>
                    </div>
                </div>
                {userRole === 'delivery_partner' && (
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">NÍVEL</p>
                        <p className="font-black text-brand-600 text-lg uppercase">{getLevelDisplayName(profile?.partner_level)}</p>
                    </div>
                )}
            </div>

            {profile?.verification_status === 'REJECTED' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-700 dark:text-red-300 text-sm">Ação Necessária</h4>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Sua documentação foi rejeitada. Acesse o perfil para reenviar os documentos pendentes.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
