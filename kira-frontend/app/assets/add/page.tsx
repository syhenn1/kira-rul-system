'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Building2, ChevronRight, Check } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type Gedung = {
  id: string;
  nama: string;
  kode: string;
};

const GEDUNG_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700 border-blue-200',
  B: 'bg-violet-100 text-violet-700 border-violet-200',
  C: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  D: 'bg-amber-100 text-amber-700 border-amber-200',
  E: 'bg-rose-100 text-rose-700 border-rose-200',
  PARKIR: 'bg-slate-100 text-slate-700 border-slate-200',
  SERVIS: 'bg-orange-100 text-orange-700 border-orange-200',
  UTAMA: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export default function AddAssetPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [selectedGedung, setSelectedGedung] = useState<Gedung | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    asset_name: '',
    purchase_date: '',
    brand: '',
    category: '',
    sub_category: '',
    type: '',
    criticality_level: '',
  });

  useEffect(() => {
    const token = authApi.getToken();
    apiFetch('/api/gedung', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setGedungList(d.gedung || []))
      .catch(console.error);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = authApi.getToken();
      const response = await apiFetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, gedung_id: selectedGedung?.id }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Server error ${response.status}`);
      }

      const result = await response.json();
      await Swal.fire({
        title: 'Berhasil!',
        html: `Asset berhasil ditambahkan!<br><br><b>RUL Prediksi:</b> ${result.data?.predicted_rul !== undefined ? result.data.predicted_rul : 'N/A'} bulan`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Kembali ke List',
      });
      router.push('/assets');
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Terjadi Kesalahan',
        text: (error as Error).message || 'Gagal menyimpan data aset ke server.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-[#F5F7FB]">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* HEADER */}
          <div className="flex items-center gap-4 mt-8">
            <Link
              href="/assets"
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center hover:bg-gray-50 transition text-xl"
            >
              ←
            </Link>
            <div>
              <h1 className="text-5xl font-bold text-[#111827]">Add New Asset</h1>
              <p className="text-gray-500 mt-3 text-lg">Create and manage company assets</p>
            </div>
          </div>

          {/* STEPPER */}
          <div className="mt-8 flex items-center gap-0 max-w-xs">
            <StepDot number={1} label="Pilih Gedung" active={step === 1} done={step === 2} />
            <div className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <StepDot number={2} label="Detail Aset" active={step === 2} done={false} />
          </div>

          {/* STEP 1 — SELECT GEDUNG */}
          {step === 1 && (
            <div className="mt-6 bg-white rounded-3xl border shadow-sm p-8 animate-fadeIn">
              <h2 className="text-2xl font-bold text-[#111827] mb-1">Pilih Gedung</h2>
              <p className="text-gray-500 text-sm mb-6">
                Tentukan lokasi gedung tempat aset ini berada
              </p>
              {gedungList.length === 0 ? (
                <p className="text-gray-400 text-sm">Memuat data gedung...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gedungList.map((g) => {
                    const colorClass =
                      GEDUNG_COLORS[g.kode] ?? 'bg-gray-100 text-gray-700 border-gray-200';
                    const isSelected = selectedGedung?.id === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGedung(g)}
                        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer
                          ${isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/10'
                            : `${colorClass} hover:shadow-md hover:-translate-y-0.5`
                          }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </span>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold border ${colorClass}`}>
                          <Building2 size={22} />
                        </div>
                        <span className="font-semibold text-sm text-center">{g.nama}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => { if (selectedGedung) setStep(2); }}
                  disabled={!selectedGedung}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-medium transition shadow-lg shadow-blue-600/20"
                >
                  Lanjutkan
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — ASSET FORM */}
          {step === 2 && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6 animate-fadeIn">
              {/* LEFT */}
              <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">
                {/* Selected gedung badge */}
                <div className="flex items-center gap-2 mb-6">
                  <Building2 size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-500">Lokasi gedung:</span>
                  <span className="text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">
                    {selectedGedung?.nama}
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="ml-auto text-xs text-blue-600 hover:underline"
                  >
                    Ganti
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nama Aset"
                    placeholder="Masukkan nama aset"
                    value={formData.asset_name}
                    onChange={(e) => handleInputChange('asset_name', e.target.value)}
                  />

                  <div>
                    <label className="text-sm font-medium text-gray-700">Tanggal Pembelian</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                      className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>

                  <Input
                    label="Brand"
                    placeholder="e.g. Sharp"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />

                  <Input
                    label="Kategori"
                    placeholder="e.g. Mechanical"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  />

                  <Input
                    label="Sub Kategori"
                    placeholder="e.g. Tata Udara"
                    value={formData.sub_category}
                    onChange={(e) => handleInputChange('sub_category', e.target.value)}
                  />

                  <Input
                    label="Tipe"
                    placeholder="e.g. Generator Portable"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  />

                  <Select
                    label="Tingkat Kekritisan"
                    value={formData.criticality_level}
                    onChange={(e) => handleInputChange('criticality_level', e.target.value)}
                    options={['Critical', 'Major', 'Minor']}
                  />
                </div>
              </div>

              {/* RIGHT */}
              <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#111827]">Upload Gambar</h2>
                  <label className="border-2 border-dashed border-gray-300 rounded-3xl h-90 mt-6 flex flex-col items-center justify-center text-center px-6 cursor-pointer hover:border-blue-500 transition overflow-hidden">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {image ? (
                      <img src={image} alt="preview" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-5xl text-blue-600">
                          ↑
                        </div>
                        <p className="mt-8 font-semibold text-gray-700 text-lg">Klik untuk upload</p>
                        <p className="text-sm text-gray-400 mt-2">PNG, JPG, JPEG</p>
                      </>
                    )}
                  </label>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-4 rounded-2xl font-medium"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Aset'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function StepDot({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
          ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}`}
      >
        {done ? <Check size={14} /> : number}
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${active || done ? 'text-blue-700' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
    </div>
  );
}

function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      >
        <option value="">Pilih {label}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
