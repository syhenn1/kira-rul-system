'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Maximize2, PanelRight, X } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';

export type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string;
  status: 'Tersedia' | 'Ditugaskan' | 'Tidak Aktif';
  experience_years: number;
};

const STATUS_STYLE: Record<string, string> = {
  Tersedia: 'bg-green-100 text-green-700',
  Ditugaskan: 'bg-yellow-100 text-yellow-700',
  'Tidak Aktif': 'bg-gray-100 text-gray-500',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function TechnicianDetailPanel({
  technician,
  onClose,
  onUpdated,
}: {
  technician: Technician | null;
  onClose: () => void;
  onUpdated?: (updated: Technician) => void;
}) {
  const [mode, setMode] = useState<'drawer' | 'modal'>('drawer');
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Technician['status']>('Tersedia');
  const [submitting, setSubmitting] = useState(false);

  const open = technician !== null;

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (technician) setStatus(technician.status);
  }, [technician]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const handleSubmit = async () => {
    if (!technician) return;
    setSubmitting(true);
    try {
      const token = authApi.getToken();
      const res = await fetch(`${API_URL}/api/technicians/${technician.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status teknisi');
      await Swal.fire({ title: 'Berhasil!', text: 'Status teknisi berhasil diperbarui.', icon: 'success', confirmButtonColor: '#2563eb' });
      onUpdated?.({ ...technician, status });
      handleClose();
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: (err as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !technician) return null;

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
              ? `bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
              : `bg-white shadow-2xl w-full max-w-md h-full flex flex-col overflow-hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <Tooltip content={isModal ? 'Tampilkan sebagai panel samping' : 'Tampilkan sebagai jendela tengah'} position="bottom">
                <button
                  onClick={() => setMode(isModal ? 'drawer' : 'modal')}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 flex items-center justify-center transition"
                  aria-label="Ubah tampilan panel detail"
                >
                  {isModal ? <PanelRight size={16} /> : <Maximize2 size={16} />}
                </button>
              </Tooltip>
              <h2 className="text-lg font-bold text-gray-900">Detail Teknisi</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
              aria-label="Tutup panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                {initials(technician.name)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{technician.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{technician.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[technician.status]}`}>
                  {technician.status}
                </span>
              </div>
            </div>

            {/* Read-only highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <p className="text-xs text-gray-400">Spesialisasi</p>
                <p className="mt-1 font-semibold text-gray-900">{technician.specialization}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <p className="text-xs text-gray-400">Pengalaman</p>
                <p className="mt-1 font-semibold text-gray-900">{technician.experience_years} tahun</p>
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 col-span-2">
                <p className="text-xs text-gray-400">Telepon</p>
                <p className="mt-1 font-semibold text-gray-900">{technician.phone || '—'}</p>
              </div>
            </div>

            {/* Editable status */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informasi yang dapat diubah</p>
              <label className="text-sm font-medium text-gray-700">Status Ketersediaan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Technician['status'])}
                className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
              >
                <option>Tersedia</option>
                <option>Ditugaskan</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 shrink-0">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || status === technician.status}
              className="px-8 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
