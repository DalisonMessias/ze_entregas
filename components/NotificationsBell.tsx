import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationsBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ unreadCount, onClick, className }) => {
  // Use className if provided, otherwise default styles
  const buttonClass = className ? className : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full transition-colors ${buttonClass}`}
      aria-label={`Notificações. ${unreadCount} não lidas.`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-800 animate-pulse" />
      )}
    </button>
  );
};