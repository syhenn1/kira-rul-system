'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { Maximize2, PanelRight, X, Loader2 } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type Gedung = { id: string; nama: string; kode: string };

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
  scheduled_date: string | null;
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

type AssetDetail = {
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
  predicted_rul: number | null;
  maintenance_count: number;
  gedung: { id: string; nama: string; kode: string } | null;
  maintenances: MaintenanceRecord[];
  prediction_history: PredictionHistory[];
};

type FormState = {
  asset_name: string;
  purchase_date: string;
  brand: string;
  category: string;
  sub_category: string;
  type: string;
  criticality_level: string;
  status: string;
  gedung_id: string;
};

const EMPTY_FORM: FormState = {
  asset_name: '', purchase_date: '', brand: '', category: '',
  sub_category: '', type: '', criticality_level: '', status: '', gedung_id: '',
};

const TABS = [
  { key: 'info', label: 'Info Aset' },
  { key: 'maintenance', label: 'Riwayat Maintenance' },
  { key: 'prediction', label: 'Riwayat RUL' },
] as const;
type TabKey = typeof TABS[number]['key'];

// Maps each maintenance status to a visual step index (0=Scheduled, 1=InProgress, 2=Completed)
const STATUS_STEP: Record<string, number> = {
  Scheduled: 0,
  'In Progress': 1,
  Completed: 2,
};
const STEP_ICONS = ['📅', '🔧', '✅'];
const STEP_LABELS = ['Scheduled', 'In Progress', 'Completed'];

const formatDate = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTime = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

const rulColor = (rul: number | null) => {
  if (rul == null) return 'text-gray-400';
  if (rul <= 180) return 'text-red-600';
  if (rul <= 365) return 'text-orange-500';
  if (rul <= 730) return 'text-yellow-600';
  return 'text-green-600';
};

