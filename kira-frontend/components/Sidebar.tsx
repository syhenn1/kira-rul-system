'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { authApi } from '@/lib/auth';

import {
  LayoutDashboard,
  Boxes,
  Wrench,
  HardHat,
  Bell,
  FileText,
  Settings,
  Building2,
  LogOut,
  Bot,
  Home,
  Menu,
  PanelLeftClose,
} from 'lucide-react';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: {
    name: string;
    href: string;
    icon?: React.ElementType;
  }[];
};

const menus: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: Boxes,
    children: [
      {
        name: 'Asset List',
        href: '/assets',
      },
      {
        name: 'Categories',
        href: '/assets/categories',
      },
    ],
  },
  {
    name: 'Maintenance',
    href: '/maintenance',
    icon: Wrench,
  },
  {
    name: 'Gedung',
    href: '/gedung',
    icon: Building2,
  },
  {
    name: 'Teknisi',
    href: '/users',
    icon: HardHat,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: Bell,
    badge: 3,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [openMenus, setOpenMenus] = React.useState({
    Assets: pathname.startsWith('/assets'),
    Maintenance: pathname.startsWith('/maintenance'),
  });

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  return (
    <aside
      className={`fixed left-4 top-4 bottom-4 bg-white rounded-[30px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out z-40 ${
        collapsed ? 'w-[82px]' : 'w-64'
      }`}
    >
      {/* Collapse Button */}
      <div className={`absolute top-5 z-50 transition-all duration-300 ${collapsed ? 'right-6' : 'right-5'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-xl p-2 hover:bg-slate-100/20 text-white transition-colors"
        >
          {collapsed ? (
            <Menu size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      {/* HEADER */}
      <div className="bg-gradient-to-b from-[#07152F] to-[#16213E] pb-8 transition-all duration-300">
        <div className="flex flex-col items-center pt-8">
          <Link href="/">
            <div
              className={`rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl transition-all duration-300 ${
                collapsed ? 'w-12 h-12 mt-2' : 'w-20 h-20'
              }`}
            >
              <span
                className={`text-white font-bold transition-all duration-300 ${
                  collapsed ? 'text-2xl' : 'text-4xl'
                }`}
              >
                K
              </span>
            </div>
          </Link>

          {/* Sembunyikan teks saat collapsed */}
          <div
            className={`flex flex-col items-center transition-all duration-300 overflow-hidden ${
              collapsed ? 'opacity-0 h-0 mt-0' : 'opacity-100 h-auto mt-5'
            }`}
          >
            <h1 className="text-4xl font-bold tracking-[0.25em] text-white whitespace-nowrap">
              KIRA
            </h1>
            <p className="text-slate-300 text-sm mt-1 whitespace-nowrap">
              AI Asset Management
            </p>
          </div>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto overflow-x-hidden">
        {menus.map((menu) => {
          const Icon = menu.icon;

          const isActive =
            pathname === menu.href ||
            pathname.startsWith(menu.href + '/');

          return (
            <Link
              key={menu.name}
              href={menu.href}
              className={`group flex items-center justify-between rounded-2xl px-3 py-3 transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? menu.name : ''} // Tambahkan tooltip saat ditutup
            >
              <div className="flex items-center gap-3">
                <div
                  className={`min-w-[40px] h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-white/20'
                      : 'bg-slate-100 group-hover:bg-white'
                  }`}
                >
                  <Icon size={18} />
                </div>

                <span
                  className={`font-medium whitespace-nowrap transition-all duration-300 ${
                    collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
                  }`}
                >
                  {menu.name}
                </span>
              </div>

              {'badge' in menu && menu.badge && !collapsed && (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive
                      ? 'bg-white text-purple-600'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {menu.badge}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center gap-3 rounded-2xl border border-purple-200 py-3 text-purple-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all ${
            collapsed ? 'w-full px-0' : 'w-full px-4'
          }`}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut size={18} className="shrink-0" />
          <span
            className={`font-medium whitespace-nowrap transition-all duration-300 ${
              collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
            }`}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}