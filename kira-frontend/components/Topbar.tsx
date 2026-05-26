'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Search, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, type AuthUser } from '@/lib/auth';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Topbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(authApi.getUser());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Cari aset, maintenance..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <Link href="/alerts">
          <button className="bg-white p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <Bell size={18} className="text-gray-600" />
          </button>
        </Link>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt="profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user ? initials(user.name) : 'U'}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {user?.name ?? 'Loading...'}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                {user?.department ?? 'Admin'}
              </p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-[enterUp_0.2s_ease-out_both]">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={14} className="text-gray-400" />
                Pengaturan
              </Link>

              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={14} className="text-gray-400" />
                Profil Saya
              </Link>

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
