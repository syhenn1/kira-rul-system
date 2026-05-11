import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] selection:bg-blue-500/30 flex items-center justify-center py-20 px-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] opacity-30 dark:opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-slow"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xl mb-8 animate-slide-up">
          <SearchX className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
        </div>
        
        <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Halaman Tidak Ditemukan
        </h2>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          Maaf, rute yang Anda tuju sepertinya tidak tersedia atau telah dipindahkan ke URL lain dalam sistem.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <Link href="/" className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2">
            <Home className="w-5 h-5" />
            Kembali ke Beranda
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-full glass font-semibold hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
