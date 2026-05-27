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

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    const token = authApi.getToken();
    apiFetch(`/api/assets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => setAsset(body.data))
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

  const rulColor = (rul: number | null) => {
    if (rul == null) return 'text-gray-400';
    if (rul <= 6)  return 'text-red-600';
    if (rul <= 12) return 'text-orange-500';
    if (rul <= 24) return 'text-yellow-600';
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
                <div className="w-full lg:w-[280px] h-[280px] rounded-3xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
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
                    <Info title="Initial Useful Life" value={`${asset.initial_useful_life} bulan`} />
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
                    {asset.predicted_rul != null ? `${asset.predicted_rul} bln` : 'N/A'}
                  </p>
                  {asset.predicted_rul != null && (
                    <p className={`text-xs mt-1 font-medium ${rulColor(asset.predicted_rul)}`}>
                      {asset.predicted_rul <= 6  ? '⚠ CRITICAL — Segera ganti' :
                       asset.predicted_rul <= 12 ? '⚠ HIGH — Butuh perhatian' :
                       asset.predicted_rul <= 24 ? '⚡ WATCH — Pantau rutin' :
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
                    asset.predicted_rul <= 6          ? 'text-red-600'   :
                    asset.predicted_rul <= 24         ? 'text-orange-500' :
                                                       'text-green-600'
                  }`}>
                    {asset.predicted_rul == null     ? 'Belum diprediksi' :
                     asset.predicted_rul <= 6        ? 'Kritis' :
                     asset.predicted_rul <= 24       ? 'Perlu Perhatian' :
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
                      <Info title="Initial Useful Life" value={`${asset.initial_useful_life} bulan`} />
                    </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="space-y-4">
                    {asset.maintenances.length === 0 ? (
                      <p className="text-gray-400 text-sm">Belum ada histori maintenance.</p>
                    ) : (
                      asset.maintenances.map((m) => (
                        <div key={m.id} className="border rounded-2xl p-5">
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
                            </div>
                          </div>
                          {(m.down_time > 0 || m.cost > 0) && (
                            <div className="flex gap-6 mt-3 text-sm text-gray-500">
                              {m.down_time > 0 && <span>Downtime: {m.down_time} hari</span>}
                              {m.cost > 0 && <span>Biaya: Rp {m.cost.toLocaleString('id-ID')}</span>}
                            </div>
                          )}
                        </div>
                      ))
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
                              {p.predicted_rul} bln
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
                className="w-[220px] mt-8"
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
