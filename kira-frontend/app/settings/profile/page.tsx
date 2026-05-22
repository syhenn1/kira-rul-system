'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { authApi, AuthUser } from '@/lib/auth';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    const loadUser = async () => {
      try {
        const data = await authApi.getCurrentUser();
        setUser(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
        });
        setPreview(data.profile_picture || '');
      } catch (err) {
        console.error(err);
        router.push('/auth/login');
      }
    };

    loadUser();
  }, [router]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

    try {
      const updated = await authApi.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        profile_picture: profilePictureValue ?? preview || undefined,
      });

      setUser(updated);
      authApi.saveSession(authApi.getToken() || '', updated);
      setPreview(updated.profile_picture || preview);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 mt-2">Update your profile information and photo.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm mt-8">
          <div className="flex flex-col lg:flex-row items-start gap-10">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-blue-50 border border-blue-100">
                {preview ? (
                  <img src={preview} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-blue-500">
                    👤
                  </div>
                )}
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                Upload Photo
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </label>
            </div>

            <button
              onClick={handleLogout}
              className="ml-auto rounded-2xl bg-red-500 px-6 py-3 text-white font-medium hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                type="text"
                placeholder="Enter your full name"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                type="email"
                placeholder="Enter your email"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                type="text"
                placeholder="Enter your phone number"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Department</label>
              <input
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                type="text"
                placeholder="Enter your department"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="mt-8 rounded-2xl bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition disabled:bg-blue-400"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  );
}
