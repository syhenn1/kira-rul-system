function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:3001`;
  return 'http://localhost:3001';
}

export const API_URL = getApiUrl();

export const apiFetch = (path: string, options: RequestInit = {}) => {
  return fetch(`${API_URL}${path}`, options);
};
