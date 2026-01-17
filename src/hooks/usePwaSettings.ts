
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
                .single();

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

        // Atualizar Manifest dinamicamente via Blob
        updateManifest(config);
    };

    const updateManifest = (config: PWASettings) => {
        try {
            const icons = Array.isArray(config.icons) ? config.icons : [];
            const shortcuts = Array.isArray(config.shortcuts) ? config.shortcuts : [];
            const screenshots = Array.isArray(config.screenshots) ? config.screenshots : [];
            const categories = Array.isArray(config.categories) ? config.categories : [];
            const related_applications = Array.isArray(config.related_applications) ? config.related_applications : [];

            const manifestObject = {
                name: config.display_name || 'Zé Entregas',
                short_name: config.short_name || config.display_name || 'Zé Entregas',
                description: config.description || '',
                start_url: config.start_url || '/',
                display: config.display || 'standalone',
                orientation: config.orientation || 'portrait',
                theme_color: config.theme_color || '#ed2b05',
                background_color: config.background_color || '#f9fafb',
                lang: config.language || 'pt-BR',
                scope: config.scope || '/',
                icons: icons.length > 0 ? icons : [
                    {
                        "src": "https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/192-192.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/512-512.png",
                        "sizes": "512x512",
                        "type": "image/png"
                    }
                ],
                shortcuts: shortcuts,
                screenshots: screenshots,
                categories: categories,
                iarc_rating_id: config.iarc_rating_id,
                related_applications: related_applications,
                prefer_related_applications: config.prefer_related_applications
            };

            const stringManifest = JSON.stringify(manifestObject);
            const blob = new Blob([stringManifest], { type: 'application/json' });
            const manifestURL = URL.createObjectURL(blob);

            const oldLink = document.querySelector('link[rel="manifest"]');
            if (oldLink) {
                oldLink.setAttribute('href', manifestURL);
            } else {
                const link = document.createElement('link');
                link.rel = 'manifest';
                link.href = manifestURL;
                document.head.appendChild(link);
            }
            // console.log('Manifest updated dynamically');
        } catch (e) {
            // console.error('Failed to update manifest:', e);
        }
    };

    return { settings, loading };
}
