'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate as fmAnimate, type Variants } from 'framer-motion';
import { X } from 'lucide-react';

export type MaintenanceScheduledResult = {
  predicted_rul: number;
  predicted_severity?: string | null;
  severity_confidence?: number | null;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  gedung_nama: string;
  criticality_level: string;
};

interface Props {
  result: MaintenanceScheduledResult;
  onAddAnother: () => void;
  onViewAll: () => void;
}

const MAX_RUL_DAYS = 730; // 2 tahun = batas Watch threshold sistem

const SEVERITY_INFO: Record<string, { color: string; bar: string; desc: string }> = {
  Critical: { color: 'text-red-600 bg-red-50 border-red-200',       bar: 'bg-red-500',    desc: 'Kerusakan fatal — butuh penanganan segera oleh teknisi.' },
  High:     { color: 'text-orange-500 bg-orange-50 border-orange-200', bar: 'bg-orange-500', desc: 'Kerusakan berat — prioritaskan perbaikan secepatnya.' },
  Medium:   { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', bar: 'bg-yellow-500', desc: 'Kerusakan sedang — jadwalkan perbaikan dalam waktu dekat.' },
  Low:      { color: 'text-green-600 bg-green-50 border-green-200',  bar: 'bg-green-500',  desc: 'Kerusakan ringan — dapat ditangani sesuai jadwal rutin.' },
};

function getRulZone(rul: number) {
  if (rul <= 180) return { label: 'Kritis',  color: 'text-red-500',     ringColor: '#ef4444', bar: 'bg-red-500',     ring: 'ring-red-200',     bg: 'bg-red-50',     rec: 'Segera jadwalkan penggantian atau perbaikan besar. Risiko kegagalan tinggi dalam 6 bulan ke depan.' };
  if (rul <= 365) return { label: 'Tinggi',  color: 'text-orange-500',  ringColor: '#f97316', bar: 'bg-orange-500',  ring: 'ring-orange-200',  bg: 'bg-orange-50',  rec: 'Maintenance mendesak diperlukan dalam 6–12 bulan ke depan sebelum kondisi memburuk.' };
  if (rul <= 730) return { label: 'Sedang',  color: 'text-yellow-600',  ringColor: '#ca8a04', bar: 'bg-yellow-500',  ring: 'ring-yellow-200',  bg: 'bg-yellow-50',  rec: 'Pantau kondisi aset secara berkala dan rencanakan maintenance dalam 1–2 tahun.' };
  return           { label: 'Baik',    color: 'text-emerald-600', ringColor: '#10b981', bar: 'bg-emerald-500', ring: 'ring-emerald-200', bg: 'bg-emerald-50', rec: 'Aset dalam kondisi baik. Lanjutkan program maintenance preventif sesuai jadwal.' };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="font-medium text-gray-800 truncate text-sm">{value}</p>
    </div>
  );
}

export default function MaintenanceScheduledModal({ result, onAddAnother, onViewAll }: Props) {
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

  /* Lock body scroll while modal is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /*
   * This component is ONLY ever rendered after a successful submission
   * (client-side state), so it never runs on the server. The guard below is a
   * safety net — createPortal cannot be called in an SSR context.
   */
  if (typeof document === 'undefined') return null;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
  };

  const hasSeverity = !!result.predicted_severity;

  const modal = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 99999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Card */}
        <motion.div
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.82, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative px-6 py-4 bg-linear-to-br from-blue-50 to-violet-50 border-b border-gray-100 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              🏗️
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 bg-white/80 px-2.5 py-0.5 rounded-full mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-gray-700">Maintenance Berhasil Dijadwalkan</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 truncate">{result.asset_name}</h2>
            </div>
            {/* Close button */}
            <button
              onClick={onViewAll}
              className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition shrink-0"
            >
              <X size={15} className="text-gray-600" />
            </button>
          </div>

          {/* Body — laid out wide, side-by-side */}
          <motion.div
            className="px-6 py-5 space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex flex-col gap-4">
              {/* Asset info */}
              <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-2">Detail Aset</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {result.gedung_nama && <InfoRow label="Gedung" value={result.gedung_nama} />}
                  {result.brand && <InfoRow label="Brand" value={result.brand} />}
                  {result.category && <InfoRow label="Kategori" value={result.category} />}
                  {result.sub_category && <InfoRow label="Sub Kategori" value={result.sub_category} />}
                  {result.criticality_level && <InfoRow label="Kekritisan" value={result.criticality_level} />}
                </div>
              </motion.div>

              {/* Severity prediction */}
              {result.predicted_severity && (() => {
                const info = SEVERITY_INFO[result.predicted_severity] ?? { color: 'text-gray-600 bg-gray-100 border-gray-200', bar: 'bg-gray-400', desc: 'Tingkat keparahan kerusakan hasil prediksi AI.' };
                const confPct = typeof result.severity_confidence === 'number' ? Math.round(result.severity_confidence * 100) : null;
                return (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col"
                  >
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-2">Prediksi Severity</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${info.color}`}>
                        {result.predicted_severity}
                      </span>
                      {confPct !== null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400 font-medium">Confidence</p>
                          <p className="text-lg font-bold text-gray-800">{confPct}%</p>
                        </div>
                      )}
                    </div>
                    {confPct !== null && (
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
                        <motion.div
                          className={`h-full rounded-full ${info.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${confPct}%` }}
                          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                        />
                      </div>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed mt-3">{info.desc}</p>
                  </motion.div>
                );
              })()}

              {/* RUL — purple background */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 p-4 text-white"
              >
                <p className="text-xs text-violet-200 font-medium tracking-wide uppercase mb-2">Prediksi Sisa Umur (RUL)</p>
                <div className="flex items-center gap-3">
                  {/* SVG ring */}
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 80 80">
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
                      <span className="text-xs font-bold text-white">{pct}%</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold tabular-nums leading-none">{displayRUL.toLocaleString()}</span>
                      <span className="text-violet-200 font-medium text-sm">hari</span>
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
            </div>

            {/* Recommendation + Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              <motion.div
                variants={itemVariants}
                className="flex-1 flex gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100"
              >
                <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600 leading-relaxed">{zone.rec}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex gap-2 md:items-center">
                <motion.button
                  onClick={onAddAnother}
                  className="border border-blue-200 text-blue-600 hover:bg-blue-50 transition px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  + Jadwalkan Lagi
                </motion.button>
                <motion.button
                  onClick={onViewAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-lg shadow-blue-600/25 whitespace-nowrap"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Lihat Daftar
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
