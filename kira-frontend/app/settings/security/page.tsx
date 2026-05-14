import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function SecuritySettingsPage() {
  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Security Settings
          </h1>

          <p className="text-gray-500 mt-2">
            Manage your account password and security
          </p>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mt-8 max-w-3xl">

          <div className="space-y-6">

            <div>
              <label className="text-sm font-medium text-gray-700">
                Current Password
              </label>

              <input
                type="password"
                placeholder="Enter current password"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                New Password
              </label>

              <input
                type="password"
                placeholder="Enter new password"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>

              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button className="mt-8 bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-xl font-medium">
            Update Password
          </button>
        </div>
      </div>
    </main>
  );
}