'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi, AuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { CheckCircle2, Wrench } from 'lucide-react';
import TourOverlay from '@/components/TourOverlay';
import Tooltip from '@/components/Tooltip';

const TOUR_STEPS = [
  {
    target: 'tambah-aset',
    title: 'Pilih Aset Bermasalah',
    desc: 'Pilih aset yang mengalami kerusakan atau masalah dari daftar yang tersedia.',
  },
  {
    target: 'tambah-judul',
    title: 'Judul Komplain',
    desc: 'Tulis judul singkat yang menggambarkan masalah, misalnya "AC di lantai 2 tidak dingin".',
  },
  {
    target: 'tambah-deskripsi',
    title: 'Deskripsi Masalah',
    desc: 'Jelaskan masalah secara detail: gejala, kapan terjadi, dan seberapa parah — semakin detail semakin baik.',
  },
  {
    target: 'tambah-prioritas',
    title: 'Tingkat Urgensi',
    desc: 'Pilih urgensi sesuai kondisi. Critical/High untuk kerusakan berat yang segera butuh penanganan.',
  },
];

interface Asset {
  id: string;
  asset_name: string;
  category: string;
  gedung?: { nama: string; kode: string } | null;
  status: string;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function TeknisiTambahPage() {
  const router = useRouter();
  const [user]                    = useState<AuthUser | null>(() => authApi.getUser());
  const [assets, setAssets]       = useState<Asset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const [form, setForm] = useState({
    id_asset:    '',
    title:       '',
    description: '',
    priority:    'Medium',
  });

  useEffect(() => {
    const u = authApi.getUser();
    if (!u) { router.push('/auth/login'); return; }
    if (u.role !== 'teknisi') { router.push('/dashboard'); return; }

    const token = authApi.getToken();
    const spec = u?.specialization ?? '';
    const url  = spec
      ? `${API_URL}/api/assets?limit=all&category=${encodeURIComponent(spec)}`
      : `${API_URL}/api/assets?limit=all`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data) => {
        const list: Asset[] = Array.isArray(data) ? data : (data.data ?? []);
        setAssets(list);
        setAssetsLoaded(true);
      })
      .catch(() => { setAssetsLoaded(true); });
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_asset || !form.title.trim() || !form.description.trim()) {
      setError('Semua field wajib diisi.');
      return;
    }
    setError('');
    setLoading(true);

    const token = authApi.getToken();
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal membuat komplain');
      }
      setSuccess(true);
      setForm({ id_asset: '', title: '', description: '', priority: 'Medium' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const assetLabel = (a: Asset) => {
    const loc = a.gedung ? ` — ${a.gedung.nama}` : '';
    const cat = a.category ? ` [${a.category}]` : '';
    return `${a.asset_name}${cat}${loc}`;
  };

  return (
    <ProtectedRoute>
      <main className="flex-1 sb-content p-4 md:p-8 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="animate-[enterUp_0.4s_ease-out_both]">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tambah Komplain</h1>
            <p className="text-gray-500 mt-1 text-sm">Laporkan kerusakan atau masalah pada aset.</p>
          </div>

          {/* Info teknisi */}
          {user && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 animate-[enterUp_0.3s_ease-out_both]">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <Wrench size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-blue-600 font-medium">
                  {user.specialization ?? 'Teknisi'}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 animate-[enterUp_0.3s_ease-out_both]">
              <CheckCircle2 size={20} />
              <div>
                <p className="font-semibold text-sm">Komplain berhasil dikirim!</p>
                <p className="text-xs text-green-600 mt-0.5">Tim akan segera menindaklanjuti laporan Anda.</p>
              </div>
              <button onClick={() => router.push('/teknisi/riwayat')} className="ml-auto text-xs text-green-700 underline">Lihat riwayat</button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm animate-[enterUp_0.3s_ease-out_both]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5 animate-[enterUp_0.5s_ease-out_both]">

            {/* Aset */}
            <div data-tour="tambah-aset">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aset yang Bermasalah <span className="text-red-500">*</span>
              </label>
              {!assetsLoaded ? (
                <p className="text-sm text-gray-400 italic py-3">Memuat daftar aset…</p>
              ) : assets.length === 0 ? (
                <p className="text-sm text-red-400 italic py-3">Tidak ada aset ditemukan. Hubungi administrator.</p>
              ) : (
                <select
                  name="id_asset"
                  value={form.id_asset}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Aset ({assets.length} tersedia) --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{assetLabel(a)}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Judul */}
            <div data-tour="tambah-judul">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Komplain <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Contoh: AC di lantai 2 tidak dingin"
                required
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Deskripsi */}
            <div data-tour="tambah-deskripsi">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi Masalah <span className="text-red-500">*</span></label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Jelaskan masalah secara detail: gejala, kapan terjadi, seberapa parah, dll."
                required
                rows={5}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Prioritas */}
            <div data-tour="tambah-prioritas">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tingkat Urgensi</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITIES.map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={`py-2 rounded-xl text-sm font-medium border transition ${
                      form.priority === p
                        ? p === 'Critical' ? 'bg-red-600 border-red-600 text-white'
                          : p === 'High' ? 'bg-orange-500 border-orange-500 text-white'
                          : p === 'Medium' ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-green-500 border-green-500 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/teknisi/dashboard')}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <Tooltip content="Kirim laporan ke admin untuk ditindaklanjuti" position="top">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition"
                >
                  {loading ? 'Mengirim...' : 'Kirim Komplain'}
                </button>
              </Tooltip>
            </div>
          </form>
        </div>
      </main>

      <TourOverlay steps={TOUR_STEPS} storageKey="teknisi-tambah-tour-v1" />
    </ProtectedRoute>
  );
}
