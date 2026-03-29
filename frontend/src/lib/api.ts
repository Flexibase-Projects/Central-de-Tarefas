/**
 * Base URL para chamadas à API.
 * Quando o app é acessado por um host público (ex.: cdt.flexibase.com) e VITE_API_URL
 * aponta para localhost, retorna '' para usar URL relativa e evitar fetch para máquina errada.
 *
 * Use `apiUrl()`/`apiFetch()` em vez de ler `import.meta.env.VITE_API_URL` em telas/hooks.
 */
export function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL || '';
  if (typeof window === 'undefined') return env;
  if (!env) return '';

  try {
    const envUrl = new URL(env);
    if (envUrl.origin === window.location.origin) return '';
  } catch {
    // Se a variável vier inválida, mantém comportamento atual.
  }

  const isLocalhostUrl = env.startsWith('http://localhost') || env.startsWith('http://127.0.0.1');
  const isBrowserOnLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhostUrl && !isBrowserOnLocalhost) return '';
  return env;
}

export type ApiQueryValue = string | number | boolean | null | undefined;
export type ApiQueryParams = Record<string, ApiQueryValue>;

export function apiUrl(path: string, query?: ApiQueryParams): string {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const resolved = base
    ? new URL(normalizedPath, base.endsWith('/') ? base : `${base}/`)
    : new URL(normalizedPath, 'http://local.invalid');

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      resolved.searchParams.set(key, String(value));
    }
  }

  return base ? resolved.toString() : `${resolved.pathname}${resolved.search}`;
}

export function apiFetch(path: string, init?: RequestInit, query?: ApiQueryParams): Promise<Response> {
  return fetch(apiUrl(path, query), init);
}
