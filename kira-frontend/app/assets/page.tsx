'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddAssetModal from '@/components/AddAssetModal';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type Asset = {
  id: string;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  type: string;
  status: string;
  criticality_level: string;
  purchase_date: string;
  predicted_rul: number | null;
  last_action: string | null;
  gedung: { nama: string; kode: string } | null;
};

type Stats = {
  total: number;
  by_status: Record<string, number>;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const TOUR_STEPS = [
  {
    target: 'add-asset-btn',
    title: 'Tambah Aset Baru',
    desc: 'Klik tombol ini untuk mendaftarkan aset baru. Anda akan memilih gedung lokasi lalu mengisi detail aset.',
  },
  {
    target: 'asset-search',
    title: 'Cari Aset',
    desc: 'Ketik nama aset untuk menyaringnya secara real-time.',
  },
  {
    target: 'asset-status-filter',
    title: 'Filter Status',
    desc: 'Filter aset berdasarkan status: Active, Maintenance, atau Inactive.',
  },
  {
    target: 'asset-table',
    title: 'Tabel Aset',
    desc: 'Klik nama aset untuk melihat detail lengkap termasuk prediksi RUL.',
  },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, by_status: {} });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetchAssets = useCallback(async (page: number, q: string, status: string) => {
    setLoading(true);
    try {
      const token = authApi.getToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(q ? { search: q } : {}),
        ...(status ? { status } : {}),
      });
      const res = await apiFetch(`/api/assets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data aset');
      const body = await res.json();
      setAssets(body.data || []);
      setStats(body.stats || { total: 0, by_status: {} });
      setPagination(body.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAssets(1, search, statusFilter);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchAssets]);

  useEffect(() => {
    fetchAssets(currentPage, search, statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleDelete = async (asset: Asset) => {
    const result = await Swal.fire({
      title: 'Hapus Aset?',
      html: `Aset <b>${asset.asset_name}</b> beserta seluruh histori maintenance akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const token = authApi.getToken();
      const res = await apiFetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menghapus aset');
      }
      await Swal.fire({ title: 'Dihapus!', text: 'Aset berhasil dihapus.', icon: 'success', confirmButtonColor: '#2563eb' });
      fetchAssets(currentPage, search, statusFilter);
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: (err as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusColor = (s: string) =>
    s === 'Active'      ? 'bg-green-100 text-green-700' :
    s === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
    s === 'Inactive'    ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-700';

  const byStatus = stats.by_status;

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_assets" delay={800} />
      <Sidebar />

      <main className="min-h-screen bg-[#F5F7FB] ml-64 p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 animate-[enterUp_0.5s_ease-out_both]">
          <div>
            <h1 className="text-5xl font-bold text-[#111827]">Assets</h1>
            <p className="text-gray-500 mt-3 text-lg">Manage and monitor all company assets</p>
          </div>

          <Tooltip content="Daftarkan aset baru ke dalam sistem" position="left">
            <button
              data-tour="add-asset-btn"
              onClick={() => setAddOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              + Add Asset
            </button>
          </Tooltip>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-6 mb-8 animate-[enterUp_0.5s_0.08s_ease-out_both]">
          <StatCard title="Total Assets"  value={String(stats.total)} />
          <StatCard title="Active"        value={String(byStatus['Active'] ?? 0)} />
          <StatCard title="Maintenance"   value={String(byStatus['Maintenance'] ?? 0)} />
          <StatCard title="Inactive"      value={String(byStatus['Inactive'] ?? 0)} />
        </div>

        {/* SEARCH + FILTER */}
        <div className="bg-white rounded-3xl border shadow-sm p-6 mb-8 animate-[enterUp_0.5s_0.14s_ease-out_both]">
          <div className="flex gap-4">
            <Tooltip content="Cari aset berdasarkan nama, brand, atau kategori" position="bottom">
              <input
                data-tour="asset-search"
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400 transition"
              />
            </Tooltip>

            <Tooltip content="Filter aset berdasarkan status" position="bottom">
              <select
                data-tour="asset-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-2xl px-5 py-4 text-gray-600 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Tooltip>
          </div>
        </div>

        {/* TABLE */}
        <div
          className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-[enterUp_0.5s_0.2s_ease-out_both]"
          data-tour="asset-table"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-5">Asset Name</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">RUL (bulan)</th>
                  <th className="px-6 py-5">Last Action</th>
                  <th className="px-6 py-5">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                      Memuat data aset...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                      Tidak ada aset ditemukan.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      className="stagger-item border-b hover:bg-gray-50 transition"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-6 py-5 font-semibold text-[#111827]">
                        <Link href={`/assets/${asset.id}`} className="hover:text-blue-600 transition">
                          {asset.asset_name}
                        </Link>
                        <p className="text-xs text-gray-400 font-normal mt-0.5">{asset.brand}</p>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {asset.category}
                        <p className="text-xs text-gray-400 mt-0.5">{asset.type}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {asset.gedung?.nama ?? <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-5">
                        {asset.predicted_rul != null ? (
                          <span className={`font-semibold ${
                            asset.predicted_rul <= 6  ? 'text-red-600'    :
                            asset.predicted_rul <= 12 ? 'text-orange-500' :
                            asset.predicted_rul <= 24 ? 'text-yellow-600' :
                                                        'text-green-600'
                          }`}>
                            {asset.predicted_rul} bln
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-gray-500 text-sm">{formatDate(asset.last_action)}</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-3">
                          <Tooltip content="Lihat detail aset" position="top">
                            <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-700 font-medium transition">
                              View
                            </Link>
                          </Tooltip>
                          <Tooltip content="Edit aset" position="top">
                            <Link href={`/assets/${asset.id}/edit`} className="text-gray-500 hover:text-gray-700 font-medium transition">
                              Edit
                            </Link>
                          </Tooltip>
                          <Tooltip content="Hapus aset dari sistem" position="top">
                            <button
                              onClick={() => handleDelete(asset)}
                              className="text-red-500 hover:text-red-600 font-medium transition"
                            >
                              Delete
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-6 py-5">
            <p className="text-gray-500 text-sm">
              {pagination.total === 0
                ? 'Tidak ada data'
                : `Menampilkan ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} dari ${pagination.total} aset`}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition ${
                    p === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'border hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          fetchAssets(1, search, statusFilter);
        }}
      />
    </ProtectedRoute>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-4xl font-bold text-[#111827] mt-3">{value}</h2>
    </div>
  );
}
