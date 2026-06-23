'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wrench, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import MaintenanceScheduledModal, { type MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ASSET   = 'AC Daikin Lantai 3';
const MOCK_TITLE   = 'AC tidak dingin sama sekali';
const MOCK_DESC    = 'AC di lantai 3 sudah 2 hari tidak mengeluarkan udara dingin. Sudah dicoba reset tapi tidak berhasil.';
const MOCK_TEKNISI = 'Ahmad Teknisi (Mechanical)';

const MOCK_FORM_FIELDS = [
  { label: 'Jenis Kerusakan',  value: 'Refrigerant bocor' },
  { label: 'Penyebab',         value: 'Kelalaian perawatan berkala' },
  { label: 'Tipe Maintenance', value: 'Corrective' },
  { label: 'Biaya (Rp)',       value: '750.000' },
];

const MOCK_RESULT: MaintenanceScheduledResult = {
  predicted_rul: 290,
  predicted_severity: 'High',
  severity_confidence: 0.88,
  asset_name: MOCK_ASSET,
  brand: 'Daikin',
  category: 'Electrical',
  sub_category: 'HVAC',
  gedung_nama: 'Gedung C',
  criticality_level: 'Critical',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MockField({ label, value, show }: { label: string; value: string; show: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className={`w-full mt-1.5 border rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${
        show ? 'border-gray-100 bg-white text-gray-900' : 'border-dashed border-gray-200 text-gray-300'
      }`}>
        {show ? value : '—'}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Demo steps (admin actions on a ticket):
 * 0 = closed (floating button)
 * 1 = ticket detail panel slides in (Open / unassigned)
 * 2 = status dropdown changes to "In Progress"
 * 3 = teknisi dropdown shows "Ahmad Teknisi"
 * 4 = "Simpan Update" pulses → saved badge shows
 * 5 = "Buat Maintenance" button pulses
 * 6 = maintenance form modal opens
 * 7 = form fields fill in sequence
 * 8 = "Simpan & Prediksi" pulses / loading
 * 9 = MaintenanceScheduledModal result (RUL 290 hari)
 */
export default function TicketDemoFlow() {
  const [demo, setDemo] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Open');
  const [teknisiFilled, setTeknisiFilled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldsVisible, setFieldsVisible] = useState([false, false, false, false]);
  const [showResult, setShowResult] = useState(false);

  const startDemo = () => {
    setDemo(1);
    setCurrentStatus('Open');
    setTeknisiFilled(false);
    setSaved(false);
    setFieldsVisible([false, false, false, false]);
    setShowResult(false);
  };

  const closeDemo = () => { setDemo(0); setShowResult(false); };

  // ── State machine ──────────────────────────────────────────────────────────

  // Step 1 → 2: after 1200ms change status
  useEffect(() => {
    if (demo !== 1) return;
    const t = setTimeout(() => setDemo(2), 1200);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 2: change status, then step 3
  useEffect(() => {
    if (demo !== 2) return;
    setCurrentStatus('In Progress');
    const t = setTimeout(() => setDemo(3), 800);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 3: fill teknisi, then step 4
  useEffect(() => {
    if (demo !== 3) return;
    setTeknisiFilled(true);
    const t = setTimeout(() => setDemo(4), 800);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 4: save → show saved badge, then step 5
  useEffect(() => {
    if (demo !== 4) return;
    const t1 = setTimeout(() => setSaved(true), 700);
    const t2 = setTimeout(() => setDemo(5), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [demo]);

  // Step 5 → 6: maintenance button pulses, then form opens
  useEffect(() => {
    if (demo !== 5) return;
    const t = setTimeout(() => setDemo(6), 1000);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 6 → 7: form opens, then fields start filling
  useEffect(() => {
    if (demo !== 6) return;
    const t = setTimeout(() => setDemo(7), 500);
    return () => clearTimeout(t);
  }, [demo]);

  // Step 7: fill form fields one by one, then step 8
  useEffect(() => {
    if (demo !== 7) return;
    const timers = [
      setTimeout(() => setFieldsVisible((p) => [true,  p[1], p[2], p[3]]), 400),
      setTimeout(() => setFieldsVisible((p) => [p[0], true,  p[2], p[3]]), 1000),
      setTimeout(() => setFieldsVisible((p) => [p[0], p[1], true,  p[3]]), 1600),
      setTimeout(() => setFieldsVisible((p) => [p[0], p[1], p[2], true ]), 2200),
      setTimeout(() => setDemo(8), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [demo]);

  // Step 8 → 9: loading, then show result
  useEffect(() => {
    if (demo !== 8) return;
    const t = setTimeout(() => { setDemo(9); setShowResult(true); }, 1500);
    return () => clearTimeout(t);
  }, [demo]);

  const panelOpen = demo >= 1 && demo <= 5;
  const formOpen  = demo >= 6 && demo <= 8;

  if (typeof document === 'undefined') return null;

  // ── Floating button (not portal) ───────────────────────────────────────────
  const floatingButton = demo === 0 ? (
    <button
      onClick={startDemo}
      className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-2xl shadow-black/30 transition-all hover:-translate-y-0.5 text-sm"
    >
      ▶ Demo: Aksi Ticket
    </button>
  ) : null;

  // ── Detail panel (portal) ──────────────────────────────────────────────────
  const detailPanel = panelOpen ? createPortal(
    <div className="fixed inset-0 z-9999 panel-bg-fade">
      <div className="absolute inset-0 bg-black/50" onClick={closeDemo} />

      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col panel-slide-in">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-orange-200 bg-orange-100 text-orange-700">
                <AlertCircle size={11} /> High
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-500 ${
                currentStatus === 'In Progress'
                  ? 'border border-yellow-200 bg-yellow-100 text-yellow-700'
                  : 'border border-blue-200 bg-blue-50 text-blue-700'
              }`}>
                <Clock size={11} />
                {currentStatus}
              </span>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2.5 py-0.5 rounded-full ml-auto">DEMO</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{MOCK_TITLE}</h2>
          </div>
          <button onClick={closeDemo} className="ml-4 w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-xs text-gray-400">Aset</p>
              <p className="mt-1 font-semibold text-gray-800 text-sm">{MOCK_ASSET}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-xs text-gray-400">Reporter</p>
              <p className="mt-1 font-semibold text-gray-800 text-sm">Budi Santoso</p>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3 col-span-2">
              <p className="text-xs text-gray-400 mb-1">Deskripsi</p>
              <p className="text-sm text-gray-700 leading-relaxed">{MOCK_DESC}</p>
            </div>
          </div>

          {/* Update form */}
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Update Ticket</p>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div className={`w-full mt-1.5 border rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-500 ${
                currentStatus === 'In Progress'
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  : 'border-gray-200 text-gray-700'
              }`}>
                {currentStatus}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tugaskan Teknisi</label>
              <div className={`w-full mt-1.5 border rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${
                teknisiFilled
                  ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-400'
              }`}>
                {teknisiFilled ? MOCK_TEKNISI : '— Belum Ditugaskan —'}
              </div>
            </div>
          </div>

          {/* Saved badge */}
          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 animate-[fadeIn_0.3s_ease-out_both]">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-700">Ticket diperbarui!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 shrink-0 space-y-2">
          <button
            className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold text-sm shadow-lg shadow-emerald-600/20 transition ${
              demo === 5 ? 'animate-pulse' : ''
            }`}
          >
            <Wrench size={16} />
            Buat Maintenance dari Ticket
          </button>
          <button
            className={`w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium transition ${
              demo === 4 ? 'animate-pulse bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'
            }`}
          >
            {demo === 4 ? '✓ Simpan Update' : 'Simpan Update'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ── Maintenance form (portal) ──────────────────────────────────────────────
  const maintenanceForm = formOpen ? createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out_both]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900">Buat Maintenance dari Ticket</h2>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2.5 py-0.5 rounded-full">DEMO</span>
            </div>
            <p className="text-gray-400 text-sm mt-0.5">
              <span className="text-blue-600 font-medium">{MOCK_TITLE}</span>
              {' · '}
              <span className="text-gray-500">{MOCK_ASSET}</span>
            </p>
          </div>
          <button onClick={closeDemo} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_FORM_FIELDS.map((field, i) => (
              <MockField key={field.label} label={field.label} value={field.value} show={fieldsVisible[i]} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-8 py-5 border-t border-gray-100 shrink-0">
          <button onClick={closeDemo} className="flex-1 border border-gray-100 text-gray-600 hover:bg-gray-50 transition py-3 rounded-2xl font-medium text-sm">
            Batal
          </button>
          <button
            className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-medium text-sm shadow-lg shadow-blue-600/20 transition ${
              demo === 8 ? 'animate-pulse' : ''
            }`}
          >
            {demo === 8 ? 'Menyimpan & Memprediksi...' : 'Simpan & Prediksi RUL'}
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
      {detailPanel}
      {maintenanceForm}
      {resultModal}
    </>
  );
}
