'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const LOADING_STATES = [
  'Tokenizing asset data...',
  'Extracting features...',
  'Analyzing maintenance history...',
  'Generating insights...',
];

export default function SummaryCard() {
  const [summary, setSummary] = useState<string>('');
  const [assets, setAssets] = useState<{ id: string, name: string, brand: string, category: string, status: string, pred_rul: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Loading text cycler
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STATES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
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
            temperature: 0.2
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
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError('Tidak dapat memuat ringkasan. Cek backend atau AI engine.');
          console.error('Summary fetch error:', fetchError);
        }
      } finally {
        setIsLoading(false);
        // Trigger the pop animation slightly after loading finishes
        setTimeout(() => setShowContent(true), 50);
      }
    }, 1500); // artificially extended to show the cool loading pipeline

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-500 
      ${isLoading ? 'bg-white' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white'}`}
    >
      {/* Decorative background shapes */}
      {!isLoading && (
        <>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
        </>
      )}

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isLoading ? 'text-gray-900' : 'text-white'}`}>
            AI Maintenance Summary
          </h2>
          <p className={`text-sm mt-1 ${isLoading ? 'text-gray-500' : 'text-blue-100'}`}>
            Ringkasan kondisi aset dan pemeliharaan terbaru.
          </p>
        </div>

        {isLoading ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            NLP Processing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Generated
          </span>
        )}
      </div>

      <div className="relative z-10 mt-5 min-h-30">
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-6 space-y-4">
            {/* NLP Pipeline Visualizer */}
            <div className="flex w-full max-w-sm gap-1">
              {LOADING_STATES.map((_, idx) => (
                <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx <= loadingStep ? 'bg-blue-600' : 'bg-gray-100'}`}></div>
              ))}
            </div>
            <p className="text-sm font-medium text-blue-600 animate-pulse">
              {LOADING_STATES[loadingStep]}
            </p>
          </div>
        ) : (
          <div className={`transition-all duration-700 transform ${showContent ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}>
            <p className="text-base leading-relaxed text-blue-50 font-medium">
              {summary}
            </p>

            {(() => {
              const criticalAssets = assets.filter((a) => a.pred_rul != null && a.pred_rul <= 180);
              return criticalAssets.length > 0 ? (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0"></span>
                    <h3 className="text-xs font-semibold text-red-300 uppercase tracking-wider">
                      Aset Kritis — Segera Ditangani ({criticalAssets.length})
                    </h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                    {criticalAssets.slice(0, 5).map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/assets/${asset.id}`}
                        className="group shrink-0 w-48 flex flex-col p-3 rounded-xl bg-red-500/20 text-white border border-red-400/40 hover:bg-red-500/30 transition-all duration-300 shadow-sm backdrop-blur-md"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg>
                          </div>
                          <p className="font-semibold text-xs leading-tight text-white truncate" title={asset.name}>{asset.name}</p>
                        </div>
                        <p className="text-[10px] text-red-200 truncate mb-2">{asset.brand} • {asset.category}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-red-400/20">
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${asset.status?.toLowerCase() === 'scrap' || asset.status?.toLowerCase() === 'maintenance' ? 'bg-red-500/40 text-red-100' : 'bg-orange-500/30 text-orange-100'}`}>
                            {asset.status || '—'}
                          </span>
                          <span className="text-[10px] font-bold bg-red-700/50 text-red-100 px-1.5 py-0.5 rounded border border-red-600/50">
                            {asset.pred_rul} hari
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
