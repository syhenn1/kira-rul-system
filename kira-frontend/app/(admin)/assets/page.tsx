'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';

import ProtectedRoute from '@/components/ProtectedRoute';
import AssetDemoFlow from '@/components/AssetDemoFlow';
import AddAssetModal from '@/components/AddAssetModal';
import AssetAddedModal, { type AssetAddedResult } from '@/components/AssetAddedModal';
import AssetDetailPanel from '@/components/AssetDetailPanel';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import Pagination from '@/components/Pagination';
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

type LookupItem = { id: string; nama: string };
type GedungItem = { id: string; nama: string; kode: string };

const SORT_OPTIONS = [
  { value: 'name_asc',  label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'rul_asc',   label: 'RUL Terendah' },
  { value: 'rul_desc',  label: 'RUL Tertinggi' },
  { value: 'date_desc', label: 'Maintenance Terbaru' },
  { value: 'date_asc',  label: 'Maintenance Terlama' },
];

const RUL_PRESETS = [
  { label: 'Kritis  < 6 bln',   min: '',    max: '180'  },
  { label: '6–12 bln',          min: '180', max: '365'  },
  { label: '1–2 thn',           min: '365', max: '730'  },
  { label: 'Sehat  > 2 thn',    min: '730', max: ''     },
];

