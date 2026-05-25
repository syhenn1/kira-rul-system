export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiFetch = (path: string, options: RequestInit = {}) => {
  return fetch(`${API_URL}${path}`, options);
};
