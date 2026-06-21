import { API_URL } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  id_perusahaan?: string | null;
  specialization?: string | null;
  profile_picture?: string | null;
  phone?: string | null;
  department?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const token = authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return res.json();
  },

  updateProfile: async (profile: Partial<AuthUser>): Promise<AuthUser> => {
    const token = authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to update profile');
    }

    return res.json();
  },

  saveSession: (token: string, user: AuthUser) => {
    localStorage.setItem('kira_token', token);
    localStorage.setItem('kira_user', JSON.stringify(user));
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('kira_token');
  },

  getUser: (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('kira_user');
    return raw ? JSON.parse(raw) : null;
  },

  logout: () => {
    localStorage.removeItem('kira_token');
    localStorage.removeItem('kira_user');
  },

  isLoggedIn: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('kira_token');
  },
};
