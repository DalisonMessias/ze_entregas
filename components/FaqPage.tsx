import React, { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';
import { Button } from './Button';

export const FaqPage: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cloud.adminListInstitutionalContents({ pageKey: 'faq', status: 'published' })
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black">Perguntas Frequentes</h1>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse border border-gray-100 dark:border-gray-700" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7 text-brand-600" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">Ainda não há perguntas publicadas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Assim que novas respostas forem publicadas, elas aparecerão aqui. Enquanto isso, fale com nosso suporte.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="px-6 py-3 rounded-xl font-black"
            >
              Voltar para a home
            </Button>
            <Button
              onClick={() => window.location.href = '/suporte'}
              className="px-6 py-3 rounded-xl font-black"
            >
              Falar com suporte
            </Button>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <details key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <summary className="font-bold cursor-pointer">{item.title}</summary>
              {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.description}</p>}
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default FaqPage;
