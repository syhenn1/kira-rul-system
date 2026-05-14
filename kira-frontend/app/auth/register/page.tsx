'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const slides = [
  {
    title: 'Create Smart Asset Management',
    desc: 'Monitor and manage all company assets with intelligent automation.',
  },
  {
    title: 'Predict Maintenance Early',
    desc: 'Use AI-powered prediction to reduce downtime and improve efficiency.',
  },
  {
    title: 'Realtime Monitoring System',
    desc: 'Track assets, alerts, and reports instantly in realtime.',
  },
];

export default function RegisterPage() {
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
    <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-6 py-10">

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
              Create Account 
            </h2>

            <p className="text-gray-400 mt-3">
              Register to continue using KIRA platform
            </p>
          </div>

          {/* SOCIAL LOGIN */}
          {/* SOCIAL LOGIN */}
<div className="mt-8">
  <button className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 transition rounded-xl py-3 font-semibold text-gray-800">

    {/* GOOGLE LOGO */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="w-5 h-5"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.9l6.2 5.2C39.2 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>

    Continue with Google
  </button>
</div>
          {/* DIVIDER */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-[1px] bg-white/10"></div>

            <span className="text-gray-500 text-sm">
              OR
            </span>

            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>

          {/* FORM */}
          <form className="space-y-5">

            <div>
              <label className="text-sm font-medium text-gray-300">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                placeholder="Create password"
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>

              <input
                type="password"
                placeholder="Confirm password"
                className="w-full mt-2 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
            >
              Create Account
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-sm text-gray-400 mt-8 text-center">
            Already have an account?{' '}

            <Link
              href="/auth/login"
              className="text-blue-400 hover:text-blue-500 font-medium"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}