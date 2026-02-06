import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Eye, FileJson, Code2 } from 'lucide-react';
import { useDialog } from '../../utils/dialogService';

interface JsonViewerProps {
  jsonText: string;
}

const isObject = (value: any) => value && typeof value === 'object' && !Array.isArray(value);

const collectPaths = (value: any, base = 'root'): string[] => {
  const paths: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const path = `${base}.${index}`;
      paths.push(path);
      paths.push(...collectPaths(item, path));
    });
    return paths;
  }
  if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      const path = `${base}.${key}`;
      paths.push(path);
      paths.push(...collectPaths(item, path));
    });
  }
  return paths;
};

const formatPrimitive = (value: any) => {
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const getTokenClass = (token: string) => {
  if (token === 'true' || token === 'false') return 'text-emerald-600 dark:text-emerald-400';
  if (token === 'null') return 'text-amber-600 dark:text-amber-400';
  if (/^-?\d/.test(token)) return 'text-blue-600 dark:text-blue-400';
  if (token.startsWith('"')) return 'text-purple-600 dark:text-purple-400';
  return 'text-gray-700 dark:text-gray-200';
};

const renderJsonCode = (json: string) => {
  const tokenPattern = /("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)/g;
  const tokenTest = /("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)/;
  const parts = json.split(tokenPattern);
  return (
    <pre className="overflow-x-auto rounded-xl bg-gray-950/90 p-4 text-xs text-gray-200">
      {parts.map((part, index) => {
        if (!tokenTest.test(part)) return <span key={index}>{part}</span>;
        return (
          <span key={index} className={getTokenClass(part)}>
            {part}
          </span>
        );
      })}
    </pre>
  );
};

const renderTable = (rows: Record<string, any>[]) => {
  const columns = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row || {}).forEach(key => acc.add(key));
      return acc;
    }, new Set<string>())
  ).slice(0, 8);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/80">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-bold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.slice(0, 8).map((row, index) => (
              <tr key={index} className="text-gray-700 dark:text-gray-200">
                {columns.map(col => (
                  <td key={col} className="px-3 py-2">
                    {formatPrimitive(row?.[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderKeyValueCards = (value: Record<string, any>) => {
  const entries = Object.entries(value || {}).slice(0, 8);
  return (
    <div className="grid gap-2">
      {entries.map(([key, val]) => (
        <div key={key} className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{key}</div>
          <div className="mt-1 font-semibold">{formatPrimitive(val)}</div>
        </div>
      ))}
    </div>
  );
};

export const JsonViewer: React.FC<JsonViewerProps> = ({ jsonText }) => {
  const { toast } = useDialog();
  const [view, setView] = useState<'visual' | 'code'>('visual');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(jsonText);
      return { ok: true, value } as const;
    } catch (error) {
      return { ok: false, error } as const;
    }
  }, [jsonText]);

  const allPaths = useMemo(() => (parsed.ok ? collectPaths(parsed.value) : []), [parsed]);

  const togglePath = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast({ message: 'JSON copiado com sucesso.', type: 'success', duration: 2000 });
    } catch (error) {
      toast({ message: 'Não foi possível copiar o JSON.', type: 'error' });
    }
  };

  const renderTree = (value: any, label: string, path: string, depth = 0): React.ReactNode => {
    const padding = Math.min(depth * 12, 48);
    const isExpandable = Array.isArray(value) || isObject(value);
    const isExpanded = expandedPaths.has(path);

    if (!isExpandable) {
      return (
        <div
          className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200"
          style={{ paddingLeft: padding }}
        >
          <span className="font-bold text-gray-500 dark:text-gray-400">{label}</span>
          <span className="font-mono">{formatPrimitive(value)}</span>
        </div>
      );
    }

    const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value);

    return (
      <div className="space-y-1" style={{ paddingLeft: padding }}>
        <button
          type="button"
          onClick={() => togglePath(path)}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>{label}</span>
          <span className="text-[10px] font-normal text-gray-400">
            {Array.isArray(value) ? `(${value.length})` : `{${entries.length}}`}
          </span>
        </button>
        {isExpanded && (
          <div className="space-y-1">
            {entries.map(([key, item]) => (
              <div key={`${path}.${key}`}>
                {renderTree(item, key, `${path}.${key}`, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!parsed.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
        <div className="mb-2 flex items-center gap-2 font-bold">
          <FileJson className="h-4 w-4" /> JSON inválido
        </div>
        <div className="whitespace-pre-wrap font-mono text-[11px] text-red-600 dark:text-red-300">{jsonText}</div>
      </div>
    );
  }

  const value = parsed.value;
  const friendlyViews: React.ReactNode[] = [];

  if (Array.isArray(value) && value.every(isObject)) {
    friendlyViews.push(renderTable(value as Record<string, any>[]));
  }

  if (isObject(value)) {
    const candidateKeys = ['products', 'pedidos', 'orders', 'relatorios', 'reports', 'items', 'itens'];
    candidateKeys.forEach(key => {
      const maybe = (value as any)[key];
      if (Array.isArray(maybe) && maybe.every(isObject)) {
        friendlyViews.push(renderTable(maybe as Record<string, any>[]));
      }
    });

    if (friendlyViews.length === 0) {
      friendlyViews.push(renderKeyValueCards(value as Record<string, any>));
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
          <FileJson className="h-4 w-4" /> JSON Viewer
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView('visual')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
              view === 'visual'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            <Eye className="h-3 w-3" /> Visual
          </button>
          <button
            type="button"
            onClick={() => setView('code')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
              view === 'code'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            <Code2 className="h-3 w-3" /> Código
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
          >
            <Copy className="h-3 w-3" /> Copiar
          </button>
        </div>
      </div>

      {view === 'visual' ? (
        <div className="space-y-3">
          {friendlyViews}
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 dark:border-gray-800 dark:bg-gray-900/80">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              <span>Estrutura</span>
              <button
                type="button"
                onClick={() => setExpandedPaths(new Set(['root', ...allPaths]))}
                className="rounded-md border border-gray-200 px-2 py-1 text-[9px] text-gray-500 dark:border-gray-700 dark:text-gray-400"
              >
                Expandir tudo
              </button>
              <button
                type="button"
                onClick={() => setExpandedPaths(new Set(['root']))}
                className="rounded-md border border-gray-200 px-2 py-1 text-[9px] text-gray-500 dark:border-gray-700 dark:text-gray-400"
              >
                Colapsar tudo
              </button>
            </div>
            {renderTree(value, 'root', 'root')}
          </div>
        </div>
      ) : (
        renderJsonCode(JSON.stringify(value, null, 2))
      )}
    </div>
  );
};

