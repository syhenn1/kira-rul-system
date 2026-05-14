import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function AddAssetPage() {
  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="flex items-center gap-4 mt-8">

          <Link
            href="/assets"
            className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
          >
            ←
          </Link>

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Add New Asset
            </h1>

            <p className="text-gray-500 mt-2">
              Create and manage a new company asset
            </p>
          </div>
        </div>

        {/* FORM */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">

          {/* LEFT */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-8 shadow-sm">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Asset Name */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Asset Name
                </label>

                <input
                  type="text"
                  placeholder="Enter asset name"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Purchase Date
                </label>

                <input
                  type="date"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>

                <input
                  type="text"
                  placeholder="Enter category"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Location
                </label>

                <select className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select location</option>
                  <option>Gedung A</option>
                  <option>Gedung B</option>
                  <option>Gedung C</option>
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Brand
                </label>

                <select className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select brand</option>
                  <option>Dell</option>
                  <option>HP</option>
                  <option>Canon</option>
                  <option>Apple</option>
                </select>
              </div>

              {/* Custodian */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Custodian
                </label>

                <select className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select custodian</option>
                  <option>IT Department</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Model
                </label>

                <input
                  type="text"
                  placeholder="Enter model"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Condition
                </label>

                <select className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select condition</option>
                  <option>Available</option>
                  <option>In Use</option>
                  <option>Maintenance</option>
                </select>
              </div>

              {/* Serial Number */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Serial Number
                </label>

                <input
                  type="text"
                  placeholder="Enter serial number"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>

                <input
                  type="text"
                  placeholder="Enter description"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Upload Image
              </h2>

              {/* UPLOAD */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl h-[400px] mt-6 flex flex-col items-center justify-center text-center px-6">

                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-4xl text-blue-600">
                  ↑
                </div>

                <p className="mt-6 font-medium text-gray-700">
                  Click to upload
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  or drag and drop
                </p>
              </div>
            </div>

            {/* BUTTON */}
            <div className="flex gap-4 mt-6">

              <Link
                href="/assets"
                className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-3 rounded-xl font-medium text-center"
              >
                Cancel
              </Link>

              <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-medium">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}