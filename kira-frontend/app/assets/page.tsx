'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] py-20 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
        </Link>
        
        <div className="glass rounded-3xl p-10 border border-white/20 shadow-2xl relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Daftar Aset</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Halaman ini sedang dalam tahap pengembangan. Ini adalah placeholder untuk route SaaS Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
