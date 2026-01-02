const DISALLOWED = [/^http:\/\/localhost/i, /^https?:\/\/127\.0\.0\.1/i, /https?:\/\/localhost[:/]/i, /https?:\/\/127\.0\.0\.1[:/]/i];

function isDevEnv(): boolean {
  try {
    const viteDev = (import.meta as any)?.env?.DEV === true;
    const nodeDev = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');
    return !!(viteDev || nodeDev);
  } catch {
    return false;
  }
}

function getDevPortWhitelist(): number[] {
  try {
    const raw = (import.meta as any)?.env?.VITE_DEV_PORTS;
    if (raw && typeof raw === 'string') {
      return raw.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
    }
  } catch { }
  return [3000, 3001, 5173];
}

function isWhitelistedDevUrl(u: string): boolean {
  if (!isDevEnv()) return false;
  try {
    const url = new URL(u);
    const host = url.hostname;
    const port = parseInt(url.port || '80', 10);
    const allowedPorts = getDevPortWhitelist();
    if ((host === 'localhost' || host === '127.0.0.1') && (allowedPorts.includes(port) || url.protocol === 'http:' || url.protocol === 'https:')) {
      return true;
    }
  } catch { }
  return false;
}

function isExplicitLocalUrl(u: string): boolean {
  try {
    const s = String(u);
    return DISALLOWED.some((re) => re.test(s));
  } catch {
    return false;
  }
}

export function enforceURLPolicy(input: RequestInfo | URL, init?: RequestInit) {
  const str = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : '');
  if (str && isExplicitLocalUrl(str)) {
    if (isWhitelistedDevUrl(str)) {
      try {
        const detail = { ts: Date.now(), url: str, action: 'allowed_dev' };
        (window as any).__urlPolicyLog = (window as any).__urlPolicyLog || [];
        (window as any).__urlPolicyLog.push(detail);
        window.dispatchEvent(new CustomEvent('url-policy-allowed', { detail }));
      } catch { }
      return;
    }
    const msg = `URL bloqueada pela política: ${str}`;
    try {
      const detail = { ts: Date.now(), url: str, reason: 'explicit_localhost_block' };
      (window as any).__urlPolicyLog = (window as any).__urlPolicyLog || [];
      (window as any).__urlPolicyLog.push(detail);
      window.dispatchEvent(new CustomEvent('url-policy-blocked', { detail }));
    } catch { }
    console.error(msg);
    throw new Error(msg);
  }
}

export function initURLPolicy(): void {
  if (typeof window === 'undefined' || !(window as any).fetch) return;
  const originalFetch = window.fetch.bind(window);
  const defaultTimeout = Number((import.meta as any)?.env?.VITE_FETCH_TIMEOUT) || 120000; // Increased to 120s for uploads

  function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, ms = defaultTimeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    const finalInit = Object.assign({}, init, { signal });

    const timeoutId = setTimeout(() => controller.abort(), ms);
    return originalFetch(input as any, finalInit).finally(() => clearTimeout(timeoutId));
  }

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const str = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : '');
      const detail = { ts: Date.now(), url: str, action: 'attempt' };
      (window as any).__urlPolicyLog = (window as any).__urlPolicyLog || [];
      (window as any).__urlPolicyLog.push(detail);
      window.dispatchEvent(new CustomEvent('url-policy-attempt', { detail }));
    } catch { }
    try { enforceURLPolicy(input, init); } catch (e) { return Promise.reject(e); }

    // Use fetchWithTimeout to ensure network calls don't hang indefinitely
    try {
      return fetchWithTimeout(input, init, defaultTimeout as number);
    } catch (e) {
      return Promise.reject(e);
    }
  }) as any;
}

export function validateEnvConfig(): void {
  try {
    const hasWindowOrigin = typeof window !== 'undefined' && window.location && !!window.location.origin;
    const viteApiUrl = (import.meta as any)?.env?.VITE_API_URL;
    const nodeApiUrl = (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) ? process.env.API_BASE_URL : '';
    const base = hasWindowOrigin ? window.location.origin : (viteApiUrl || nodeApiUrl || '');
    if (!base) {
      const msg = 'Configuração de baseURL ausente. Defina VITE_API_URL ou API_BASE_URL.';
      console.warn(msg);
      const detail = { ts: Date.now(), issue: 'missing_base_url' };
      (window as any).__urlPolicyLog = (window as any).__urlPolicyLog || [];
      (window as any).__urlPolicyLog.push(detail);
      window.dispatchEvent(new CustomEvent('env-config-warning', { detail }));
    }
  } catch { }
}
