import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { UserRole } from '../../types';
import { ActiveTab } from '../../types/navigation';
import { canAccessTabForRole } from '../../utils/accessControl';
import { CollaboratorFunction, getResourcesForRole } from './assistantResourcesData';

interface AssistantResourcesProps {
  userRole: UserRole;
  collaboratorFunction?: CollaboratorFunction | null;
  onNavigate?: (tab: ActiveTab) => void;
}

export const AssistantResources: React.FC<AssistantResourcesProps> = ({
  userRole,
  collaboratorFunction,
  onNavigate
}) => {
  const [openResourceId, setOpenResourceId] = useState<string>('');

  const items = getResourcesForRole(userRole, collaboratorFunction).filter(resource =>
    canAccessTabForRole(userRole, resource.tab)
  );

  const handleNavigate = (tab: ActiveTab) => {
    if (onNavigate) {
      onNavigate(tab);
      return;
    }
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }));
  };

  return (
    <div className="grid gap-3">
      {items.map(item => {
        const Icon = item.icon;
        const isOpen = openResourceId === item.id;

        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenResourceId(prev => (prev === item.id ? '' : item.id))}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="truncate text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                  {item.title}
                </h4>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.tag && (
                  <span className="rounded-full bg-gray-900 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white dark:bg-white dark:text-gray-900">
                    {item.tag}
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{item.description}</p>
                <button
                  type="button"
                  onClick={() => handleNavigate(item.tab)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {item.actionLabel || 'Abrir'}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/70">
          Nenhum recurso disponível para o seu perfil no momento.
        </div>
      )}
    </div>
  );
};
