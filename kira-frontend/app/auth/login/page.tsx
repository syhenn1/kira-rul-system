import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* LEFT SIDE */}
        <div className="bg-[#0F172A] text-white p-12 flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              KIRA
            </h1>

            <p className="text-gray-300 mt-2">
              Asset Management System
            </p>
          </div>

          <div className="mt-20">
            <h2 className="text-4xl font-bold leading-tight">
              Manage your company assets efficiently.
            </h2>

            <p className="text-gray-400 mt-6 leading-relaxed">
              Monitor, track, and organize all company assets
              in one modern dashboard system.
            </p>
          </div>

          <div className="mt-10 flex gap-3">
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="p-12 flex flex-col justify-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome Back 👋
            </h2>

            <p className="text-gray-500 mt-2">
              Login to continue accessing your dashboard
            </p>
          </div>

          {/* FORM */}
          <form className="mt-10 space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" />
                Remember me
              </label>

              <button
                type="button"
                className="text-blue-600 hover:text-blue-700"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
            >
              Sign In
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-sm text-gray-500 mt-8 text-center">
            Don&apos;t have an account?{' '}
            <Link
              href="#"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Admin
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}