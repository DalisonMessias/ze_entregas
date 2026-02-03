import React, { useState, useEffect, useRef } from 'react';
import {
    Loader2, AlertTriangle, CheckCircle, Clock, Upload, X,
    FileText, Camera, Bike, Car, ShieldCheck, ShieldOff,
    FileCheck, FileX, RefreshCw, Zap, DollarSign, Headphones,
    Star, ChevronRight, UserCheck, Smartphone, Info
} from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { PartnerProfile, PartnerDocument, DocumentType, VehicleType } from '../types';
import { useDialog } from '../utils/dialogService';

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

const requiredDocs: Record<VehicleType, { type: DocumentType, name: string, description: string }[]> = {
    'moto': [
        { type: 'CNH', name: 'CNH', description: 'Carteira de Habilitação' },
        { type: 'CRLV', name: 'CRLV', description: 'Documento do Veículo' },
        { type: 'VEHICLE_PHOTO', name: 'Foto da Moto', description: 'Foto nítida de lado' },
        { type: 'ADDRESS_PROOF', name: 'Endereço', description: 'Comprovante de residência' },
        { type: 'SELFIE', name: 'Selfie', description: 'Sua foto segurando o documento' },
    ],
    'car': [
        { type: 'CNH', name: 'CNH', description: 'Carteira de Habilitação' },
        { type: 'CRLV', name: 'CRLV', description: 'Documento do Veículo' },
        { type: 'VEHICLE_PHOTO', name: 'Foto do Carro', description: 'Foto nítida de frente' },
        { type: 'ADDRESS_PROOF', name: 'Endereço', description: 'Comprovante de residência' },
        { type: 'SELFIE', name: 'Selfie', description: 'Sua foto segurando o documento' },
    ],
    'bike': [
        { type: 'PERSONAL_ID', name: 'Documento Pessoal', description: 'RG ou CNH' },
        { type: 'ADDRESS_PROOF', name: 'Endereço', description: 'Comprovante de residência' },
        { type: 'SELFIE', name: 'Selfie', description: 'Sua foto segurando o documento' },
    ],
    'other': [
        { type: 'PERSONAL_ID', name: 'Documento Pessoal', description: 'RG ou CNH' },
        { type: 'ADDRESS_PROOF', name: 'Endereço', description: 'Comprovante de residência' },
        { type: 'SELFIE', name: 'Selfie', description: 'Sua foto segurando o documento' },
    ],
};