const TOUR_STEPS = [
  {
    target: 'add-asset-btn',
    title: 'Tambah Aset Baru',
    desc: 'Klik tombol ini untuk mendaftarkan aset baru.',
  },
  {
    target: 'asset-search',
    title: 'Cari Aset',
    desc: 'Ketik nama aset untuk menyaringnya secara real-time.',
  },
  {
    target: 'asset-filter-panel',
    title: 'Filter & Urutkan',
    desc: 'Saring berdasarkan status, RUL range, kategori, kekritisan, dan lokasi. Urutkan berdasarkan RUL atau nama.',
  },
  {
    target: 'asset-table',
    title: 'Tabel Aset',
    desc: 'Klik nama aset untuk melihat detail lengkap termasuk prediksi RUL.',
  },
];

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, by_status: {} });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [rulMin, setRulMin] = useState('');
  const [rulMax, setRulMax] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [gedungFilter, setGedungFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [assetResult, setAssetResult] = useState<AssetAddedResult | null>(null);
  const [assetImage, setAssetImage] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [gedungs, setGedungs] = useState<GedungItem[]>([]);

  // Load lookup data once
  useEffect(() => {
    const token = authApi.getToken();
    Promise.all([
      apiFetch('/api/lookup/kategori', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/gedung', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([cats, geds]) => {
      setCategories(cats.data ?? []);
      setGedungs(geds.gedung ?? []);
    }).catch(() => {});
  }, []);

  const fetchAssets = useCallback(async (
    page: number,
    q: string,
    status: string,
    sort: string,
    rMin: string,
    rMax: string,
    cat: string,
    crit: string,
    ged: string,
  ) => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = authApi.getToken();
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (q)    params.set('search', q);
      if (status) params.set('status', status);
      if (sort)  params.set('sort_by', sort);
      if (rMin)  params.set('rul_min', rMin);
      if (rMax)  params.set('rul_max', rMax);
      if (cat)   params.set('category', cat);
      if (crit)  params.set('criticality', crit);
      if (ged)   params.set('gedung_id', ged);

      const res = await apiFetch(`/api/assets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setFetchError('Sesi login kadaluarsa. Silakan logout lalu login ulang.');
        return;
      }
      if (!res.ok) throw new Error('Gagal memuat data aset');
      const body = await res.json();
      setAssets(body.data || []);
      setStats(body.stats || { total: 0, by_status: {} });
      setPagination(body.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error(err);
      setFetchError('Tidak dapat terhubung ke server. Pastikan backend berjalan.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce all filter changes
  const filterState = { search, statusFilter, sortBy, rulMin, rulMax, categoryFilter, criticalityFilter, gedungFilter };
  const filterRef = useRef(filterState);
  filterRef.current = filterState;

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      const f = filterRef.current;
      fetchAssets(1, f.search, f.statusFilter, f.sortBy, f.rulMin, f.rulMax, f.categoryFilter, f.criticalityFilter, f.gedungFilter);
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortBy, rulMin, rulMax, categoryFilter, criticalityFilter, gedungFilter, fetchAssets]);

  useEffect(() => {
    const f = filterRef.current;
    fetchAssets(currentPage, f.search, f.statusFilter, f.sortBy, f.rulMin, f.rulMax, f.categoryFilter, f.criticalityFilter, f.gedungFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const activeFilterCount = [statusFilter, rulMin, rulMax, categoryFilter, criticalityFilter, gedungFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatusFilter('');
    setRulMin('');
    setRulMax('');
    setCategoryFilter('');
    setCriticalityFilter('');
    setGedungFilter('');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  const applyRulPreset = (min: string, max: string) => {
    setRulMin(min);
    setRulMax(max);
    setCurrentPage(1);
  };

  const refreshAssets = () => {
    const f = filterRef.current;
    fetchAssets(currentPage, f.search, f.statusFilter, f.sortBy, f.rulMin, f.rulMax, f.categoryFilter, f.criticalityFilter, f.gedungFilter);
  };

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
      refreshAssets();
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

  const rulBadge = (rul: number | null) => {
    if (rul == null) return { color: 'text-gray-400', bg: '' };
    if (rul <= 180)  return { color: 'text-red-600',    bg: 'bg-red-50' };
    if (rul <= 365)  return { color: 'text-orange-500', bg: 'bg-orange-50' };
    if (rul <= 730)  return { color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { color: 'text-green-600', bg: 'bg-green-50' };
  };

  const byStatus = stats.by_status;

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_assets" delay={800} />

      <main className="flex-1 min-h-screen bg-[#F5F7FB] p-8">

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

        {/* SEARCH + FILTER PANEL */}
        <div
          data-tour="asset-filter-panel"
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8 animate-[enterUp_0.5s_0.14s_ease-out_both]"
        >
          {/* Row 1: Search + Status + Sort + Filter toggle */}
          <div className="flex gap-4 flex-wrap">
            <input
              data-tour="asset-search"
              type="text"
              placeholder="Search assets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-50 border border-gray-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400 transition"
            />

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-600 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-600 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-2 border rounded-2xl px-5 py-3.5 font-medium transition ${
                filterOpen || activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-100 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-gray-400 hover:text-red-500 transition text-sm font-medium self-center"
              >
                Reset semua
              </button>
            )}
          </div>

          {/* Row 2: Expandable advanced filters */}
          {filterOpen && (
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

              {/* RUL Range */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Range RUL (hari)</p>
                <div className="flex gap-2 items-center mb-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={rulMin}
                    onChange={(e) => { setRulMin(e.target.value); setCurrentPage(1); }}
                    className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-sm shrink-0">–</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={rulMax}
                    onChange={(e) => { setRulMax(e.target.value); setCurrentPage(1); }}
                    className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {RUL_PRESETS.map((p) => {
                    const active = rulMin === p.min && rulMax === p.max;
                    return (
                      <button
                        key={p.label}
                        onClick={() => applyRulPreset(p.min, p.max)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kategori</p>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.nama}>{c.nama}</option>
                  ))}
                </select>
              </div>

              {/* Criticality */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kekritisan</p>
                <select
                  value={criticalityFilter}
                  onChange={(e) => { setCriticalityFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Level</option>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lokasi Gedung</p>
                <select
                  value={gedungFilter}
                  onChange={(e) => { setGedungFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Gedung</option>
                  {gedungs.map((g) => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div
          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-[enterUp_0.5s_0.2s_ease-out_both]"
          data-tour="asset-table"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-5">Asset Name</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">
                    <button
                      onClick={() => setSortBy(sortBy === 'rul_asc' ? 'rul_desc' : 'rul_asc')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      RUL (hari)
                      {sortBy === 'rul_asc'  && <span>↑</span>}
                      {sortBy === 'rul_desc' && <span>↓</span>}
                      {sortBy !== 'rul_asc' && sortBy !== 'rul_desc' && <span className="opacity-30">↕</span>}
                    </button>
                  </th>
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
                ) : fetchError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-red-500">
                      {fetchError}
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                      Tidak ada aset ditemukan.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset, i) => {
                    const rul = rulBadge(asset.predicted_rul);
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setDetailAssetId(asset.id)}
                        className="stagger-item border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <td className="px-6 py-5 font-semibold text-[#111827]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailAssetId(asset.id); }}
                            className="hover:text-blue-600 transition text-left"
                          >
                            {asset.asset_name}
                          </button>
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${rul.color} ${rul.bg}`}>
                              {asset.predicted_rul} hari
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-gray-500 text-sm">{formatDate(asset.last_action)}</td>
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-3">
                            <Tooltip content="Lihat & ubah detail aset" position="top">
                              <button
                                onClick={() => setDetailAssetId(asset.id)}
                                className="text-blue-600 hover:text-blue-700 font-medium transition"
                              >
                                View
                              </button>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            itemLabel="aset"
            onPageChange={setCurrentPage}
          />
        </div>
      </main>

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(data, image) => {
          setAssetResult(data);
          setAssetImage(image);
        }}
      />

      {assetResult && (
        <AssetAddedModal
          result={assetResult}
          image={assetImage}
          onAddAnother={() => {
            setAssetResult(null);
            setAssetImage(null);
            setAddOpen(true);
          }}
          onViewAll={() => {
            setAssetResult(null);
            setAssetImage(null);
            router.refresh();
          }}
        />
      )}

      <AssetDetailPanel
        assetId={detailAssetId}
        onClose={() => setDetailAssetId(null)}
        onSaved={refreshAssets}
      />

      <AssetDemoFlow />
    </ProtectedRoute>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-4xl font-bold text-[#111827] mt-3">{value}</h2>
    </div>
  );
}
