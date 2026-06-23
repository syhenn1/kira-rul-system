'use client';

import { useState, useEffect } from 'react';
import { X, BrainCircuit, Plus, Cpu, CheckCircle2, ChevronRight, LayoutDashboard, Package, Wrench, Bell, FileText } from 'lucide-react';

const ASSET_NAME = 'AC Daikin Lantai 3';

const STAT_CARDS = [
  { label: 'Total Aset',       value: '48', color: 'text-blue-600',   tip: 'Jumlah seluruh aset terdaftar di sistem' },
  { label: 'In Use',           value: '31', color: 'text-green-600',  tip: 'Aset yang sedang aktif digunakan' },
  { label: 'Maintenance',      value: '9',  color: 'text-yellow-600', tip: 'Aset dalam proses perbaikan' },
  { label: 'Perlu Perhatian',  value: '8',  color: 'text-red-600',    tip: 'RUL kritis ≤ 365 hari — segera ditangani' },
];

const STEP_LABELS = ['Dashboard', 'Tooltip', 'Buka Form', 'Isi Data', 'AI Prediksi', 'Hasil'];

export default function DemoSimulator() {
  const [open, setOpen]             = useState(false);
  const [step, setStep]             = useState(0);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [typedName, setTypedName]   = useState('');
  const [aiProgress, setAiProgress] = useState(0);
  const [showForm, setShowForm]     = useState(false);

  const resetAndOpen = () => {
    setStep(0); setActiveCard(null);
    setTypedName(''); setAiProgress(0); setShowForm(false);
    setOpen(true);
  };

  // Step 0 — highlight each stat card
  useEffect(() => {
    if (!open || step !== 0) return;
    const ts = [0, 1, 2, 3].map((i) => setTimeout(() => setActiveCard(i), i * 750 + 400));
    const next = setTimeout(() => { setActiveCard(null); setStep(1); }, 3800);
    return () => { ts.forEach(clearTimeout); clearTimeout(next); };
  }, [open, step]);

  // Step 1 — tooltip demo
  useEffect(() => {
    if (!open || step !== 1) return;
    setActiveCard(0);
    const t1 = setTimeout(() => setActiveCard(2), 900);
    const t2 = setTimeout(() => { setActiveCard(null); setStep(2); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, step]);

  // Step 2 — open form
  useEffect(() => {
    if (!open || step !== 2) return;
    setShowForm(true);
    const t = setTimeout(() => setStep(3), 500);
    return () => clearTimeout(t);
  }, [open, step]);

  // Step 3 — type asset name
  useEffect(() => {
    if (!open || step !== 3) return;
    setTypedName('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypedName(ASSET_NAME.slice(0, i));
      if (i >= ASSET_NAME.length) { clearInterval(iv); setTimeout(() => setStep(4), 800); }
    }, 70);
    return () => clearInterval(iv);
  }, [open, step]);

  // Step 4 — AI progress bar
  useEffect(() => {
    if (!open || step !== 4) return;
    setAiProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 3;
      setAiProgress(Math.min(p, 100));
      if (p >= 100) { clearInterval(iv); setTimeout(() => setStep(5), 400); }
    }, 50);
    return () => clearInterval(iv);
  }, [open, step]);

  if (!open) return (
    <button
      onClick={resetAndOpen}
      className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-2xl shadow-black/30 transition-all hover:-translate-y-0.5 text-sm group"
    >
      <Cpu size={16} className="text-blue-400 group-hover:animate-pulse" />
      Simulasi Demo
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: '88vh', maxHeight: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 px-5 py-3 bg-zinc-800 shrink-0">
          <div className="flex gap-1.5">
            <button onClick={() => setOpen(false)} className="w-3 h-3 rounded-full bg-red-500 hover:brightness-110 transition" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-zinc-700 rounded-md px-4 py-1 text-zinc-400 text-xs text-center select-none">
            kira-system.app/dashboard
          </div>
          <button onClick={resetAndOpen} className="text-xs text-zinc-400 hover:text-white transition px-2">
            ↺ Ulangi
          </button>
        </div>

        {/* App shell */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 bg-linear-to-b from-[#07152F] to-[#16213E] flex flex-col items-center pt-5 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2">
              <BrainCircuit size={26} className="text-blue-400" />
            </div>
            <span className="text-white font-bold tracking-widest text-xs mb-5">KIRA</span>
            {[
              { icon: LayoutDashboard, label: 'Dashboard',   active: true  },
              { icon: Package,         label: 'Aset',         active: false },
              { icon: Wrench,          label: 'Maintenance',  active: false },
              { icon: FileText,        label: 'Tickets',      active: false },
              { icon: Bell,            label: 'Alerts',       active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs cursor-pointer ${active ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>
                <Icon size={13} />
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 bg-gray-50 relative overflow-hidden">

            {/* Dashboard layer (fades when form opens) */}
            <div className={`absolute inset-0 p-5 transition-all duration-500 ${step >= 2 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Selamat datang kembali, Admin</p>
                </div>
                <button className={`flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${step === 2 ? 'scale-90 brightness-75' : ''}`}>
                  <Plus size={13} />
                  Tambah Aset
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {STAT_CARDS.map((card, i) => (
                  <div
                    key={i}
                    className={`relative bg-white rounded-2xl p-4 border-2 transition-all duration-300 ${activeCard === i ? 'border-blue-500 shadow-lg scale-105' : 'border-transparent shadow-sm'}`}
                  >
                    <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                    {activeCard === i && (
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-xl animate-[enterUp_0.2s_ease-out]">
                        {card.tip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mock chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Tren Maintenance — 6 Bulan</p>
                <div className="flex items-end gap-2 h-24">
                  {[35, 60, 45, 80, 55, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg transition-all duration-500" style={{ height: `${h}%`, background: `hsl(${220 + i * 8}, 80%, 65%)` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Form overlay */}
            {showForm && (
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-6 animate-[enterUp_0.3s_ease-out]">
                <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">Tambah Aset Baru</h3>
                    <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                      <X size={12} className="text-gray-400" />
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {step <= 3 && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Nama Aset *</label>
                          <div className="mt-1 px-3 py-2.5 border border-blue-400 rounded-xl bg-blue-50/40 text-sm text-gray-800 min-h-[38px] flex items-center">
                            {typedName}
                            {step === 3 && typedName.length < ASSET_NAME.length && (
                              <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Kategori</label>
                            <div className={`mt-1 px-3 py-2 border rounded-xl text-xs transition-all duration-500 ${typedName.length > 5 ? 'border-gray-200 bg-gray-50 text-gray-800' : 'border-dashed border-gray-200 text-gray-300'}`}>
                              {typedName.length > 5 ? 'Mechanical' : '—'}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Kekritisan</label>
                            <div className={`mt-1 px-3 py-2 border rounded-xl text-xs transition-all duration-700 ${typedName.length > 10 ? 'border-gray-200 bg-gray-50 text-gray-800' : 'border-dashed border-gray-200 text-gray-300'}`}>
                              {typedName.length > 10 ? 'Major' : '—'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600">Tanggal Pembelian</label>
                          <div className={`mt-1 px-3 py-2 border rounded-xl text-xs transition-all duration-1000 ${typedName.length > 15 ? 'border-gray-200 bg-gray-50 text-gray-800' : 'border-dashed border-gray-200 text-gray-300'}`}>
                            {typedName.length > 15 ? '2023-03-15' : '—'}
                          </div>
                        </div>

                        {typedName === ASSET_NAME && (
                          <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold animate-[enterUp_0.3s_ease-out] shadow-lg shadow-blue-500/30">
                            Simpan & Prediksi RUL →
                          </button>
                        )}
                      </>
                    )}

                    {step === 4 && (
                      <div className="py-4 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
                          <BrainCircuit size={26} className="text-blue-600 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">AI sedang memprediksi RUL…</p>
                          <p className="text-xs text-gray-400 mt-1">Menganalisis pola historis & tingkat kerusakan</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-75"
                            style={{ width: `${aiProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 tabular-nums">{aiProgress}%</p>
                      </div>
                    )}

                    {step === 5 && (
                      <div className="py-2 text-center space-y-3 animate-[enterUp_0.4s_ease-out]">
                        <CheckCircle2 size={36} className="text-green-500 mx-auto" />
                        <p className="text-sm font-bold text-gray-900">Aset Berhasil Ditambahkan!</p>
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl py-4">
                          <p className="text-xs text-gray-400 mb-1">Predicted RUL</p>
                          <p className="text-5xl font-extrabold text-orange-500 tabular-nums">245</p>
                          <p className="text-xs text-gray-400 mt-1">hari tersisa</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-gray-400">Aset</p>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{ASSET_NAME}</p>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-gray-400">Severity</p>
                            <p className="text-xs font-semibold text-orange-600 mt-0.5">Medium</p>
                          </div>
                        </div>
                        <button onClick={resetAndOpen} className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition">
                          ↺ Ulangi Demo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step progress bar */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-1 shrink-0 overflow-x-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs shrink-0 transition-all ${i === step ? 'text-blue-600 font-semibold' : i < step ? 'text-green-500' : 'text-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
              {i < STEP_LABELS.length - 1 && <ChevronRight size={10} className="text-gray-200 ml-0.5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
