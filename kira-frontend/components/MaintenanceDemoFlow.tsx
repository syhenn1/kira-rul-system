'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MaintenanceScheduledModal, { type MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ASSET_NAME = 'Pompa Air Grundfos';

const MOCK_RESULT: MaintenanceScheduledResult = {
  predicted_rul: 412,
  predicted_severity: 'Medium',
  severity_confidence: 0.81,
  asset_name: 'Pompa Air Grundfos',
  brand: 'Grundfos',
  category: 'Mechanical',
  sub_category: 'Pompa',
  gedung_nama: 'Gedung A',
  criticality_level: 'Major',
};

const FORM_FIELDS = [
  { label: 'Tipe Maintenance', value: 'Corrective' },
  { label: 'Tanggal',          value: '2026-07-10' },
  { label: 'Teknisi',          value: 'Ahmad Teknisi' },
  { label: 'Biaya (Rp)',       value: '500.000' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function MockFormField({ label, value, show }: { label: string; value: string; show: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div
        className={`w-full mt-1.5 border rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${
          show
            ? 'border-gray-100 bg-white text-gray-900'
            : 'border-dashed border-gray-200 text-gray-300'
        }`}
      >
        {show ? value : '—'}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Demo steps:
 * 0 = closed (floating button shown)
 * 1 = modal open, asset search input highlighted/focused
 * 2 = "Pompa Air Grundfos" typing char-by-char into search box
 * 3 = asset card appears selected
 * 4 = right-side form fields fill in sequence
 * 5 = "Simpan & Prediksi" pulses, AI progress bar runs 0→100%
 * 6 = severity result "Medium ✓" badge shown inside form
 * 7 = MaintenanceScheduledModal with mock result
 */
export default function MaintenanceDemoFlow() {
  const [demo, setDemo]               = useState(0);
  const [typedSearch, setTypedSearch] = useState('');
  const [assetSelected, setAssetSelected] = useState(false);
  const [fieldsVisible, setFieldsVisible] = useState([false, false, false, false]);
  const [aiProgress, setAiProgress]   = useState(0);
  const [showSeverity, setShowSeverity] = useState(false);
  const [showResult, setShowResult]   = useState(false);

  const startDemo = () => {
    setDemo(1);
    setTypedSearch('');
    setAssetSelected(false);
    setFieldsVisible([false, false, false, false]);
    setAiProgress(0);
    setShowSeverity(false);
    setShowResult(false);
  };

  const closeDemo = () => {
    setDemo(0);
    setShowResult(false);
  };

  // ── State machine ──────────────────────────────────────────────────────────

  // Step 1 → 2: after 800ms, start typing
  useEffect(() => {
    if (demo !== 1) return;
    const t = setTimeout(() => setDemo(2), 800);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 2: type asset name char-by-char
  useEffect(() => {
    if (demo !== 2) return;
    let i = 0;
    setTypedSearch('');
    const iv = setInterval(() => {
      i++;
      setTypedSearch(MOCK_ASSET_NAME.slice(0, i));
      if (i >= MOCK_ASSET_NAME.length) {
        clearInterval(iv);
        // after typing done, wait 400ms then show asset card
        setTimeout(() => setDemo(3), 400);
      }
    }, 65);
    return () => clearInterval(iv);
  }, [demo]);

  // Step 3: asset card selected, then after 900ms move to step 4
  useEffect(() => {
    if (demo !== 3) return;
    setAssetSelected(true);
    const t = setTimeout(() => setDemo(4), 900);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 4: form fields fill in sequence, then move to step 5
  useEffect(() => {
    if (demo !== 4) return;
    const timers = [
      setTimeout(() => setFieldsVisible((p) => [true,  p[1], p[2], p[3]]), 300),
      setTimeout(() => setFieldsVisible((p) => [p[0], true,  p[2], p[3]]), 900),
      setTimeout(() => setFieldsVisible((p) => [p[0], p[1], true,  p[3]]), 1500),
      setTimeout(() => setFieldsVisible((p) => [p[0], p[1], p[2], true ]), 2100),
      setTimeout(() => setDemo(5), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [demo]);

  // Step 5: AI progress bar runs 0→100% over ~2s, then step 6
  useEffect(() => {
    if (demo !== 5) return;
    setAiProgress(0);
    const start = Date.now();
    const duration = 2000;
    const raf = { id: 0 };
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setAiProgress(pct);
      if (pct < 100) {
        raf.id = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDemo(6), 300);
      }
    };
    raf.id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.id);
  }, [demo]);

  // Step 6: show severity badge, then after 1800ms open result modal
  useEffect(() => {
    if (demo !== 6) return;
    setShowSeverity(true);
    const t = setTimeout(() => { setDemo(7); setShowResult(true); }, 1800);
    return () => clearTimeout(t);
  }, [demo]);

  const modalOpen = demo >= 1 && demo <= 6;

  if (typeof document === 'undefined') return null;

  // ── Floating button (not portal) ───────────────────────────────────────────
  const floatingButton = demo === 0 ? (
    <button
      onClick={startDemo}
      className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-2xl shadow-black/30 transition-all hover:-translate-y-0.5 text-sm"
    >
      ▶ Demo: Jadwal Maintenance
    </button>
  ) : null;

  // ── Modal (portal) ─────────────────────────────────────────────────────────
  const modal = modalOpen ? createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out_both]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">Jadwalkan Maintenance</h2>
                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2.5 py-0.5 rounded-full">DEMO</span>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">Buat catatan maintenance baru untuk sebuah aset</p>
            </div>
          </div>
          <button
            onClick={closeDemo}
            className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — two-column */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row h-full min-h-0">

            {/* Left — asset search + form fields (2/3) */}
            <div className="flex-1 px-8 py-6 space-y-6 border-b md:border-b-0 md:border-r border-gray-100">

              {/* Asset search */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Cari Aset</label>
                <div
                  className={`w-full border rounded-2xl px-4 py-3 text-sm flex items-center transition-all duration-300 ${
                    demo === 1 ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/30' : 'border-gray-100'
                  }`}
                >
                  <span className="text-gray-900">
                    {typedSearch}
                    {demo === 2 && typedSearch.length < MOCK_ASSET_NAME.length && (
                      <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle" />
                    )}
                    {demo === 1 && typedSearch.length === 0 && (
                      <span className="text-gray-400">Cari aset berdasarkan nama, brand, kategori...</span>
                    )}
                  </span>
                </div>

                {/* Asset card — shown at step 3+ */}
                {assetSelected && (
                  <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 animate-[fadeIn_0.3s_ease-out_both]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-blue-900 text-sm">{MOCK_ASSET_NAME}</p>
                        <p className="text-xs text-blue-600 mt-1">Grundfos · Mechanical / Pompa / Pompa Transfer</p>
                      </div>
                      <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        Gedung A
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form fields — shown at step 4+ */}
              {demo >= 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {FORM_FIELDS.map((field, i) => (
                    <MockFormField key={field.label} label={field.label} value={field.value} show={fieldsVisible[i]} />
                  ))}
                </div>
              )}

              {/* Severity result — step 6 */}
              {showSeverity && (
                <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 animate-[fadeIn_0.3s_ease-out_both]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border border-yellow-300 bg-yellow-100 text-yellow-700">
                    Medium ✓
                  </span>
                  <div>
                    <p className="text-xs font-medium text-yellow-700">Prediksi Severity</p>
                    <p className="text-xs text-yellow-600">Confidence: 81%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — summary card (1/3) */}
            <div className="w-full md:w-72 shrink-0 px-6 py-6 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Ringkasan</p>

              <div className="space-y-3">
                {/* Asset summary */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs text-gray-400 mb-1">Aset</p>
                  {assetSelected ? (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">{MOCK_ASSET_NAME}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Grundfos · Mechanical · Pompa</p>
                      <span className="mt-2 inline-block text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                        Gedung A
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-gray-300">Belum dipilih</p>
                  )}
                </div>

                {/* Form values summary */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
                  <p className="text-xs text-gray-400 mb-2">Detail</p>
                  {FORM_FIELDS.map((field, i) => (
                    <div key={field.label} className="flex justify-between text-xs">
                      <span className="text-gray-400">{field.label}</span>
                      <span className={`font-medium ${fieldsVisible[i] ? 'text-gray-800' : 'text-gray-200'}`}>
                        {fieldsVisible[i] ? field.value : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI progress — step 5 */}
                {demo >= 5 && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-violet-700">AI Prediksi Severity</span>
                      <span className="text-xs text-violet-500">{aiProgress}%</span>
                    </div>
                    <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-100"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-8 py-5 border-t border-gray-100 shrink-0">
          <button
            onClick={closeDemo}
            className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-3 rounded-2xl font-medium text-sm text-center"
          >
            Batal
          </button>
          <button
            className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-medium text-sm shadow-lg shadow-blue-600/20 transition ${
              demo >= 5 ? 'animate-[pulseRing_1.5s_infinite]' : ''
            }`}
          >
            {demo >= 5 && demo < 6 ? 'Menyimpan...' : 'Simpan & Prediksi'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ── Result modal (portal) ──────────────────────────────────────────────────
  const resultModal = showResult
    ? createPortal(
        <MaintenanceScheduledModal
          result={MOCK_RESULT}
          onAddAnother={closeDemo}
          onViewAll={closeDemo}
        />,
        document.body
      )
    : null;

  return (
    <>
      {floatingButton}
      {modal}
      {resultModal}
    </>
  );
}
