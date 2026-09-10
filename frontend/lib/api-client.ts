// Frontend API client configuration for connecting Vercel frontend to Railway backend

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export function getImageUrl(path: string): string {
  if (!path) return '/company-logo.png';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/uploads/') && API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

export async function fetchWithCredentials(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? getApiUrl(input) : input;
  return fetch(url, {
    ...init,
    credentials: 'include'
  });
}
