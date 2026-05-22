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

      <div className="relative z-10 mt-5 min-h-[120px]">
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

            {assets.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-3">
                  Aset Terkait (Quick Access)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assets.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/assets/${asset.id}`}
                      className="group flex flex-col p-3 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:-translate-y-1 transition-all duration-300 shadow-sm backdrop-blur-md"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight text-white line-clamp-1" title={asset.name}>{asset.name}</p>
                            <p className="text-[11px] text-blue-200 mt-0.5 line-clamp-1">{asset.brand} • {asset.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-white/10">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${asset.status?.toLowerCase() === 'scrap' || asset.status?.toLowerCase() === 'maintenance' ? 'bg-red-500/30 text-red-100' : 'bg-green-500/30 text-green-100'}`}>
                          {asset.status || 'UNKNOWN'}
                        </span>
                        <span className="text-xs font-medium bg-blue-900/50 text-blue-100 px-2 py-1 rounded-md border border-blue-800/50">
                          RUL: {asset.pred_rul !== null && asset.pred_rul !== undefined ? `${asset.pred_rul} bln` : 'N/A'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
