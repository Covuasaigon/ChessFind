export const RENDER_BACKEND_URL = 'https://chessfind.onrender.com';

export function getApiBaseUrl(): string {
  // 1. Check environment variables if set
  if (typeof process !== 'undefined' && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. Browser environment: If on Vercel or non-localhost domain, target Render backend
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return RENDER_BACKEND_URL;
    }
  }

  // 3. Vercel SSR environment
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    return RENDER_BACKEND_URL;
  }

  return '';
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);

  let savedToken = '';
  if (typeof window !== 'undefined') {
    try {
      savedToken = localStorage.getItem('sgc_token') || '';
    } catch {}
  }

  const headers: Record<string, string> = {
    ...(savedToken ? { 'X-Admin-Token': savedToken } : {}),
    ...(options.headers as Record<string, string> || {})
  };

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers
  });
}
