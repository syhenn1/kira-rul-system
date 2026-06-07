'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, AlertTriangle, Clock, Eye, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Pagination from '@/components/Pagination';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import AssetDetailPanel from '@/components/AssetDetailPanel';
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
    desc: 'Gunakan tab ini untuk melihat semua aset atau menyaring per kategori: Critical (≤180 hari), High (≤365 hari), atau Watch (≤730 hari).',
  },
  {
    target: 'alert-list',
    title: 'Daftar Aset Berisiko',
    desc: 'Setiap kartu menampilkan nama aset, level urgensi, brand/kategori, dan bar RUL. Klik panah (→) di kanan untuk melihat detail aset.',
  },
];

const CRITICAL = 180;
const HIGH = 365;
const WATCH = 730;

type AlertAsset = {
  id: string;
  asset_name: string;
  merk_nama: string | null;
  kategori_nama: string | null;
  sub_kategori_nama: string | null;
  tipe_nama: string | null;
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

const SORT_OPTIONS = [
  { value: 'rul_asc',   label: 'RUL Terendah' },
  { value: 'rul_desc',  label: 'RUL Tertinggi' },
  { value: 'name_asc',  label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
];

export default function AlertsPage() {
  const [assets, setAssets] = useState<AlertAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rul_asc');
  const [page, setPage] = useState(1);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

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

  const byCategory =
    filter === 'critical' ? critical
    : filter === 'high' ? high
    : filter === 'watch' ? watch
    : assets;

  const q = search.trim().toLowerCase();
  const searched = q
    ? byCategory.filter((a) =>
        a.asset_name.toLowerCase().includes(q) ||
        (a.merk_nama ?? '').toLowerCase().includes(q) ||
        (a.kategori_nama ?? '').toLowerCase().includes(q)
      )
    : byCategory;

  const filtered = [...searched].sort((a, b) => {
    switch (sortBy) {
      case 'rul_desc':  return b.predicted_rul - a.predicted_rul;
      case 'name_asc':  return a.asset_name.localeCompare(b.asset_name);
      case 'name_desc': return b.asset_name.localeCompare(a.asset_name);
      case 'rul_asc':
      default:          return a.predicted_rul - b.predicted_rul;
    }
  });

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
            { key: 'critical' as Filter, count: critical.length, label: 'RUL ≤ 180 hari', activeColor: 'bg-red-500', textColor: 'text-red-600', tip: 'Aset kritis — perlu penanganan segera dalam 180 hari' },
            { key: 'high' as Filter, count: high.length, label: 'RUL ≤ 365 hari', activeColor: 'bg-orange-500', textColor: 'text-orange-500', tip: 'Prioritas tinggi — sisa usia pakai di bawah 365 hari' },
            { key: 'watch' as Filter, count: watch.length, label: 'RUL ≤ 730 hari', activeColor: 'bg-yellow-500', textColor: 'text-yellow-600', tip: 'Perlu dipantau — sisa usia pakai di bawah 730 hari' },
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

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 animate-[enterUp_0.5s_0.15s_ease-out_both]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama aset, brand, atau kategori..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 bg-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-2 mt-4 animate-[enterUp_0.5s_0.18s_ease-out_both]"
          data-tour="alert-filter-tabs"
        >
          {tabs.map((t) => (
            <Tooltip
              key={t.key}
              content={
                t.key === 'all' ? 'Tampilkan semua aset yang memerlukan perhatian'
                : t.key === 'critical' ? 'RUL ≤ 180 hari — kritis'
                : t.key === 'high' ? 'RUL ≤ 365 hari — prioritas tinggi'
                : 'RUL ≤ 730 hari — perlu dipantau'
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
                onClick={() => setDetailAssetId(asset.id)}
                className={`stagger-item bg-white rounded-2xl p-5 shadow-sm border-l-4 ${u.border} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer`}
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
                      {asset.merk_nama ?? '—'} — {asset.kategori_nama ?? '—'} / {asset.sub_kategori_nama ?? '—'}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${u.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {asset.predicted_rul} hari
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={18} className="shrink-0 text-gray-300 ml-2" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!loading && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              limit={PAGE_SIZE}
              itemLabel="aset"
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <AssetDetailPanel assetId={detailAssetId} onClose={() => setDetailAssetId(null)} />
    </main>
  );
}
