'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, PlusCircle, LogOut } from 'lucide-react';
import { authApi } from '@/lib/auth';

const menus = [
  { name: 'Dashboard', href: '/teknisi/dashboard', icon: LayoutDashboard },
  { name: 'Riwayat',   href: '/teknisi/riwayat',   icon: ClipboardList },
  { name: 'Tambah',    href: '/teknisi/tambah',     icon: PlusCircle },
];

export default function TeknisiBottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex items-center justify-around py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {menus.map(m => {
        const Icon = m.icon;
        const isActive = pathname === m.href || pathname.startsWith(m.href + '/');
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{m.name}</span>
          </Link>
        );
      })}
      <button
        onClick={() => { authApi.logout(); router.push('/auth/login'); }}
        className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
      >
        <LogOut size={22} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Logout</span>
      </button>
    </nav>
  );
}
