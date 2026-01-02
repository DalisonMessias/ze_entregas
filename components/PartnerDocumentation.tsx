import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock, Upload, X, FileText, Camera, Bike, Car, ShieldCheck, ShieldOff, FileCheck, FileX, RefreshCw, Zap } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { PartnerProfile, PartnerDocument, DocumentType, VehicleType } from '../types';

interface PartnerDocumentationProps {
    profile: PartnerProfile | null;
    onProfileUpdate: (profile: PartnerProfile) => void;

    // Admin-specific props
    viewMode?: 'owner' | 'admin';
    userIdForAdmin?: string;
    initialDocumentsForAdmin?: PartnerDocument[];
    onAdminAction?: (action: 'approve_profile' | 'reject_profile' | 'block_profile', userId: string) => void;
    onAdminDocAction?: (action: 'approve_doc' | 'reject_doc', docId: string) => void;
    onRefreshAdmin?: () => void;
}

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-24 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 border ${type === 'success' ? 'bg-white border-green-100 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-red-100 dark:bg-gray-800 dark:border-red-900'}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {type === 'success' ? 'Sucesso' : 'Erro'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
    );
};

const requiredDocs: Record<VehicleType, { type: DocumentType, name: string }[]> = {
    'moto': [
        { type: 'CNH', name: 'CNH (Carteira de Habilitação)' },
        { type: 'CRLV', name: 'CRLV (Documento do Veículo)' },
        { type: 'VEHICLE_PHOTO', name: 'Foto do Veículo' },
        { type: 'ADDRESS_PROOF', name: 'Comprovante de Endereço' },
        { type: 'SELFIE', name: 'Selfie de Verificação' },
    ],
    'car': [
        { type: 'CNH', name: 'CNH (Carteira de Habilitação)' },
        { type: 'CRLV', name: 'CRLV (Documento do Veículo)' },
        { type: 'VEHICLE_PHOTO', name: 'Foto do Veículo' },
        { type: 'ADDRESS_PROOF', name: 'Comprovante de Endereço' },
        { type: 'SELFIE', name: 'Selfie de Verificação' },
    ],
    'bike': [
        { type: 'PERSONAL_ID', name: 'Documento Pessoal (RG ou CNH)' },
        { type: 'ADDRESS_PROOF', name: 'Comprovante de Endereço' },
        { type: 'SELFIE', name: 'Selfie de Verificação' },
    ],
    'other': [ // Fallback, same as bike
        { type: 'PERSONAL_ID', name: 'Documento Pessoal (RG ou CNH)' },
        { type: 'ADDRESS_PROOF', name: 'Comprovante de Endereço' },
        { type: 'SELFIE', name: 'Selfie de Verificação' },
    ],
};

const getStatusChip = (status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MISSING') => {
    switch (status) {
        case 'APPROVED': return <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle className="w-3 h-3" /> Aprovado</span>;
        case 'PENDING': return <span className="flex items-center gap-1 text-xs font-bold text-yellow-600"><Clock className="w-3 h-3" /> Em Análise</span>;
        case 'REJECTED': return <span className="flex items-center gap-1 text-xs font-bold text-red-500"><X className="w-3 h-3" /> Rejeitado</span>;
        case 'MISSING': return <span className="flex items-center gap-1 text-xs font-bold text-gray-500"><Upload className="w-3 h-3" /> Pendente</span>;
    }
}

