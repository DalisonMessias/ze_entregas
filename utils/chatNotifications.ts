/**
 * Serviço de notificações do navegador para chat
 */

let notificationPermission: NotificationPermission = 'default';

/**
 * Solicita permissão para mostrar notificações
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn('Este navegador não suporta notificações');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermission = 'granted';
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        return permission === 'granted';
    }

    return false;
};

/**
 * Mostra uma notificação de nova mensagem
 */
export const showMessageNotification = (
    contactName: string,
    messageContent: string,
    conversationId: string
) => {
    if (notificationPermission !== 'granted') {
        return;
    }

    // Não mostrar notificação se a aba está ativa
    if (document.hasFocus()) {
        return;
    }

    const notification = new Notification(`Nova mensagem de ${contactName}`, {
        body: messageContent.substring(0, 100),
        icon: '/chat-icon.png', // Adicione um ícone do chat em public/
        badge: '/chat-badge.png',
        tag: conversationId, // Evita múltiplas notificações da mesma conversa
        requireInteraction: false,
        silent: false,
    });

    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    // Auto-fechar após 5 segundos
    setTimeout(() => notification.close(), 5000);
};

/**
 * Toca som de notificação
 */
export const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification-sound.mp3'); // Adicione o som em public/
        audio.volume = 0.5;
        audio.play().catch(err => {
            console.warn('Não foi possível tocar o som de notificação:', err);
        });
    } catch (error) {
        console.error('Erro ao tocar som:', error);
    }
};

/**
 * Verifica se as notificações estão habilitadas
 */
export const areNotificationsEnabled = (): boolean => {
    return notificationPermission === 'granted';
};
