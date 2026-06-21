'use client';

import { useState } from 'react';
import Topbar from '@/components/Topbar';

type Language = 'id' | 'en';
type Density = 'compact' | 'normal' | 'spacious';

export default function PersonalizationPage() {
  const [language, setLanguage] = useState<Language>('id');
  const [density, setDensity] = useState<Density>('normal');
  const [notifications, setNotifications] = useState({
    alerts: true,
    maintenance: true,
    reports: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="flex-1 min-h-screen bg-[#F5F7FB]">

      <div className="flex-1 sb-content p-8">
        <Topbar />

        <div className="mt-8 animate-[slideUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Personalization</h1>
          <p className="text-gray-500 mt-1 text-sm">Atur tampilan dan preferensi notifikasi kamu</p>
        </div>

        <div className="mt-8 max-w-xl space-y-3 animate-[slideUp_0.5s_0.1s_ease-out_both]">

          {/* Language */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Bahasa</p>
            <div className="flex gap-2">
              {([['id', 'Indonesia'], ['en', 'English']] as [Language, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLanguage(val)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    language === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Kepadatan Tampilan</p>
            <div className="flex gap-2">
              {([['compact', 'Compact'], ['normal', 'Normal'], ['spacious', 'Spacious']] as [Density, string][]).map(
                ([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDensity(val)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      density === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Notifikasi</p>
            <div className="space-y-3">
              {(
                [
                  ['alerts', 'Alert aset kritis'],
                  ['maintenance', 'Jadwal maintenance'],
                  ['reports', 'Laporan mingguan'],
                ] as [keyof typeof notifications, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    onClick={() => toggle(key)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                      notifications[key] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                        notifications[key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {saved && (
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              Preferensi berhasil disimpan.
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full rounded-2xl bg-blue-600 py-3 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200"
          >
            Simpan Preferensi
          </button>
        </div>
      </div>
    </main>
  );
}
