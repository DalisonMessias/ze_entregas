import React from 'react';
import { Bell, Info, X } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsPanelProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

// Function to format time difference
const timeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} anos atrás`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} meses atrás`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} dias atrás`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} horas atrás`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutos atrás`;
  return `Agora mesmo`;
};

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onMarkAsRead, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[60vh] mt-20 animate-in slide-in-from-top-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-500" /> Notificações
          </h3>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Info className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma notificação por aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map(notif => (
                <li
                  key={notif.id}
                  onClick={() => !notif.is_read && onMarkAsRead(notif.id)}
                  className={`p-4 transition-colors ${!notif.is_read ? 'bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>}
                    <div className={notif.is_read ? 'pl-5' : ''}>
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{notif.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(notif.created_at)}</p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
