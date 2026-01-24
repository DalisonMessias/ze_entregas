import express from 'express';
import path from 'path';
import { supabaseAdmin } from '../services/supabaseClient.js';

const router = express.Router();

router.get('/manifest.json', async (req, res) => {
    try {
        const { data: config, error } = await supabaseAdmin
            .from('pwa_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        const icons = Array.isArray(config.icons) ? config.icons : [];
        const shortcuts = Array.isArray(config.shortcuts) ? config.shortcuts : [];
        const screenshots = Array.isArray(config.screenshots) ? config.screenshots : [];
        const categories = Array.isArray(config.categories) ? config.categories : [];

        const manifest = {
            id: '/', // Identificador único do app (essencial para Chrome)
            name: config.display_name || 'Zé Entregas',
            short_name: config.short_name || config.display_name || 'Zé Entregas',
            description: config.description || 'Logística e entregas inteligentes',
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
            prefer_related_applications: config.prefer_related_applications || false
        };

        // console.log('Serving dynamic manifest for:', manifest.name);
        res.json(manifest);
    } catch (error) {
        console.error('Error generating dynamic manifest:', error);

        // Objeto de fallback definitivo para garantir que o PWA nunca fique sem manifest
        const fallbackManifest = {
            name: "Zé Entregas",
            short_name: "Zé Entregas",
            description: "Logística e entregas inteligentes",
            start_url: "/",
            display: "standalone",
            orientation: "portrait",
            theme_color: "#ed2b05",
            background_color: "#f9fafb",
            icons: [
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
            ]
        };

        res.header('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(fallbackManifest, null, 2));
    }
});

export default router;
