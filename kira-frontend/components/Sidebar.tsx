'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import {
  LayoutDashboard,
  Boxes,
  Wrench,
  HardHat,
  Bell,
  FileText,
  History,
  Settings,
  ChevronDown,
  Building2,
  Plus,
  List,
} from 'lucide-react';

const menus = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    name: 'Assets',
    icon: Boxes,
    href: '/assets',
    children: [
      { name: 'List Assets', href: '/assets', icon: List },
      { name: 'Add Asset', href: '/assets/add', icon: Plus },
    ],
  },
  {
    name: 'Maintenance',
    icon: Wrench,
    href: '/maintenance',
    children: [
      { name: 'Gedung A', href: '/maintenance/gedung-a' },
      { name: 'Gedung B', href: '/maintenance/gedung-b' },
      { name: 'Gedung C', href: '/maintenance/gedung-c' },
    ],
  },
  { name: 'Gedung', icon: Building2, href: '/gedung' },
  { name: 'Teknisi', icon: HardHat, href: '/users' },
  { name: 'Alerts', icon: Bell, href: '/alerts' },
  { name: 'Reports', icon: FileText, href: '/reports' },
  { name: 'Activity Logs', icon: History, href: '/activity-logs' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    Assets: pathname.startsWith('/assets'),
    Maintenance: pathname.startsWith('/maintenance'),
  });

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-[#18181B] text-white p-6 flex flex-col overflow-y-auto">

      {/* LOGO */}
      <Link href="/">
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-widest leading-none group-hover:text-blue-400 transition-colors">
              KIRA
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Asset Management</p>
          </div>
        </div>
      </Link>

      {/* MENU */}
      <nav className="mt-10 flex flex-col gap-1">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const isActive =
            pathname === menu.href || pathname.startsWith(menu.href + '/');

          return (
            <div key={menu.name}>
              <div
                onClick={() => {
                  if (menu.children) {
                    setOpenMenus((prev) => ({
                      ...prev,
                      [menu.name]: !prev[menu.name],
                    }));
                  }
                }}
              >
                <Link
                  href={menu.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span className="text-sm font-medium">{menu.name}</span>
                  </div>

                  {menu.children && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        openMenus[menu.name] ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </Link>
              </div>

              {menu.children && openMenus[menu.name] && (
                <div className="ml-5 mt-1 flex flex-col gap-0.5">
                  {menu.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isChildActive
                            ? 'bg-white/10 text-white'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {child.icon ? (
                          <child.icon size={14} />
                        ) : (
                          <Building2 size={14} />
                        )}
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
