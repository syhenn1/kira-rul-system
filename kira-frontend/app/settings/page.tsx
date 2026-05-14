import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Settings
          </h1>

          <p className="text-gray-500 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

          {/* PROFILE */}
          <Link
            href="/settings/profile"
            className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl text-blue-600">
              👤
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-6">
              Profile Settings
            </h2>

            <p className="text-gray-500 mt-3 leading-relaxed">
              Update your personal information, profile photo,
              and account details.
            </p>
          </Link>

          {/* SECURITY */}
          <Link
            href="/settings/security"
            className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-2xl text-red-600">
              🔒
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-6">
              Security Settings
            </h2>

            <p className="text-gray-500 mt-3 leading-relaxed">
              Change your password and manage account security settings.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}