export default function AssetDetailPanel({
  assetId,
  onClose,
  onSaved,
}: {
  assetId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [mode, setMode] = useState<'drawer' | 'modal'>('drawer');
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const [expandedMaintId, setExpandedMaintId] = useState<string | null>(null);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const open = assetId !== null;

  // Trigger the enter transition a frame after mount so the initial (offscreen) state paints first
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Slide the active-tab underline indicator to match the active button's position/width
  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    const el = tabRefs.current[idx];
    if (el) setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab, visible]);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    setAsset(null);
    setActiveTab('info');
    setExpandedMaintId(null);
    const token = authApi.getToken();
    Promise.all([
      apiFetch(`/api/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      apiFetch('/api/gedung', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([assetBody, gedungBody]) => {
        const a = assetBody.data;
        if (!a) return;
        setAsset(a);
        setForm({
          asset_name: a.asset_name ?? '',
          purchase_date: a.purchase_date ? a.purchase_date.slice(0, 10) : '',
          brand: a.brand ?? '',
          category: a.category ?? '',
          sub_category: a.sub_category ?? '',
          type: a.type ?? '',
          criticality_level: a.criticality_level ?? '',
          status: a.status ?? '',
          gedung_id: a.gedung?.id ?? '',
        });
        setGedungList(gedungBody.gedung || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleInput = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const handleSubmit = async () => {
    if (!asset) return;
    if (!form.asset_name.trim()) {
      Swal.fire({ title: 'Validasi', text: 'Nama aset wajib diisi.', icon: 'warning', confirmButtonColor: '#2563eb' });
      return;
    }
    setSubmitting(true);
    try {
      const token = authApi.getToken();
      const res = await apiFetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, gedung_id: form.gedung_id || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memperbarui aset');
      }
      await Swal.fire({ title: 'Berhasil!', text: 'Data aset berhasil diperbarui.', icon: 'success', confirmButtonColor: '#2563eb' });
      onSaved?.();
      handleClose();
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: (err as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isModal = mode === 'modal';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Positioner */}
      <div
        className={
          isModal
            ? 'absolute inset-0 flex items-center justify-center p-6'
            : 'absolute inset-y-0 right-0 flex'
        }
      >
        {/* Panel */}
        <div
          className={
            isModal
              ? `bg-white rounded-3xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
              : `bg-white shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-5 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Tooltip content={isModal ? 'Tampilkan sebagai panel samping' : 'Tampilkan sebagai jendela tengah'} position="bottom">
                <button
                  onClick={() => setMode(isModal ? 'drawer' : 'modal')}
                  className="w-9 h-9 rounded-xl border text-gray-500 hover:bg-gray-50 hover:text-blue-600 flex items-center justify-center transition"
                  aria-label="Ubah tampilan panel detail"
                >
                  {isModal ? <PanelRight size={16} /> : <Maximize2 size={16} />}
                </button>
              </Tooltip>
              <h2 className="text-lg font-bold text-[#111827]">Detail Aset</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
              aria-label="Tutup panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="relative flex gap-6 px-6 border-b shrink-0 overflow-x-auto scrollbar-hidden">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={() => setActiveTab(t.key)}
                className={`pb-3 pt-3 whitespace-nowrap text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
            <span
              className="absolute bottom-0 h-0.5 bg-blue-600 transition-[left,width] duration-300 ease-out"
              style={{ left: tabIndicator.left, width: tabIndicator.width }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading || !asset ? (
              <div className="flex items-center justify-center h-full text-gray-400 gap-2 text-sm">
                <Loader2 className="animate-spin" size={18} />
                Memuat detail aset...
              </div>
            ) : activeTab === 'info' ? (
              <div className="space-y-7">
                {/* Identity */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                    {asset.asset_image ? (
                      <img src={asset.asset_image} alt={asset.asset_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🏭</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#111827]">{asset.asset_name}</h3>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${statusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>
                </div>

                {/* Read-only highlights */}
                <div className="grid grid-cols-3 gap-3">
                  <HighlightStat label="Prediksi RUL" value={asset.predicted_rul != null ? `${asset.predicted_rul} hari` : 'N/A'} valueClass={rulColor(asset.predicted_rul)} />
                  <HighlightStat label="Maintenance" value={`${asset.maintenance_count}x`} />
                  <HighlightStat label="Usia Pakai Awal" value={`${asset.initial_useful_life} hari`} />
                </div>

                {/* Editable form */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informasi yang dapat diubah</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Nama Aset" value={form.asset_name} onChange={(v) => handleInput('asset_name', v)} />
                    <FormDate  label="Tanggal Pembelian" value={form.purchase_date} onChange={(v) => handleInput('purchase_date', v)} />
                    <FormField label="Brand" value={form.brand} onChange={(v) => handleInput('brand', v)} />
                    <FormField label="Kategori" value={form.category} onChange={(v) => handleInput('category', v)} />
                    <FormField label="Sub Kategori" value={form.sub_category} onChange={(v) => handleInput('sub_category', v)} />
                    <FormField label="Tipe" value={form.type} onChange={(v) => handleInput('type', v)} />
                    <FormSelect label="Tingkat Kekritisan" value={form.criticality_level} onChange={(v) => handleInput('criticality_level', v)} options={['Critical', 'Major', 'Minor']} />
                    <FormSelect label="Status" value={form.status} onChange={(v) => handleInput('status', v)} options={['Active', 'Maintenance', 'Inactive']} />
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Gedung / Lokasi</label>
                      <select
                        value={form.gedung_id}
                        onChange={(e) => handleInput('gedung_id', e.target.value)}
                        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                      >
                        <option value="">Tidak ada / Lepas dari gedung</option>
                        {gedungList.map((g) => (
                          <option key={g.id} value={g.id}>{g.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'maintenance' ? (
              <div className="space-y-4">
                {asset.maintenances.length === 0 ? (
                  <p className="text-gray-400 text-sm">Belum ada histori maintenance.</p>
                ) : (
                  asset.maintenances.map((m) => {
                    const isExpanded = expandedMaintId === m.id;
                    const currentStep = STATUS_STEP[m.status] ?? 0;
                    return (
                      <div key={m.id} className="border rounded-2xl overflow-hidden">
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
                              const done   = idx <= currentStep;
                              const active = idx === currentStep;
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

                        {isExpanded && (
                          <div className="border-t px-5 py-6 bg-gray-50">
                            {m.logs.length === 0 ? (
                              <p className="text-gray-400 text-sm">Tidak ada log tersedia untuk maintenance ini.</p>
                            ) : (
                              <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                                <div className="space-y-6">
                                  {m.logs.map((log, li) => {
                                    const step = STATUS_STEP[log.status] ?? 0;
                                    const dotColors = ['bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
                                    const dotColor = dotColors[step] ?? 'bg-gray-400';
                                    return (
                                      <div key={log.id} className="flex gap-5 relative">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0 shadow-sm z-10 ${dotColor}`}>
                                          {STEP_ICONS[step]}
                                        </div>
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
            ) : (
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

          {/* Footer */}
          {!loading && asset && (
            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t shrink-0">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium text-sm"
              >
                {activeTab === 'info' ? 'Batal' : 'Tutup'}
              </button>
              {activeTab === 'info' && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 font-semibold ${valueClass ?? 'text-[#111827]'}`}>{value}</p>
    </div>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
      />
    </div>
  );
}

function FormDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
      >
        <option value="">Pilih {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
