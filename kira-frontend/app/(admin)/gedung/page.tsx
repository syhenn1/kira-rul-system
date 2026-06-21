'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import Swal from 'sweetalert2';

import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

const TOUR_STEPS = [
  {
    target: 'gedung-add-btn',
    title: 'Tambah Gedung Baru',
    desc: 'Klik tombol ini untuk menambahkan gedung baru ke dalam sistem. Anda perlu mengisi nama gedung dan kode uniknya.',
  },
  {
    target: 'gedung-search',
    title: 'Cari Gedung',
    desc: 'Ketik nama atau kode gedung untuk menyaring daftar secara real-time.',
  },
  {
    target: 'gedung-grid',
    title: 'Daftar Gedung',
    desc: 'Setiap kartu menampilkan nama dan kode gedung. Arahkan kursor ke kartu untuk menampilkan tombol Edit dan Hapus.',
  },
];

type Gedung = { id: string; nama: string; kode: string };

const GEDUNG_COLORS: Record<string, string> = {
  A:      'bg-blue-100 text-blue-700',
  B:      'bg-violet-100 text-violet-700',
  C:      'bg-emerald-100 text-emerald-700',
  D:      'bg-amber-100 text-amber-700',
  E:      'bg-rose-100 text-rose-700',
  F:      'bg-indigo-100 text-indigo-700',
  G:      'bg-teal-100 text-teal-700',
  PARKIR: 'bg-slate-100 text-slate-700',
  SERVIS: 'bg-orange-100 text-orange-700',
  UTAMA:  'bg-cyan-100 text-cyan-700',
};

const SORT_OPTIONS = [
  { value: 'name_asc',  label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'kode_asc',  label: 'Kode A–Z' },
  { value: 'kode_desc', label: 'Kode Z–A' },
];

const CATEGORY_OPTIONS = [
  { value: 'Semua', label: 'Semua Kategori' },
  { value: 'Utama', label: 'Gedung Utama' },
  { value: 'Penunjang', label: 'Area Penunjang' },
];

function isPenunjang(kode: string) {
  return kode === 'PARKIR' || kode === 'SERVIS';
}

function getColor(kode: string) {
  if (GEDUNG_COLORS[kode]) return GEDUNG_COLORS[kode];
  const seed = kode.charCodeAt(0) % 5;
  const fallbacks = [
    'bg-pink-100 text-pink-700',
    'bg-lime-100 text-lime-700',
    'bg-sky-100 text-sky-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-yellow-100 text-yellow-700',
  ];
  return fallbacks[seed];
}

