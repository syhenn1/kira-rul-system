'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ChevronRight, X, Lock } from 'lucide-react';
import AssetAddedModal, { type AssetAddedResult } from './AssetAddedModal';

const MOCK_NAME = 'Pompa Air Grundfos';

const MOCK_RESULT: AssetAddedResult = {
  asset_name: MOCK_NAME,
  predicted_rul: 412,
  gedung_nama: 'Gedung A',
  brand: 'Grundfos',
  category: 'Mechanical',
  sub_category: 'Pompa',
  tipe: 'Pompa Transfer',
};

const MOCK_GEDUNGS = [
  { kode: 'A', nama: 'Gedung A', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { kode: 'B', nama: 'Gedung B', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { kode: 'C', nama: 'Gedung C', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { kode: 'D', nama: 'Gedung D', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

// demo: 0=closed 1=step1-open 2=step1-selected 3=step2 4=filling 5=pin 6=saving 7=done
export default function AssetDemoFlow() {
  const [demo, setDemo]           = useState(0);
  const [typedName, setTypedName] = useState('');
  const [showDate, setShowDate]   = useState(false);
  const [showMerk, setShowMerk]   = useState(false);
  const [showKat, setShowKat]     = useState(false);
  const [showSub, setShowSub]     = useState(false);
  const [showTipe, setShowTipe]   = useState(false);
  const [showCrit, setShowCrit]   = useState(false);
  const [pinLen, setPinLen]       = useState(0);
  const [showResult, setShowResult] = useState(false);

  const startDemo = () => {
    setDemo(1); setTypedName('');
    setShowDate(false); setShowMerk(false); setShowKat(false);
    setShowSub(false); setShowTipe(false); setShowCrit(false);
    setPinLen(0); setShowResult(false);
  };

  const closeDemo = () => { setDemo(0); setShowResult(false); };

  // State machine
  useEffect(() => {
    if (demo === 0) return;

    if (demo === 1) {
      const t = setTimeout(() => setDemo(2), 900);
      return () => clearTimeout(t);
    }
    if (demo === 2) {
      const t = setTimeout(() => setDemo(3), 1400);
      return () => clearTimeout(t);
    }
    if (demo === 3) {
      const t = setTimeout(() => setDemo(4), 300);
      return () => clearTimeout(t);
    }
    if (demo === 4) {
      let i = 0;
      setTypedName('');
      const iv = setInterval(() => {
        i++;
        setTypedName(MOCK_NAME.slice(0, i));
        if (i >= MOCK_NAME.length) clearInterval(iv);
      }, 65);
      const timers = [
        setTimeout(() => setShowDate(true), 1400),
        setTimeout(() => setShowMerk(true), 2100),
        setTimeout(() => setShowKat(true),  2800),
        setTimeout(() => setShowSub(true),  3500),
        setTimeout(() => setShowTipe(true), 4200),
        setTimeout(() => setShowCrit(true), 4900),
        setTimeout(() => setDemo(5),        6000),
      ];
      return () => { clearInterval(iv); timers.forEach(clearTimeout); };
    }
    if (demo === 5) {
      let d = 0;
      setPinLen(0);
      const iv = setInterval(() => {
        d++;
        setPinLen(d);
        if (d >= 6) clearInterval(iv);
      }, 230);
      const t = setTimeout(() => setDemo(6), 2600);
      return () => { clearInterval(iv); clearTimeout(t); };
    }
    if (demo === 6) {
      const t = setTimeout(() => { setDemo(7); setShowResult(true); }, 1100);
      return () => clearTimeout(t);
    }
  }, [demo]);

  const modalOpen = demo >= 1 && demo <= 6;

  return (
    <>
      {/* Floating trigger */}
      {demo === 0 && (
        <button
          onClick={startDemo}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-2xl shadow-black/30 transition-all hover:-translate-y-0.5 text-sm"
        >
          ▶ Demo: Tambah Aset
        </button>
      )}

      {/* Mock modal */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6" style={{ zIndex: 9999 }}>
          <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn transition-all duration-200 ${demo === 5 ? 'scale-[0.97] opacity-60 pointer-events-none' : ''}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-10 pt-8 pb-5 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold text-[#111827]">Tambah Aset Baru</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold tracking-wide">DEMO</span>
                </div>
                <p className="text-gray-500 text-sm mt-0.5">Lengkapi data aset perusahaan</p>
              </div>
              <button onClick={closeDemo} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
                <X size={18} />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-start gap-0 px-10 pt-6 pb-1 shrink-0 max-w-xs">
              <StepDot n={1} label="Pilih Gedung" active={demo <= 2} done={demo >= 3} />
              <div className={`flex-1 h-0.5 mt-3.5 mx-2 transition-colors duration-300 ${demo >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <StepDot n={2} label="Detail Aset"  active={demo >= 3} done={false} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-10 py-6">

              {/* Step 1 */}
              {demo <= 2 && (
                <div>
                  <p className="text-sm text-gray-500 mb-5">Pilih gedung lokasi aset ini berada</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    {MOCK_GEDUNGS.map((g) => {
                      const selected  = demo === 2 && g.kode === 'A';
                      const highlight = demo === 1 && g.kode === 'A';
                      return (
                        <div key={g.kode} className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 px-5 py-7 transition-all duration-500
                          ${selected  ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/10 scale-105' :
                            highlight ? `${g.color} border-dashed animate-pulse` :
                            g.color}`}
                        >
                          {selected && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check size={11} className="text-white" />
                            </span>
                          )}
                          <Building2 size={26} />
                          <span className="font-semibold text-sm text-center">{g.nama}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {demo >= 3 && demo <= 6 && (
                <div className="flex gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 size={14} className="text-blue-600" />
                      <span className="text-gray-500">Lokasi:</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">Gedung A</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nama */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nama Aset</label>
                        <div className="w-full mt-1.5 border border-blue-300 bg-blue-50/30 rounded-2xl px-4 py-3 text-sm text-black min-h-11.5 flex items-center">
                          {typedName}
                          {demo === 4 && typedName.length < MOCK_NAME.length && (
                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <MockField label="Tanggal Pembelian" value="2022-05-10" show={showDate} />

                      {/* Dropdowns */}
                      <MockField label="Merk / Brand"      value="Grundfos"       show={showMerk} />
                      <MockField label="Kategori"          value="Mechanical"     show={showKat}  />
                      <MockField label="Sub Kategori"      value="Pompa"          show={showSub}  />
                      <MockField label="Tipe"              value="Pompa Transfer" show={showTipe} />
                      <MockField label="Tingkat Kekritisan" value="Major"         show={showCrit} accent />
                    </div>
                  </div>

                  {/* Image area */}
                  <div className="w-64 shrink-0 flex flex-col">
                    <p className="text-sm font-medium text-gray-700 mb-2">Gambar Aset <span className="text-gray-400 font-normal">(opsional)</span></p>
                    <div className="flex-1 min-h-64 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
                      Tidak ada foto
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-10 py-5 border-t border-gray-100 shrink-0">
              {demo <= 2 ? (
                <>
                  <button onClick={closeDemo} className="text-sm text-gray-500 hover:text-gray-700">Batal</button>
                  <button disabled={demo < 2} className={`flex items-center gap-2 px-7 py-2.5 rounded-2xl text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition ${demo === 2 ? 'bg-blue-600 animate-[pulseRing_1.5s_infinite]' : 'bg-blue-300'}`}>
                    Lanjutkan <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeDemo} className="text-sm text-gray-500 hover:text-gray-700">Batal</button>
                  <button className={`flex items-center gap-2 bg-blue-600 text-white px-10 py-2.5 rounded-2xl text-sm font-medium shadow-lg shadow-blue-600/20 ${demo === 5 || demo === 6 ? 'animate-pulse' : ''}`}>
                    <Lock size={14} />
                    {demo === 6 ? 'Menyimpan...' : 'Simpan Aset'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mock PIN dialog */}
          {demo === 5 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fadeIn mx-4">
                <div className="flex flex-col items-center text-center gap-1 mb-7">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                    <Lock size={26} />
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">Konfirmasi PIN</h3>
                  <p className="text-sm text-gray-500">Masukkan PIN 6 digit untuk melanjutkan</p>
                </div>

                <div className="flex gap-3 justify-center">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-200 ${i < pinLen ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50'}`}>
                      {i < pinLen ? '•' : ''}
                    </div>
                  ))}
                </div>

                <button disabled className="w-full mt-6 bg-blue-300 text-white py-3 rounded-2xl font-medium text-sm cursor-not-allowed">
                  {pinLen < 6 ? 'Masukkan PIN...' : 'Konfirmasi'}
                </button>
                <button onClick={closeDemo} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 py-2">
                  Tutup Demo
                </button>
              </div>
            </div>
          )}
        </div>
      , document.body)}

      {/* Real AssetAddedModal with mock data */}
      {showResult && (
        <AssetAddedModal
          result={MOCK_RESULT}
          image={null}
          onAddAnother={closeDemo}
          onViewAll={closeDemo}
        />
      )}
    </>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}`}>
        {done ? <Check size={13} /> : n}
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${active || done ? 'text-blue-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

function MockField({ label, value, show, accent }: { label: string; value: string; show: boolean; accent?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className={`w-full mt-1.5 border rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${
        show
          ? accent
            ? 'border-orange-300 bg-orange-50 text-orange-700 font-medium'
            : 'border-gray-200 bg-white text-black'
          : 'border-dashed border-gray-200 text-gray-300'
      }`}>
        {show ? value : '—'}
      </div>
    </div>
  );
}
