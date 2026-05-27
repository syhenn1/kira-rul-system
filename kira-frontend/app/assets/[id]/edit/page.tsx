'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type Gedung = { id: string; nama: string; kode: string };

export default function EditAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gedungList, setGedungList] = useState<Gedung[]>([]);

  const [form, setForm] = useState({
    asset_name: '',
    purchase_date: '',
    brand: '',
    category: '',
    sub_category: '',
    type: '',
    criticality_level: '',
    status: '',
    gedung_id: '',
  });

  useEffect(() => {
    if (!id) return;
    const token = authApi.getToken();
    Promise.all([
      apiFetch(`/api/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      apiFetch('/api/gedung', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([assetBody, gedungBody]) => {
        const a = assetBody.data;
        if (!a) return;
        setForm({
          asset_name: a.asset_name ?? '',
          purchase_date: a.purchase_date ? a.purchase_date.slice(0, 10) : '',
          brand: a.brand ?? '',
          category: a.category ?? '',
          sub_category: a.sub_category ?? '',
          type: a.type ?? '',
          criticality_level: a.criticality_level ?? '',
          status: a.status ?? '',
          gedung_id: a.gedung?.id ?? '',
        });
        setGedungList(gedungBody.gedung || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleInput = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.asset_name.trim()) {
      Swal.fire({ title: 'Validasi', text: 'Nama aset wajib diisi.', icon: 'warning', confirmButtonColor: '#2563eb' });
      return;
    }
    setSubmitting(true);
    try {
      const token = authApi.getToken();
      const res = await apiFetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, gedung_id: form.gedung_id || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memperbarui aset');
      }
      await Swal.fire({ title: 'Berhasil!', text: 'Data aset berhasil diperbarui.', icon: 'success', confirmButtonColor: '#2563eb' });
      router.push(`/assets/${id}`);
    } catch (err) {
      Swal.fire({ title: 'Gagal', text: (err as Error).message, icon: 'error', confirmButtonColor: '#ef4444' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="flex min-h-screen bg-[#F5F7FB]">
          <Sidebar />
          <div className="flex-1 ml-64 p-8 flex items-center justify-center">
            <p className="text-gray-400 text-lg">Memuat data aset...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-[#F5F7FB]">
        <Sidebar />

        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* HEADER */}
          <div className="flex items-center gap-4 mt-8">
            <Link
              href={`/assets/${id}`}
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center hover:bg-gray-50 transition text-xl"
            >
              ←
            </Link>
            <div>
              <h1 className="text-5xl font-bold text-[#111827]">Edit Asset</h1>
              <p className="text-gray-500 mt-3 text-lg">Perbarui informasi aset</p>
            </div>
          </div>

          {/* FORM */}
          <div className="mt-8 bg-white rounded-3xl border shadow-sm p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Nama Aset"
                placeholder="Masukkan nama aset"
                value={form.asset_name}
                onChange={(e) => handleInput('asset_name', e.target.value)}
              />

              <div>
                <label className="text-sm font-medium text-gray-700">Tanggal Pembelian</label>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => handleInput('purchase_date', e.target.value)}
                  className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                />
              </div>

              <FormInput
                label="Brand"
                placeholder="e.g. Sharp"
                value={form.brand}
                onChange={(e) => handleInput('brand', e.target.value)}
              />

              <FormInput
                label="Kategori"
                placeholder="e.g. Mechanical"
                value={form.category}
                onChange={(e) => handleInput('category', e.target.value)}
              />

              <FormInput
                label="Sub Kategori"
                placeholder="e.g. Tata Udara"
                value={form.sub_category}
                onChange={(e) => handleInput('sub_category', e.target.value)}
              />

              <FormInput
                label="Tipe"
                placeholder="e.g. AC Split"
                value={form.type}
                onChange={(e) => handleInput('type', e.target.value)}
              />

              <FormSelect
                label="Tingkat Kekritisan"
                value={form.criticality_level}
                onChange={(e) => handleInput('criticality_level', e.target.value)}
                options={['Critical', 'Major', 'Minor']}
              />

              <FormSelect
                label="Status"
                value={form.status}
                onChange={(e) => handleInput('status', e.target.value)}
                options={['Active', 'Maintenance', 'Inactive']}
              />

              <div>
                <label className="text-sm font-medium text-gray-700">Gedung / Lokasi</label>
                <select
                  value={form.gedung_id}
                  onChange={(e) => handleInput('gedung_id', e.target.value)}
                  className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                >
                  <option value="">Tidak ada / Lepas dari gedung</option>
                  {gedungList.map((g) => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex gap-4 mt-8 justify-end">
              <Link
                href={`/assets/${id}`}
                className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Batal
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-10 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition shadow-lg shadow-blue-600/20"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function FormInput({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
      />
    </div>
  );
}

function FormSelect({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
      >
        <option value="">Pilih {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