export const PartnerDocumentation: React.FC<PartnerDocumentationProps> = ({
    profile,
    onProfileUpdate,
    viewMode = 'owner',
    userIdForAdmin,
    initialDocumentsForAdmin = [],
    onAdminAction,
    onAdminDocAction,
    onRefreshAdmin
}) => {
    const [documents, setDocuments] = useState<PartnerDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [docError, setDocError] = useState<string | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState(0);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [vehicleDetails, setVehicleDetails] = useState({
        vehicle_type: profile?.vehicle_type || 'moto',
        vehicle_plate: profile?.vehicle_plate || '',
        vehicle_model: profile?.vehicle_model || '',
        vehicle_year: profile?.vehicle_year || '',
    });
    const [uploading, setUploading] = useState<DocumentType | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Partial<Record<DocumentType, number>>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUploadTypeRef = useRef<DocumentType | null>(null);
    const [savingDetails, setSavingDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (viewMode === 'admin') {
            setDocuments(initialDocumentsForAdmin);
            setLoadingDocs(false);
            return;
        }

        let isMounted = true;
        const loadDocs = async () => {
            setLoadingDocs(true);
            setDocError(null);
            try {
                const docs = await cloud.getPartnerDocuments();
                if (isMounted) {
                    setDocuments(docs);
                }
            } catch (e) {
                console.error(e);
                if (isMounted) {
                    setDocError('Falha ao carregar documentos. Verifique sua conexão.');
                }
            } finally {
                if (isMounted) {
                    setLoadingDocs(false);
                }
            }
        };

        loadDocs();

        return () => { isMounted = false; };

    }, [viewMode, initialDocumentsForAdmin, fetchTrigger]);


    useEffect(() => {
        if (profile) {
            setVehicleDetails({
                vehicle_type: profile.vehicle_type || 'moto',
                vehicle_plate: profile.vehicle_plate || '',
                vehicle_model: profile.vehicle_model || '',
                vehicle_year: profile.vehicle_year || '',
            });
        }
    }, [profile]);

    const handleVehicleTypeChange = async (type: VehicleType) => {
        setVehicleDetails(prev => ({ ...prev, vehicle_type: type }));
        try {
            await cloud.updateMyPartnerProfile({ vehicle_type: type });
            if (profile) onProfileUpdate({ ...profile, vehicle_type: type });
            setToast({ type: 'success', message: "Tipo de veículo atualizado!" });
        } catch (e) {
            setToast({ type: 'error', message: "Erro ao atualizar tipo de veículo." });
        }
    };

    const handleSaveVehicleDetails = async () => {
        setSavingDetails(true);
        try {
            await cloud.updateMyPartnerProfile({
                vehicle_plate: vehicleDetails.vehicle_plate,
                vehicle_model: vehicleDetails.vehicle_model,
            });
            if (profile) {
                onProfileUpdate({
                    ...profile,
                    vehicle_plate: vehicleDetails.vehicle_plate,
                    vehicle_model: vehicleDetails.vehicle_model,
                });
            }
            setToast({ type: 'success', message: "Detalhes do veículo salvos!" });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro ao salvar: " + e.message });
        } finally {
            setSavingDetails(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const typeToUpload = currentUploadTypeRef.current;
        if (!typeToUpload) return;

        const file = e.target.files[0];
        setUploading(typeToUpload);
        setUploadProgress(prev => ({ ...prev, [typeToUpload]: 0 }));

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                const current = prev[typeToUpload] || 0;
                if (current >= 99) {
                    clearInterval(progressInterval);
                    return { ...prev, [typeToUpload]: 99 };
                }
                const increment = Math.random() * 10 + 5;
                return { ...prev, [typeToUpload]: Math.min(99, Math.round(current + increment)) };
            });
        }, 250);

        try {
            await cloud.uploadPartnerDocument(file, typeToUpload);

            clearInterval(progressInterval);
            setUploadProgress(prev => ({ ...prev, [typeToUpload]: 100 }));
            setToast({ type: 'success', message: "Documento enviado com sucesso!" });

            // Wait a bit on 100% to give user feedback
            setTimeout(() => {
                if (viewMode === 'owner') {
                    setFetchTrigger(t => t + 1);
                } else if (onRefreshAdmin) {
                    onRefreshAdmin();
                }
                setUploading(null);
            }, 800);

        } catch (err: any) {
            clearInterval(progressInterval);
            setToast({ type: 'error', message: "Erro no upload: " + err.message });
            setUploading(null);
            setUploadProgress(prev => ({ ...prev, [typeToUpload]: undefined }));
        } finally {
            currentUploadTypeRef.current = null;
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const triggerUpload = (type: DocumentType) => {
        currentUploadTypeRef.current = type;
        fileInputRef.current?.click();
    };

    const handleSubmitForReview = async () => {
        setSubmitting(true);
        try {
            await cloud.requestPartnerReview();
            if (profile) {
                onProfileUpdate({ ...profile, verification_status: 'PENDING_REVIEW' });
            }
            setToast({ type: 'success', message: "Documentação enviada para análise!" });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro ao enviar: " + e.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (viewMode === 'admin') {
        if (!profile || !userIdForAdmin) return <div className="text-center text-red-500 p-4">Erro: Dados do parceiro não fornecidos.</div>;

        const requiredDocsForVehicle = requiredDocs[profile.vehicle_type];

        return (
            <div className="space-y-4 animate-in fade-in">
                {onRefreshAdmin && <button onClick={onRefreshAdmin} className="text-xs font-bold text-blue-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar Dados</button>}

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2 mb-6 border border-gray-200 dark:border-gray-700">
                    <p><strong>Veículo:</strong> <span className="font-mono uppercase">{profile.vehicle_type}</span></p>
                    {(profile.vehicle_type === 'moto' || profile.vehicle_type === 'car') && (
                        <>
                            <p><strong>Placa:</strong> <span className="font-mono uppercase">{profile.vehicle_plate || 'N/A'}</span></p>
                            <p><strong>Modelo:</strong> <span className="font-mono">{profile.vehicle_model || 'N/A'}</span></p>
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    {requiredDocsForVehicle.map(reqDoc => {
                        const doc = documents.find(d => d.document_type === reqDoc.type);
                        const status = doc ? doc.status : 'MISSING';
                        return (
                            <div key={reqDoc.type} className={`p-4 rounded-xl border transition-colors ${doc?.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-gray-800 dark:text-white">{reqDoc.name}</p>
                                        <div className="mt-1">{getStatusChip(status as any)}</div>
                                        {doc?.admin_notes && <p className="text-xs text-red-500 mt-1 italic">Obs: {doc.admin_notes}</p>}
                                    </div>
                                </div>
                                {doc && (
                                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 underline">Ver Anexo</a>
                                        <div className="flex-1"></div>
                                        <Button onClick={() => onAdminDocAction?.('reject_doc', doc.id)} variant="danger" size="sm" className="px-3 py-1 text-xs"><FileX className="w-3 h-3 mr-1" />Rejeitar</Button>
                                        <Button onClick={() => onAdminDocAction?.('approve_doc', doc.id)} variant="success" size="sm" className="px-3 py-1 text-xs"><FileCheck className="w-3 h-3 mr-1" />Aprovar</Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Ação Final do Perfil</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={() => onAdminAction?.('reject_profile', userIdForAdmin)} variant="outline" className="flex-1 border-red-500 text-red-500 hover:bg-red-50">
                            <ShieldOff className="w-4 h-4 mr-2" /> Rejeitar Cadastro
                        </Button>
                        <Button onClick={() => onAdminAction?.('approve_profile', userIdForAdmin)} variant="success" className="flex-1">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Aprovar Cadastro
                        </Button>
                    </div>
                    <Button onClick={() => onAdminAction?.('block_profile', userIdForAdmin)} variant="danger" className="w-full mt-3">Bloquear Parceiro permanentemente</Button>
                </div>
            </div>
        );
    }

    // Owner View
    const isMotorized = vehicleDetails.vehicle_type === 'moto' || vehicleDetails.vehicle_type === 'car';
    const requiredDocsForVehicle = requiredDocs[vehicleDetails.vehicle_type];

    const firstMissingDocIndex = requiredDocsForVehicle.findIndex(
        reqDoc => !documents.some(d => d.document_type === reqDoc.type && d.status !== 'REJECTED')
    );

    const allDocsUploaded = firstMissingDocIndex === -1;

    return (
        <div className="space-y-6 animate-in fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h1 className="text-xl font-black text-gray-900 dark:text-white">Modo Parceiro</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete seu cadastro para começar a receber entregas.</p>
            </div>

            {profile?.verification_status === 'REJECTED' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-700 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-700 dark:text-red-300">Cadastro Rejeitado</h4>
                        <p className="text-xs text-red-600 dark:text-red-400">Um ou mais documentos foram rejeitados. Verifique abaixo, corrija e envie para análise novamente.</p>
                    </div>
                </div>
            )}
            {profile?.verification_status === 'PENDING_REVIEW' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-700 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-700 dark:text-yellow-300">Em Análise</h4>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Nossa equipe está analisando seus documentos. Você será notificado em breve.</p>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">1. Seu Veículo</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => handleVehicleTypeChange('moto')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${vehicleDetails.vehicle_type === 'moto' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Zap className="w-8 h-8" />
                        <span className="text-xs font-bold">Moto</span>
                    </button>

                    <button
                        onClick={() => handleVehicleTypeChange('bike')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${vehicleDetails.vehicle_type === 'bike' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Bike className="w-8 h-8" />
                        <span className="text-xs font-bold">Bike</span>
                    </button>

                    <button
                        onClick={() => handleVehicleTypeChange('car')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${vehicleDetails.vehicle_type === 'car' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Car className="w-8 h-8" />
                        <span className="text-xs font-bold">Carro</span>
                    </button>
                </div>
                {isMotorized && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
                        <CustomInput type="text" placeholder="Placa (ABC-1234)" value={vehicleDetails.vehicle_plate} onChange={e => setVehicleDetails({ ...vehicleDetails, vehicle_plate: e.target.value })} className="uppercase" />
                        <CustomInput type="text" placeholder="Modelo (Ex: Honda Biz)" value={vehicleDetails.vehicle_model} onChange={e => setVehicleDetails({ ...vehicleDetails, vehicle_model: e.target.value })} />
                        <Button onClick={handleSaveVehicleDetails} disabled={savingDetails} fullWidth className="mt-2">
                            {savingDetails ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Detalhes do Veículo'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">2. Documentos</h3>
                {docError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-center">
                        <p className="text-sm font-bold text-red-600 dark:text-red-300">{docError}</p>
                        <Button onClick={() => setFetchTrigger(t => t + 1)} variant="ghost" size="sm" className="mt-2 text-blue-500">
                            Tentar Novamente
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requiredDocsForVehicle.map((reqDoc, index) => {
                            const doc = documents.find(d => d.document_type === reqDoc.type);
                            const status = doc ? doc.status : 'MISSING';
                            const progress = uploadProgress[reqDoc.type];
                            const isUploadingThis = uploading === reqDoc.type;

                            const isNextToBeUploaded = firstMissingDocIndex !== -1 && index === firstMissingDocIndex;
                            const isEnabled = !uploading && (!!doc || isNextToBeUploaded);

                            return (
                                <div key={reqDoc.type} className={`p-4 rounded-xl border transition-colors ${doc?.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'}`}>
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-gray-800 dark:text-white">{reqDoc.name}</p>
                                            <div className="mt-1">{getStatusChip(status as any)}</div>
                                            {doc?.admin_notes && <p className="text-xs text-red-500 mt-1 italic">Motivo: {doc.admin_notes}</p>}
                                        </div>
                                        <Button
                                            onClick={() => triggerUpload(reqDoc.type)}
                                            disabled={!isEnabled}
                                            className="px-3 py-2 text-xs w-[100px] relative overflow-hidden flex items-center justify-center transition-all"
                                        >
                                            {isUploadingThis && typeof progress === 'number' ? (
                                                <>
                                                    <div className="absolute top-0 left-0 h-full bg-brand-200 dark:bg-brand-700/50 transition-all duration-150" style={{ width: `${progress}%` }}></div>
                                                    <span className="relative z-10 text-brand-800 dark:text-brand-200 font-mono">{`${progress}%`}</span>
                                                </>
                                            ) : doc ? (
                                                'Reenviar'
                                            ) : (
                                                'Enviar'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">3. Finalizar</h3>
                <Button
                    onClick={handleSubmitForReview}
                    disabled={!allDocsUploaded || submitting || profile?.verification_status === 'PENDING_REVIEW' || uploading !== null}
                    fullWidth
                    className="py-4"
                >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar para Análise'}
                </Button>
                {!allDocsUploaded && <p className="text-xs text-red-500 mt-2 text-center">Envie todos os documentos necessários para habilitar.</p>}
            </div>
        </div>
    );
};