import React, { useEffect, useState } from 'react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';

export const SolutionsPage: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  useEffect(() => {
    const load = () => cloud.getInstitutionalPublic('solutions').then(setItems).catch(() => setItems([]));
    load();
    const ch = cloud.subscribeInstitutionalChanges('solutions', load);
    return () => { try { ch?.unsubscribe(); } catch {} };
  }, []);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-black">Soluções para seu negócio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((c) => (
          <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-lg">{c.title}</h2>
            {c.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{c.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SolutionsPage;
