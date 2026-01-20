
import { useEffect, useState } from 'react';
import { getClient, initSupabase } from '../../services/cloud';
import { PWASettings } from '../../types';

export function usePwaSettings() {
    const [settings, setSettings] = useState<PWASettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Garantir que temos o cliente
    const supabase = getClient() || initSupabase();

    useEffect(() => {
        if (!supabase) return;
        fetchSettings();

        // Inscrever para atualizações em tempo real
        const subscription = supabase
            .channel('pwa_settings_changes')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'pwa_settings' },
                (payload) => {
                    // console.log('PWA Settings updated in DB:', payload);
                    setSettings(payload.new as PWASettings);
                    applyPwaUpdates(payload.new as PWASettings);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchSettings = async () => {
        if (!supabase) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pwa_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setSettings(data);
                applyPwaUpdates(data);
            }
        } catch (error) {
            // console.error('Error fetching PWA settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyPwaUpdates = (config: PWASettings) => {
        if (!config) return;

        // Atualizar Theme Color
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta && config.theme_color) {
            themeColorMeta.setAttribute('content', config.theme_color);
        } else if (!themeColorMeta && config.theme_color) {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = config.theme_color;
            document.head.appendChild(meta);
        }

        // Atualizar Background Color (body)
        if (config.background_color) {
            document.body.style.backgroundColor = config.background_color;
        }

        // Atualizar Title
        if (config.display_name) {
            document.title = config.display_name;
        }

        // Atualizar Meta Description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && config.description) {
            metaDesc.setAttribute('content', config.description);
        }

        // Atualizar Favicon (pega o primeiro ícone disponível ou o de 192x192)
        const iconUrl = config.icons?.[0]?.src;
        if (iconUrl) {
            const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
            if (favicon) {
                favicon.setAttribute('href', iconUrl);
            } else {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.href = iconUrl;
                document.head.appendChild(link);
            }
        }

        // Atualizar Manifest dinamicamente via Blob
        updateManifest(config);
    };

    const updateManifest = (config: PWASettings) => {
        // A atualização do manifesto agora é feita via backend na rota /pwa/manifest.json
        // Este hook continua responsável por Meta Tags e Título em tempo real
        console.log('Manifest dynamic updates handled by Backend Route /pwa/manifest.json');
    };

    return { settings, loading };
}
