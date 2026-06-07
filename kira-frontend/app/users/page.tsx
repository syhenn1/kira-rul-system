'use client';

import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Pagination from '@/components/Pagination';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import TechnicianDetailPanel from '@/components/TechnicianDetailPanel';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

const TOUR_STEPS = [
  {
    target: 'teknisi-status-cards',
    title: 'Kartu Status Teknisi',
    desc: 'Menampilkan jumlah teknisi berdasarkan ketersediaan. Klik kartu mana saja untuk memfilter tabel hanya menampilkan teknisi pada status tersebut.',
  },
  {
    target: 'teknisi-search',
    title: 'Cari Teknisi',
    desc: 'Ketik nama atau email teknisi untuk menyaring daftar secara real-time.',
  },
  {
    target: 'teknisi-spec-filter',
    title: 'Filter Spesialisasi',
    desc: 'Filter teknisi berdasarkan bidang keahliannya — Mekanikal, Elektrikal, IT & Jaringan, dan lainnya.',
  },
  {
    target: 'teknisi-table',
    title: 'Daftar Teknisi',
    desc: 'Setiap baris menampilkan profil teknisi, spesialisasi, pengalaman, dan status. Gunakan dropdown di kolom terakhir untuk mengubah status ketersediaan langsung.',
  },
];

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

const SORT_OPTIONS = [
  { value: 'name_asc',  label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'exp_desc',  label: 'Pengalaman Terbanyak' },
  { value: 'exp_asc',   label: 'Pengalaman Tersedikit' },
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
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailTechnician, setDetailTechnician] = useState<Technician | null>(null);

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

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name_desc': return b.name.localeCompare(a.name);
      case 'exp_desc':  return b.experience_years - a.experience_years;
      case 'exp_asc':   return a.experience_years - b.experience_years;
      case 'name_asc':
      default:          return a.name.localeCompare(b.name);
    }
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    tersedia: technicians.filter((t) => t.status === 'Tersedia').length,
    ditugaskan: technicians.filter((t) => t.status === 'Ditugaskan').length,
    tidakAktif: technicians.filter((t) => t.status === 'Tidak Aktif').length,
  };

  return (
    <main className="flex min-h-screen bg-[#F5F7FB]">
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_users" delay={800} />
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8 animate-[enterUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Teknisi</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Daftar teknisi yang tersedia untuk ditugaskan ke pekerjaan maintenance
          </p>
        </div>

        {/* Summary strip */}
        <div
          className="grid grid-cols-3 gap-4 mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]"
          data-tour="teknisi-status-cards"
        >
          {[
            { label: 'Tersedia', count: counts.tersedia, color: 'text-green-600', active: statusFilter === 'Tersedia', key: 'Tersedia', tip: 'Teknisi siap ditugaskan — klik untuk filter' },
            { label: 'Ditugaskan', count: counts.ditugaskan, color: 'text-yellow-600', active: statusFilter === 'Ditugaskan', key: 'Ditugaskan', tip: 'Teknisi sedang menangani pekerjaan — klik untuk filter' },
            { label: 'Tidak Aktif', count: counts.tidakAktif, color: 'text-gray-500', active: statusFilter === 'Tidak Aktif', key: 'Tidak Aktif', tip: 'Teknisi tidak aktif — klik untuk filter' },
          ].map(({ label, count, color, active, key, tip }) => (
            <Tooltip key={key} content={tip} position="bottom">
              <button
                onClick={() => { setStatusFilter(active ? 'Semua' : key); setPage(1); }}
                className={`w-full rounded-2xl p-5 text-left transition-all duration-300 ${
                  active ? 'bg-gray-800 text-white shadow-lg scale-[1.02]' : 'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className={`text-3xl font-bold ${active ? 'text-white' : color}`}>{count}</div>
                <div className={`text-sm font-medium mt-1 ${active ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-4 flex flex-col lg:flex-row gap-3 animate-[enterUp_0.5s_0.15s_ease-out_both]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Tooltip content="Cari teknisi berdasarkan nama atau email" position="bottom">
              <input
                data-tour="teknisi-search"
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              />
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <Tooltip content="Filter teknisi berdasarkan bidang spesialisasi" position="bottom">
              <select
                data-tour="teknisi-spec-filter"
                value={specFilter}
                onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
              >
                {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Tooltip>

            <Tooltip content="Urutkan daftar teknisi" position="bottom">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Tooltip>
          </div>
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden animate-[enterUp_0.5s_0.22s_ease-out_both]"
          data-tour="teknisi-table"
        >
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
                    onClick={() => setDetailTechnician(t)}
                    className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
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

                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Ubah status ketersediaan teknisi" position="left">
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
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={sorted.length}
              limit={PAGE_SIZE}
              itemLabel="teknisi"
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      <TechnicianDetailPanel
        technician={detailTechnician}
        onClose={() => setDetailTechnician(null)}
        onUpdated={(updated) => {
          setTechnicians((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setDetailTechnician(updated);
        }}
      />
    </main>
  );
}
