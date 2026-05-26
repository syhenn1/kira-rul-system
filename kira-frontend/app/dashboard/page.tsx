'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import StatCard from '@/components/StatCard';
import SummaryCard from '@/components/SummaryCard';
import WelcomeHeader from '@/components/WelcomeHeader';
import { AssetBarChart, AssetDonutChart } from '@/components/Charts';
import RecentActivities from '@/components/RecentActivities';
import ProtectedRoute from '@/components/ProtectedRoute';
import OnboardingModal from '@/components/OnboardingModal';
import TourOverlay from '@/components/TourOverlay';
import Tooltip from '@/components/Tooltip';
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
    desc: '4 kartu ini menampilkan total aset, yang sedang dipakai, yang tersedia, dan yang memerlukan maintenance.',
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
    title: 'Upcoming Maintenance',
    desc: 'Daftar jadwal maintenance yang akan segera jatuh tempo. Klik "Lihat Semua" untuk lihat semua jadwal.',
  },
  {
    target: 'recent-activities',
    title: 'Aktivitas Terkini',
    desc: 'Log aktivitas terbaru di sistem — penambahan aset, perubahan status, dan tindakan maintenance.',
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
    scheduled_date: string;
    cost: number;
    user_name: string;
  }[];
};

function statusCount(data: DashboardData | null, status: string) {
  if (!data) return '—';
  const found = data.stats.by_status.find((s) => s.status === status);
  return String(found?.count ?? 0);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SEVERITY_CLASS: Record<string, string> = {
  High: 'bg-red-100 text-red-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

export default function DashboardPage() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);

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

      <main className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* Welcome */}
          <div className="mt-8 animate-[enterUp_0.5s_ease-out_both]" data-tour="welcome-header">
            <WelcomeHeader />
          </div>

          {/* Summary */}
          <div className="mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]">
            <SummaryCard />
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

            <Tooltip content="Aset yang siap digunakan kapan saja" position="bottom">
              <div className="w-full">
                <StatCard title="Available" value={statusCount(dashData, 'Available')} subtitle="Siap Digunakan" />
              </div>
            </Tooltip>

            <Tooltip content="Aset dengan RUL kritis yang perlu perhatian segera" position="bottom">
              <div className="w-full">
                <StatCard
                  title="Perlu Perhatian"
                  value={dashData ? String(alerts.critical + alerts.high) : '—'}
                  subtitle="RUL ≤ 12 Bulan"
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
                      RUL ≤ 6 bln
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Perlu penanganan segera</p>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-semibold text-sm">{alerts.high} Prioritas Tinggi</p>
                    <span className="bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      RUL ≤ 12 bln
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Rencanakan maintenance</p>
                </div>
                <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-semibold text-sm">{alerts.watch} Perlu Dipantau</p>
                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      RUL ≤ 24 bln
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
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Maintenance</h2>
                <Tooltip content="Lihat semua jadwal maintenance yang akan datang">
                  <Link href="/maintenance" className="text-blue-600 hover:text-blue-700 font-medium transition text-sm">
                    Lihat Semua
                  </Link>
                </Tooltip>
              </div>

              <div className="space-y-4">
                {dashData?.upcoming_maintenances.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Tidak ada jadwal mendatang.</p>
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

          {/* ACTIVITIES TABLE */}
          <div
            className="mt-6 animate-[enterUp_0.5s_0.48s_ease-out_both]"
            data-tour="recent-activities"
          >
            <RecentActivities />
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