const getStatusChip = (status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MISSING') => {
    switch (status) {
        case 'APPROVED': return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Aprovado</div>;
        case 'PENDING': return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-[10px] font-black uppercase tracking-wider"><Clock className="w-3 h-3" /> Em Análise</div>;
        case 'REJECTED': return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider"><X className="w-3 h-3" /> Rejeitado</div>;
        case 'MISSING': return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-black uppercase tracking-wider"><Upload className="w-3 h-3" /> Pendente</div>;
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
    const { alert } = useDialog();

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
                if (isMounted) setDocuments(docs);
            } catch (e) {
                if (isMounted) setDocError('Falha ao carregar documentos.');
            } finally {
                if (isMounted) setLoadingDocs(false);
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
        if (vehicleDetails.vehicle_type === type) return;
        setVehicleDetails(prev => ({ ...prev, vehicle_type: type }));
        try {
            await cloud.updateMyPartnerProfile({ vehicle_type: type });
            if (profile) onProfileUpdate({ ...profile, vehicle_type: type });
        } catch (e) {
            await alert({ title: 'Erro', message: "Erro ao atualizar tipo de veículo." });
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
            await alert({ title: 'Sucesso', message: "Informações salvas!" });
        } catch (e: any) {
            await alert({ title: 'Erro', message: "Erro ao salvar: " + e.message });
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
                const increment = Math.random() * 15 + 5;
                return { ...prev, [typeToUpload]: Math.min(99, Math.round(current + increment)) };
            });
        }, 200);

        try {
            await cloud.uploadPartnerDocument(file, typeToUpload);
            clearInterval(progressInterval);
            setUploadProgress(prev => ({ ...prev, [typeToUpload]: 100 }));

            setTimeout(() => {
                if (viewMode === 'owner') setFetchTrigger(t => t + 1);
                else if (onRefreshAdmin) onRefreshAdmin();
                setUploading(null);
            }, 500);
        } catch (err: any) {
            clearInterval(progressInterval);
            await alert({ title: 'Erro', message: "Erro no upload: " + err.message });
            setUploading(null);
        } finally {
            currentUploadTypeRef.current = null;
            if (e.target) e.target.value = '';
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
            if (profile) onProfileUpdate({ ...profile, verification_status: 'PENDING_REVIEW' });
            await alert({ title: 'Tudo Pronto!', message: "Sua documentação foi enviada. Analisaremos em até 24h úteis." });
        } catch (e: any) {
            await alert({ title: 'Erro', message: "Erro ao enviar: " + e.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (viewMode === 'admin') {
        if (!profile || !userIdForAdmin) return <div className="text-center text-red-500 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">Erro: Perfil não encontrado.</div>;
        const requiredDocsForVehicle = requiredDocs[profile.vehicle_type] || requiredDocs['moto'];

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-black text-gray-900 dark:text-white">Análise de Documentos</h3>
                    {onRefreshAdmin && <button onClick={onRefreshAdmin} className="text-xs font-black text-brand-600 flex items-center gap-1 uppercase tracking-tighter"><RefreshCw className="w-3.5 h-3.5" /> Atualizar</button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-[32px] border border-gray-100 dark:border-gray-800">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Veículo</p>
                        <p className="font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
                            {profile.vehicle_type === 'moto' && <Zap className="w-4 h-4 text-brand-500" />}
                            {profile.vehicle_type === 'car' && <Car className="w-4 h-4 text-brand-500" />}
                            {profile.vehicle_type === 'bike' && <Bike className="w-4 h-4 text-brand-500" />}
                            {profile.vehicle_type}
                        </p>
                    </div>
                    {profile.vehicle_plate && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Placa</p>
                            <p className="font-black text-gray-900 dark:text-white uppercase font-mono">{profile.vehicle_plate}</p>
                        </div>
                    )}
                    {profile.vehicle_model && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Modelo</p>
                            <p className="font-black text-gray-900 dark:text-white">{profile.vehicle_model}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {requiredDocsForVehicle.map(reqDoc => {
                        const doc = documents.find(d => d.document_type === reqDoc.type);
                        const status = doc ? doc.status : 'MISSING';
                        return (
                            <div key={reqDoc.type} className={`p-5 rounded-3xl border transition-all ${doc?.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-gray-900 dark:text-white">{reqDoc.name}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{reqDoc.description}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2">{getStatusChip(status as any)}</div>
                                        {doc?.admin_notes && <div className="mt-3 p-2 bg-red-100/50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 italic">Ressalva: {doc.admin_notes}</div>}
                                    </div>

                                    {doc && (
                                        <div className="flex flex-col gap-2">
                                            <Button onClick={() => window.open(doc.file_url, '_blank')} variant="ghost" size="sm" className="text-brand-600 font-black text-[10px]">VER ANEXO</Button>
                                            <div className="flex gap-2">
                                                <Button onClick={() => onAdminDocAction?.('reject_doc', doc.id)} variant="danger" size="sm" className="h-8 w-8 !p-0 rounded-lg shadow-lg shadow-red-500/10"><FileX className="w-4 h-4" /></Button>
                                                <Button onClick={() => onAdminDocAction?.('approve_doc', doc.id)} variant="success" size="sm" className="h-8 w-8 !p-0 rounded-lg shadow-lg shadow-green-500/10"><FileCheck className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 mt-8 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-5">
                        <ShieldCheck className="w-48 h-48" />
                    </div>

                    <h3 className="font-black text-xl text-gray-900 dark:text-white mb-6">Decisão Final</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button onClick={() => onAdminAction?.('reject_profile', userIdForAdmin)} variant="outline" className="h-14 font-black text-red-500 border-red-200 hover:bg-red-50 uppercase tracking-widest text-xs">
                            Rejeitar Cadastro
                        </Button>
                        <Button onClick={() => onAdminAction?.('approve_profile', userIdForAdmin)} variant="success" className="h-14 font-black shadow-lg shadow-green-500/20 uppercase tracking-widest text-xs">
                            Aprovar Parceiro
                        </Button>
                    </div>
                    <Button onClick={() => onAdminAction?.('block_profile', userIdForAdmin)} variant="ghost" className="w-full mt-6 text-xs text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest">Bloquear permanentemente</Button>
                </div>
            </div>
        );
    }

    // OWNER VIEW
    const requiredDocsForVehicle = requiredDocs[vehicleDetails.vehicle_type] || requiredDocs['moto'];
    const firstMissingDocIndex = requiredDocsForVehicle.findIndex(
        reqDoc => !documents.some(d => d.document_type === reqDoc.type && d.status !== 'REJECTED')
    );
    const allDocsUploaded = firstMissingDocIndex === -1;
    const isPending = profile?.verification_status === 'PENDING_REVIEW';
    const isRejected = profile?.verification_status === 'REJECTED';
    const isNew = profile?.verification_status === 'NOT_SUBMITTED';

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />

            {/* HERO SECTION / LANDING PAGE */}
            {(isNew || isRejected) && (
                <div className="relative overflow-hidden bg-[#EA1D2C] rounded-[48px] p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
                        <ShieldCheck className="w-64 h-64 rotate-12" />
                    </div>

                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20">
                            <Star className="w-3 h-3 fill-current" /> Programa de Seleção
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight tracking-tighter">
                            Seja um <span className="text-white">Parceiro VIP</span> <br />
                            do Zé Entregas.
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl font-medium mb-10 leading-relaxed">
                            Aumente seus ganhos, ganhe prioridade e tenha acesso a ferramentas exclusivas após verificação.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            {[
                                { icon: <Zap className="w-5 h-5" />, title: "Entrega Prioritária", desc: "Pedidos tocam primeiro para você." },
                                { icon: <DollarSign className="w-5 h-5" />, title: "Taxas Reduzidas", desc: "Pagamos mais por corrida realizada." },
                                { icon: <Headphones className="w-5 h-5" />, title: "Suporte 24h", desc: "Atendimento humano exclusivo." },
                                { icon: <ShieldCheck className="w-5 h-5" />, title: "Perfil Verificado", desc: "Selo de confiança para lojas." }
                            ].map((b, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10">
                                    <div className="shrink-0 w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                        {b.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm">{b.title}</h4>
                                        <p className="text-[10px] text-white/60 font-medium leading-tight">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STATUS ALERT */}
            {isRejected && (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-[32px] border-2 border-red-100 dark:border-red-800 flex items-start gap-4">
                    <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-500/20">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-red-700 dark:text-red-300">Atenção ao Cadastro</h4>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 leading-relaxed">Alguns documentos foram recusados por nossa equipe. Por favor, revise as observações em vermelho e envie novamente.</p>
                    </div>
                </div>
            )}

            {isPending && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[48px] border border-gray-100 dark:border-gray-700 text-center shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Clock className="w-32 h-32" />
                    </div>
                    <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-600 dark:text-yellow-400 shadow-inner">
                        <Clock className="w-10 h-10 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Quase lá!</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                        Estamos analisando cuidadosamente seus documentos. Este processo costuma levar menos de 24 horas. Fique de olho nas notificações!
                    </p>
                    <div className="mt-8">
                        <Button onClick={() => window.location.reload()} variant="ghost" className="font-black text-brand-600 uppercase tracking-widest text-[10px]"><RefreshCw className="w-3.5 h-3.5 mr-2" /> Atualizar Status</Button>
                    </div>
                </div>
            )}

            {!isPending && (
                <>
                    {/* STEP 1: VEHICLE */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg flex items-center justify-center font-black">1</div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white">Escolha seu Veículo</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {[
                                { id: 'moto', icon: <Zap className="w-8 h-8" />, label: 'Moto' },
                                { id: 'bike', icon: <Bike className="w-8 h-8" />, label: 'Bike' },
                                { id: 'car', icon: <Car className="w-8 h-8" />, label: 'Carro' }
                            ].map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => handleVehicleTypeChange(v.id as VehicleType)}
                                    className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all transform active:scale-95 ${vehicleDetails.vehicle_type === v.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10 text-brand-600 shadow-lg shadow-brand-500/10' : 'border-gray-100 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className={`p-4 rounded-2xl ${vehicleDetails.vehicle_type === v.id ? 'bg-brand-100 dark:bg-brand-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                        {v.icon}
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest leading-none">{v.label}</span>
                                </button>
                            ))}
                        </div>

                        {(vehicleDetails.vehicle_type === 'moto' || vehicleDetails.vehicle_type === 'car') && (
                            <div className="mt-8 space-y-4 pt-8 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Placa do Veículo</label>
                                        <CustomInput
                                            type="text"
                                            placeholder="Ex: ABC-1234"
                                            value={vehicleDetails.vehicle_plate}
                                            onChange={e => setVehicleDetails({ ...vehicleDetails, vehicle_plate: e.target.value })}
                                            className="uppercase !rounded-2xl !bg-gray-50 dark:!bg-gray-900 font-mono text-lg"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Marca/Modelo</label>
                                        <CustomInput
                                            type="text"
                                            placeholder="Ex: Honda Titan 160"
                                            value={vehicleDetails.vehicle_model}
                                            onChange={e => setVehicleDetails({ ...vehicleDetails, vehicle_model: e.target.value })}
                                            className="!rounded-2xl !bg-gray-50 dark:!bg-gray-900"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSaveVehicleDetails} disabled={savingDetails} fullWidth className="h-14 !rounded-2xl font-black shadow-lg shadow-brand-500/10 active:scale-[0.98]">
                                    {savingDetails ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Dados do Veículo'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* STEP 2: DOCUMENTS */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg flex items-center justify-center font-black">2</div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white">Envio de Documentos</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">Envie fotos nítidas dos seus documentos originais. Evite reflexos.</p>

                        {docError ? (
                            <div className="text-center py-10 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
                                <p className="text-sm font-black text-red-600 dark:text-red-400">{docError}</p>
                                <Button onClick={() => setFetchTrigger(t => t + 1)} variant="ghost" size="sm" className="mt-2 text-brand-600 font-black uppercase text-[10px]"><RefreshCw className="w-3 h-3 mr-1" /> Tentar Novamente</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {requiredDocsForVehicle.map((reqDoc, index) => {
                                    const doc = documents.find(d => d.document_type === reqDoc.type);
                                    const status = doc ? doc.status : 'MISSING';
                                    const progress = uploadProgress[reqDoc.type];
                                    const isUploadingThis = uploading === reqDoc.type;
                                    const isNext = firstMissingDocIndex !== -1 && index === firstMissingDocIndex;
                                    const isEnabled = !uploading && (!!doc || isNext);
                                    const isDone = doc && doc.status === 'APPROVED';

                                    return (
                                        <div key={reqDoc.type} className={`relative p-5 rounded-3xl border-2 transition-all ${isNext ? 'border-brand-200 dark:border-brand-900 bg-brand-50/30' : 'border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-700/30'} ${doc?.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900' : ''}`}>
                                            <div className="flex justify-between items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-black text-sm text-gray-900 dark:text-white truncate">{reqDoc.name}</p>
                                                        {isDone && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none mb-3">{reqDoc.description}</p>
                                                    <div className="flex items-center">{getStatusChip(status as any)}</div>
                                                </div>

                                                <div className="shrink-0">
                                                    <Button
                                                        onClick={() => triggerUpload(reqDoc.type)}
                                                        disabled={!isEnabled}
                                                        className={`h-11 px-6 rounded-2xl relative overflow-hidden transition-all text-[10px] font-black uppercase tracking-widest ${doc ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'}`}
                                                    >
                                                        {isUploadingThis && typeof progress === 'number' ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="font-mono">{`${progress}%`}</span>
                                                            </div>
                                                        ) : doc ? 'RE-ENVIAR' : 'ENVIAR'}
                                                    </Button>
                                                </div>
                                            </div>
                                            {doc?.admin_notes && <div className="mt-3 p-3 bg-red-100/50 dark:bg-red-900/20 rounded-xl text-[10px] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 leading-relaxed font-bold">Ressalva: {doc.admin_notes}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* FINAL STEP */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <UserCheck className="w-32 h-32" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">Concluir Solicitação</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">Após enviar, seu cadastro entrará em modo de análise prioritária pela nossa equipe.</p>

                            <Button
                                onClick={handleSubmitForReview}
                                disabled={!allDocsUploaded || submitting || isPending || uploading !== null}
                                fullWidth
                                className="h-16 rounded-3xl font-black text-lg shadow-xl shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ShieldCheck className="w-6 h-6 mr-2" /> ENVIAR PARA ANÁLISE</>}
                            </Button>

                            {!allDocsUploaded && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-wider animate-pulse">
                                    <Info className="w-3 h-3" /> faltam documentos obrigatórios
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
