

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShieldAlert, FileCheck, FileX, Eye, X, RefreshCw, AlertTriangle, CheckCircle, Clock, User, MapPin } from 'lucide-react';
import * as cloud from '../services/cloud';
import { FraudAlert, IdentityVerification } from '../types';
import { Button } from './Button';
import { Switch } from './Switch'; 
import { useDialog } from '../utils/dialogService'; // Import useDialog

const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('pt-BR');

const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
        case 'LOW': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'HIGH': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-500';
    }
};

const getStatusChipColor = (status: string) => {
    switch (status) {
        case 'OPEN': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'VERIFIED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'RESOLVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-500';
    }
};

export const SecurityManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'fraud' | 'identity'>('fraud');
    const [loading, setLoading] = useState(true);

    // Fraud Alerts State
    const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
    const [selectedFraudAlert, setSelectedFraudAlert] = useState<FraudAlert | null>(null);
    const [processingFraud, setProcessingFraud] = useState(false);

    // Identity Verifications State
    const [identityVerifications, setIdentityVerifications] = useState<IdentityVerification[]>([]);
    const [selectedVerification, setSelectedVerification] = useState<IdentityVerification | null>(null);
    const [processingVerification, setProcessingVerification] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    const { alert } = useDialog(); // Use the custom dialog service

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'fraud') {
                const alerts = await cloud.adminGetFraudAlerts();
                setFraudAlerts(alerts);
            } else {
                const verifications = await cloud.adminGetIdentityVerifications();
                setIdentityVerifications(verifications);
            }
        } catch (e) {
            console.error("Error loading security data:", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateFraudStatus = async (alertId: string, status: 'OPEN' | 'RESOLVED') => {
        setProcessingFraud(true);
        try {
            await cloud.adminUpdateFraudAlert(alertId, status);
            await loadData();
            setSelectedFraudAlert(null);
        } catch (e) {
            console.error(e);
            await alert({ title: "Erro", message: "Erro ao atualizar status do alerta de fraude." });
        } finally {
            setProcessingFraud(false);
        }
    };

    const handleUpdateIdentityStatus = async (verificationId: string, status: 'VERIFIED' | 'REJECTED') => {
        setProcessingVerification(true);
        try {
            await cloud.adminUpdateIdentityVerification(verificationId, status, adminNotes);
            await loadData();
            setSelectedVerification(null);
            setAdminNotes('');
        } catch (e) {
            console.error(e);
            await alert({ title: "Erro", message: "Erro ao atualizar status da verificação de identidade." });
        } finally {
            setProcessingVerification(false);
        }
    };

    const FraudAlertDetailsModal: React.FC<{ alert: FraudAlert, onClose: () => void }> = ({ alert, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Detalhes do Alerta</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <p><strong>ID Usuário:</strong> {alert.user_id}</p>
                    <p><strong>Tipo:</strong> {alert.type}</p>
                    <p><strong>Descrição:</strong> {alert.description || 'N/A'}</p>
                    <p><strong>Severidade:</strong> <span className={`px-2 py-1 rounded-full text-xs font-bold ${getAlertSeverityColor(alert.severity)}`}>{alert.severity}</span></p>
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(alert.status)}`}>{alert.status}</span></p>
                    <p><strong>Criado em:</strong> {formatDateTime(alert.created_at)}</p>
                </div>
                <div className="flex gap-3 mt-4">
                    {alert.status === 'OPEN' ? (
                        <Button fullWidth onClick={() => handleUpdateFraudStatus(alert.id, 'RESOLVED')} disabled={processingFraud}>
                            {processingFraud ? <Loader2 className="animate-spin"/> : 'Marcar como Resolvido'}
                        </Button>
                    ) : (
                        <Button fullWidth variant="outline" onClick={onClose}>Fechar</Button>
                    )}
                </div>
            </div>
        </div>
    );

    const IdentityVerificationDetailsModal: React.FC<{ verification: IdentityVerification, onClose: () => void }> = ({ verification, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-blue-500" /> Detalhes da Verificação</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <p><strong>ID Usuário:</strong> {verification.user_id}</p>
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(verification.status)}`}>{verification.status}</span></p>
                    <p><strong>Criado em:</strong> {formatDateTime(verification.created_at)}</p>
                    
                    {verification.photo_url && (
                        <div>
                            <p><strong>Foto:</strong></p>
                            <img src={verification.photo_url} alt="Selfie de Verificação" className="max-w-full h-auto rounded-lg mt-2" />
                        </div>
                    )}
                    {verification.location_data && (
                        <div>
                            <p><strong>Localização:</strong></p>
                            <p className="text-sm">Lat: {verification.location_data.lat}, Lng: {verification.location_data.lng} (Acurácia: {verification.location_data.accuracy}m)</p>
                            <a href={`https://www.google.com/maps?q=${verification.location_data.lat},${verification.location_data.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4"/> Ver no Mapa
                            </a>
                        </div>
                    )}
                    
                    {verification.status === 'REJECTED' && verification.admin_notes && (
                        <div>
                            <p><strong>Notas do Admin:</strong></p>
                            <p className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{verification.admin_notes}</p>
                        </div>
                    )}

                    {(verification.status === 'PENDING' || verification.status === 'REJECTED') && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Notas (para rejeição)</label>
                                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 h-20" placeholder="Motivo da rejeição, etc."/>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <Button fullWidth variant="danger" onClick={() => handleUpdateIdentityStatus(verification.id, 'REJECTED')} disabled={processingVerification}>
                                    {processingVerification ? <Loader2 className="animate-spin"/> : 'Rejeitar'}
                                </Button>
                                <Button fullWidth variant="success" onClick={() => handleUpdateIdentityStatus(verification.id, 'VERIFIED')} disabled={processingVerification}>
                                    {processingVerification ? <Loader2 className="animate-spin"/> : 'Aprovar'}
                                </Button>
                            </div>
                        </>
                    )}
                    <Button fullWidth variant="outline" onClick={onClose} className="mt-4">Fechar</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('fraud')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'fraud' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Alertas de Fraude</button>
                <button onClick={() => setActiveTab('identity')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'identity' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Verificações de Identidade</button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
            ) : (
                <>
                    {activeTab === 'fraud' && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-lg dark:text-white">Alertas Recentes</h3>
                                <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">ID Usuário</th>
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3">Severidade</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fraudAlerts.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum alerta de fraude.</td></tr>}
                                        {fraudAlerts.map(alert => (
                                            <tr key={alert.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 font-mono text-xs dark:text-white">{alert.user_id.substring(0, 8)}...</td>
                                                <td className="px-4 py-3">{alert.type}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getAlertSeverityColor(alert.severity)}`}>{alert.severity}</span></td>
                                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(alert.status)}`}>{alert.status}</span></td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedFraudAlert(alert)} className="px-3 py-1.5 text-xs">
                                                        <Eye className="w-4 h-4 mr-1"/> Ver
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'identity' && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-lg dark:text-white">Verificações Recentes</h3>
                                <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">ID Usuário</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {identityVerifications.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma verificação de identidade.</td></tr>}
                                        {identityVerifications.map(verification => (
                                            <tr key={verification.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 font-mono text-xs dark:text-white">{verification.user_id.substring(0, 8)}...</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(verification.status)}`}>{verification.status}</span></td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(verification.created_at)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedVerification(verification)} className="px-3 py-1.5 text-xs">
                                                        <Eye className="w-4 h-4 mr-1"/> Ver
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedFraudAlert && <FraudAlertDetailsModal alert={selectedFraudAlert} onClose={() => setSelectedFraudAlert(null)} />}
            {selectedVerification && <IdentityVerificationDetailsModal verification={selectedVerification} onClose={() => setSelectedVerification(null)} />}
        </div>
    );
};