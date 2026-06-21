'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';

const slides = [
  {
    title: 'Manage Assets Smarter',
    desc: 'Monitor, organize, and track all company assets in one intelligent dashboard.',
  },
  {
    title: 'AI Maintenance Prediction',
    desc: 'Predict asset failures and maintenance schedules with AI-powered analytics.',
  },
  {
    title: 'Realtime Monitoring',
    desc: 'Get alerts, activity logs, and asset reports instantly in realtime.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      authApi.saveSession(token, user);
      if (user.role === 'teknisi') {
        router.push('/teknisi/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50 relative overflow-hidden flex items-center justify-center px-6">

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-black/80 hover:text-black transition bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10"
      >
        ← Back to Home
      </Link>

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50" />
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full top-[-100px] left-[-100px]" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-6xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT — dark branded panel */}
        <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-[#07152F] to-[#1a2a50]">
          <div>
            <h1 className="text-4xl font-bold text-white">KIRA</h1>
            <p className="text-slate-400 mt-2">Intelligent Asset Management</p>
          </div>

          <div className="mt-16 transition-all duration-500">
            <h2 className="text-4xl font-bold leading-tight text-white">
              {slides[currentSlide].title}
            </h2>
            <p className="text-slate-400 mt-6 text-lg leading-relaxed">
              {slides[currentSlide].desc}
            </p>
          </div>

          <div className="flex gap-3 mt-10">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'w-8 bg-blue-400' : 'w-2.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — clean white panel */}
        <div className="p-12 flex flex-col justify-center bg-white">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 mt-2 text-sm">Login to continue accessing your dashboard</p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-8 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* FORM */}
          <form className={`space-y-5 ${error ? '' : 'mt-8'}`} onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-2 bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mt-2 bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                <input type="checkbox" className="accent-blue-600" />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-8 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
