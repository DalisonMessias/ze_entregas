import React, { useState, useEffect } from 'react';
import { X, QrCode, Search, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';

interface QrLog {
    id: string;
    created_at: string;
    qr_content: string;
    status: 'SUCCESS' | 'ERROR' | 'INVALID';
    metadata: any;
    merchant_id: string;
}

interface QrCodeLogsModalProps {
    onClose: () => void;
}

export const QrCodeLogsModal: React.FC<QrCodeLogsModalProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<QrLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadLogs = async () => {
        setLoading(true);
        try {
            const client = cloud.getClient();
            if (!client) throw new Error('Falha ao conectar com servidor');

            const { data, error } = await client
                .from('qrcode_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'ERROR': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            case 'INVALID': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Logs de QR Code</h2>
                            <p className="text-sm text-gray-500">Últimas 50 leituras</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>Nenhum log encontrado.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map(log => (
                                <div key={log.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${getStatusColor(log.status)}`}>
                                            {log.status === 'SUCCESS' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                            {log.status}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="font-mono text-sm dark:text-gray-300 break-all mb-2 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                        {log.qr_content}
                                    </p>
                                    {log.metadata && (
                                        <div className="text-xs text-gray-400 font-mono mt-2">
                                            {JSON.stringify(log.metadata)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    <Button onClick={loadLogs} variant="outline" fullWidth>
                        <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                    </Button>
                </div>
            </div>
        </div>
    );
};
