'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, AlertTriangle, Clock, Eye } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

const TOUR_STEPS = [
  {
    target: 'alert-summary-cards',
    title: 'Kartu Ringkasan RUL',
    desc: 'Menampilkan jumlah aset per kategori kekritisan berdasarkan Remaining Useful Life (RUL). Klik kartu untuk memfilter daftar di bawah.',
  },
  {
    target: 'alert-filter-tabs',
    title: 'Tab Filter',
    desc: 'Gunakan tab ini untuk melihat semua aset atau menyaring per kategori: Critical (≤6 bln), High (≤12 bln), atau Watch (≤24 bln).',
  },
  {
    target: 'alert-list',
    title: 'Daftar Aset Berisiko',
    desc: 'Setiap kartu menampilkan nama aset, level urgensi, brand/kategori, dan bar RUL. Klik panah (→) di kanan untuk melihat detail aset.',
  },
];

const CRITICAL = 6;
const HIGH = 12;
const WATCH = 24;

type AlertAsset = {
  id: string;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  criticality_level: string;
  status: string;
  predicted_rul: number;
  mode_severity: string;
  maintenance_count: number;
  recorded_at: string;
};

function urgency(rul: number) {
  if (rul <= CRITICAL) return {
    label: 'Critical',
    badgeBg: 'bg-red-100', badgeText: 'text-red-600',
    bar: 'bg-red-500', border: 'border-l-red-500',
    icon: AlertTriangle, iconColor: 'text-red-500',
  };
  if (rul <= HIGH) return {
    label: 'High',
    badgeBg: 'bg-orange-100', badgeText: 'text-orange-600',
    bar: 'bg-orange-400', border: 'border-l-orange-400',
    icon: Clock, iconColor: 'text-orange-400',
  };
  return {
    label: 'Watch',
    badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700',
    bar: 'bg-yellow-400', border: 'border-l-yellow-400',
    icon: Eye, iconColor: 'text-yellow-500',
  };
}

const PAGE_SIZE = 10;

type Filter = 'all' | 'critical' | 'high' | 'watch';

export default function AlertsPage() {
  const [assets, setAssets] = useState<AlertAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = authApi.getToken();
    fetch(`${API_URL}/api/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setAssets(d.alerts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const critical = assets.filter((a) => a.predicted_rul <= CRITICAL);
  const high = assets.filter((a) => a.predicted_rul > CRITICAL && a.predicted_rul <= HIGH);
  const watch = assets.filter((a) => a.predicted_rul > HIGH && a.predicted_rul <= WATCH);

  const filtered =
    filter === 'critical' ? critical
    : filter === 'high' ? high
    : filter === 'watch' ? watch
    : assets;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabs: { key: Filter; label: string; count: number; activeClass: string }[] = [
    { key: 'all', label: 'Semua', count: assets.length, activeClass: 'bg-gray-800 text-white' },
    { key: 'critical', label: 'Critical', count: critical.length, activeClass: 'bg-red-500 text-white' },
    { key: 'high', label: 'High', count: high.length, activeClass: 'bg-orange-500 text-white' },
    { key: 'watch', label: 'Watch', count: watch.length, activeClass: 'bg-yellow-500 text-white' },
  ];

  return (
    <main className="flex min-h-screen bg-[#F5F7FB]">
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_alerts" delay={800} />
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8 animate-[enterUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Aset yang memiliki sisa umur pakai di bawah ambang batas dan perlu perhatian
          </p>
        </div>

        {/* Summary strip */}
        <div
          className="grid grid-cols-3 gap-4 mt-6 animate-[enterUp_0.5s_0.1s_ease-out_both]"
          data-tour="alert-summary-cards"
        >
          {[
            { key: 'critical' as Filter, count: critical.length, label: 'RUL ≤ 6 bulan', activeColor: 'bg-red-500', textColor: 'text-red-600', tip: 'Aset kritis — perlu penanganan segera dalam 6 bulan' },
            { key: 'high' as Filter, count: high.length, label: 'RUL ≤ 12 bulan', activeColor: 'bg-orange-500', textColor: 'text-orange-500', tip: 'Prioritas tinggi — sisa usia pakai di bawah 12 bulan' },
            { key: 'watch' as Filter, count: watch.length, label: 'RUL ≤ 24 bulan', activeColor: 'bg-yellow-500', textColor: 'text-yellow-600', tip: 'Perlu dipantau — sisa usia pakai di bawah 24 bulan' },
          ].map(({ key, count, label, activeColor, textColor, tip }) => (
            <Tooltip key={key} content={tip} position="bottom">
              <button
                onClick={() => { setFilter(filter === key ? 'all' : key); setPage(1); }}
                className={`w-full rounded-2xl p-5 text-left transition-all duration-300 ${
                  filter === key
                    ? `${activeColor} text-white shadow-lg scale-[1.02]`
                    : 'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className={`text-3xl font-bold ${filter === key ? 'text-white' : textColor}`}>
                  {count}
                </div>
                <div className={`text-sm font-medium mt-1 ${filter === key ? 'text-white/80' : 'text-gray-500'}`}>
                  {label}
                </div>
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-2 mt-6 animate-[enterUp_0.5s_0.18s_ease-out_both]"
          data-tour="alert-filter-tabs"
        >
          {tabs.map((t) => (
            <Tooltip
              key={t.key}
              content={
                t.key === 'all' ? 'Tampilkan semua aset yang memerlukan perhatian'
                : t.key === 'critical' ? 'RUL ≤ 6 bulan — kritis'
                : t.key === 'high' ? 'RUL ≤ 12 bulan — prioritas tinggi'
                : 'RUL ≤ 24 bulan — perlu dipantau'
              }
              position="bottom"
            >
              <button
                onClick={() => { setFilter(t.key); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === t.key ? t.activeClass : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-70">{t.count}</span>
              </button>
            </Tooltip>
          ))}
        </div>

        {/* List */}
        <div className="mt-4 space-y-3" data-tour="alert-list">
          {loading && (
            <div className="text-center py-20 text-gray-400 text-sm">Memuat data...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm text-gray-400 text-sm">
              Tidak ada aset dalam kategori ini.
            </div>
          )}

          {paginated.map((asset, i) => {
            const u = urgency(asset.predicted_rul);
            const pct = Math.min(100, Math.round((asset.predicted_rul / WATCH) * 100));
            const Icon = u.icon;

            return (
              <div
                key={asset.id}
                className={`stagger-item bg-white rounded-2xl p-5 shadow-sm border-l-4 ${u.border} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="flex items-center gap-5">
                  <div className={`shrink-0 ${u.iconColor}`}>
                    <Icon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{asset.asset_name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.badgeBg} ${u.badgeText}`}>
                        {u.label}
                      </span>
                      {asset.criticality_level === 'Critical' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Kritis
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 mt-0.5">
                      {asset.brand} — {asset.category} / {asset.sub_category}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${u.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {asset.predicted_rul} bulan
                      </span>
                    </div>
                  </div>

                  <Tooltip content="Lihat detail aset" position="left">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="shrink-0 text-gray-300 hover:text-gray-600 transition ml-2"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-2xl px-6 py-4 shadow-sm">
            <p className="text-xs text-gray-400">
              {filtered.length} aset · halaman {page} dari {totalPages}
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

        {!loading && assets.length > 0 && (
          <div className="mt-4 text-center text-xs text-gray-400">
            Menampilkan {paginated.length} dari {filtered.length} aset yang memerlukan perhatian
          </div>
        )}
      </div>
    </main>
  );
}
