
import * as cloud from './cloud';
import * as storage from './storage';
import { UserRole, PartnerRequest, NotificationPreferences, ChatMessageData, BlitzAlert } from '../types';

let subscription: any = null;
let chatSubscription: any = null;
let blitzSubscription: any = null;

const playNotificationSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {
        console.error(e);
    }
};

const sendLocalNotification = (title: string, body: string, soundEnabled: boolean) => {
    if (Notification.permission === 'granted') {
        // Envia notificação nativa (aparece mesmo com app minimizado no desktop/mobile se suportado)
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: '/icon-192x192.png', // Fallback icon path
                vibrate: [200, 100, 200],
                tag: 'ze-entregas-update'
            } as any);
        });
    }
    
    // Som
    if (soundEnabled) {
        playNotificationSound();
    }
};

export const initNotificationService = async (userId: string, role: UserRole) => {
    if (!userId) return;

    // 1. Carregar preferências do usuário
    const prefs = await cloud.getNotificationPreferences();
    storage.saveNotificationPreferences(prefs); // Cache local

    // 2. Solicitar permissão se não tiver
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    // 3. Obter dados do perfil para filtro de cidade
    const profile = await cloud.getMyPartnerProfile(); // Ou perfil genérico
    const userCity = profile?.city || localStorage.getItem('user_city') || '';

    // 4. Iniciar listener do Realtime Supabase
    const client = cloud.getClient();
    if (!client) return;

    // Se já existe, remove para evitar duplicatas
    if (subscription) {
        client.removeChannel(subscription);
    }

    // Listener para Pedidos
    subscription = client
        .channel('public:partner_requests')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'partner_requests',
            },
            (payload) => {
                handleRequestUpdate(payload.new as PartnerRequest, payload.old as PartnerRequest, userId, role, prefs);
            }
        )
        .subscribe();

    // Listener para Chat
    if (chatSubscription) {
        client.removeChannel(chatSubscription);
    }

    chatSubscription = client
        .channel('public:chat_messages')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `receiver_id=eq.${userId}` // Only listen to messages sent TO me
            },
            (payload) => {
                const msg = payload.new as ChatMessageData;
                // Don't notify if user is sender (obvious)
                if (msg.sender_id !== userId) {
                    sendLocalNotification('Nova Mensagem', msg.message, prefs.sound_enabled);
                }
            }
        )
        .subscribe();

    // Listener para Alerta Relâmpago (Blitz Alerts)
    if (blitzSubscription) {
        client.removeChannel(blitzSubscription);
    }

    blitzSubscription = client
        .channel('public:blitz_alerts')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'blitz_alerts'
            },
            (payload) => {
                const alert = payload.new as BlitzAlert;
                
                // Regra 1: Não notificar o próprio usuário que criou o alerta
                if (alert.user_id === userId) return;

                // Regra 2: Notificar apenas se estiver na mesma cidade (case insensitive e parcial)
                // Se a cidade do usuário não estiver definida, não recebe (ou recebe tudo? Vamos assumir que precisa de cidade)
                if (userCity && alert.city && 
                   (alert.city.toLowerCase().includes(userCity.toLowerCase()) || userCity.toLowerCase().includes(alert.city.toLowerCase()))) {
                    
                    const title = `🚨 Alerta Relâmpago: ${alert.type}`;
                    const body = `${alert.address} - ${alert.city}. Cuidado!`;
                    
                    if (prefs.system_alerts) {
                        sendLocalNotification(title, body, prefs.sound_enabled);
                    }
                }
            }
        )
        .subscribe();
        
    console.log("Notification Service Initialized for", role, "City:", userCity);
};

const handleRequestUpdate = (
    newReq: PartnerRequest, 
    oldReq: PartnerRequest, 
    userId: string, 
    role: UserRole, 
    prefs: NotificationPreferences
) => {
    // Ignorar se status não mudou
    if (newReq.status === oldReq.status) return;

    // Lógica Inteligente de Roteamento de Notificação
    
    // LOJA
    if (role === 'store_partner' && newReq.store_id === userId) {
        if (!prefs.order_updates) return;

        if (newReq.status === 'ACCEPTED') {
            sendLocalNotification('Pedido Aceito!', 'Um entregador aceitou sua corrida e está a caminho.', prefs.sound_enabled);
        } else if (newReq.status === 'IN_TRANSIT') {
            sendLocalNotification('Em Rota', 'O entregador confirmou a coleta e saiu para entrega.', prefs.sound_enabled);
        } else if (newReq.status === 'COMPLETED') {
            sendLocalNotification('Entrega Finalizada', 'O pedido foi entregue com sucesso!', prefs.sound_enabled);
        } else if (newReq.status === 'AWAITING_STORE_DECISION') {
            sendLocalNotification('Atenção: Problema', `O entregador reportou um problema: ${newReq.failure_reason}`, prefs.sound_enabled);
        }
    }

    // ENTREGADOR
    if (role === 'delivery_partner' && newReq.partner_id === userId) {
        if (!prefs.order_updates) return;

        // Note: Geralmente entregador que causa a mudança de status, então talvez não precise notificar ele mesmo,
        // mas pode ser útil se a loja cancelar ou mudar algo.
        
        if (newReq.status === 'CANCELLED') {
            sendLocalNotification('Corrida Cancelada', 'A loja cancelou a solicitação.', prefs.sound_enabled);
        }
    }
};

export const stopNotificationService = () => {
    const client = cloud.getClient();
    if (client) {
        if (subscription) {
            client.removeChannel(subscription);
            subscription = null;
        }
        if (chatSubscription) {
            client.removeChannel(chatSubscription);
            chatSubscription = null;
        }
        if (blitzSubscription) {
            client.removeChannel(blitzSubscription);
            blitzSubscription = null;
        }
    }
};
