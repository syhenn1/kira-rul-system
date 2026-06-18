'use client';

import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50">

      {/* BACK BUTTON */}
      <Link
        href="/auth/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 hover:text-black shadow-sm transition"
      >
        ← Back to Login
      </Link>

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50" />

      <div className="absolute w-[500px] h-[500px] bg-blue-300/20 blur-[120px] rounded-full top-[-100px] left-[-100px]" />

      <div className="absolute w-[500px] h-[500px] bg-purple-300/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-5xl bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              KIRA
            </h1>

            <p className="text-gray-600 mt-2">
              Intelligent Asset Management
            </p>
          </div>

          <div className="mt-16">

            <h2 className="text-5xl font-bold leading-tight text-gray-900">
              Reset your password securely.
            </h2>

            <p className="text-gray-600 mt-6 text-lg leading-relaxed">
              Don&apos;t worry. Enter your email address and we&apos;ll send
              you instructions to reset your password and regain access to your
              account.
            </p>
          </div>

          {/* INDICATOR */}
          <div className="flex gap-3 mt-10">

            <div className="w-10 h-3 rounded-full bg-blue-600" />

            <div className="w-3 h-3 rounded-full bg-gray-300" />

            <div className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="p-12 flex flex-col justify-center bg-white">

          <div>

            <h2 className="text-4xl font-bold text-gray-900">
              Forgot Password
            </h2>

            <p className="text-gray-600 mt-3">
              Enter your email to receive reset instructions.
            </p>
          </div>

          {/* FORM */}
          <form className="mt-10 space-y-6">

            <div>

              <label className="text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                className="w-full mt-2 bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20"
            >
              Send Reset Link
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-sm text-gray-600 mt-8 text-center">

            Remember your password?{' '}

            <Link
              href="/auth/login"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}