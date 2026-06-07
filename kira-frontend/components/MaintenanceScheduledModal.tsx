'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate as fmAnimate, type Variants } from 'framer-motion';
import { X } from 'lucide-react';

export type MaintenanceScheduledResult = {
  predicted_rul: number;
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
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.82, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative h-44 bg-linear-to-br from-blue-100 to-violet-100 flex items-center justify-center shrink-0">
            <div className="flex flex-col items-center gap-2 text-blue-400">
              <div className="w-20 h-20 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-4xl shadow-sm">
                🏗️
              </div>
              <span className="text-xs font-medium text-blue-500">Foto Aset</span>
            </div>
            {/* Close button */}
            <button
              onClick={onViewAll}
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
                onClick={onAddAnother}
                className="flex-1 border border-blue-200 text-blue-600 hover:bg-blue-50 transition py-3 rounded-xl font-semibold text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                + Jadwalkan Lagi
              </motion.button>
              <motion.button
                onClick={onViewAll}
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
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
