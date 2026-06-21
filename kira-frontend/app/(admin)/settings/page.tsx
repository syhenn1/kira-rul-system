'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Lock, Palette, ChevronRight, LogOut } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { authApi } from '@/lib/auth';

const items = [
  {
    href: '/settings/profile',
    icon: User,
    label: 'Profile',
    desc: 'Perbarui nama, foto, nomor telepon, dan departemen kamu.',
  },
  {
    href: '/settings/security',
    icon: Lock,
    label: 'Security',
    desc: 'Ubah password dan kelola keamanan akun.',
  },
  {
    href: '/settings/personalization',
    icon: Palette,
    label: 'Personalization',
    desc: 'Atur preferensi tampilan dan notifikasi.',
  },
];

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = () => {
    authApi.logout();
    router.push('/auth/login');
  };

  return (
    <main className="flex-1 min-h-screen bg-[#F5F7FB]">

      <div className="flex-1 sb-content p-8">
        <Topbar />

        <div className="mt-8 animate-[slideUp_0.5s_ease-out_both]">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola akun dan preferensi kamu</p>
        </div>

        <div className="mt-8 max-w-xl space-y-2 animate-[slideUp_0.5s_0.1s_ease-out_both]">
          {items.map(({ href, icon: Icon, label, desc }, i) => (
            <Link
              key={href}
              href={href}
              className="stagger-item flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                <Icon size={18} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </Link>
          ))}

          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 font-medium transition px-1 py-1"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
