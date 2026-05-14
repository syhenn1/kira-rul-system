import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function ProfileSettingsPage() {
  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Profile Settings
          </h1>

          <p className="text-gray-500 mt-2">
            Update your profile information
          </p>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mt-8">

          <div className="flex items-center gap-6 mb-10">

            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl">
              👤
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium">
              Upload Photo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="text-sm font-medium text-gray-700">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                Phone Number
              </label>

              <input
                type="text"
                placeholder="Enter your phone number"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Department
              </label>

              <input
                type="text"
                placeholder="Enter department"
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button className="mt-8 bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-xl font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </main>
  );
}