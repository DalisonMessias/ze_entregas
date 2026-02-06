import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AssistantCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tag?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AssistantCard: React.FC<AssistantCardProps> = ({
  title,
  description,
  icon: Icon,
  tag,
  actionLabel = 'Abrir',
  onAction
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-brand-200/40 to-transparent opacity-70" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
          <Icon className="h-5 w-5" />
        </div>
        {tag && (
          <span className="rounded-full bg-gray-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white dark:bg-gray-100 dark:text-gray-900">
            {tag}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3 space-y-2">
        <h4 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
          {title}
        </h4>
        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
