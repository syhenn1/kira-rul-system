'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { authApi, AuthUser } from '@/lib/auth';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [profilePictureValue, setProfilePictureValue] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then((data) => {
        setUser(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
        });
        setPreview(data.profile_picture || '');
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfilePictureValue(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await authApi.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        profile_picture: (profilePictureValue ?? preview) || undefined,
      });
      setUser(updated);
      authApi.saveSession(authApi.getToken() || '', updated);
      setPreview(updated.profile_picture || preview);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const fields: { field: keyof typeof formData; label: string; placeholder: string; type: string }[] = [
    { field: 'name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap', type: 'text' },
    { field: 'email', label: 'Email', placeholder: 'Masukkan email', type: 'email' },
    { field: 'phone', label: 'Nomor Telepon', placeholder: 'Masukkan nomor telepon', type: 'text' },
    { field: 'department', label: 'Departemen', placeholder: 'Masukkan departemen', type: 'text' },
  ];

  return (
    <main className="flex-1 min-h-screen bg-[#F5F7FB]">

      <div className="flex-1 sb-content p-8">
        <Topbar />

        <div className="mt-8 animate-[slideUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1 text-sm">Perbarui informasi profil dan foto kamu</p>
        </div>

        <div className="mt-8 max-w-xl space-y-3 animate-[slideUp_0.5s_0.1s_ease-out_both]">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
              {preview ? (
                <img src={preview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.name || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
            </div>
            <label className="shrink-0 cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium transition">
              Ganti foto
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
            </label>
          </div>

          {/* Field cards */}
          {fields.map(({ field, label, placeholder, type }) => (
            <div key={field} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
              <input
                value={formData[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                type={type}
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
              Profil berhasil diperbarui.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full rounded-2xl bg-blue-600 py-3 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </main>
  );
}
