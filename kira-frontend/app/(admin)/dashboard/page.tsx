'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import StatCard from '@/components/StatCard';
import SummaryCard from '@/components/SummaryCard';
import WelcomeHeader from '@/components/WelcomeHeader';
import { AssetBarChart, AssetDonutChart } from '@/components/Charts';
import ProtectedRoute from '@/components/ProtectedRoute';
import OnboardingModal from '@/components/OnboardingModal';
import TourOverlay from '@/components/TourOverlay';
import Tooltip from '@/components/Tooltip';
import AssetDetailPanel from '@/components/AssetDetailPanel';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

const TOUR_STEPS = [
  {
    target: 'welcome-header',
    title: 'Ringkasan Dashboard',
    desc: 'Halaman ini menampilkan kondisi seluruh aset secara ringkas — status, tren, dan peringatan terbaru.',
  },
  {
    target: 'stat-cards',
    title: 'KPI Aset',
    desc: '4 kartu ini menampilkan total aset, yang sedang dipakai, yang sedang maintenance, dan yang memerlukan perhatian (RUL kritis).',
  },
  {
    target: 'asset-overview-chart',
    title: 'Grafik Asset Overview',
    desc: 'Visualisasi tren maintenance per bulan (6 bulan terakhir). Hover pada batang untuk melihat angka detail.',
  },
  {
    target: 'alerts-panel',
    title: 'Panel Alerts & Reminders',
    desc: 'Peringatan aset kritis berdasarkan RUL. Klik "Lihat Semua" untuk melihat semua alert secara lengkap.',
  },
  {
    target: 'upcoming-maintenance',
    title: 'Maintenance Aktif Terbaru',
    desc: 'Daftar maintenance yang masih berjalan atau menunggu, diurutkan dari yang terbaru dibuat. Klik "Lihat Semua" untuk lihat semua maintenance.',
  },
];

type DashboardData = {
  stats: {
    total: number;
    by_status: { status: string; count: number }[];
  };
  by_category: { category: string; count: number }[];
  monthly_trend: { month: string; count: number }[];
  alerts_summary: { critical: number; high: number; watch: number };
  upcoming_maintenances: {
    id: string;
    asset_name: string;
    scheduled_date: string;
    severity: string;
    status: string;
    maintenance_type: string;
  }[];
  recent_maintenances: {
    id: string;
    asset_name: string;
    maintenance_type: string;
    severity: string;
    status: string;
    scheduled_date: string | null;
    cost: number;
    user_name: string;
  }[];
  asset_insights: {
    id: string;
    name: string;
    brand: string;
    category: string;
    status: string;
    maintenance_count: number;
    average_down_time: number | null;
    total_maintenance_cost: number | null;
    max_maintenance_cost: number | null;
    mode_severity: string | null;
    predicted_rul: number | null;
    recorded_at: string | null;
  }[];
};

