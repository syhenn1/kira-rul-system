'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, Search, Filter, FileText, Wrench, TrendingDown } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Pagination from '@/components/Pagination';
import ProtectedRoute from '@/components/ProtectedRoute';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import AssetDetailPanel from '@/components/AssetDetailPanel';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

const TOUR_STEPS = [
  {
    target: 'reports-tabs',
    title: 'Tab Laporan',
    desc: 'Pilih antara laporan Aset (kondisi dan RUL terbaru) atau laporan Maintenance (histori perbaikan).',
  },
  {
    target: 'reports-export',
    title: 'Ekspor CSV',
    desc: 'Unduh data laporan saat ini sebagai file CSV untuk diolah di Excel atau tools lainnya.',
  },
  {
    target: 'reports-search',
    title: 'Pencarian & Filter',
    desc: 'Cari dan saring data laporan secara real-time berdasarkan nama, kategori, atau status.',
  },
  {
    target: 'reports-table',
    title: 'Tabel Laporan',
    desc: 'Data laporan lengkap dengan paginasi. Setiap kolom menampilkan informasi kunci untuk analisis.',
  },
];

type Tab = 'assets' | 'maintenance';

type AssetRow = {
  id: string;
  asset_name: string;
  merk_nama: string | null;
  kategori_nama: string | null;
  sub_kategori_nama: string | null;
  tipe_nama: string | null;
  criticality_level: string;
  status: string;
  purchase_date: string;
  predicted_rul: number;
  maintenance_count: number;
  total_cost: number;
};

type MaintenanceRow = {
  id: string;
  asset_name: string;
  kategori_nama: string | null;
  maintenance_type: string;
  severity: string;
  status: string;
  scheduled_date: string | null;
  completion_date: string | null;
  cost: number;
  down_time: number;
  user_name: string;
};

const PAGE_SIZE = 15;

const ASSET_SORT_OPTIONS = [
  { value: 'rul_asc',   label: 'RUL Terendah' },
  { value: 'rul_desc',  label: 'RUL Tertinggi' },
  { value: 'name_asc',  label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'cost_desc', label: 'Total Biaya Tertinggi' },
  { value: 'cost_asc',  label: 'Total Biaya Terendah' },
];

const MAINTENANCE_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Terbaru' },
  { value: 'date_asc',  label: 'Terlama' },
  { value: 'name_asc',  label: 'Nama Aset A–Z' },
  { value: 'name_desc', label: 'Nama Aset Z–A' },
  { value: 'cost_desc', label: 'Biaya Tertinggi' },
  { value: 'cost_asc',  label: 'Biaya Terendah' },
];

// predicted_rul disimpan dalam satuan HARI (konsisten dengan Alerts/Dashboard — threshold 180/365/730)
const RUL_BADGE = (rul: number) => {
  if (rul <= 180) return 'bg-red-100 text-red-600';
  if (rul <= 365) return 'bg-orange-100 text-orange-600';
  if (rul <= 730) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
};

const SEVERITY_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

