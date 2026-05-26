'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

export default function SecuritySettingsPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    if (form.next !== form.confirm) {
      setError('Password baru tidak cocok.');
      return;
    }
    if (form.next.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    setSaving(true);
    try {
      const token = authApi.getToken();
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah password');
      }
      setSuccess(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'current', label: 'Password Saat Ini', placeholder: 'Masukkan password saat ini' },
    { key: 'next', label: 'Password Baru', placeholder: 'Minimal 8 karakter' },
    { key: 'confirm', label: 'Konfirmasi Password Baru', placeholder: 'Ulangi password baru' },
  ];

  return (
    <main className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8 animate-[slideUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Security</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola password dan keamanan akun kamu</p>
        </div>

        <div className="mt-8 max-w-xl space-y-3 animate-[slideUp_0.5s_0.1s_ease-out_both]">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {label}
              </label>
              <input
                type="password"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full mt-1.5 text-gray-800 text-sm bg-transparent outline-none border-b border-gray-100 pb-1 focus:border-blue-400 transition"
              />
            </div>
          ))}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              Password berhasil diubah.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-3 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Update Password'}
          </button>
        </div>
      </div>
    </main>
  );
}
