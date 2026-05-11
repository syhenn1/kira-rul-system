'use client';

import { Bell, Search } from 'lucide-react';

export default function Topbar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative w-full max-w-md">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800"
          size={18}
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800"
          />
      </div>

      <div className="flex items-center gap-5">
        <button className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <Bell size={20} className="text-gray-700" />
        </button>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <img
            src="https://i.pravatar.cc/300"
            alt="profile"
            className="w-12 h-12 rounded-full object-cover"
          />

          <div>
            <h3 className="font-semibold text-gray-800">
              SyukronnRZ
            </h3>

            <p className="text-sm text-gray-900">
              Admin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}