'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, animate as fmAnimate, type Variants } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── RUL zone config (unit: hari) ──────────────────────────────────────────────
const MAX_RUL_DAYS = 1825; // 5 tahun = 60 bulan × 30.4 hari

function getRulZone(rul: number) {
  if (rul <= 90)  return { label: 'Kritis',  color: 'text-red-500',     ringColor: '#ef4444', bar: 'bg-red-500',     ring: 'ring-red-200',     bg: 'bg-red-50',     rec: 'Segera jadwalkan penggantian atau perbaikan besar. Risiko kegagalan tinggi dalam 3 bulan ke depan.' };
  if (rul <= 180) return { label: 'Tinggi',  color: 'text-orange-500',  ringColor: '#f97316', bar: 'bg-orange-500',  ring: 'ring-orange-200',  bg: 'bg-orange-50',  rec: 'Maintenance mendesak diperlukan dalam 3–6 bulan ke depan sebelum kondisi memburuk.' };
  if (rul <= 365) return { label: 'Sedang',  color: 'text-yellow-600',  ringColor: '#ca8a04', bar: 'bg-yellow-500',  ring: 'ring-yellow-200',  bg: 'bg-yellow-50',  rec: 'Pantau kondisi aset secara berkala dan rencanakan maintenance dalam 6–12 bulan.' };
  return           { label: 'Baik',    color: 'text-emerald-600', ringColor: '#10b981', bar: 'bg-emerald-500', ring: 'ring-emerald-200', bg: 'bg-emerald-50', rec: 'Aset dalam kondisi baik. Lanjutkan program maintenance preventif sesuai jadwal.' };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GedungOption = { id: string; nama: string; kode: string };

type LookupRef = { id: string; kode: string; nama: string } | null;

type AssetOption = {
  id: string;
  asset_name: string;
  status: string;
  criticality_level: string;
  gedung_id: string | null;
  gedung:      { id: string; nama: string } | null;
  merk:        LookupRef;
  kategori:    LookupRef;
  subKategori: LookupRef;
  tipe:        LookupRef;
};

type RULResult = {
  predicted_rul: number;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  gedung_nama: string;
  criticality_level: string;
};

// ── RUL Result Modal ──────────────────────────────────────────────────────────

function RULResultModal({ result, onGoToList, onClose }: {
  result: RULResult;
  onGoToList: () => void;
  onClose: () => void;
}) {
  const [displayRUL, setDisplayRUL] = useState(0);
  const rul = result.predicted_rul;
  const zone = getRulZone(rul);
  const pct = Math.min(100, Math.max(0, Math.round((rul / MAX_RUL_DAYS) * 100)));
  const circumference = 2 * Math.PI * 34;
  const strokeOffset = circumference * (1 - pct / 100);

  useEffect(() => {
    const controls = fmAnimate(0, rul, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayRUL(Math.round(v)),
    });
    return () => controls.stop();
  }, [rul]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.82, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      >
        {/* Asset image placeholder */}
        <div className="relative h-44 bg-linear-to-br from-blue-100 to-violet-100 flex items-center justify-center shrink-0">
          <div className="flex flex-col items-center gap-2 text-blue-400">
            <div className="w-20 h-20 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-4xl shadow-sm">
              🏗️
            </div>
            <span className="text-xs font-medium text-blue-500">Foto Aset</span>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition"
          >
            <X size={15} className="text-gray-600" />
          </button>
          {/* Success badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-gray-700">Maintenance Berhasil Dijadwalkan</span>
          </div>
        </div>

        {/* Scrollable body */}
        <motion.div
          className="overflow-y-auto px-6 py-5 space-y-4 flex-1"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Asset name */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-bold text-gray-900 truncate">{result.asset_name}</h2>
          </motion.div>

          {/* Asset info grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {result.gedung_nama && <InfoRow label="Gedung" value={result.gedung_nama} />}
            {result.brand && <InfoRow label="Brand" value={result.brand} />}
            {result.category && <InfoRow label="Kategori" value={result.category} />}
            {result.sub_category && <InfoRow label="Sub Kategori" value={result.sub_category} />}
            {result.criticality_level && <InfoRow label="Kekritisan" value={result.criticality_level} />}
          </motion.div>

          {/* RUL — purple background */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 p-5 text-white"
          >
            <p className="text-xs text-violet-200 font-medium tracking-wide uppercase mb-1">Prediksi Sisa Umur (RUL)</p>
            <div className="flex items-center gap-4">
              {/* SVG ring */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <motion.circle
                    cx="40" cy="40" r="34" fill="none"
                    strokeWidth="8" strokeLinecap="round"
                    stroke="white"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: strokeOffset }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{pct}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tabular-nums leading-none">{displayRUL.toLocaleString()}</span>
                  <span className="text-violet-200 font-medium text-base">hari</span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-xs font-semibold text-white">Kondisi: {zone.label}</span>
                </div>
              </div>
            </div>

            {/* Progress bar inside purple card */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-violet-200 mb-1">
                <span>Sisa umur</span>
                <span>{rul.toLocaleString()} / {MAX_RUL_DAYS.toLocaleString()} hari</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Recommendation */}
          <motion.div
            variants={itemVariants}
            className="flex gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-600 leading-relaxed">{zone.rec}</p>
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex gap-3 pb-2">
            <motion.button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 transition py-3 rounded-xl font-medium text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Tutup
            </motion.button>
            <motion.button
              onClick={onGoToList}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Lihat Daftar Maintenance
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="font-medium text-gray-800 truncate text-sm">{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AddMaintenancePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rulResult, setRulResult] = useState<RULResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gedung
  const [gedungList, setGedungList] = useState<GedungOption[]>([]);
  const [selectedGedung, setSelectedGedung] = useState<string>('');

  // Assets
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);

  const [preselectedAssetId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('assetId') || '';
  });
  const [preselectedAssetError, setPreselectedAssetError] = useState<string | null>(null);
  const [hasAppliedPreselectedAsset, setHasAppliedPreselectedAsset] = useState(false);

  const [formData, setFormData] = useState({
    id_asset: '',
    maintenance_type: 'Preventive',
    severity: 'Medium',
    scheduled_date: '',
    completion_date: '',
    cost: '',
    status: 'Scheduled',
  });

  const handleInputChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleAssetSelect = (assetId: string) => {
    setPreselectedAssetError(null);
    handleInputChange('id_asset', assetId);
  };

  // Fetch gedung list
  useEffect(() => {
    const token = localStorage.getItem('kira_token');
    fetch(`${API_URL}/api/gedung`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setGedungList(d.gedung || []))
      .catch(() => {});
  }, []);

  // Fetch assets
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setIsLoadingAssets(true);
      setAssetError(null);
      try {
        const token = localStorage.getItem('kira_token');
        const response = await fetch(`${API_URL}/api/assets`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || err?.details || 'Failed to fetch assets');
        }
        const result = await response.json();
        setAssets(result.data || []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setAssetError((error as Error).message);
      } finally {
        setIsLoadingAssets(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Apply preselected asset from URL
  useEffect(() => {
    if (!preselectedAssetId || isLoadingAssets || assetError || hasAppliedPreselectedAsset) return;
    const matchedAsset = assets.find((a) => a.id === preselectedAssetId);
    let isActive = true;
    queueMicrotask(() => {
      if (!isActive) return;
      if (matchedAsset) {
        setFormData((prev) => ({ ...prev, id_asset: matchedAsset.id }));
        setAssetSearch(matchedAsset.asset_name);
        if (matchedAsset.gedung_id) setSelectedGedung(matchedAsset.gedung_id);
        setPreselectedAssetError(null);
      } else {
        setPreselectedAssetError('Aset dari link tidak tersedia untuk akun Anda. Pilih aset lain.');
      }
      setHasAppliedPreselectedAsset(true);
    });
    return () => { isActive = false; };
  }, [assetError, assets, hasAppliedPreselectedAsset, isLoadingAssets, preselectedAssetId]);

  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    let list = assets;
    if (selectedGedung) list = list.filter((a) => a.gedung_id === selectedGedung);
    if (!keyword) return list;
    return list.filter((a) =>
      [a.asset_name, a.merk?.nama, a.kategori?.nama, a.subKategori?.nama, a.tipe?.nama, a.status, a.criticality_level]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(keyword))
    );
  }, [assets, assetSearch, selectedGedung]);

  const selectedAsset = assets.find((a) => a.id === formData.id_asset);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!formData.id_asset || !formData.scheduled_date) {
      setErrorMsg('Asset dan Scheduled Date harus diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = authApi.getToken();
      const response = await apiFetch('/api/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || err?.details || 'Failed to create maintenance');
      }
      const result = await response.json();
      const gedungName = selectedAsset?.gedung?.nama
        ?? (selectedAsset?.gedung_id ? gedungList.find((g) => g.id === selectedAsset.gedung_id)?.nama : '') ?? '';
      setRulResult({
        predicted_rul: result.data?.predicted_rul ?? 0,
        asset_name: selectedAsset?.asset_name ?? 'Aset',
        brand: selectedAsset?.merk?.nama ?? '',
        category: selectedAsset?.kategori?.nama ?? '',
        sub_category: selectedAsset?.subKategori?.nama ?? '',
        gedung_nama: gedungName,
        criticality_level: selectedAsset?.criticality_level ?? '',
      });
    } catch (error) {
      setErrorMsg((error as Error).message || 'Gagal menjadwalkan maintenance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      {/* RUL Result Modal — wrapped in AnimatePresence for enter/exit animation */}
      <AnimatePresence>
        {rulResult && (
          <RULResultModal
            result={rulResult}
            onGoToList={() => router.push('/maintenance')}
            onClose={() => { setRulResult(null); router.push('/maintenance'); }}
          />
        )}
      </AnimatePresence>

      <main className="flex min-h-screen bg-[#F5F7FB]">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* HEADER */}
          <div className="flex items-center gap-4 mt-8">
            <Link
              href="/maintenance"
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center hover:bg-gray-50 transition text-xl"
            >
              ←
            </Link>
            <div>
              <h1 className="text-5xl font-bold text-[#111827]">Schedule Maintenance</h1>
              <p className="text-gray-500 mt-3 text-lg">Create a new maintenance record for an asset</p>
            </div>
          </div>

          {/* FORM CARD */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 mt-8 max-w-4xl space-y-8">
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
                  notice={preselectedAssetError}
                  onSearchChange={setAssetSearch}
                  onSelect={handleAssetSelect}
                />

                <div>
                  <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                    className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                <Select label="Maintenance Type" value={formData.maintenance_type}
                  onChange={(e) => handleInputChange('maintenance_type', e.target.value)}
                  options={['Preventive', 'Corrective', 'Predictive', 'Condition-Based']} />

                <Select label="Severity" value={formData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                  options={['Low', 'Medium', 'High', 'Critical']} />

                <Select label="Status" value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={['Scheduled', 'In Progress', 'Completed']} />

                <div>
                  <label className="text-sm font-medium text-gray-700">Completion Date (Tanggal Selesai)</label>
                  <input
                    type="datetime-local"
                    value={formData.completion_date}
                    onChange={(e) => handleInputChange('completion_date', e.target.value)}
                    className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                <Input label="Maintenance Cost (Biaya Perbaikan)" placeholder="e.g. 500000"
                  type="number" value={formData.cost}
                  onChange={(e) => handleInputChange('cost', e.target.value)} />
              </div>
            </section>

            {/* ACTIONS */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <Link href="/maintenance"
                className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-4 rounded-2xl font-medium text-center">
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoadingAssets || assets.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? 'Saving...' : 'Schedule Maintenance'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AssetSelect({ assets, selectedAsset, search, isLoading, error, notice, onSearchChange, onSelect }: {
  assets: AssetOption[]; selectedAsset?: AssetOption; search: string;
  isLoading: boolean; error: string | null; notice: string | null;
  onSearchChange: (v: string) => void; onSelect: (id: string) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium text-gray-700">Asset</label>
      <input
        type="text"
        placeholder="Search asset by name, brand, category, or type"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
      {selectedAsset && (
        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-blue-900">{selectedAsset.asset_name}</p>
              <p className="text-sm text-blue-700 mt-1">{selectedAsset.merk?.nama} — {selectedAsset.kategori?.nama} / {selectedAsset.subKategori?.nama}</p>
            </div>
            {selectedAsset.gedung && (
              <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{selectedAsset.gedung.nama}</span>
            )}
          </div>
        </div>
      )}
      {notice && <div className="mt-3 rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">{notice}</div>}
      <div className="mt-3 border border-gray-200 rounded-2xl overflow-hidden bg-white">
        {isLoading && <div className="p-4 text-gray-500">Loading assets...</div>}
        {!isLoading && error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
        {!isLoading && !error && assets.length === 0 && <div className="p-4 text-gray-500">No assets available for this location.</div>}
        {!isLoading && !error && assets.length > 0 && (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {assets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => onSelect(asset.id)}
                className={`w-full text-left p-4 transition ${selectedAsset?.id === asset.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{asset.asset_name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{asset.merk?.nama} — {asset.kategori?.nama} / {asset.subKategori?.nama}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {asset.gedung && <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{asset.gedung.nama}</span>}
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{asset.status}</span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{asset.criticality_level}</span>
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

function Input({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black" />
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
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black">
        <option value="">Select {label}</option>
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  );
}
