'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React, { useLayoutEffect, useState } from 'react';
import { authApi } from '@/lib/auth';
import { LayoutDashboard, ClipboardList, PlusCircle, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const menus = [
  { name: 'Dashboard',        href: '/teknisi/dashboard', icon: LayoutDashboard },
  { name: 'Riwayat Komplain', href: '/teknisi/riwayat',   icon: ClipboardList },
  { name: 'Tambah Komplain',  href: '/teknisi/tambah',    icon: PlusCircle },
];

export default function TeknisiSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const stored = localStorage.getItem('sb_collapsed') === 'true';
    if (stored) {
      document.body.classList.add('sb-collapsed');
      setCollapsed(true);
    } else {
      document.body.classList.remove('sb-collapsed');
    }
    setReady(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sb_collapsed', String(next));
      if (next) document.body.classList.add('sb-collapsed');
      else document.body.classList.remove('sb-collapsed');
      return next;
    });
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/auth/login');
  };

  return (
    <aside
      className={[
        'hidden md:flex flex-col fixed left-4 top-4 bottom-4 bg-white rounded-[30px] shadow-2xl border border-slate-200 overflow-visible z-40',
        ready ? 'transition-[width] duration-300 ease-in-out' : '',
        collapsed ? 'w-[82px]' : 'w-64',
      ].join(' ')}
    >
      {/* Centered collapse arrow */}
      <button
        onClick={toggle}
        className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center z-50 hover:bg-slate-50 transition text-slate-500 hover:text-slate-800"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className="flex flex-col h-full overflow-hidden rounded-[30px]">
        {/* HEADER */}
        <div className="bg-gradient-to-b from-[#07152F] to-[#16213E] pb-8">
          <div className="flex flex-col items-center pt-8">
            <Link href="/">
              <div className={`rounded-3xl overflow-hidden shadow-xl transition-all duration-300 ${collapsed ? 'w-12 h-12 mt-2' : 'w-20 h-20'}`}>
                <Image src="/assets/kira.png" alt="Kira" width={80} height={80} className="w-full h-full object-contain" />
              </div>
            </Link>
            <div className={`flex flex-col items-center transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 h-0 mt-0' : 'opacity-100 h-auto mt-5'}`}>
              <h1 className="text-4xl font-bold tracking-[0.25em] text-white whitespace-nowrap">KIRA</h1>
              <p className="text-slate-400 text-xs mt-1 whitespace-nowrap">Portal Teknisi</p>
            </div>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto overflow-x-hidden">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname === menu.href || pathname.startsWith(menu.href + '/');
            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`group flex items-center rounded-2xl px-3 py-3 transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                } ${collapsed ? 'justify-center' : 'gap-0'}`}
                title={collapsed ? menu.name : ''}
              >
                <div className={`min-w-[40px] h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                  <Icon size={18} />
                </div>
                <span className={`font-medium whitespace-nowrap transition-all duration-300 ml-3 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
                  {menu.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center gap-3 rounded-2xl border border-purple-200 py-3 text-purple-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all w-full ${collapsed ? 'px-0' : 'px-4'}`}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
