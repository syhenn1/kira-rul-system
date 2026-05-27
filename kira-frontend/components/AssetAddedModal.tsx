'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, X, Building2, Tag, Layers, LayoutGrid,
  ChevronRight, Cpu,
} from 'lucide-react';

export type AssetAddedResult = {
  asset_name: string;
  predicted_rul: number;
  gedung_nama: string;
  brand: string;
  category: string;
  sub_category?: string;
  tipe?: string;
};

interface Props {
  result: AssetAddedResult;
  image: string | null;
  onAddAnother: () => void;
  onViewAll: () => void;
}

/* ── RUL helpers ──────────────────────────────────────────────────────────── */
type Zone = { label: string; color: string; bar: string; glow: string; icon: string };

function getZone(rul: number): Zone {
  if (rul <= 90)  return { label: 'Kritis',  color: 'text-red-500',     bar: 'bg-red-500',     glow: 'shadow-red-200',    icon: '🔴' };
  if (rul <= 180) return { label: 'Tinggi',  color: 'text-orange-500',  bar: 'bg-orange-500',  glow: 'shadow-orange-200', icon: '🟠' };
  if (rul <= 365) return { label: 'Sedang',  color: 'text-yellow-600',  bar: 'bg-yellow-500',  glow: 'shadow-yellow-200', icon: '🟡' };
  return           { label: 'Baik',    color: 'text-emerald-600', bar: 'bg-emerald-500', glow: 'shadow-emerald-200', icon: '🟢' };
}

/** 0 – 100 percentage capped at 730 days (2 years) */
const rulPct = (rul: number) => Math.min(100, Math.round((rul / 730) * 100));

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AssetAddedModal({ result, image, onAddAnother, onViewAll }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const zone = getZone(result.predicted_rul);
  const pct  = rulPct(result.predicted_rul);

  /* Animate the RUL bar after the card has faded in */
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pct), 400);
    return () => clearTimeout(t);
  }, [pct]);

  /* Lock body scroll while modal is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /*
   * This component is ONLY ever rendered after `setSuccessResult()` is called
   * (client-side state), so it never runs on the server. The guard below is a
   * safety net — createPortal cannot be called in an SSR context.
   */
  if (typeof document === 'undefined') return null;

  const modal = (
    /* ── Overlay rendered directly on document.body — bypasses stacking contexts ── */
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Card ── */}
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
      >

        {/* ══ HEADER GRADIENT ══ */}
        <div className="relative bg-linear-to-br from-blue-600 via-blue-500 to-violet-600 px-6 pt-8 pb-6">
          {/* Close button */}
          <button
            onClick={onViewAll}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X size={14} className="text-white" />
          </button>

          {/* Success badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-100 font-medium tracking-wide uppercase">Aset Berhasil Ditambahkan</p>
              <p className="text-white font-bold text-lg leading-tight truncate max-w-60">{result.asset_name}</p>
            </div>
          </div>

          {/* Asset image strip */}
          {image ? (
            <div className="rounded-2xl overflow-hidden h-28 w-full">
              <img src={image} alt="asset" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl bg-white/10 h-20 w-full flex items-center justify-center gap-2 text-white/60">
              <Cpu size={20} />
              <span className="text-sm">Tidak ada foto</span>
            </div>
          )}
        </div>

        {/* ══ BODY ══ */}
        <div className="px-6 pt-5 pb-2">

          {/* Meta rows */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <MetaChip icon={<Building2 size={13} />} label="Lokasi"       value={result.gedung_nama} />
            <MetaChip icon={<Tag size={13} />}        label="Brand"        value={result.brand} />
            <MetaChip icon={<LayoutGrid size={13} />} label="Kategori"     value={result.category} />
            {result.sub_category && (
              <MetaChip icon={<Layers size={13} />}   label="Sub Kategori" value={result.sub_category} />
            )}
            {result.tipe && (
              <MetaChip icon={<Cpu size={13} />}      label="Tipe"         value={result.tipe} />
            )}
          </div>

          {/* ── RUL card ── */}
          <div className={`rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-sm ${zone.glow}`}>
            {/* Title row */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                Prediksi Sisa Umur (RUL)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                {zone.icon} {zone.label}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-end gap-1.5 mb-3">
              <span className={`text-4xl font-extrabold leading-none ${zone.color}`}>
                {result.predicted_rul.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400 mb-0.5">hari</span>
              <span className="text-xs text-gray-400 mb-0.5 ml-1">
                (~{Math.round(result.predicted_rul / 30)} bulan)
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${zone.bar}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0</span>
              <span>2 tahun</span>
            </div>

            {/* Advice */}
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {result.predicted_rul <= 90
                ? '⚠️ Aset ini memerlukan perhatian segera. Pertimbangkan penggantian atau overhaul.'
                : result.predicted_rul <= 180
                ? '🔧 Jadwalkan maintenance dalam waktu dekat untuk mencegah kerusakan.'
                : result.predicted_rul <= 365
                ? '📅 Lakukan pemeliharaan preventif berkala sesuai jadwal.'
                : '✅ Aset dalam kondisi baik. Lanjutkan pemeliharaan rutin.'}
            </p>
          </div>
        </div>

        {/* ══ FOOTER BUTTONS ══ */}
        <div className="px-6 py-5 flex gap-3">
          <button
            onClick={onAddAnother}
            className="flex-1 border border-blue-200 text-blue-600 hover:bg-blue-50 transition py-3 rounded-2xl text-sm font-semibold"
          >
            + Tambah Aset Lain
          </button>
          <button
            onClick={onViewAll}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-600/25"
          >
            Lihat Semua Aset
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Step indicator dots (decorative — mirrors TourOverlay style) */}
        <div className="flex justify-center gap-1.5 pb-4">
          {['Gedung', 'Detail', 'Selesai'].map((s, i) => (
            <div key={s} className={`rounded-full transition-all ${i === 2 ? 'w-5 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

/* ── MetaChip ─────────────────────────────────────────────────────────────── */
function MetaChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5">
      <span className="text-blue-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-xs font-semibold text-gray-700 truncate">{value}</p>
      </div>
    </div>
  );
}
