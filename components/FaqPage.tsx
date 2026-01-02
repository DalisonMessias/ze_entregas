import React, { useEffect, useState } from 'react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';

export const FaqPage: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  useEffect(() => {
    const load = () => cloud.getInstitutionalPublic('faq').then(setItems).catch(() => setItems([]));
    load();
    const ch = cloud.subscribeInstitutionalChanges('faq', load);
    return () => { try { ch?.unsubscribe(); } catch {} };
  }, []);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black">Perguntas Frequentes</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <details key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <summary className="font-bold cursor-pointer">{item.title}</summary>
            {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.description}</p>}
          </details>
        ))}
      </div>
    </div>
  );
};

export default FaqPage;
