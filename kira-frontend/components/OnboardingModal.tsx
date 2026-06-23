'use client';

import { useState, useEffect, useRef, ReactNode, ReactElement } from 'react';
import {
  LayoutDashboard, Package, Wrench, Bell, ShieldCheck,
  X, ChevronRight, ChevronLeft, Lock,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const ONBOARDED_KEY = 'kira_onboarded';

// ─── Illustration SVGs ──────────────────────────────────────────────────────

function WelcomeIllus() {
  return (
    <div className="relative w-56 h-56 mx-auto animate-[floatIllus_5s_ease-in-out_infinite]">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {/* Outer rings */}
        <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1" fill="none" opacity="0.12" strokeDasharray="6 4" />
        <circle cx="100" cy="100" r="68" stroke="white" strokeWidth="1" fill="none" opacity="0.18" />
        {/* Connecting lines to nodes */}
        {[[32,55],[168,55],[168,148],[32,148],[100,14]].map(([x,y],i) => (
          <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="white" strokeWidth="1" opacity="0.35"
            style={{strokeDasharray:200,strokeDashoffset:200,animation:`drawSvgLine 1s ${i*0.15}s ease-out forwards`}} />
        ))}
        {/* Satellite nodes */}
        {[[32,55,9],[168,55,7],[168,148,10],[32,148,8],[100,14,7]].map(([cx,cy,r],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity="0.55"
            style={{animation:`popIn 0.5s ${0.6+i*0.1}s ease-out both`}} />
        ))}
        {/* Scattered micro dots */}
        {[[55,35,3],[155,28,2],[175,170,3],[28,168,2.5],[180,95,2],[18,100,2]].map(([cx,cy,r],i)=>(
          <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity="0.3" />
        ))}
        {/* Center glow ring */}
        <circle cx="100" cy="100" r="34" fill="white" opacity="0.15" />
      </svg>
      {/* Center icon card */}
      <div className="absolute inset-0 flex items-center justify-center" style={{animation:'popIn 0.6s 0.2s ease-out both',opacity:0}}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-2xl flex items-center justify-center">
          <LayoutDashboard size={30} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function AssetsIllus() {
  return (
    <div className="relative w-56 h-56 mx-auto animate-[floatIllus_5.5s_ease-in-out_infinite]">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {/* Background card shadows */}
        <rect x="54" y="66" width="110" height="74" rx="12" fill="white" opacity="0.12" transform="rotate(-6 109 103)" />
        <rect x="48" y="62" width="110" height="74" rx="12" fill="white" opacity="0.2"  transform="rotate(-3 103 99)" />
        {/* Main card */}
        <rect x="42" y="58" width="116" height="78" rx="12" fill="white" opacity="0.9"
          style={{animation:'popIn 0.5s 0.1s ease-out both',opacity:0}} />
        {/* Card inner lines */}
        <rect x="56" y="72" width="48" height="7"  rx="3.5" fill="#059669" opacity="0.7" />
        <rect x="56" y="85" width="70" height="5"  rx="2.5" fill="#374151" opacity="0.25" />
        <rect x="56" y="94" width="55" height="5"  rx="2.5" fill="#374151" opacity="0.18" />
        <rect x="56" y="103" width="62" height="5" rx="2.5" fill="#374151" opacity="0.15" />
        {/* Tag badge */}
        <rect x="113" y="69" width="34" height="16" rx="8" fill="#059669" opacity="0.85" />
        <rect x="123" y="74" width="14" height="6"  rx="3" fill="white" opacity="0.9" />
        {/* Check circle */}
        <circle cx="150" cy="115" r="14" fill="#059669" opacity="0.9"
          style={{animation:'popIn 0.5s 0.5s ease-out both',opacity:0}} />
        <polyline points="144,115 149,121 157,109" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Floating dots */}
        {[[40,145,4],[165,52,3],[170,150,3],[35,60,3]].map(([cx,cy,r],i)=>(
          <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity="0.35" />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{animation:'popIn 0.6s 0.3s ease-out both',opacity:0}}>
        <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center -mt-10 -mr-10">
          <Package size={22} className="text-emerald-600" />
        </div>
      </div>
    </div>
  );
}

function MaintenanceIllus() {
  return (
    <div className="relative w-56 h-56 mx-auto animate-[floatIllus_6s_ease-in-out_infinite]">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {/* Calendar card */}
        <rect x="40" y="50" width="120" height="105" rx="14" fill="white" opacity="0.15" />
        <rect x="44" y="54" width="112" height="97"  rx="11" fill="white" opacity="0.85"
          style={{animation:'popIn 0.5s 0.1s ease-out both',opacity:0}} />
        {/* Calendar header */}
        <rect x="44" y="54" width="112" height="28" rx="11" fill="#ea580c" opacity="0.9" />
        <rect x="44" y="68" width="112" height="14" fill="#ea580c" opacity="0.9" />
        {/* Calendar grid dots */}
        {[0,1,2,3,4,5,6].map(col=>(
          [0,1,2,3].map(row=>{
            const x = 58 + col*14;
            const y = 96 + row*14;
            const done = (col+row)%3===0;
            const due  = col===5 && row===1;
            return (
              <circle key={`${col}-${row}`} cx={x} cy={y} r="5"
                fill={due?'#ea580c':done?'#d1fae5':'#f3f4f6'} opacity="0.9"
                style={{animation:`popIn 0.3s ${0.3+(col+row)*0.04}s ease-out both`,opacity:0}} />
            );
          })
        ))}
        {/* Wrench diagonal */}
        <line x1="125" y1="70" x2="165" y2="110" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
        <circle cx="125" cy="70" r="10" fill="white" opacity="0.7" />
        <circle cx="165" cy="110" r="8"  fill="white" opacity="0.6" />
        {/* Refresh arc */}
        <path d="M160 148 A22 22 0 0 1 138 170" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"
          opacity="0.55" strokeDasharray="50" style={{animation:'drawSvgLine 0.8s 0.7s ease-out forwards',strokeDashoffset:50}} />
        <polygon points="161,141 168,149 153,150" fill="white" opacity="0.55" />
      </svg>
      <div className="absolute top-6 right-6" style={{animation:'popIn 0.5s 0.4s ease-out both',opacity:0}}>
        <div className="w-11 h-11 rounded-2xl bg-white shadow-xl flex items-center justify-center">
          <Wrench size={20} className="text-orange-600" />
        </div>
      </div>
    </div>
  );
}

function AlertsIllus() {
  const pts = "40,140 70,115 100,125 125,80 150,90 175,45";
  return (
    <div className="relative w-56 h-56 mx-auto animate-[floatIllus_4.8s_ease-in-out_infinite]">
      <svg viewBox="0 0 200 180" className="absolute inset-0 w-full h-full">
        {/* Grid */}
        {[0,1,2,3].map(i=>(
          <line key={i} x1="35" y1={40+i*33} x2="180" y2={40+i*33} stroke="white" strokeWidth="0.5" opacity="0.2" />
        ))}
        {[0,1,2,3,4].map(i=>(
          <line key={i} x1={35+i*36} y1="40" x2={35+i*36} y2="140" stroke="white" strokeWidth="0.5" opacity="0.2" />
        ))}
        {/* Threshold lines */}
        <line x1="35" y1="75"  x2="180" y2="75"  stroke="#fbbf24" strokeWidth="1" opacity="0.6" strokeDasharray="4 3" />
        <line x1="35" y1="95"  x2="180" y2="95"  stroke="#f97316" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" />
        <line x1="35" y1="120" x2="180" y2="120" stroke="#ef4444" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" />
        {/* Area fill */}
        <polygon points={`${pts} 175,155 40,155`} fill="white" opacity="0.08" />
        {/* Main line */}
        <polyline points={pts} stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="300" style={{animation:'drawSvgLine 1.2s 0.2s ease-out forwards',strokeDashoffset:300}} />
        {/* Data point circles */}
        {pts.split(' ').map((p,i)=>{
          const [x,y]=p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r="5" fill="white" opacity="0.9"
            style={{animation:`popIn 0.4s ${0.3+i*0.15}s ease-out both`,opacity:0}} />;
        })}
        {/* Alert badge at last point */}
        <polygon points="175,28 183,44 167,44" fill="#ef4444" opacity="0.9"
          style={{animation:'popIn 0.5s 1.2s ease-out both',opacity:0}} />
        <text x="175" y="41" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">!</text>
        {/* Labels */}
        <text x="28" y="78"  fontSize="7" fill="white" opacity="0.7" textAnchor="end">Watch</text>
        <text x="28" y="98"  fontSize="7" fill="white" opacity="0.7" textAnchor="end">High</text>
        <text x="28" y="123" fontSize="7" fill="white" opacity="0.7" textAnchor="end">Crit</text>
      </svg>
      <div className="absolute top-4 right-4" style={{animation:'popIn 0.5s 0.3s ease-out both',opacity:0}}>
        <div className="w-11 h-11 rounded-2xl bg-white shadow-xl flex items-center justify-center">
          <Bell size={20} className="text-red-500" />
        </div>
      </div>
    </div>
  );
}

function PinIllus() {
  return (
    <div className="relative w-56 h-56 mx-auto animate-[floatIllus_5.2s_ease-in-out_infinite]">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {/* Shield background */}
        <path d="M100 18 L164 46 L164 110 Q164 158 100 182 Q36 158 36 110 L36 46 Z"
          stroke="white" strokeWidth="1.5" fill="white" opacity="0.12" />
        {/* Circuit lines */}
        {[
          "M20 80 H45 V120 H20","M180 80 H155 V120 H180",
          "M20 80 H45","M180 80 H155",
          "M100 185 V165","M100 30 V18",
        ].map((d,i)=>(
          <path key={i} d={d} stroke="white" strokeWidth="1" fill="none" opacity="0.3"
            strokeDasharray="80" style={{animation:`drawSvgLine 0.8s ${i*0.1}s ease-out forwards`,strokeDashoffset:80}} />
        ))}
        {/* Circuit dots */}
        {[[20,80],[20,120],[180,80],[180,120],[45,80],[45,120],[155,80],[155,120]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="4" fill="white" opacity="0.4" />
        ))}
        {/* Lock body */}
        <rect x="68" y="95" width="64" height="52" rx="10" fill="white" opacity="0.9"
          style={{animation:'popIn 0.5s 0.2s ease-out both',opacity:0}} />
        {/* Lock shackle */}
        <path d="M80 95 V76 Q80 58 100 58 Q120 58 120 76 V95"
          stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.85"
          strokeDasharray="100" style={{animation:'drawSvgLine 0.7s 0.4s ease-out forwards',strokeDashoffset:100}} />
        {/* Keyhole */}
        <circle cx="100" cy="117" r="9" fill="#7c3aed" opacity="0.8"
          style={{animation:'popIn 0.5s 0.7s ease-out both',opacity:0}} />
        <rect x="96.5" y="117" width="7" height="12" rx="3" fill="#7c3aed" opacity="0.8" />
        {/* PIN dots preview */}
        {[0,1,2,3,4,5].map(i=>(
          <circle key={i} cx={73+i*11} cy="132"  r="4" fill="#7c3aed" opacity={i<2?0.9:0.35}
            style={{animation:`popIn 0.3s ${0.8+i*0.07}s ease-out both`,opacity:0}} />
        ))}
      </svg>
      <div className="absolute top-4 left-4" style={{animation:'popIn 0.5s 0.5s ease-out both',opacity:0}}>
        <div className="w-11 h-11 rounded-2xl bg-white shadow-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-purple-600" />
        </div>
      </div>
    </div>
  );
}

// ─── Step definitions ──────────────────────────────────────────────────────

interface StepDef {
  gradient: string;
  accentFrom: string;
  accentTo: string;
  Illus: () => ReactElement;
  title: string;
  desc: string;
  hint: string;
  isPinStep?: boolean;
}

const ALL_STEPS: StepDef[] = [
  {
    gradient: 'from-blue-600 via-blue-700 to-indigo-800',
    accentFrom: 'from-blue-400',
    accentTo: 'to-indigo-500',
    Illus: WelcomeIllus,
    title: 'Selamat Datang di KIRA!',
    desc: 'Platform manajemen aset cerdas yang membantu Anda memantau, mengelola, dan memprediksi kondisi aset perusahaan secara real-time menggunakan kecerdasan buatan.',
    hint: '💡 Ikuti panduan singkat ini — hanya butuh 1 menit!',
  },
  {
    gradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    accentFrom: 'from-emerald-400',
    accentTo: 'to-teal-500',
    Illus: AssetsIllus,
    title: 'Kelola Semua Aset',
    desc: 'Daftarkan dan pantau aset dari berbagai kategori — elektronik, furnitur, kendaraan, hingga mesin industri. Setiap aset memiliki histori lengkap, status kondisi, dan prediksi RUL.',
    hint: '💡 Gunakan tombol "+ Add Asset" di halaman Aset untuk mendaftarkan aset baru.',
  },
  {
    gradient: 'from-orange-500 via-orange-600 to-amber-700',
    accentFrom: 'from-orange-400',
    accentTo: 'to-amber-500',
    Illus: MaintenanceIllus,
    title: 'Jadwal Maintenance',
    desc: 'Buat jadwal pemeliharaan, tugaskan teknisi yang tepat, dan pantau progres pekerjaan secara langsung. Cegah downtime dengan perencanaan yang terstruktur.',
    hint: '💡 Klik "+ Schedule" di halaman Maintenance untuk membuat jadwal baru.',
  },
  {
    gradient: 'from-red-500 via-red-600 to-rose-700',
    accentFrom: 'from-red-400',
    accentTo: 'to-rose-500',
    Illus: AlertsIllus,
    title: 'Alerts & Prediksi RUL',
    desc: 'AI KIRA memprediksi Remaining Useful Life (RUL) setiap aset secara otomatis. Dapatkan peringatan dini sebelum aset mengalami kerusakan kritis.',
    hint: '💡 Aset dengan RUL ≤ 6 bulan dikategorikan Critical — perlu tindakan segera.',
  },
  {
    gradient: 'from-purple-600 via-purple-700 to-violet-800',
    accentFrom: 'from-purple-400',
    accentTo: 'to-violet-500',
    Illus: PinIllus,
    title: 'Buat PIN Keamanan',
    desc: 'PIN 6 digit melindungi operasi sensitif seperti menambahkan aset baru. Anda hanya perlu membuatnya sekali — dan bisa diubah kapan saja di Pengaturan > Keamanan.',
    hint: '🔐 PIN ini berbeda dari password login dan hanya digunakan di dalam aplikasi.',
    isPinStep: true,
  },
];

// ─── 6-box PIN input ────────────────────────────────────────────────────────

function PinBoxes({ value, onChange, onEnter }: {
  value: string; onChange: (v: string) => void; onEnter: () => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').map(c => c.trim()).slice(0, 6);

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d;
    onChange(next.join('').trimEnd());
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { const n=[...digits]; n[i]=''; onChange(n.join('').trimEnd()); }
      else if (i > 0) refs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter' && value.length === 6) onEnter();
  };

  useEffect(() => {
    const first = digits.findIndex(d => !d);
    refs.current[first === -1 ? 0 : first]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }}
          type="password" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-2xl outline-none transition-all duration-200
            ${d ? 'border-purple-500 bg-purple-50 text-purple-700 scale-105'
                : 'border-gray-200 bg-gray-50 text-black'}
            focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:scale-105`}
        />
      ))}
    </div>
  );
}

// ─── Content panel (animated on key change) ─────────────────────────────────

function StepContent({
  step, isPinStep, pinPhase, pinValue, pinConfirm, pinError, pinLoading, pinDone,
  setActivePinValue, handlePinSubmit,
}: {
  step: StepDef;
  isPinStep: boolean;
  pinPhase: 'set' | 'confirm';
  pinValue: string; pinConfirm: string; pinError: string;
  pinLoading: boolean; pinDone: boolean;
  setActivePinValue: (v: string) => void;
  handlePinSubmit: () => void;
}) {
  const activePinValue = pinPhase === 'confirm' ? pinConfirm : pinValue;

  return (
    <div className="animate-[onboardSlide_0.38s_ease-out_both]">
      <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
        {step.title}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-4">
        {step.desc}
      </p>
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        {step.hint}
      </div>

      {isPinStep && !pinDone && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {pinPhase === 'set' ? 'Buat PIN 6 digit:' : 'Konfirmasi PIN Anda:'}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {pinPhase === 'set'
              ? 'Gunakan angka yang mudah Anda ingat namun sulit ditebak orang lain.'
              : 'Masukkan PIN yang sama untuk konfirmasi.'}
          </p>
          <PinBoxes key={pinPhase} value={activePinValue}
            onChange={setActivePinValue} onEnter={handlePinSubmit} />
          {pinError && (
            <p className="text-center text-sm text-red-500 mt-3 animate-[slideUp_0.3s_ease-out_both]">
              {pinError}
            </p>
          )}
        </div>
      )}

      {isPinStep && pinDone && (
        <div className="mt-6 flex flex-col items-center gap-3 animate-[popIn_0.5s_ease-out_both]">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck size={30} className="text-green-600" />
          </div>
          <p className="text-sm font-semibold text-green-700">PIN berhasil dibuat!</p>
          <p className="text-xs text-gray-400">Mengalihkan ke dashboard…</p>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export default function OnboardingModal({ onPinSet, onOpen: onOpenCb, onClose: onCloseCb }: { onPinSet?: () => void; onOpen?: () => void; onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<StepDef[]>([]);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  // PIN state
  const [pinPhase, setPinPhase] = useState<'set' | 'confirm'>('set');
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinDone, setPinDone] = useState(false);

  useEffect(() => {
    const alreadyOnboarded = localStorage.getItem(ONBOARDED_KEY);
    const token = authApi.getToken();
    if (!token) return;

    apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const hasPin = !!data.has_pin;
        if (!alreadyOnboarded || !hasPin) {
          setSteps(hasPin ? ALL_STEPS.filter(s => !s.isPinStep) : ALL_STEPS);
          setOpen(true);
          onOpenCb?.();
          setTimeout(() => setMounted(true), 40);
        }
      })
      .catch(console.error);
  }, []);

  const dismiss = () => {
    setMounted(false);
    setTimeout(() => {
      localStorage.setItem(ONBOARDED_KEY, '1');
      setOpen(false);
      onCloseCb?.();
    }, 300);
  };

  const go = (next: number) => {
    setMounted(false);
    setTimeout(() => { setIdx(next); setMounted(true); }, 180);
  };

  const handlePinSubmit = async () => {
    setPinError('');
    if (!/^\d{6}$/.test(pinValue)) { setPinError('PIN harus 6 digit angka'); return; }
    if (pinPhase === 'set') { setPinPhase('confirm'); setPinConfirm(''); return; }
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
      setPinDone(true);
      onPinSet?.();
      setTimeout(dismiss, 1600);
    } catch (e) { setPinError((e as Error).message); }
    finally { setPinLoading(false); }
  };

  if (!open || steps.length === 0) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const isPin = !!step.isPinStep;
  const activePinValue = pinPhase === 'confirm' ? pinConfirm : pinValue;
  const setActivePinValue = pinPhase === 'confirm' ? setPinConfirm : setPinValue;
  const { Illus } = step;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      {/* Modal container */}
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex transition-all duration-300 ${
          mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{ minHeight: 520 }}
      >
        {/* ── LEFT: Illustration panel ── */}
        <div
          className={`relative hidden md:flex flex-col items-center justify-center w-[44%] bg-linear-to-br ${step.gradient} overflow-hidden p-8`}
        >
          {/* Abstract bg circles */}
          <div className="absolute top-[-30%] right-[-20%] w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-15%] w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-[10%] left-[5%] w-24 h-24 rounded-full bg-white/5 pointer-events-none animate-[orbitSpin_12s_linear_infinite]" style={{transformOrigin:'120px 120px'}} />

          {/* Illustration */}
          <div key={`illus-${idx}`} className="animate-[onboardSlide_0.4s_ease-out_both] w-full">
            <Illus />
          </div>

          {/* Step label */}
          <p key={`label-${idx}`} className="mt-6 text-white/70 text-xs font-medium uppercase tracking-widest animate-[fadeIn_0.5s_0.2s_ease-out_both]">
            Langkah {idx + 1} dari {steps.length}
          </p>
        </div>

        {/* ── RIGHT: Content panel ── */}
        <div className="flex flex-col flex-1 p-8 md:p-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            {/* Progress pills */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-400 ${
                    i === idx
                      ? `h-2 w-8 bg-linear-to-r ${step.accentFrom} ${step.accentTo}`
                      : i < idx
                      ? 'h-2 w-2 bg-gray-300'
                      : 'h-2 w-2 bg-gray-150'
                  }`}
                  style={{ backgroundColor: i > idx ? '#e5e7eb' : undefined }}
                />
              ))}
            </div>
            <button
              onClick={dismiss}
              className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* Content (animates on step change) */}
          <div className="flex-1">
            <StepContent
              key={idx}
              step={step}
              isPinStep={isPin}
              pinPhase={pinPhase}
              pinValue={pinValue}
              pinConfirm={pinConfirm}
              pinError={pinError}
              pinLoading={pinLoading}
              pinDone={pinDone}
              setActivePinValue={setActivePinValue}
              handlePinSubmit={handlePinSubmit}
            />
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {idx > 0 ? (
              <button
                onClick={() => {
                  if (isPin && pinPhase === 'confirm') { setPinPhase('set'); setPinError(''); }
                  else go(idx - 1);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                <ChevronLeft size={15} /> Kembali
              </button>
            ) : (
              <button onClick={dismiss} className="text-sm text-gray-400 hover:text-gray-600 transition">
                Lewati
              </button>
            )}

            {isPin ? (
              <button
                onClick={handlePinSubmit}
                disabled={pinLoading || activePinValue.length < 6 || pinDone}
                className={`flex items-center gap-2 bg-linear-to-r ${step.accentFrom} ${step.accentTo}
                  text-white px-7 py-2.5 rounded-2xl text-sm font-semibold
                  disabled:opacity-40 disabled:cursor-not-allowed transition
                  shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0`}
              >
                <Lock size={13} />
                {pinLoading ? 'Menyimpan…' : pinPhase === 'set' ? 'Lanjutkan →' : 'Simpan PIN'}
              </button>
            ) : isLast ? (
              <button
                onClick={dismiss}
                className={`flex items-center gap-2 bg-linear-to-r ${step.accentFrom} ${step.accentTo}
                  text-white px-7 py-2.5 rounded-2xl text-sm font-semibold
                  transition shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
              >
                Selesai ✓
              </button>
            ) : (
              <button
                onClick={() => go(idx + 1)}
                className={`flex items-center gap-2 bg-linear-to-r ${step.accentFrom} ${step.accentTo}
                  text-white px-7 py-2.5 rounded-2xl text-sm font-semibold
                  transition shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
              >
                Lanjutkan <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