export default function GedungPage() {
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Gedung | null>(null);
  const [form, setForm] = useState({ nama: '', kode: '' });
  const [saving, setSaving] = useState(false);

  const fetchGedung = async () => {
    setLoading(true);
    const token = authApi.getToken();
    try {
      const r = await apiFetch('/api/gedung', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setGedungList(d.gedung || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGedung(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ nama: '', kode: '' });
    setShowForm(true);
  };

  const openEdit = (g: Gedung) => {
    setEditTarget(g);
    setForm({ nama: g.nama, kode: g.kode });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nama.trim() || !form.kode.trim()) {
      Swal.fire({ title: 'Isi semua field', icon: 'warning', confirmButtonColor: '#2563eb' });
      return;
    }
    setSaving(true);
    const token = authApi.getToken();
    try {
      const url = editTarget ? `/api/gedung/${editTarget.id}` : '/api/gedung';
      const method = editTarget ? 'PATCH' : 'POST';
      const r = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama: form.nama, kode: form.kode.toUpperCase() }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal menyimpan');
      setShowForm(false);
      fetchGedung();
    } catch (e) {
      Swal.fire({ title: 'Terjadi Kesalahan', text: (e as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Gedung) => {
    const confirm = await Swal.fire({
      title: `Hapus ${g.nama}?`,
      text: 'Aset yang terhubung akan kehilangan relasi gedung.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;
    const token = authApi.getToken();
    try {
      const r = await apiFetch(`/api/gedung/${g.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal menghapus');
      fetchGedung();
    } catch (e) {
      Swal.fire({ title: 'Gagal Menghapus', text: (e as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    }
  };

  const searched = gedungList.filter(
    (g) =>
      g.nama.toLowerCase().includes(search.toLowerCase()) ||
      g.kode.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = searched.filter((g) => {
    if (categoryFilter === 'Utama') return !isPenunjang(g.kode);
    if (categoryFilter === 'Penunjang') return isPenunjang(g.kode);
    return true;
  });

  const filtered = [...byCategory].sort((a, b) => {
    switch (sortBy) {
      case 'name_desc': return b.nama.localeCompare(a.nama);
      case 'kode_asc':  return a.kode.localeCompare(b.kode);
      case 'kode_desc': return b.kode.localeCompare(a.kode);
      case 'name_asc':
      default:          return a.nama.localeCompare(b.nama);
    }
  });

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_gedung" delay={800} />

      <main className="flex-1 min-h-screen bg-[#F5F7FB]">

        <div className="flex-1 sb-content p-8">
          <Topbar />

          {/* Header */}
          <div className="flex items-center justify-between mt-8 animate-[enterUp_0.5s_ease-out_both]">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manajemen Gedung</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Kelola daftar gedung dan lokasi aset perusahaan
              </p>
            </div>

            <Tooltip content="Tambahkan gedung baru ke dalam sistem" position="left">
              <button
                data-tour="gedung-add-btn"
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={16} />
                Tambah Gedung
              </button>
            </Tooltip>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4 mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">{gedungList.length}</div>
              <div className="text-sm text-gray-500 mt-1">Total Gedung</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-3xl font-bold text-emerald-600">
                {gedungList.filter((g) => g.kode !== 'PARKIR' && g.kode !== 'SERVIS').length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Gedung Utama</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-3xl font-bold text-orange-500">
                {gedungList.filter((g) => g.kode === 'PARKIR' || g.kode === 'SERVIS').length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Area Penunjang</div>
            </div>
          </div>

          {/* Search & filter bar */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-4 flex flex-col lg:flex-row gap-3 animate-[enterUp_0.5s_0.14s_ease-out_both]">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Tooltip content="Cari gedung berdasarkan nama atau kode" position="bottom">
                <input
                  data-tour="gedung-search"
                  type="text"
                  placeholder="Cari nama atau kode gedung..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                />
              </Tooltip>
            </div>

            <Tooltip content="Filter berdasarkan kategori gedung" position="bottom">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Tooltip>

            <Tooltip content="Urutkan daftar gedung" position="bottom">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Tooltip>
          </div>

          {/* Grid */}
          <div
            className="mt-4 animate-[enterUp_0.5s_0.2s_ease-out_both]"
            data-tour="gedung-grid"
          >
            {loading ? (
              <div className="text-center py-20 text-gray-400 text-sm">Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm text-gray-400 text-sm">
                {search ? 'Tidak ada gedung yang cocok dengan pencarian.' : 'Belum ada gedung terdaftar.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {filtered.map((g, i) => {
                  const color = getColor(g.kode);
                  return (
                    <div
                      key={g.id}
                      onClick={() => openEdit(g)}
                      className="stagger-item bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4 group relative hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color}`}>
                        <Building2 size={28} />
                      </div>

                      <div className="text-center">
                        <p className="font-bold text-gray-900 text-sm">{g.nama}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Kode: {g.kode}</p>
                      </div>

                      <div
                        className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip content="Edit gedung ini" position="top">
                          <button
                            onClick={() => openEdit(g)}
                            className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition"
                          >
                            <Pencil size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Hapus gedung ini" position="top">
                          <button
                            onClick={() => handleDelete(g)}
                            className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="mt-5 text-center text-xs text-gray-400">
              Menampilkan {filtered.length} dari {gedungList.length} gedung
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-[enterUp_0.35s_ease-out_both]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Building2 size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {editTarget ? 'Edit Gedung' : 'Tambah Gedung Baru'}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nama Gedung</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                  placeholder="cth. Gedung F"
                  className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Kode Gedung</label>
                <input
                  value={form.kode}
                  onChange={(e) => setForm((p) => ({ ...p, kode: e.target.value }))}
                  placeholder="cth. F"
                  className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm uppercase"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Kode digunakan sebagai identifikasi singkat dan otomatis diubah ke huruf kapital.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-7">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-2xl text-sm font-medium transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-2xl text-sm font-medium transition shadow-lg shadow-blue-600/20"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
