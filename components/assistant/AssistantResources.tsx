import React from 'react';
import { UserRole } from '../../types';
import { ActiveTab } from '../../types/navigation';
import { canAccessTabForRole } from '../../utils/accessControl';
import { AssistantCard } from './AssistantCard';
import { CollaboratorFunction, getResourcesForRole } from './assistantResources';

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
      {items.map(item => (
        <AssistantCard
          key={item.id}
          title={item.title}
          description={item.description}
          icon={item.icon}
          tag={item.tag}
          onAction={() => handleNavigate(item.tab)}
          actionLabel={item.actionLabel || 'Abrir'}
        />
      ))}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/70">
          Nenhum recurso disponível para o seu perfil no momento.
        </div>
      )}
    </div>
  );
};

