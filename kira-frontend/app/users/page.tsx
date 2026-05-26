'use client';

import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string;
  status: 'Tersedia' | 'Ditugaskan' | 'Tidak Aktif';
  experience_years: number;
};

const STATUS_STYLE: Record<string, string> = {
  Tersedia: 'bg-green-100 text-green-700',
  Ditugaskan: 'bg-yellow-100 text-yellow-700',
  'Tidak Aktif': 'bg-gray-100 text-gray-500',
};

const SPECIALIZATIONS = [
  'Semua', 'Mekanikal', 'Elektrikal', 'Sipil', 'HVAC',
  'IT & Jaringan', 'Plumbing', 'Proteksi Kebakaran', 'Instrumentasi',
];

const PAGE_SIZE = 15;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
];

export default function TeknisiPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [specFilter, setSpecFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTechnicians = async () => {
    const token = authApi.getToken();
    const res = await fetch(`${API_URL}/api/technicians`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTechnicians(data.technicians || []);
    setLoading(false);
  };

  useEffect(() => { fetchTechnicians(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    const token = authApi.getToken();
    await fetch(`${API_URL}/api/technicians/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setTechnicians((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: status as Technician['status'] } : t))
    );
    setUpdatingId(null);
  };

  const filtered = technicians.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || t.status === statusFilter;
    const matchSpec = specFilter === 'Semua' || t.specialization === specFilter;
    return matchSearch && matchStatus && matchSpec;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    tersedia: technicians.filter((t) => t.status === 'Tersedia').length,
    ditugaskan: technicians.filter((t) => t.status === 'Ditugaskan').length,
    tidakAktif: technicians.filter((t) => t.status === 'Tidak Aktif').length,
  };

  return (
    <main className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8 animate-[slideUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Teknisi</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Daftar teknisi yang tersedia untuk ditugaskan ke pekerjaan maintenance
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4 mt-6 animate-[slideUp_0.5s_0.08s_ease-out_both]">
          {[
            { label: 'Tersedia', count: counts.tersedia, color: 'text-green-600', active: statusFilter === 'Tersedia', key: 'Tersedia' },
            { label: 'Ditugaskan', count: counts.ditugaskan, color: 'text-yellow-600', active: statusFilter === 'Ditugaskan', key: 'Ditugaskan' },
            { label: 'Tidak Aktif', count: counts.tidakAktif, color: 'text-gray-500', active: statusFilter === 'Tidak Aktif', key: 'Tidak Aktif' },
          ].map(({ label, count, color, active, key }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(active ? 'Semua' : key); setPage(1); }}
              className={`rounded-2xl p-5 text-left transition-all duration-300 ${
                active ? 'bg-gray-800 text-white shadow-lg scale-[1.02]' : 'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className={`text-3xl font-bold ${active ? 'text-white' : color}`}>{count}</div>
              <div className={`text-sm font-medium mt-1 ${active ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-4 flex flex-col lg:flex-row gap-3 animate-[fadeIn_0.4s_0.15s_ease-out_both]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <select
              value={specFilter}
              onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
            >
              {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden animate-[fadeIn_0.4s_0.2s_ease-out_both]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-6 py-4 font-medium">Teknisi</th>
                  <th className="px-6 py-4 font-medium">Spesialisasi</th>
                  <th className="px-6 py-4 font-medium">Pengalaman</th>
                  <th className="px-6 py-4 font-medium">Telepon</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Ubah Status</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                      Memuat data...
                    </td>
                  </tr>
                )}

                {!loading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                      Tidak ada teknisi yang sesuai.
                    </td>
                  </tr>
                )}

                {paginated.map((t, i) => (
                  <tr
                    key={t.id}
                    className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {initials(t.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">{t.specialization}</td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {t.experience_years} tahun
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {t.phone || '—'}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[t.status]}`}>
                        {t.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={t.status}
                        disabled={updatingId === t.id}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                      >
                        <option>Tersedia</option>
                        <option>Ditugaskan</option>
                        <option>Tidak Aktif</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {filtered.length} teknisi · halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