function statusCount(data: DashboardData | null, status: string) {
  if (!data) return '—';
  const found = data.stats.by_status.find((s) => s.status === status);
  return String(found?.count ?? 0);
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SEVERITY_CLASS: Record<string, string> = {
  High: 'bg-red-100 text-red-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

const MAINTENANCE_STATUS_CLASS: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Scheduled: 'bg-blue-100 text-blue-700',
};

function rulColor(rul: number | null) {
  if (rul == null) return 'text-gray-400';
  if (rul <= 180) return 'text-red-600';
  if (rul <= 365) return 'text-orange-500';
  if (rul <= 730) return 'text-yellow-600';
  return 'text-green-600';
}

function formatCurrency(value: number | null) {
  if (value == null) return '-';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

export default function DashboardPage() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  useEffect(() => {
    const token = authApi.getToken();
    fetch(`${API_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setDashData)
      .catch(console.error);
  }, []);

  // Prepare chart data from API
  const barLabels = dashData?.monthly_trend.map((t) => t.month) ?? [];
  const barValues = dashData?.monthly_trend.map((t) => t.count) ?? [];
  const donutLabels = dashData?.by_category.map((c) => c.category) ?? [];
  const donutValues = dashData?.by_category.map((c) => c.count) ?? [];

  const totalAssets = dashData ? String(dashData.stats.total) : '—';
  const alerts = dashData?.alerts_summary ?? { critical: 0, high: 0, watch: 0 };

  return (
    <ProtectedRoute>
      <OnboardingModal />
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_dashboard" delay={1200} />

      <main className="flex-1 min-w-0 min-h-screen bg-gray-100 overflow-x-hidden">

        <div className="min-w-0 sb-content p-8">
          <Topbar />

          {/* Welcome */}
          <div className="mt-8 animate-[enterUp_0.5s_ease-out_both]" data-tour="welcome-header">
            <WelcomeHeader />
          </div>

          {/* Summary */}
          <div className="mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]">
            <SummaryCard onSelectAsset={setDetailAssetId} dashboardSnapshot={dashData} />
          </div>

          {/* STAT CARDS */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6 animate-[enterUp_0.5s_0.14s_ease-out_both]"
            data-tour="stat-cards"
          >
            <Tooltip content="Jumlah seluruh aset terdaftar di sistem" position="bottom">
              <div className="w-full">
                <StatCard title="Total Assets" value={totalAssets} subtitle="Semua Aset" />
              </div>
            </Tooltip>

            <Tooltip content="Aset yang sedang aktif digunakan" position="bottom">
              <div className="w-full">
                <StatCard title="In Use" value={statusCount(dashData, 'Active')} subtitle="Sedang Digunakan" />
              </div>
            </Tooltip>

            <Tooltip content="Aset yang sedang dalam proses maintenance" position="bottom">
              <div className="w-full">
                <StatCard title="Maintenance" value={statusCount(dashData, 'Maintenance')} subtitle="Dalam Perbaikan" />
              </div>
            </Tooltip>

            <Tooltip content="Aset dengan RUL kritis yang perlu perhatian segera" position="bottom">
              <div className="w-full">
                <StatCard
                  title="Perlu Perhatian"
                  value={dashData ? String(alerts.critical + alerts.high) : '—'}
                  subtitle="RUL ≤ 365 Hari"
                />
              </div>
            </Tooltip>
          </div>

          {/* CHART SECTION */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* BAR CHART */}
            <div
              className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.2s_ease-out_both]"
              data-tour="asset-overview-chart"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Asset Overview</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Jumlah maintenance per bulan (6 bulan terakhir)</p>
                </div>
              </div>
              <AssetBarChart
                labels={barLabels.length ? barLabels : undefined}
                datasets={barValues.length ? [{ label: 'Maintenance', data: barValues }] : undefined}
              />
            </div>

            {/* ALERT PANEL */}
            <div
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.26s_ease-out_both]"
              data-tour="alerts-panel"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Alerts & Reminders</h2>
                <Tooltip content="Lihat semua peringatan aset di halaman Alerts">
                  <Link href="/alerts" className="text-blue-600 hover:text-blue-700 font-medium transition text-sm">
                    Lihat Semua
                  </Link>
                </Tooltip>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-semibold text-sm">{alerts.critical} Aset Kritis</p>
                    <span className="bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      RUL ≤ 180 hari
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Perlu penanganan segera</p>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-semibold text-sm">{alerts.high} Prioritas Tinggi</p>
                    <span className="bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      RUL ≤ 365 hari
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Rencanakan maintenance</p>
                </div>
                <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-semibold text-sm">{alerts.watch} Perlu Dipantau</p>
                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      RUL ≤ 730 hari
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Pantau berkala</p>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER SECTION */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* DONUT CHART */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.3s_ease-out_both]">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Aset per Kategori</h2>
              <AssetDonutChart
                labels={donutLabels.length ? donutLabels : undefined}
                data={donutValues.length ? donutValues : undefined}
              />
            </div>

            {/* UPCOMING MAINTENANCE */}
            <div
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.36s_ease-out_both]"
              data-tour="upcoming-maintenance"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Maintenance Aktif Terbaru</h2>
                <Tooltip content="Lihat maintenance yang masih berjalan atau menunggu">
                  <Link href="/maintenance" className="text-blue-600 hover:text-blue-700 font-medium transition text-sm">
                    Lihat Semua
                  </Link>
                </Tooltip>
              </div>

              <div className="space-y-4">
                {dashData?.upcoming_maintenances.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Tidak ada maintenance aktif saat ini.</p>
                )}
                {dashData?.upcoming_maintenances.slice(0, 3).map((m) => (
                  <div key={m.id}>
                    <h3 className="font-semibold text-gray-800 text-sm">{m.asset_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{m.maintenance_type} · {formatDate(m.scheduled_date)}</p>
                    <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_CLASS[m.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {m.severity}
                    </span>
                  </div>
                ))}
                {!dashData && (
                  <p className="text-sm text-gray-400 text-center py-6">Memuat...</p>
                )}
              </div>
            </div>

            {/* TOP ASSETS BY CATEGORY */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.42s_ease-out_both]">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Top Kategori Aset</h2>
              <div className="space-y-3">
                {dashData?.by_category.slice(0, 5).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <p className="font-medium text-gray-700 text-sm">{c.category}</p>
                    </div>
                    <p className="text-gray-500 text-sm">{c.count} unit</p>
                  </div>
                ))}
                {!dashData && (
                  <p className="text-sm text-gray-400 text-center py-6">Memuat...</p>
                )}
              </div>
            </div>
          </div>

          {/* ANALISIS LANJUTAN */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* ASSET INSIGHTS TABLE */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.48s_ease-out_both]">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Analisis Mendalam Aset</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sumber data yang sama dipakai AI untuk menyusun ringkasan di atas — diurutkan dari sisa umur (RUL) terendah.
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hidden -mx-1 px-1">
                <table className="w-full text-sm min-w-160">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase">
                      <th className="pb-3 font-medium">Aset</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">RUL</th>
                      <th className="pb-3 font-medium">Maintenance</th>
                      <th className="pb-3 font-medium">Avg Downtime</th>
                      <th className="pb-3 font-medium">Total Biaya</th>
                      <th className="pb-3 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData?.asset_insights.slice(0, 6).map((a) => (
                      <tr key={a.id} className="border-t border-gray-50">
                        <td className="py-3 pr-3">
                          <button onClick={() => setDetailAssetId(a.id)} className="font-medium text-gray-700 hover:text-blue-600 transition text-left">
                            {a.name}
                          </button>
                          <p className="text-xs text-gray-400">{a.brand} · {a.category}</p>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${MAINTENANCE_STATUS_CLASS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className={`py-3 pr-3 font-semibold whitespace-nowrap ${rulColor(a.predicted_rul)}`}>
                          {a.predicted_rul != null ? `${a.predicted_rul} hari` : '-'}
                        </td>
                        <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{a.maintenance_count}x</td>
                        <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{a.average_down_time != null ? `${a.average_down_time} jam` : '-'}</td>
                        <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{formatCurrency(a.total_maintenance_cost)}</td>
                        <td className="py-3 text-gray-600 whitespace-nowrap">{a.mode_severity ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dashData?.asset_insights.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Belum ada data analisis aset.</p>
                )}
                {!dashData && (
                  <p className="text-sm text-gray-400 text-center py-6">Memuat...</p>
                )}
              </div>
            </div>

            {/* RECENT MAINTENANCE ACTIVITY */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-[enterUp_0.5s_0.54s_ease-out_both]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Aktivitas Maintenance Terbaru</h2>
                <Tooltip content="Lihat seluruh riwayat maintenance">
                  <Link href="/maintenance" className="text-blue-600 hover:text-blue-700 font-medium transition text-sm">
                    Lihat Semua
                  </Link>
                </Tooltip>
              </div>
              <div className="space-y-4">
                {dashData?.recent_maintenances.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Belum ada aktivitas maintenance.</p>
                )}
                {dashData?.recent_maintenances.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{m.asset_name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{m.maintenance_type} · {m.user_name}</p>
                      <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${MAINTENANCE_STATUS_CLASS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_CLASS[m.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.severity}
                      </span>
                      {m.cost > 0 && <p className="text-xs text-gray-400 mt-2">{formatCurrency(m.cost)}</p>}
                    </div>
                  </div>
                ))}
                {!dashData && (
                  <p className="text-sm text-gray-400 text-center py-6">Memuat...</p>
                )}
              </div>
            </div>
          </div>

        </div>

        <AssetDetailPanel assetId={detailAssetId} onClose={() => setDetailAssetId(null)} />
      </main>
    </ProtectedRoute>
  );
}
