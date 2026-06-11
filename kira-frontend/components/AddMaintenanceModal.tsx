'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';
import type { MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type GedungOption = { id: string; nama: string; kode: string };

type TechnicianOption = { id: string; name: string; specialization: string; phone?: string | null; status: string };

type AssetOption = {
  id: string;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  type: string;
  status: string;
  criticality_level: string;
  gedung: { nama: string; kode: string } | null;
};

const emptyFormData = {
  id_asset: '',
  id_teknisi: '',
  maintenance_type: 'Preventive',
  cost: '',
  jenis_kerusakan: '',
  penyebab: '',
  spare_part_digunakan: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AssetSelect({ assets, selectedAsset, search, isLoading, error, onSearchChange, onSelect }: {
  assets: AssetOption[]; selectedAsset?: AssetOption; search: string;
  isLoading: boolean; error: string | null;
  onSearchChange: (v: string) => void; onSelect: (id: string) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium text-gray-700">Asset</label>
      <input
        type="text"
        placeholder="Cari aset berdasarkan nama, brand, kategori, atau tipe"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
      {selectedAsset && (
        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-blue-900">{selectedAsset.asset_name}</p>
              <p className="text-sm text-blue-700 mt-1">{selectedAsset.brand} — {selectedAsset.category} / {selectedAsset.sub_category}</p>
            </div>
            {selectedAsset.gedung && (
              <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{selectedAsset.gedung.nama}</span>
            )}
          </div>
        </div>
      )}
      <div className="mt-3 border border-gray-200 rounded-2xl overflow-hidden bg-white">
        {isLoading && <div className="p-4 text-gray-500 text-sm">Memuat aset...</div>}
        {!isLoading && error && <div className="p-4 text-red-600 bg-red-50 text-sm">{error}</div>}
        {!isLoading && !error && assets.length === 0 && <div className="p-4 text-gray-500 text-sm">Tidak ada aset untuk lokasi ini.</div>}
        {!isLoading && !error && assets.length > 0 && (
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {assets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => onSelect(asset.id)}
                className={`w-full text-left p-3.5 transition ${selectedAsset?.id === asset.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{asset.asset_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{asset.brand} — {asset.category} / {asset.sub_category}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {asset.gedung && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{asset.gedung.nama}</span>}
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{asset.status}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{asset.criticality_level}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, placeholder, value, onChange, type = 'text', hint }: {
  label: string; placeholder: string; value?: string; hint?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {hint && <span className="ml-1.5 text-xs text-violet-500 font-normal">{hint}</span>}
      </label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-black" />
    </div>
  );
}

function Select({ label, options, value, onChange }: {
  label: string; options: string[]; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select value={value} onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-black">
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: MaintenanceScheduledResult) => void;
}

export default function AddMaintenanceModal({ open, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gedung
  const [gedungList, setGedungList] = useState<GedungOption[]>([]);
  const [selectedGedung, setSelectedGedung] = useState<string>('');

  // Assets
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Technicians
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  const [formData, setFormData] = useState(emptyFormData);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setErrorMsg(null);
    setSelectedGedung('');
    setAssetSearch('');
    setFormData(emptyFormData);
  }, []);

  // Fetch lookup data each time the modal opens
  useEffect(() => {
    if (!open) return;
    reset();
    const token = authApi.getToken();
    const h = { Authorization: `Bearer ${token}` };

    setIsLoadingAssets(true);
    setAssetError(null);

    Promise.all([
      apiFetch('/api/gedung',       { headers: h }).then((r) => r.json()),
      apiFetch('/api/technicians',  { headers: h }).then((r) => r.json()),
      apiFetch('/api/assets?limit=all', { headers: h }).then((r) => r.json()),
    ])
      .then(([gedungData, techData, assetData]) => {
        setGedungList(gedungData.gedung || []);
        setTechnicians(techData.technicians || []);
        setAssets(assetData.data || []);
      })
      .catch((err) => setAssetError((err as Error).message || 'Gagal memuat data aset'))
      .finally(() => setIsLoadingAssets(false));
  }, [open, reset]);

  const handleInputChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleAssetSelect = (assetId: string) => {
    handleInputChange('id_asset', assetId);
  };

  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    let list = assets;
    if (selectedGedung) {
      const gedungNama = gedungList.find((g) => g.id === selectedGedung)?.nama;
      list = list.filter((a) => a.gedung?.nama === gedungNama);
    }
    if (!keyword) return list;
    return list.filter((a) =>
      [a.asset_name, a.brand, a.category, a.sub_category, a.type, a.status, a.criticality_level]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(keyword))
    );
  }, [assets, assetSearch, selectedGedung, gedungList]);

  const selectedAsset = assets.find((a) => a.id === formData.id_asset);

  if (!open) return null;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!formData.id_asset || !formData.id_teknisi) {
      setErrorMsg('Asset dan Teknisi harus diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = authApi.getToken();
      const response = await apiFetch('/api/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          jenis_kerusakan:      formData.jenis_kerusakan      || undefined,
          penyebab:             formData.penyebab             || undefined,
          spare_part_digunakan: formData.spare_part_digunakan || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || err?.details || 'Failed to create maintenance');
      }
      const result = await response.json();

      onClose();
      onSuccess({
        predicted_rul: result.data?.predicted_rul ?? 0,
        predicted_severity: result.data?.predicted_severity ?? null,
        severity_confidence: result.data?.severity_confidence ?? null,
        asset_name: selectedAsset?.asset_name ?? 'Aset',
        brand: selectedAsset?.brand ?? '',
        category: selectedAsset?.category ?? '',
        sub_category: selectedAsset?.sub_category ?? '',
        gedung_nama: selectedAsset?.gedung?.nama ?? '',
        criticality_level: selectedAsset?.criticality_level ?? '',
      });
    } catch (error) {
      setErrorMsg((error as Error).message || 'Gagal menjadwalkan maintenance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn transition-all duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-8 pb-5 border-b shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Jadwalkan Maintenance</h2>
            <p className="text-gray-500 text-sm mt-0.5">Buat catatan maintenance baru untuk sebuah aset</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8">
          {/* Error banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-auto shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Step 1: Pilih Gedung ──────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
              <h2 className="text-base font-semibold text-gray-800">Pilih Lokasi Gedung</h2>
              <span className="text-xs text-gray-400">(opsional — untuk filter aset &amp; memperkaya prediksi RUL)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => { setSelectedGedung(''); handleInputChange('id_asset', ''); setAssetSearch(''); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                  selectedGedung === '' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Semua Gedung
              </button>
              {gedungList.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setSelectedGedung(g.id); handleInputChange('id_asset', ''); setAssetSearch(''); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                    selectedGedung === g.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {g.nama}
                </button>
              ))}
            </div>
            {selectedGedung && (
              <p className="mt-2 text-xs text-blue-600">
                Menampilkan aset di {gedungList.find((g) => g.id === selectedGedung)?.nama ?? '—'}
                {' · '}
                <button type="button" className="underline" onClick={() => { setSelectedGedung(''); handleInputChange('id_asset', ''); setAssetSearch(''); }}>
                  Tampilkan semua
                </button>
              </p>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* ── Step 2: Detail ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
              <h2 className="text-base font-semibold text-gray-800">Detail Maintenance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AssetSelect
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                search={assetSearch}
                isLoading={isLoadingAssets}
                error={assetError}
                onSearchChange={setAssetSearch}
                onSelect={handleAssetSelect}
              />

              <Select label="Maintenance Type" value={formData.maintenance_type}
                onChange={(e) => handleInputChange('maintenance_type', e.target.value)}
                options={['Preventive', 'Corrective', 'Predictive', 'Condition-Based']} />

              <Input label="Maintenance Cost (Biaya Perbaikan)" placeholder="contoh: 500000"
                type="number" value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)} />

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Teknisi <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.id_teknisi}
                  onChange={(e) => handleInputChange('id_teknisi', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">— Pilih Teknisi —</option>
                  {technicians.filter(t => t.status !== 'Tidak Aktif').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.specialization}{t.phone ? ` · ${t.phone}` : ''}
                    </option>
                  ))}
                </select>
                {formData.id_teknisi && (() => {
                  const tech = technicians.find(t => t.id === formData.id_teknisi);
                  return tech ? (
                    <div className="mt-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                      <span className="font-semibold">{tech.name}</span>
                      <span className="text-blue-500"> · {tech.specialization}</span>
                      {tech.phone && <span className="text-blue-400"> · {tech.phone}</span>}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* ── Field untuk klasifikasi severity AI ── */}
              <Input label="Jenis Kerusakan" hint="(untuk prediksi severity)"
                placeholder="contoh: Mati mendadak, Kebocoran, Retak/pecah"
                value={formData.jenis_kerusakan}
                onChange={(e) => handleInputChange('jenis_kerusakan', e.target.value)} />

              <Input label="Penyebab" hint="(untuk prediksi severity)"
                placeholder="contoh: Overload, Kelembaban tinggi, Usia pakai"
                value={formData.penyebab}
                onChange={(e) => handleInputChange('penyebab', e.target.value)} />

              <div className="md:col-span-2">
                <Input label="Spare Part Digunakan" hint="(opsional)"
                  placeholder="contoh: PCB board, Seal ring, Kompresor"
                  value={formData.spare_part_digunakan}
                  onChange={(e) => handleInputChange('spare_part_digunakan', e.target.value)} />
              </div>
            </div>

            {formData.jenis_kerusakan && formData.penyebab && (
              <p className="mt-3 text-xs text-violet-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                AI akan memprediksi severity secara otomatis berdasarkan informasi ini.
              </p>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex gap-4 px-10 py-6 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-3.5 rounded-2xl font-medium text-center"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingAssets || assets.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-3.5 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? 'Menyimpan...' : 'Jadwalkan Maintenance'}
          </button>
        </div>
      </div>
    </div>
  );
}
