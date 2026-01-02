import React, { useEffect, useState } from 'react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';

export const BenefitsPage: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  useEffect(() => {
    const load = () => cloud.getInstitutionalPublic('benefits').then(setItems).catch(() => setItems([]));
    load();
    const ch = cloud.subscribeInstitutionalChanges('benefits', load);
    return () => { try { ch?.unsubscribe(); } catch {} };
  }, []);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-black">Benefícios Zé Entregas</h1>
      <ul className="space-y-3">
        {items.map((b) => (
          <li key={b.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-sm">
            {b.title}
            {b.description && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{b.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BenefitsPage;
