type Severity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LoggerConfig {
  maxEntriesPerFile: number;
  maxBytesPerFile: number;
  maxFiles: number;
  level: Severity;
  remoteSender?: (entry: LogEntry) => Promise<void>;
}

interface LogEntry {
  ts: string;
  level: Severity;
  message: string;
  context?: any;
  txn?: string;
}

const defaultConfig: LoggerConfig = {
  maxEntriesPerFile: 1000,
  maxBytesPerFile: 512 * 1024,
  maxFiles: 5,
  level: 'INFO',
};

const severityOrder: Record<Severity, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

let config: LoggerConfig = { ...defaultConfig };
let writeQueue: Promise<void> = Promise.resolve();

const metaKey = 'log_meta';
const fileKey = (index: number) => `logs_${index}`;

const nowIso = () => new Date().toISOString();

const toJsonLine = (e: LogEntry) => JSON.stringify(e);

const loadMeta = () => {
  try {
    const raw = localStorage.getItem(metaKey);
    return raw ? JSON.parse(raw) : { current: 0, counts: {}, sizes: {} };
  } catch {
    return { current: 0, counts: {}, sizes: {} };
  }
};

const saveMeta = (m: any) => {
  try {
    localStorage.setItem(metaKey, JSON.stringify(m));
  } catch {}
};

const appendToFile = (index: number, line: string) => {
  let current = '';
  try {
    current = localStorage.getItem(fileKey(index)) || '';
  } catch {}
  const next = current ? `${current}\n${line}` : line;
  try {
    localStorage.setItem(fileKey(index), next);
    return next.length - current.length;
  } catch {
    return 0;
  }
};

const rotateIfNeeded = (m: any, index: number, lineLen: number) => {
  const count = (m.counts[index] || 0) + 1;
  const size = (m.sizes[index] || 0) + lineLen;
  m.counts[index] = count;
  m.sizes[index] = size;
  if (count >= config.maxEntriesPerFile || size >= config.maxBytesPerFile) {
    const nextIndex = (index + 1) % config.maxFiles;
    m.current = nextIndex;
    try { localStorage.removeItem(fileKey(nextIndex)); } catch {}
    m.counts[nextIndex] = 0;
    m.sizes[nextIndex] = 0;
  }
  return m;
};

const shouldLog = (level: Severity) => severityOrder[level] >= severityOrder[config.level];

const enqueueWrite = (entry: LogEntry) => {
  writeQueue = writeQueue.then(async () => {
    const m = loadMeta();
    const idx = m.current || 0;
    const line = toJsonLine(entry);
    const len = appendToFile(idx, line);
    const updated = rotateIfNeeded(m, idx, len);
    saveMeta(updated);
    if (config.remoteSender) {
      try { await config.remoteSender(entry); } catch {}
    }
  });
};

export const setConfig = (partial: Partial<LoggerConfig>) => {
  config = { ...config, ...partial };
};

export const setLevel = (level: Severity) => setConfig({ level });

export const log = (level: Severity, message: string, context?: any, txn?: string) => {
  if (!shouldLog(level)) return;
  const entry: LogEntry = { ts: nowIso(), level, message, context, txn };
  enqueueWrite(entry);
};

export const debug = (message: string, context?: any, txn?: string) => log('DEBUG', message, context, txn);
export const info = (message: string, context?: any, txn?: string) => log('INFO', message, context, txn);
export const warn = (message: string, context?: any, txn?: string) => log('WARN', message, context, txn);
export const error = (message: string, context?: any, txn?: string) => log('ERROR', message, context, txn);

export const getFiles = () => {
  const m = loadMeta();
  const files: { index: number; size: number; count: number; content: string }[] = [];
  for (let i = 0; i < config.maxFiles; i++) {
    let content = '';
    try { content = localStorage.getItem(fileKey(i)) || ''; } catch {}
    files.push({ index: i, size: m.sizes[i] || 0, count: m.counts[i] || 0, content });
  }
  return files;
};

export const clear = () => {
  for (let i = 0; i < config.maxFiles; i++) {
    try { localStorage.removeItem(fileKey(i)); } catch {}
  }
  saveMeta({ current: 0, counts: {}, sizes: {} });
};

export const setRemoteSender = (sender: (entry: LogEntry) => Promise<void>) => {
  config.remoteSender = sender;
};

export const withTxn = () => crypto.randomUUID();

export const flush = async () => { await writeQueue; };
