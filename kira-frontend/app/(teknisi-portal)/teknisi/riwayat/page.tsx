'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { Search, ChevronDown, Wrench, X, Sparkles } from 'lucide-react';
import MaintenanceScheduledModal, { type MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  asset?: { asset_name?: string; name?: string };
  assigned?: { name: string };
  maintenance_id?: string | null;
  id_reporter?: string;
}

const STATUSES = ['Semua', 'Open', 'In Progress', 'Resolved', 'Closed'];

const priorityColor: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const statusColor: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-500',
};

// ── Maintenance Action Modal ──────────────────────────────────────────────────

function MaintenanceActionModal({
  ticket,
  onClose,
  onSuccess,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: (result: MaintenanceScheduledResult) => void;
}) {
  const [form, setForm] = useState({
    jenis_kerusakan: '',
    penyebab: '',
    spare_part_digunakan: '',
    maintenance_type: 'Corrective',
    cost: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jenis_kerusakan.trim() || !form.penyebab.trim()) {
      setError('Jenis kerusakan dan penyebab wajib diisi agar AI dapat memprediksi severity.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const token = authApi.getToken();
      const res = await fetch(`${API_URL}/api/tickets/${ticket.id}/create-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, cost: form.cost ? parseFloat(form.cost) : undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal membuat aksi maintenance');
      }
      const { data } = await res.json();
      onSuccess({
        predicted_rul:       data.predicted_rul       ?? 0,
        predicted_severity:  data.predicted_severity  ?? null,
        severity_confidence: data.severity_confidence ?? null,
        asset_name:          data.asset_name          ?? ticket.asset?.asset_name ?? ticket.asset?.name ?? 'Aset',
        brand:               data.brand               ?? '',
        category:            data.category            ?? '',
        sub_category:        data.sub_category        ?? '',
        gedung_nama:         data.gedung_nama         ?? '',
        criticality_level:   data.criticality_level   ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-[enterUp_0.3s_ease-out_both]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Wrench size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Buat Aksi Maintenance</h2>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{ticket.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
          )}

          {/* AI hint */}
          <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
            <Sparkles size={15} className="text-violet-500 shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 leading-relaxed">
              Isi jenis kerusakan dan penyebab agar AI dapat memprediksi <strong>severity</strong> dan <strong>sisa umur aset (RUL)</strong> secara otomatis.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Jenis Kerusakan <span className="text-red-500">*</span>
              <span className="ml-1.5 text-xs text-violet-500 font-normal">(untuk prediksi AI)</span>
            </label>
            <input
              type="text"
              value={form.jenis_kerusakan}
              onChange={e => setForm(p => ({ ...p, jenis_kerusakan: e.target.value }))}
              placeholder="cth: Mati mendadak, Kebocoran, Retak/pecah"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Penyebab <span className="text-red-500">*</span>
              <span className="ml-1.5 text-xs text-violet-500 font-normal">(untuk prediksi AI)</span>
            </label>
            <input
              type="text"
              value={form.penyebab}
              onChange={e => setForm(p => ({ ...p, penyebab: e.target.value }))}
              placeholder="cth: Overload, Kelembaban tinggi, Usia pakai"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Spare Part Digunakan
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={form.spare_part_digunakan}
              onChange={e => setForm(p => ({ ...p, spare_part_digunakan: e.target.value }))}
              placeholder="cth: PCB board, Seal ring, Kompresor"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Biaya (Rp)
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={form.cost}
              onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
              placeholder="cth: 250000"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Maintenance</label>
            <select
              value={form.maintenance_type}
              onChange={e => setForm(p => ({ ...p, maintenance_type: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['Corrective', 'Preventive', 'Predictive', 'Condition-Based'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition">
              {submitting ? 'Memproses AI...' : 'Buat & Prediksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeknisiRiwayatPage() {
  const router = useRouter();
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selected, setSelected]         = useState<Ticket | null>(null);
  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [schedResult, setSchedResult]   = useState<MaintenanceScheduledResult | null>(null);

  const fetchTickets = useCallback(async () => {
    const user  = authApi.getUser();
    const token = authApi.getToken();
    if (!user || !token) return;
    try {
      const res  = await fetch(`${API_URL}/api/tickets?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list: Ticket[] = Array.isArray(data) ? data : (data.data ?? []);
      setTickets(list.filter((t: any) => t.id_reporter === user.id));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const u = authApi.getUser();
    if (!u) { router.push('/auth/login'); return; }
    if (u.role !== 'teknisi') { router.push('/dashboard'); return; }
    fetchTickets();
  }, [router, fetchTickets]);

  const filtered = tickets.filter(t => {
    const assetName = t.asset?.asset_name ?? t.asset?.name ?? '';
    const matchStatus = statusFilter === 'Semua' || t.status === statusFilter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                        assetName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleMaintenanceSuccess = (result: MaintenanceScheduledResult) => {
    setActionTicket(null);
    setSelected(null);
    setSchedResult(result);
    fetchTickets();
  };

  return (
    <ProtectedRoute>
      <main className="flex-1 sb-content p-4 md:p-8 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="animate-[enterUp_0.4s_ease-out_both]">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Riwayat Komplain</h1>
            <p className="text-gray-500 mt-1 text-sm">Daftar semua komplain yang telah Anda buat.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 animate-[enterUp_0.45s_ease-out_both]">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul atau aset..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[enterUp_0.5s_ease-out_both]">
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-sm">Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">Tidak ada komplain ditemukan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Judul</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Aset</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Prioritas</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(t => (
                      <tr
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-800">{t.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                            {t.asset?.asset_name ?? t.asset?.name ?? '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                          {t.asset?.asset_name ?? t.asset?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColor[t.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 hidden sm:table-cell">
                          {new Date(t.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            className="panel-bg-fade fixed inset-0 bg-black/40 z-50 flex justify-end"
            onClick={() => setSelected(null)}
          >
            <div
              className="panel-slide-in w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Detail Komplain</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Judul</p>
                  <p className="font-semibold text-gray-800">{selected.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Deskripsi</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{selected.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prioritas</p>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColor[selected.priority] ?? 'bg-gray-100'}`}>{selected.priority}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[selected.status] ?? 'bg-gray-100'}`}>{selected.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Aset</p>
                  <p className="text-gray-700 text-sm">{selected.asset?.asset_name ?? selected.asset?.name ?? '—'}</p>
                </div>
                {selected.assigned && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ditangani Oleh</p>
                    <p className="text-gray-700 text-sm">{selected.assigned.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dibuat</p>
                  <p className="text-gray-700 text-sm">{new Date(selected.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Terakhir Diperbarui</p>
                  <p className="text-gray-700 text-sm">{new Date(selected.updated_at).toLocaleString('id-ID')}</p>
                </div>

                {/* Maintenance status */}
                {selected.maintenance_id ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                    <Wrench size={15} />
                    <span className="font-medium">Maintenance sudah dibuat untuk ticket ini.</span>
                  </div>
                ) : selected.status !== 'Resolved' && selected.status !== 'Closed' ? (
                  <button
                    onClick={() => setActionTicket(selected)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition"
                  >
                    <Wrench size={15} />
                    Buat Aksi Maintenance + Prediksi AI
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Maintenance action modal */}
        {actionTicket && (
          <MaintenanceActionModal
            ticket={actionTicket}
            onClose={() => setActionTicket(null)}
            onSuccess={handleMaintenanceSuccess}
          />
        )}

        {/* Result modal (severity + RUL) */}
        {schedResult && (
          <MaintenanceScheduledModal
            result={schedResult}
            onAddAnother={() => setSchedResult(null)}
            onViewAll={() => { setSchedResult(null); router.push('/teknisi/riwayat'); }}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}
