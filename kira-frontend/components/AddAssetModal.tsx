'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Building2, Check, ChevronRight, X, Upload, Plus, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';
import LookupDropdown from './LookupDropdown';
import type { AssetAddedResult } from './AssetAddedModal';

type Gedung = { id: string; nama: string; kode: string };
type PinMode = 'verify' | 'set' | 'set-confirm';
type LookupItem = { id: string; kode: string; nama: string };

const GEDUNG_COLORS: Record<string, string> = {
  A:      'bg-blue-100 text-blue-700 border-blue-200',
  B:      'bg-violet-100 text-violet-700 border-violet-200',
  C:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  D:      'bg-amber-100 text-amber-700 border-amber-200',
  E:      'bg-rose-100 text-rose-700 border-rose-200',
  PARKIR: 'bg-slate-100 text-slate-700 border-slate-200',
  SERVIS: 'bg-orange-100 text-orange-700 border-orange-200',
  UTAMA:  'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// ── STRICT BRAND TO HIERARCHY MATRIX FROM DATASET ────────────────────────────
// Kombinasi Merek → Kategori → Sub Kategori → Tipe diekstrak 100% dari dataset.
const BRAND_VALIDATION_MATRIX: Record<string, Record<string, Record<string, string[]>>> = {
  'Sharp': {
    'Mechanical': { 'Tata Udara': ['AC Split'] },
  },
  'Perkins': {
    'Mechanical': { 'Genset': ['Genset Diesel'] },
  },
  'Hochiki': {
    'Sistem Proteksi Kebakaran Aktif': { 'Sistem Deteksi Kebakaran': ['Smoke Detector', 'Heat Detector'] },
  },
  'Hikvision': {
    'Security Sistem': { 'Sistem Pengawasan': ['Kamera CCTV', 'Monitor CCTV', 'DVR CCTV'] },
  },
  'Daikin': {
    'Mechanical': { 'Tata Udara': ['AC Cassette', 'AC Split', 'AC Sentral'] },
  },
  'Import': {
    'Mechanical': { 'Tata Udara': ['AHU', 'FCU'] },
    'Electrical': {
      'Control Panel': ['Control Panel Hydrant Diesel Pump', 'Control Panel AC', 'Panel PP-ME', 'Control Panel Penerangan'],
      'Lampu Penerangan': ['Lampu LED', 'Lampu Downlight', 'Lampu TL LED'],
      'Panel Distribusi': ['Panel UPS', 'SDP'],
    },
    'Plumbing': { 'Sanitari Sistem': ['Urinal', 'Floor Drain', 'Kloset'] },
    'Sistem Pemadam Kebakaran': {
      'Alat Pemadam Api Portable': ['APAR Wet Chemical', 'APAB Dry Powder', 'APAR Dry Powder Stored Pressure', 'APAR Dry Powder Cartridge'],
      'Fire Pump System': ['Diesel Fire Pump'],
    },
    'Sistem Telekomunikasi Gedung': {
      'Telephone System': ['PABX', 'Pesawat Telepon'],
      'Sistem Audio dan Video': ['Monitor/Layar'],
    },
    'Arsitektur': { 'Interior Gedung': ['Plafon Gypsum / GRC'] },
    'Civil': {
      'Lantai Bangunan': ['Lantai Granit'],
      'Dinding Bangunan': ['Dinding Tembok/Mansonry'],
    },
  },
  'Generic': {
    'Mechanical': { 'Tata Udara': ['AC VRV', 'FCU'] },
    'Electrical': {
      'Signage Gedung': ['Lampu Neon Sign', 'Lampu Pylon Sign'],
      'Panel Distribusi': ['Panel UPS', 'LVMDP', 'SDP'],
      'Lampu Penerangan': ['Lampu LED Downlight', 'Lampu Downlight'],
      'Generator Panel': ['Automatic Transfer Switch (ATS Panel)'],
    },
    'Plumbing': {
      'Sanitari Sistem': ['Kloset', 'Jet Shower'],
      'Sistem Pemipaan gedung': ['Pemipaan Air Bersih', 'Pemipaan Air Kotor'],
    },
    'Sistem Pemadam Kebakaran': {
      'Alat Pemadam Api Portable': ['APAR CO2', 'APAB Dry Powder', 'APAR Dry Powder Stored Pressure', 'APAR Dry Powder Cartridge'],
      'Hydrant System': ['Valve Control'],
    },
    'Security Sistem': { 'Sistem Keamanan': ['Access Control', 'Push Button'] },
    'Sistem Telekomunikasi Gedung': {
      'Telephone System': ['Pesawat Telepon', 'PABX'],
      'Sistem Audio dan Video': ['Monitor/Layar'],
    },
    'Sistem Proteksi Kebakaran Aktif': { 'Sistem Alarm Kebakaran': ['Bell Alarm', 'MCFA'] },
    'Civil': {
      'Lantai Bangunan': ['Lantai Karpet', 'Lantai Granit', 'Lantai Keramik'],
      'Atap Bangunan': ['Atap Beton'],
    },
    'Distribusi Air': { 'Distributor Air Bersih': ['Roof Tank'] },
    'Arsitektur': { 'Interior Gedung': ['Plafon Gypsum / GRC'] },
  },
  'Lokal': {
    'Mechanical': { 'Tata Udara': ['AC VRV'] },
    'Electrical': {
      'Signage Gedung': ['Lampu Backlit Sign', 'Lampu Pylon Sign'],
      'Generator Panel': ['Automatic Transfer Switch (ATS Panel)'],
      'Panel Distribusi': ['SDP'],
      'Control Panel': ['Control Panel Penerangan'],
      'Lampu Penerangan': ['Lampu LED'],
    },
    'Security Sistem': { 'Sistem Keamanan': ['Kick Bar'] },
    'Sistem Pemadam Kebakaran': {
      'Fire Pump System': ['Diesel Fire Pump'],
      'Hydrant System': ['Valve Control'],
      'Alat Pemadam Api Portable': ['APAR CO2', 'APAR Dry Powder Cartridge', 'APAB Dry Powder', 'APAR Dry Powder Stored Pressure'],
    },
    'Sistem Proteksi Kebakaran Aktif': { 'Sistem Alarm Kebakaran': ['Bell Alarm'] },
    'Sistem Telekomunikasi Gedung': {
      'Telephone System': ['PABX'],
      'Sistem Jaringan Internet': ['LAN (Local Area Network)'],
    },
    'Plumbing': {
      'Sanitari Sistem': ['Rooftank', 'Kloset', 'Urinal', 'Jet Shower'],
      'Sistem Pemipaan gedung': ['Pemipaan Air Kotor'],
    },
    'Civil': {
      'Atap Bangunan': ['Atap Beton'],
      'Dinding Bangunan': ['Dinding Batu Alam', 'Dinding Tembok/Mansonry'],
    },
    'Arsitektur': {
      'Interior Gedung': ['Plafon Gypsum / GRC'],
      'Pintu dan Jendela': ['Pintu Kayu/HPL'],
    },
  },
  'Mitsubishi': {
    'Mechanical': { 'Tata Udara': ['AC Cassette', 'AC Split'] },
  },
  'Panasonic': {
    'Mechanical': { 'Tata Udara': ['AC Split', 'AC Cassette'] },
    'Ventilasi Sistem': { 'Sistem Sirkulasi Udara': ['Exhaust Fan'] },
  },
  'Gree': {
    'Mechanical': { 'Tata Udara': ['AC Split'] },
  },
  'Grundfos': {
    'Mechanical': { 'Pompa': ['Pompa Transfer', 'Pompa Air Tanah', 'Pompa Boster'] },
  },
  'LG': {
    'Mechanical': { 'Tata Udara': ['AC Cassette', 'AC Split'] },
    'Security Sistem': { 'Sistem Pengawasan': ['Monitor CCTV'] },
  },
  'Bosch': {
    'Security Sistem': { 'Sistem Pengawasan': ['Kamera CCTV'] },
  },
  'Samsung': {
    'Mechanical': { 'Tata Udara': ['AC Split'] },
  },
  'Notifier': {
    'Sistem Proteksi Kebakaran Aktif': { 'Sistem Deteksi Kebakaran': ['Smoke Detector'] },
  },
  'Wasser': {
    'Plumbing': { 'Sanitari Sistem': ['Kran Air'] },
  },
  'Honeywell': {
    'Security Sistem': { 'Sistem Pengawasan': ['DVR CCTV'] },
  },
  'Axis': {
    'Security Sistem': { 'Sistem Pengawasan': ['Kamera CCTV'] },
  },
  'Ebara': {
    'Mechanical': { 'Pompa': ['Pompa Boster'] },
  },
  'Krisbow': {
    'Ventilasi Sistem': { 'Sistem Sirkulasi Udara': ['Exhaust Fan'] },
  },
  'KDK': {
    'Ventilasi Sistem': { 'Sistem Sirkulasi Udara': ['Exhaust Fan'] },
  },
  'Dahua': {
    'Security Sistem': { 'Sistem Pengawasan': ['Kamera CCTV'] },
  },
  'Cummins': {
    'Mechanical': { 'Genset': ['Genset Diesel'] },
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: AssetAddedResult, image: string | null) => void;
}

export default function AddAssetModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [selectedGedung, setSelectedGedung] = useState<Gedung | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fetched lookup data (fetched once on open)
  const [allMerk,        setAllMerk]        = useState<LookupItem[]>([]);
  const [allKategori,    setAllKategori]    = useState<LookupItem[]>([]);
  const [allSubKategori, setAllSubKategori] = useState<LookupItem[]>([]);
  const [allTipe,        setAllTipe]        = useState<LookupItem[]>([]);

  // States klasifikasi yang dipilih
  const [merk, setMerk] = useState<LookupItem | null>(null);
  const [kategori, setKategori] = useState<LookupItem | null>(null);
  const [subKategori, setSubKategori] = useState<LookupItem | null>(null);
  const [tipe, setTipe] = useState<LookupItem | null>(null);

  const [assetName, setAssetName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [criticalityLevel, setCriticalityLevel] = useState('');

  // Pin state
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>('verify');
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedGedung(null);
    setPreview(null);
    setIsSubmitting(false);
    setShowPin(false);
    setPinValue('');
    setPinConfirm('');
    setPinError('');
    setErrorMsg(null);
    setAssetName('');
    setPurchaseDate('');
    setCriticalityLevel('');
    setMerk(null);
    setKategori(null);
    setSubKategori(null);
    setTipe(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const token = authApi.getToken();
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      apiFetch('/api/gedung',              { headers: h }).then((r) => r.json()),
      apiFetch('/api/auth/me',             { headers: h }).then((r) => r.json()),
      apiFetch('/api/lookup/merk',         { headers: h }).then((r) => r.json()),
      apiFetch('/api/lookup/kategori',     { headers: h }).then((r) => r.json()),
      apiFetch('/api/lookup/sub_kategori', { headers: h }).then((r) => r.json()),
      apiFetch('/api/lookup/tipe',         { headers: h }).then((r) => r.json()),
    ])
      .then(([gedungData, meData, merkData, katData, subKatData, tipeData]) => {
        reset();
        setGedungList(gedungData.gedung || []);
        setHasPin(!!meData.has_pin);
        setAllMerk(merkData.data        || []);
        setAllKategori(katData.data     || []);
        setAllSubKategori(subKatData.data || []);
        setAllTipe(tipeData.data        || []);
      })
      .catch(console.error);
  }, [open, reset]);

  // LookupItem[] yang difilter berdasarkan BRAND_VALIDATION_MATRIX
  const filteredMerk = useMemo(
    () => allMerk.filter((m) => m.nama in BRAND_VALIDATION_MATRIX),
    [allMerk],
  );

  const filteredKategori = useMemo(() => {
    if (!merk) return [];
    const allowed = Object.keys(BRAND_VALIDATION_MATRIX[merk.nama] || {});
    return allKategori.filter((k) => allowed.includes(k.nama));
  }, [merk, allKategori]);

  const filteredSubKategori = useMemo(() => {
    if (!merk || !kategori) return [];
    const allowed = Object.keys(BRAND_VALIDATION_MATRIX[merk.nama]?.[kategori.nama] || {});
    return allSubKategori.filter((sk) => allowed.includes(sk.nama));
  }, [merk, kategori, allSubKategori]);

  const filteredTipe = useMemo(() => {
    if (!merk || !kategori || !subKategori) return [];
    const allowed = BRAND_VALIDATION_MATRIX[merk.nama]?.[kategori.nama]?.[subKategori.nama] || [];
    return allTipe.filter((t) => allowed.includes(t.nama));
  }, [merk, kategori, subKategori, allTipe]);

  // Cascade clear: Memastikan hierarki dibersihkan ke bawah setiap kali level atas berubah
  const handleMerkChange = (item: LookupItem | null) => {
    setMerk(item); setKategori(null); setSubKategori(null); setTipe(null);
  };
  const handleKategoriChange = (item: LookupItem | null) => {
    setKategori(item); setSubKategori(null); setTipe(null);
  };
  const handleSubKategoriChange = (item: LookupItem | null) => {
    setSubKategori(item); setTipe(null);
  };

  if (!open) return null;

  const handleSaveClick = () => {
    setErrorMsg(null);
    if (!assetName.trim()) { setErrorMsg('Nama aset wajib diisi.'); return; }
    if (!purchaseDate)     { setErrorMsg('Tanggal pembelian wajib diisi.'); return; }
    if (!criticalityLevel) { setErrorMsg('Tingkat kekritisan wajib dipilih.'); return; }
    if (!merk || !kategori || !subKategori || !tipe) { 
      setErrorMsg('Semua klasifikasi aset (Merk, Kategori, Sub, Tipe) wajib dipilih.'); return; 
    }

    setPinValue('');
    setPinConfirm('');
    setPinError('');
    setPinMode(hasPin ? 'verify' : 'set');
    setShowPin(true);
  };

  const submitAsset = async () => {
    setIsSubmitting(true);
    try {
      const token = authApi.getToken();
      const body: Record<string, string | undefined> = {
        asset_name: assetName,
        purchase_date: purchaseDate,
        criticality_level: criticalityLevel,
        gedung_id: selectedGedung?.id,
      };
      if (merk)        body.merk_id         = merk.id;
      if (kategori)    body.kategori_id     = kategori.id;
      if (subKategori) body.sub_kategori_id = subKategori.id;
      if (tipe)        body.tipe_id         = tipe.id;

      const response = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${response.status}`);
      }

      const result = await response.json();
      const resultData: AssetAddedResult = {
        asset_name:    assetName,
        predicted_rul: result.data?.predicted_rul ?? 0,
        gedung_nama:   selectedGedung?.nama  ?? '-',
        brand:         merk?.nama            ?? '-',
        category:      kategori?.nama        ?? '-',
        sub_category:  subKategori?.nama,
        tipe:          tipe?.nama,
      };

      onClose();
      onSuccess(resultData, preview);
    } catch (error) {
      setErrorMsg((error as Error).message || 'Gagal menyimpan data aset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = async () => {
    setPinError('');
    if (!/^\d{6}$/.test(pinValue)) { setPinError('PIN harus 6 digit angka'); return; }

    if (pinMode === 'set') { setPinMode('set-confirm'); setPinConfirm(''); return; }

    if (pinMode === 'set-confirm') {
      if (pinConfirm !== pinValue) { setPinError('Konfirmasi PIN tidak cocok'); return; }
      setPinLoading(true);
      try {
        const token = authApi.getToken();
        const r = await apiFetch('/api/auth/set-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pin: pinValue }),
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Gagal menyimpan PIN');
        setHasPin(true);
        setShowPin(false);
        await submitAsset();
      } catch (e) { setPinError((e as Error).message); }
      finally { setPinLoading(false); }
      return;
    }

    setPinLoading(true);
    try {
      const token = authApi.getToken();
      const r = await apiFetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: pinValue }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'PIN salah');
      setShowPin(false);
      await submitAsset();
    } catch (e) { setPinError((e as Error).message); }
    finally { setPinLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !showPin) onClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn transition-all duration-200 ${showPin ? 'scale-[0.97] opacity-60 pointer-events-none' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-8 pb-5 border-b shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Tambah Aset Baru</h2>
            <p className="text-gray-500 text-sm mt-0.5">Lengkapi data aset perusahaan</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-start gap-0 px-10 pt-6 pb-1 shrink-0 max-w-xs">
          <StepDot number={1} label="Pilih Gedung" active={step === 1} done={step === 2} />
          <div className={`flex-1 h-0.5 mt-3.5 mx-2 transition-colors duration-300 ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <StepDot number={2} label="Detail Aset" active={step === 2} done={false} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-10 py-6">

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500">Pilih gedung lokasi aset ini berada</p>
                <button
                  onClick={() => { onClose(); }}
                  className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition font-medium"
                >
                  <Plus size={15} />
                  Tambah Gedung
                </button>
              </div>
              {gedungList.length === 0 ? (
                <p className="text-gray-400 text-sm">Memuat data gedung...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {gedungList.map((g) => {
                    const color = GEDUNG_COLORS[g.kode] ?? 'bg-gray-100 text-gray-700 border-gray-200';
                    const selected = selectedGedung?.id === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGedung(g)}
                        className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 px-5 py-7 transition-all duration-200
                          ${selected ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/10' : `${color} hover:shadow-sm hover:-translate-y-0.5`}`}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                        <Building2 size={26} />
                        <span className="font-semibold text-sm text-center leading-tight">{g.nama}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex gap-8">
              {/* Left: form */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={14} className="text-blue-600" />
                  <span className="text-gray-500">Lokasi:</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">
                    {selectedGedung?.nama}
                  </span>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs text-blue-600 hover:underline">Ganti</button>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="ml-auto shrink-0"><X size={13} /></button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Nama Aset" placeholder="Masukkan nama aset" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tanggal Pembelian</label>
                    <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm" />
                  </div>

                  <LookupDropdown label="Merk / Brand"  table="merk"         value={merk}        onChange={handleMerkChange}        overrideItems={filteredMerk}        placeholder="Pilih merk aset" />
                  <LookupDropdown label="Kategori"      table="kategori"     value={kategori}    onChange={handleKategoriChange}    overrideItems={filteredKategori}    placeholder="Pilih kategori"    disabled={!merk}        disabledHint="Pilih Merk terlebih dahulu" />
                  <LookupDropdown label="Sub Kategori"  table="sub_kategori" value={subKategori}  onChange={handleSubKategoriChange}  overrideItems={filteredSubKategori}  placeholder="Pilih sub kategori" disabled={!kategori}    disabledHint="Pilih Kategori terlebih dahulu" />
                  <LookupDropdown label="Tipe"          table="tipe"         value={tipe}        onChange={setTipe}                  overrideItems={filteredTipe}        placeholder="Pilih tipe aset"   disabled={!subKategori} disabledHint="Pilih Sub Kategori terlebih dahulu" />

                  <FormSelect label="Tingkat Kekritisan" value={criticalityLevel} onChange={(e) => setCriticalityLevel(e.target.value)} options={['Critical', 'Major', 'Minor']} />
                </div>
              </div>

              {/* Right: image */}
              <div className="w-64 shrink-0 flex flex-col">
                <p className="text-sm font-medium text-gray-700 mb-2">Gambar Aset <span className="text-gray-400 font-normal">(opsional)</span></p>
                <label className="flex-1 min-h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden">
                  <input type="file" className="hidden" accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500"><Upload size={24} /></div>
                      <p className="text-sm font-medium text-gray-600">Klik untuk upload</p>
                      <p className="text-xs text-gray-400">PNG, JPG, JPEG</p>
                    </div>
                  )}
                </label>
                {preview && (
                  <button onClick={() => setPreview(null)} className="mt-2 text-xs text-red-500 hover:text-red-600 text-center">Hapus gambar</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-10 py-5 border-t shrink-0">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Batal</button>
              <button
                onClick={() => { if (selectedGedung) setStep(2); }}
                disabled={!selectedGedung}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-7 py-2.5 rounded-2xl text-sm font-medium transition shadow-lg shadow-blue-600/20"
              >
                Lanjutkan <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Kembali</button>
              <button
                onClick={handleSaveClick}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-10 py-2.5 rounded-2xl text-sm font-medium transition shadow-lg shadow-blue-600/20"
              >
                <Lock size={14} />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Aset'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* PIN overlay */}
      {showPin && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <PinOverlay
            mode={pinMode}
            pinValue={pinValue}
            pinConfirm={pinConfirm}
            error={pinError}
            loading={pinLoading}
            onPinChange={setPinValue}
            onConfirmChange={setPinConfirm}
            onSubmit={handlePinSubmit}
            onCancel={() => setShowPin(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── PIN OVERLAY ──────────────────────────────────────────────────────────────
function PinOverlay({ mode, pinValue, pinConfirm, error, loading, onPinChange, onConfirmChange, onSubmit, onCancel }: {
  mode: PinMode; pinValue: string; pinConfirm: string; error: string; loading: boolean;
  onPinChange: (v: string) => void; onConfirmChange: (v: string) => void;
  onSubmit: () => void; onCancel: () => void;
}) {
  const title    = mode === 'verify' ? 'Konfirmasi PIN' : mode === 'set' ? 'Buat PIN Baru' : 'Konfirmasi PIN Baru';
  const subtitle = mode === 'verify' ? 'Masukkan PIN 6 digit untuk melanjutkan' : mode === 'set' ? 'Buat PIN 6 digit untuk keamanan transaksi' : 'Masukkan kembali PIN yang sama untuk konfirmasi';
  const activePin = mode === 'set-confirm' ? pinConfirm : pinValue;
  const setActive = mode === 'set-confirm' ? onConfirmChange : onPinChange;

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fadeIn mx-4">
      <div className="flex flex-col items-center text-center gap-1 mb-7">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
          {mode === 'verify' ? <Lock size={26} /> : <ShieldCheck size={26} />}
        </div>
        <h3 className="text-xl font-bold text-[#111827]">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <PinBoxes value={activePin} onChange={setActive} onEnter={onSubmit} />
      {error && <p className="text-center text-sm text-red-500 mt-3">{error}</p>}
      <button onClick={onSubmit} disabled={loading || activePin.length < 6}
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-medium text-sm transition shadow-lg shadow-blue-600/20">
        {loading ? 'Memproses...' : mode === 'set' ? 'Lanjutkan' : mode === 'set-confirm' ? 'Simpan PIN & Lanjutkan' : 'Konfirmasi'}
      </button>
      <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2">Batal</button>
    </div>
  );
}

// ── 6-BOX PIN INPUT ──────────────────────────────────────────────────────────
function PinBoxes({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').map((c) => c.trim()).slice(0, 6);

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d;
    onChange(next.join('').trimEnd());
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { const next = [...digits]; next[i] = ''; onChange(next.join('').trimEnd()); }
      else if (i > 0) refs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter' && value.length === 6) onEnter();
  };

  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    refs.current[firstEmpty === -1 ? 0 : firstEmpty]?.focus();
  }, []);

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }}
          type="password" inputMode="numeric" maxLength={1} value={d}
          onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-2xl outline-none transition-all
            ${d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-black'}
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
        />
      ))}
    </div>
  );
}

// ── SHARED SUB-COMPONENTS ─────────────────────────────────────────────────────
function StepDot({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300
        ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}`}>
        {done ? <Check size={13} /> : number}
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${active || done ? 'text-blue-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

function FormInput({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm" />
    </div>
  );
}

function FormSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select value={value} onChange={onChange}
        className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm cursor-pointer">
        <option value="">Pilih {label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}