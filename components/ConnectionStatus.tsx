import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import * as cloud from '../services/cloud';

type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'syncing';

export const ConnectionStatus: React.FC = () => {
    const [status, setStatus] = useState<ConnectionState>(navigator.onLine ? 'online' : 'offline');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => {
            // When browser says online, try to sync
            setStatus('syncing');
            syncData();
        };

        const handleOffline = () => {
            setStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Reconnection Interval (Yellow Bar Logic)
    useEffect(() => {
        let interval: any;
        if (status === 'offline' || status === 'reconnecting') {
            interval = setInterval(async () => {
                setStatus('reconnecting');
                // Try lightweight fetch to check real connectivity
                try {
                    const client = cloud.getClient();
                    // Simple ping
                    if (client) {
                        const { error } = await client.from('pwa_settings').select('id').limit(1);
                        if (!error) {
                            // Success!
                            setStatus('syncing');
                            syncData();
                            return;
                        }
                    }
                    throw new Error("Ping failed");
                } catch (e) {
                    // Still offline
                    setTimeout(() => setStatus('offline'), 2000); // Show yellow briefly then back to red
                }
            }, 30000); // 30 seconds
        }
        return () => clearInterval(interval);
    }, [status]);

    const syncData = async () => {
        try {
            const success = await cloud.syncOfflineData();
            if (success) {
                // Keep green bar for a moment
                setTimeout(() => setStatus('online'), 3000);
            } else {
                // Sync failed (maybe partial), but technically online?
                // Let's assume online but keep trying sync later
                setTimeout(() => setStatus('online'), 3000);
            }
        } catch (e) {
            // console.error("Sync error", e);
            setStatus('offline');
        }
    };

    if (status === 'online') return null;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] p-2 flex items-center justify-center gap-2 text-xs font-bold text-white shadow-md transition-colors duration-500 ${status === 'offline' ? 'bg-red-600' :
                status === 'reconnecting' ? 'bg-yellow-500 text-yellow-900' :
                    'bg-green-600'
            }`}>
            {status === 'offline' && (
                <>
                    <WifiOff className="w-4 h-4" />
                    Sem conexão — tentando reconectar…
                </>
            )}
            {status === 'reconnecting' && (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tentando reconectar…
                </>
            )}
            {status === 'syncing' && (
                <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Conectado — sincronizando dados…
                </>
            )}
        </div>
    );
};