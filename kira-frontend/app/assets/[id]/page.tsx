'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type MaintenanceLog = {
  id: string;
  status: string;
  note: string;
  start_date: string | null;
  completion_date: string | null;
  down_time: number;
  cost: number;
  created_at: string;
  user: { name: string } | null;
};

type MaintenanceRecord = {
  id: string;
  maintenance_type: string;
  severity: string;
  status: string;
  scheduled_date: string;
  completion_date: string | null;
  down_time: number;
  cost: number;
  user: { name: string } | null;
  logs: MaintenanceLog[];
};

type PredictionHistory = {
  id: string;
  predicted_rul: number;
  maintenance_count: number;
  recorded_at: string;
};

type Asset = {
  id: string;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  type: string;
  criticality_level: string;
  status: string;
  purchase_date: string;
  initial_useful_life: number;
  asset_image: string | null;
  gedung: { id: string; nama: string; kode: string } | null;
  predicted_rul: number | null;
  maintenance_count: number;
  maintenances: MaintenanceRecord[];
  prediction_history: PredictionHistory[];
};

// Maps each status to a visual step index (0=Scheduled, 1=InProgress, 2=Completed)
const STATUS_STEP: Record<string, number> = {
  Scheduled: 0,
  'In Progress': 1,
  Completed: 2,
};

