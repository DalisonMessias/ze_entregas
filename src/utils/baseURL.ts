export function getBaseURL(): string {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
  } catch {}
  const fromVite = (import.meta as any)?.env?.VITE_API_URL;
  if (fromVite) return String(fromVite);
  const fromNode = (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) ? process.env.API_BASE_URL : '';
  return fromNode || '';
}

export const baseURL = getBaseURL();

export function buildURL(path: string): string {
  const base = getBaseURL();
  if (!base) return path;
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${trimmed}`;
}
