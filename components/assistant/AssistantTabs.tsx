import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface AssistantTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface AssistantTabsProps {
  value: string;
  onChange: (value: string) => void;
  tabs: AssistantTabItem[];
}

export const AssistantTabs: React.FC<AssistantTabsProps> = ({ value, onChange, tabs }) => {
  return (
    <div className="flex w-full gap-2 rounded-2xl border border-white/60 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
      {tabs.map(tab => {
        const isActive = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