const STATUS_BADGE: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700',
  Scheduled: 'bg-blue-100 text-blue-600',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('assets');
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [assetSortBy, setAssetSortBy] = useState('rul_asc');
  const [maintenanceSortBy, setMaintenanceSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  useEffect(() => {
    const token = authApi.getToken();
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/reports/assets`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/reports/maintenance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([a, m]) => {
        setAssetRows(a.assets || []);
        setMaintenanceRows(m.maintenances || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derived unique categories and statuses
  const assetCategories = useMemo(
    () => ['Semua', ...Array.from(new Set(assetRows.map((r) => r.kategori_nama ?? 'Tidak Diketahui'))).sort()],
    [assetRows]
  );
  const maintenanceStatuses = useMemo(
    () => ['Semua', ...Array.from(new Set(maintenanceRows.map((r) => r.status))).sort()],
    [maintenanceRows]
  );

  // Reset page when tab / filters change
  const resetPage = () => setPage(1);

  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase();
    const result = assetRows.filter((r) => {
      const matchSearch =
        r.asset_name.toLowerCase().includes(q) ||
        (r.merk_nama ?? '').toLowerCase().includes(q) ||
        (r.kategori_nama ?? '').toLowerCase().includes(q);
      const matchCat = categoryFilter === 'Semua' || (r.kategori_nama ?? 'Tidak Diketahui') === categoryFilter;
      return matchSearch && matchCat;
    });
    return [...result].sort((a, b) => {
      switch (assetSortBy) {
        case 'rul_desc':  return b.predicted_rul - a.predicted_rul;
        case 'name_asc':  return a.asset_name.localeCompare(b.asset_name);
        case 'name_desc': return b.asset_name.localeCompare(a.asset_name);
        case 'cost_desc': return b.total_cost - a.total_cost;
        case 'cost_asc':  return a.total_cost - b.total_cost;
        case 'rul_asc':
        default:          return a.predicted_rul - b.predicted_rul;
      }
    });
  }, [assetRows, search, categoryFilter, assetSortBy]);

  const filteredMaintenance = useMemo(() => {
    const q = search.toLowerCase();
    const result = maintenanceRows.filter((r) => {
      const matchSearch =
        r.asset_name.toLowerCase().includes(q) ||
        r.maintenance_type.toLowerCase().includes(q) ||
        (r.kategori_nama ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'Semua' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
    return [...result].sort((a, b) => {
      switch (maintenanceSortBy) {
        case 'date_asc':  return new Date(a.scheduled_date ?? 0).getTime() - new Date(b.scheduled_date ?? 0).getTime();
        case 'name_asc':  return a.asset_name.localeCompare(b.asset_name);
        case 'name_desc': return b.asset_name.localeCompare(a.asset_name);
        case 'cost_desc': return b.cost - a.cost;
        case 'cost_asc':  return a.cost - b.cost;
        case 'date_desc':
        default:          return new Date(b.scheduled_date ?? 0).getTime() - new Date(a.scheduled_date ?? 0).getTime();
      }
    });
  }, [maintenanceRows, search, statusFilter, maintenanceSortBy]);

  const activeData = tab === 'assets' ? filteredAssets : filteredMaintenance;
  const totalPages = Math.ceil(activeData.length / PAGE_SIZE);
  const paginated = activeData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    if (tab === 'assets') {
      exportCSV('laporan-aset.csv',
        ['Nama Aset', 'Merk', 'Kategori', 'Sub Kategori', 'Tipe', 'Status', 'Kekritisan', 'RUL (hari)', 'Jml Maintenance', 'Total Biaya', 'Tgl Pembelian'],
        filteredAssets.map((r) => [r.asset_name, r.merk_nama ?? '', r.kategori_nama ?? '', r.sub_kategori_nama ?? '', r.tipe_nama ?? '', r.status, r.criticality_level, r.predicted_rul, r.maintenance_count, r.total_cost, formatDate(r.purchase_date)])
      );
    } else {
      exportCSV('laporan-maintenance.csv',
        ['Aset', 'Kategori', 'Tipe', 'Severity', 'Status', 'Tgl Dijadwalkan', 'Tgl Selesai', 'Biaya', 'Down Time (hari)', 'Oleh'],
        filteredMaintenance.map((r) => [r.asset_name, r.kategori_nama ?? '', r.maintenance_type, r.severity, r.status, formatDate(r.scheduled_date), formatDate(r.completion_date), r.cost, r.down_time, r.user_name])
      );
    }
  };

  // Summary stats
  const totalMaintCost = maintenanceRows.reduce((s, r) => s + r.cost, 0);
  const avgRul = assetRows.length ? Math.round(assetRows.reduce((s, r) => s + r.predicted_rul, 0) / assetRows.length) : 0;
  const criticalCount = assetRows.filter((r) => r.predicted_rul <= 180).length;

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_reports" delay={800} />

      <main className="flex-1 min-h-screen bg-[#F5F7FB]">

        <div className="flex-1 sb-content p-8">
          <Topbar />

          {/* Header */}
          <div className="flex items-center justify-between mt-8 animate-[enterUp_0.5s_ease-out_both]">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Analisis kondisi aset dan histori maintenance perusahaan
              </p>
            </div>

            <Tooltip content="Unduh data laporan sebagai file CSV" position="left">
              <button
                data-tour="reports-export"
                onClick={handleExport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                <Download size={15} />
                Ekspor CSV
              </button>
            </Tooltip>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4 mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]">
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{assetRows.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total Aset</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <TrendingDown size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{avgRul} <span className="text-sm font-normal text-gray-400">hari</span></div>
                <div className="text-xs text-gray-500 mt-0.5">Rata-rata RUL</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Wrench size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{maintenanceRows.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total Maintenance</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-2 mt-6 animate-[enterUp_0.5s_0.14s_ease-out_both]"
            data-tour="reports-tabs"
          >
            {([
              { key: 'assets' as Tab, label: 'Laporan Aset', icon: FileText },
              { key: 'maintenance' as Tab, label: 'Laporan Maintenance', icon: Wrench },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSearch(''); setCategoryFilter('Semua'); setStatusFilter('Semua'); setAssetSortBy('rul_asc'); setMaintenanceSortBy('date_desc'); resetPage(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div
            className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-3 flex flex-col sm:flex-row gap-3 animate-[enterUp_0.5s_0.2s_ease-out_both]"
            data-tour="reports-search"
          >
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={tab === 'assets' ? 'Cari nama aset, brand, atau kategori...' : 'Cari nama aset atau tipe maintenance...'}
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400 shrink-0" />
              {tab === 'assets' ? (
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {assetCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              ) : (
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {maintenanceStatuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </div>

            <Tooltip content="Urutkan data laporan" position="bottom">
              {tab === 'assets' ? (
                <select
                  value={assetSortBy}
                  onChange={(e) => { setAssetSortBy(e.target.value); resetPage(); }}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {ASSET_SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <select
                  value={maintenanceSortBy}
                  onChange={(e) => { setMaintenanceSortBy(e.target.value); resetPage(); }}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {MAINTENANCE_SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </Tooltip>
          </div>

          {/* Table */}
          <div
            className="bg-white rounded-2xl shadow-sm mt-3 overflow-hidden animate-[enterUp_0.5s_0.26s_ease-out_both]"
            data-tour="reports-table"
          >
            <div className="overflow-x-auto">
              {tab === 'assets' ? (
                <table className="w-full min-w-200">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                      <th className="px-6 py-4 font-medium">Nama Aset</th>
                      <th className="px-6 py-4 font-medium">Kategori</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">RUL</th>
                      <th className="px-6 py-4 font-medium">Kekritisan</th>
                      <th className="px-6 py-4 font-medium">Jml Maintenance</th>
                      <th className="px-6 py-4 font-medium">Total Biaya</th>
                      <th className="px-6 py-4 font-medium">Tgl Beli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Memuat data...</td></tr>
                    )}
                    {!loading && (paginated as AssetRow[]).length === 0 && (
                      <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Tidak ada data yang sesuai.</td></tr>
                    )}
                    {!loading && (paginated as AssetRow[]).map((r, i) => (
                      <tr
                        key={r.id}
                        onClick={() => setDetailAssetId(r.id)}
                        className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 text-sm">{r.asset_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.merk_nama ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.kategori_nama ?? '—'} / {r.sub_kategori_nama ?? '—'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RUL_BADGE(r.predicted_rul)}`}>
                            {r.predicted_rul} hari
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.criticality_level}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-center">{r.maintenance_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{r.total_cost > 0 ? formatCurrency(r.total_cost) : '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(r.purchase_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-200">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                      <th className="px-6 py-4 font-medium">Aset</th>
                      <th className="px-6 py-4 font-medium">Tipe</th>
                      <th className="px-6 py-4 font-medium">Severity</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Tgl Dijadwalkan</th>
                      <th className="px-6 py-4 font-medium">Tgl Selesai</th>
                      <th className="px-6 py-4 font-medium">Biaya</th>
                      <th className="px-6 py-4 font-medium">Dilakukan Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Memuat data...</td></tr>
                    )}
                    {!loading && (paginated as MaintenanceRow[]).length === 0 && (
                      <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Tidak ada data yang sesuai.</td></tr>
                    )}
                    {!loading && (paginated as MaintenanceRow[]).map((r, i) => (
                      <tr key={r.id} className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors" style={{ animationDelay: `${i * 25}ms` }}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 text-sm">{r.asset_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.kategori_nama ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.maintenance_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BADGE[r.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(r.scheduled_date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(r.completion_date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{r.cost > 0 ? formatCurrency(r.cost) : '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={activeData.length}
                limit={PAGE_SIZE}
                itemLabel={tab === 'assets' ? 'aset' : 'maintenance'}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>

        <AssetDetailPanel assetId={detailAssetId} onClose={() => setDetailAssetId(null)} />
      </main>
    </ProtectedRoute>
  );
}
