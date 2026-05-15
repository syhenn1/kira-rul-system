'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        prev === slides.length - 1 ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-6">
 
 <Link
  href="/"
  className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/80 hover:text-white transition bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10"
>
  ← Back to Home
</Link>

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-black to-purple-900/30"></div>

      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full top-[-100px] left-[-100px]" />

      <div className="absolute w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-6xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT */}
        <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-blue-950/80 to-black">

          <div>
            <h1 className="text-4xl font-bold text-white">
              KIRA
            </h1>

            <p className="text-gray-400 mt-2">
              Intelligent Asset Management
            </p>
          </div>

          {/* SLIDESHOW */}
          <div className="mt-16 transition-all duration-500">
            <h2 className="text-5xl font-bold leading-tight text-white">
              {slides[currentSlide].title}
            </h2>

            <p className="text-gray-400 mt-6 text-lg leading-relaxed">
              {slides[currentSlide].desc}
            </p>
          </div>

          {/* DOT */}
          <div className="flex gap-3 mt-10">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index
                    ? 'w-10 bg-white'
                    : 'w-3 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="p-12 flex flex-col justify-center bg-black/30">

          <div>
            <h2 className="text-4xl font-bold text-white">
              Welcome Back 
            </h2>

            <p className="text-gray-400 mt-3">
              Login to continue accessing your dashboard
            </p>
          </div>

          {/* FORM */}
          <form className="mt-10 space-y-5">

            <div>
              <label className="text-sm font-medium text-gray-300">
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" />
                Remember me
              </label>

              <Link
  href="/auth/forgot-password"
  className="text-blue-400 hover:text-blue-500"
>
  Forgot Password?
</Link>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
            >
              Sign In
            </button>
          </form>

          {/* REGISTER */}
          <p className="text-sm text-gray-400 mt-8 text-center">
            Don&apos;t have an account?{' '}

            <Link
              href="/auth/register"
              className="text-blue-400 hover:text-blue-500 font-medium"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}