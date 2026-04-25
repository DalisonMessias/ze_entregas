import React, { Suspense, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileJson } from 'lucide-react';

const LazyJsonViewer = React.lazy(() => import('./JsonViewer').then(module => ({ default: module.JsonViewer })));

interface StructuredResponseProps {
  text: string;
  isUser?: boolean;
  renderText: (text: string) => React.ReactNode;
}

const extractJsonBlock = (text: string) => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    const cleaned = text.replace(fenced[0], '').trim();
    return { jsonText: fenced[1].trim(), cleaned };
  }

  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return { jsonText: trimmed, cleaned: '' };
  }

  return { jsonText: null, cleaned: text };
};

const splitDetails = (text: string) => {
  const detailsMatch = text.match(/DETALHES:\s*([\s\S]*)$/i);
  const summary = text
    .replace(/RESUMO:\s*/i, '')
    .replace(/DETALHES:\s*[\s\S]*$/i, '')
    .trim();
  const details = detailsMatch?.[1]?.trim() || '';
  return { summary, details };
};

export const StructuredResponse: React.FC<StructuredResponseProps> = ({ text, renderText }) => {
  const [showDetails, setShowDetails] = useState(true);

  const { summary, details } = useMemo(() => splitDetails(text), [text]);

  const summaryExtraction = useMemo(() => extractJsonBlock(summary), [summary]);
  const detailsExtraction = useMemo(() => extractJsonBlock(details), [details]);

  const summaryText = summaryExtraction.cleaned;
  const detailsText = detailsExtraction.cleaned;
  const summaryJson = summaryExtraction.jsonText;
  const detailsJson = detailsExtraction.jsonText;

  return (
    <div className="space-y-3">
      {summaryText && <div>{renderText(summaryText)}</div>}

      {summaryJson && (
        <Suspense fallback={<div className="text-xs text-gray-400">Carregando JSON...</div>}>
          <LazyJsonViewer jsonText={summaryJson} />
        </Suspense>
      )}

      {details && (
        <button
          type="button"
          onClick={() => setShowDetails(prev => !prev)}
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-600"
        >
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>
      )}

      {showDetails && details && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/70">
          {detailsText && <div>{renderText(detailsText)}</div>}
          {detailsJson && (
            <Suspense fallback={<div className="text-xs text-gray-400">Carregando JSON...</div>}>
              <LazyJsonViewer jsonText={detailsJson} />
            </Suspense>
          )}
          {!detailsText && !detailsJson && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileJson className="h-4 w-4" /> Nenhum detalhe adicional disponível.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

