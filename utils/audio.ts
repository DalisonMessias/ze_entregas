/**
 * Sintetiza sons de notificação agradáveis usando a Web Audio API nativa do navegador.
 * Elimina requisições de arquivos de som externos, prevenindo erros 403 Forbidden / 404 Not Found,
 * reduzindo tráfego de rede e permitindo funcionamento 100% offline.
 */
export const playNotificationSound = (type: 'default' | 'success' | 'alert' = 'default') => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();

        if (type === 'alert') {
            // Ding-Dong eletrônico chamativo para novos pedidos (Notas G5 e C6)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(783.99, ctx.currentTime); // Nota G5
            gain1.gain.setValueAtTime(0.12, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.35);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15); // Nota C6
            gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.55);
        } else if (type === 'success') {
            // Tom de sucesso suave (Notas C5 para E5)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else {
            // Ding de notificação padrão (Nota A5)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {
        console.warn('[Sound] Falha ao reproduzir áudio sintetizado no navegador:', e);
    }
};