const STEP_ICONS = ['📅', '🔧', '✅'];
const STEP_LABELS = ['Scheduled', 'In Progress', 'Completed'];

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedMaintId, setExpandedMaintId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = authApi.getToken();
    apiFetch(`/api/assets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          console.error('Asset detail error:', body);
          return;
        }
        setAsset(body.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!asset) return;
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
      router.push('/assets');
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: (err as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const rulColor = (rul: number | null) => {
    if (rul == null) return 'text-gray-400';
    if (rul <= 180) return 'text-red-600';
    if (rul <= 365) return 'text-orange-500';
    if (rul <= 730) return 'text-yellow-600';
    return 'text-green-600';
  };

  const statusColor = (s: string) =>
    s === 'Active'      ? 'bg-green-100 text-green-700'   :
    s === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
    s === 'Inactive'    ? 'bg-gray-100 text-gray-600'     :
    s === 'Completed'   ? 'bg-green-100 text-green-700'   :
    s === 'Scheduled'   ? 'bg-blue-100 text-blue-700'     :
    s === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700';

  const severityColor = (s: string) =>
    s === 'Critical' ? 'text-red-600' :
    s === 'High'     ? 'text-orange-500' :
    s === 'Medium'   ? 'text-yellow-600' :
                       'text-green-600';

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="flex min-h-screen bg-[#F5F7FB]">
          <Sidebar />
          <div className="flex-1 ml-64 p-8 flex items-center justify-center">
            <p className="text-gray-400 text-lg">Memuat data aset...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (!asset) {
    return (
      <ProtectedRoute>
        <main className="flex min-h-screen bg-[#F5F7FB]">
          <Sidebar />
          <div className="flex-1 ml-64 p-8 flex flex-col items-center justify-center gap-4">
            <p className="text-gray-500 text-lg">Aset tidak ditemukan.</p>
            <Link href="/assets" className="text-blue-600 hover:underline">← Kembali ke daftar aset</Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-[#F5F7FB]">
        <Sidebar />

        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* HEADER */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center gap-4">
              <Link
                href="/assets"
                className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 transition text-xl"
              >
                ←
              </Link>
              <div>
                <h1 className="text-5xl font-bold text-[#111827]">Asset Detail</h1>
                <p className="text-gray-500 mt-2">Monitor and manage asset information</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href={`/assets/${asset.id}/edit`}
                className="px-6 py-3 rounded-2xl border bg-white hover:bg-gray-50 transition font-medium text-gray-700"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 transition text-white font-medium"
              >
                Delete
              </button>
            </div>
          </div>

          {/* TOP */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">

            {/* LEFT — asset info */}
            <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">
              <div className="flex flex-col lg:flex-row gap-8">

                {/* IMAGE */}
                <div className="w-full lg:w-70 h-70 rounded-3xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  {asset.asset_image ? (
                    <img src={asset.asset_image} alt={asset.asset_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🏭</span>
                  )}
                </div>

                {/* INFO */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-4xl font-bold text-[#111827]">{asset.asset_name}</h2>
                    <span className={`px-4 py-2 rounded-full font-medium text-sm ${statusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mt-10">
                    <Info title="Kategori"        value={asset.category} />
                    <Info title="Sub Kategori"    value={asset.sub_category} />
                    <Info title="Brand"           value={asset.brand} />
                    <Info title="Tipe"            value={asset.type} />
                    <Info title="Tingkat Kekritisan" value={asset.criticality_level} />
                    <Info title="Tanggal Pembelian"  value={formatDate(asset.purchase_date)} />
                    <Info title="Lokasi Gedung"   value={asset.gedung?.nama ?? '-'} />
                    <Info title="Initial Useful Life" value={`${asset.initial_useful_life} hari`} />
                  </div>
                </div>
              </div>
            </div>

            {/* STATUS panel */}
            <div className="bg-white rounded-3xl border shadow-sm p-8">
              <h2 className="text-2xl font-bold text-[#111827]">Status RUL</h2>

              <div className="space-y-8 mt-8">
                <div>
                  <p className="text-sm text-gray-400">Prediksi RUL</p>
                  <p className={`mt-2 text-4xl font-bold ${rulColor(asset.predicted_rul)}`}>
                    {asset.predicted_rul != null ? `${asset.predicted_rul} hari` : 'N/A'}
                  </p>
                  {asset.predicted_rul != null && (
                    <p className={`text-xs mt-1 font-medium ${rulColor(asset.predicted_rul)}`}>
                      {asset.predicted_rul <= 180 ? '⚠ CRITICAL — Segera ganti' :
                       asset.predicted_rul <= 365 ? '⚠ HIGH — Butuh perhatian' :
                       asset.predicted_rul <= 730 ? '⚡ WATCH — Pantau rutin' :
                                                    '✓ OK — Kondisi baik'}
                    </p>
                  )}
                </div>

                <Info title="Total Maintenance" value={`${asset.maintenance_count} kali`} />

                {asset.prediction_history[0] && (
                  <Info title="Terakhir Diprediksi" value={formatDate(asset.prediction_history[0].recorded_at)} />
                )}

                <div>
                  <p className="text-sm text-gray-400">Kondisi</p>
                  <p className={`mt-2 font-semibold ${
                    asset.predicted_rul == null       ? 'text-gray-500' :
                    asset.predicted_rul <= 180        ? 'text-red-600'   :
                    asset.predicted_rul <= 730        ? 'text-orange-500' :
                                                       'text-green-600'
                  }`}>
                    {asset.predicted_rul == null     ? 'Belum diprediksi' :
                     asset.predicted_rul <= 180      ? 'Kritis' :
                     asset.predicted_rul <= 730      ? 'Perlu Perhatian' :
                                                      'Baik'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">

            {/* LEFT — tabs */}
            <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">

              {/* TAB */}
              <div className="flex gap-8 border-b overflow-x-auto">
                {['overview', 'maintenance', 'prediction'].map((tab) => (
                  <TabButton
                    key={tab}
                    title={tab === 'overview' ? 'Overview' : tab === 'maintenance' ? 'Maintenance History' : 'RUL History'}
                    active={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                  />
                ))}
              </div>

              {/* CONTENT */}
              <div className="mt-8">

                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-xl font-bold text-[#111827] mb-6">Informasi Aset</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Info title="Nama Aset"        value={asset.asset_name} />
                      <Info title="Brand"            value={asset.brand} />
                      <Info title="Kategori"         value={asset.category} />
                      <Info title="Sub Kategori"     value={asset.sub_category} />
                      <Info title="Tipe"             value={asset.type} />
                      <Info title="Kekritisan"       value={asset.criticality_level} />
                      <Info title="Status"           value={asset.status} />
                      <Info title="Gedung"           value={asset.gedung?.nama ?? '-'} />
                      <Info title="Tanggal Pembelian" value={formatDate(asset.purchase_date)} />
                      <Info title="Initial Useful Life" value={`${asset.initial_useful_life} hari`} />
                    </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="space-y-4">
                    {asset.maintenances.length === 0 ? (
                      <p className="text-gray-400 text-sm">Belum ada histori maintenance.</p>
                    ) : (
                      asset.maintenances.map((m) => {
                        const isExpanded = expandedMaintId === m.id;
                        const currentStep = STATUS_STEP[m.status] ?? 0;
                        return (
                          <div key={m.id} className="border rounded-2xl overflow-hidden">
                            {/* Card header */}
                            <button
                              onClick={() => setExpandedMaintId(isExpanded ? null : m.id)}
                              className="w-full text-left p-5 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                  <h4 className="font-semibold text-[#111827]">{m.maintenance_type}</h4>
                                  <p className="text-sm text-gray-400 mt-1">{formatDate(m.scheduled_date)}</p>
                                  {m.user && <p className="text-xs text-gray-400 mt-0.5">Oleh: {m.user.name}</p>}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`text-xs font-semibold ${severityColor(m.severity)}`}>
                                    {m.severity}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>
                                    {m.status}
                                  </span>
                                  {(m.down_time > 0 || m.cost > 0) && (
                                    <span className="text-xs text-gray-400">
                                      {m.down_time > 0 && `${m.down_time}h downtime`}
                                      {m.down_time > 0 && m.cost > 0 && ' · '}
                                      {m.cost > 0 && `Rp ${m.cost.toLocaleString('id-ID')}`}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                              </div>

                              {/* Mini progress bar */}
                              <div className="flex items-center gap-1 mt-4">
                                {STEP_LABELS.map((label, idx) => {
                                  const done    = idx <= currentStep;
                                  const active  = idx === currentStep;
                                  return (
                                    <div key={label} className="flex items-center gap-1 flex-1">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                                        active  ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
                                        done    ? 'bg-green-500 text-white' :
                                                  'bg-gray-200 text-gray-400'
                                      }`}>
                                        {done && !active ? '✓' : idx + 1}
                                      </div>
                                      <p className={`text-xs truncate ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                        {label}
                                      </p>
                                      {idx < 2 && (
                                        <div className={`h-0.5 flex-1 rounded ${idx < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </button>

                            {/* Timeline detail (expanded) */}
                            {isExpanded && (
                              <div className="border-t px-5 py-6 bg-gray-50">
                                {m.logs.length === 0 ? (
                                  <p className="text-gray-400 text-sm">Tidak ada log tersedia untuk maintenance ini.</p>
                                ) : (
                                  <div className="relative">
                                    {/* Vertical line */}
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                                    <div className="space-y-6">
                                      {m.logs.map((log, li) => {
                                        const step = STATUS_STEP[log.status] ?? 0;
                                        const dotColors = [
                                          'bg-blue-500',   // Scheduled
                                          'bg-yellow-500', // In Progress
                                          'bg-green-500',  // Completed
                                        ];
                                        const dotColor = dotColors[step] ?? 'bg-gray-400';
                                        return (
                                          <div key={log.id} className="flex gap-5 relative">
                                            {/* Dot */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0 shadow-sm z-10 ${dotColor}`}>
                                              {STEP_ICONS[step]}
                                            </div>

                                            {/* Content */}
                                            <div className={`flex-1 bg-white rounded-2xl p-4 border shadow-sm ${li === m.logs.length - 1 ? 'border-l-4 border-l-blue-300' : ''}`}>
                                              <div className="flex items-center justify-between flex-wrap gap-2">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(log.status)}`}>
                                                  {log.status}
                                                </span>
                                                <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                                              </div>
                                              <p className="text-sm text-gray-700 mt-2">{log.note}</p>
                                              {log.user && (
                                                <p className="text-xs text-gray-400 mt-1">Oleh: {log.user.name}</p>
                                              )}
                                              <div className="flex gap-4 mt-2 flex-wrap">
                                                {log.start_date && (
                                                  <span className="text-xs text-gray-500">Mulai: {formatDate(log.start_date)}</span>
                                                )}
                                                {log.completion_date && (
                                                  <span className="text-xs text-gray-500">Selesai: {formatDate(log.completion_date)}</span>
                                                )}
                                                {log.down_time > 0 && (
                                                  <span className="text-xs text-gray-500">Downtime: {log.down_time}h</span>
                                                )}
                                                {log.cost > 0 && (
                                                  <span className="text-xs text-gray-500">Biaya: Rp {log.cost.toLocaleString('id-ID')}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === 'prediction' && (
                  <div className="space-y-4">
                    {asset.prediction_history.length === 0 ? (
                      <p className="text-gray-400 text-sm">Belum ada histori prediksi.</p>
                    ) : (
                      asset.prediction_history.map((p) => (
                        <div key={p.id} className="border rounded-2xl p-5 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">{formatDate(p.recorded_at)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{p.maintenance_count} maintenance tercatat</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${rulColor(p.predicted_rul)}`}>
                              {p.predicted_rul} hari
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">predicted RUL</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* QR */}
            <div className="bg-white rounded-3xl border shadow-sm p-8 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-[#111827]">QR Code</h2>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(asset.id)}`}
                alt="qr"
                className="w-55 mt-8"
              />
              <p className="text-gray-500 mt-4 text-sm text-center break-all">{asset.asset_name}</p>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="font-semibold text-[#111827] mt-1">{value}</p>
    </div>
  );
}

function TabButton({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 whitespace-nowrap transition font-medium ${
        active ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-black'
      }`}
    >
      {title}
    </button>
  );
}
