'use client';

import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const LOADING_STATES = [
  'Membaca data dashboard...',
  'Menganalisis kondisi aset...',
  'Memproses riwayat maintenance...',
  'Menghasilkan ringkasan AI...',
];

type SummaryStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface Props {
  onSelectAsset?: (assetId: string) => void;
  dashboardSnapshot?: object | null;
}

export default function SummaryCard({ onSelectAsset, dashboardSnapshot }: Props) {
  const [summary, setSummary] = useState<string>('');
  const [assets, setAssets] = useState<{ id: string, name: string, brand: string, category: string, status: string, pred_rul: number | null }[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SummaryStatus>('idle');
  const [loadingStep, setLoadingStep] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const isLoading = status === 'loading';

  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STATES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleViewInsights = () => {
    if (status === 'loading') return;

    setStatus('loading');
    setError(null);
    setShowContent(false);
    setLoadingStep(0);

    const controller = new AbortController();
    abortRef.current = controller;

    timeoutRef.current = window.setTimeout(async () => {
      try {
        const token = authApi.getToken();
        const response = await apiFetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            limit: 10,
            temperature: 0.2,
            dashboardSnapshot: dashboardSnapshot ?? null,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || 'Gagal mengambil ringkasan');
        }

        const data = await response.json();
        setSummary(data.summary || 'Tidak ada ringkasan yang tersedia.');
        setAssets(data.assets || []);
        setCriticalCount(typeof data.critical_count === 'number' ? data.critical_count : 0);
        setStatus('loaded');
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError('Tidak dapat memuat ringkasan. Cek backend atau AI engine.');
          setStatus('error');
          console.error('Summary fetch error:', fetchError);
        }
      } finally {
        setTimeout(() => setShowContent(true), 50);
      }
    }, 1500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 shadow-lg bg-white min-w-0 w-full">

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">AI Maintenance Summary</h2>
          <p className="text-sm mt-1 text-gray-500">
            {dashboardSnapshot
              ? 'AI membaca tampilan dashboard saat ini.'
              : 'Ringkasan kondisi aset dan pemeliharaan terbaru.'}
          </p>
        </div>

        <div className="shrink-0">
          {status === 'loading' ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              NLP Processing
            </span>
          ) : status === 'loaded' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Generated
            </span>
          ) : status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              Gagal
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              Belum Dianalisis
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="mt-5 min-h-30 max-h-80 overflow-y-auto overflow-x-hidden scrollbar-hidden">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center text-center h-full py-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              {dashboardSnapshot
                ? 'AI akan membaca data yang tampil di dashboard ini — stat, aset, maintenance, dan prediksi RUL.'
                : 'Hasilkan ringkasan AI berdasarkan data dashboard terkini.'}
            </p>
            <button
              onClick={handleViewInsights}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View Insights
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={handleViewInsights}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors duration-200"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full py-6 space-y-4">
            <div className="flex w-full max-w-sm gap-1">
              {LOADING_STATES.map((_, idx) => (
                <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx <= loadingStep ? 'bg-blue-600' : 'bg-gray-100'}`}></div>
              ))}
            </div>
            <p className="text-sm font-medium text-blue-600 animate-pulse">
              {LOADING_STATES[loadingStep]}
            </p>
          </div>
        )}

        {status === 'loaded' && (
          <div className={`transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            {/* Summary text in a styled card */}
            <div className="rounded-xl bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
              <p className="relative text-sm leading-relaxed text-blue-50 font-medium wrap-break-word whitespace-pre-line">
                {summary}
              </p>
            </div>

            {/* Critical assets */}
            {criticalCount > 0 && (() => {
              const criticalAssets = assets.filter((a) => a.pred_rul != null && a.pred_rul <= 180);
              return (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                    <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                      Aset Kritis — Segera Ditangani ({criticalCount})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3 pb-1">
                    {criticalAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => onSelectAsset?.(asset.id)}
                        className="group w-48 flex flex-col p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-all duration-200 shadow-sm text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg>
                          </div>
                          <p className="font-semibold text-xs leading-tight text-gray-800 truncate" title={asset.name}>{asset.name}</p>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mb-2">{asset.brand} • {asset.category}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-red-100">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                            {asset.status || '—'}
                          </span>
                          <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                            {asset.pred_rul} hari
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
