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

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.9l6.2 5.2C39.2 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

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
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-6">

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/80 hover:text-white transition bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10"
      >
        ← Back to Home
      </Link>

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-black to-purple-900/30" />
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full top-[-100px] left-[-100px]" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-6xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT */}
        <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-blue-950/80 to-black">
          <div>
            <h1 className="text-4xl font-bold text-white">KIRA</h1>
            <p className="text-gray-400 mt-2">Intelligent Asset Management</p>
          </div>

          <div className="mt-16 transition-all duration-500">
            <h2 className="text-5xl font-bold leading-tight text-white">
              {slides[currentSlide].title}
            </h2>
            <p className="text-gray-400 mt-6 text-lg leading-relaxed">
              {slides[currentSlide].desc}
            </p>
          </div>

          <div className="flex gap-3 mt-10">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'w-10 bg-white' : 'w-3 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="p-12 flex flex-col justify-center bg-black/30">
          <div>
            <h2 className="text-4xl font-bold text-white">Welcome Back</h2>
            <p className="text-gray-400 mt-3">Login to continue accessing your dashboard</p>
          </div>

          {/* GOOGLE LOGIN */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => authApi.loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 transition rounded-xl py-3 font-semibold text-gray-800"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* FORM */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-500">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-8 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-500 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
