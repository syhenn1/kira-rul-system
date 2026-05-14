'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  Boxes,
  Wrench,
  Users,
  Bell,
  FileText,
  History,
  Settings,
  ChevronDown,
  Building2,
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
  },
  {
    name: 'Maintenance',
    icon: Wrench,
    href: '/maintenance',
    children: [
      {
        name: 'Gedung A',
        href: '/maintenance/gedung-a',
      },
      {
        name: 'Gedung B',
        href: '/maintenance/gedung-b',
      },
      {
        name: 'Gedung C',
        href: '/maintenance/gedung-c',
      },
    ],
  },
  {
    name: 'Users',
    icon: Users,
    href: '/users',
  },
  {
    name: 'Alerts',
    icon: Bell,
    href: '/alerts',
  },
  {
    name: 'Reports',
    icon: FileText,
    href: '/reports',
  },
  {
    name: 'Activity Logs',
    icon: History,
    href: '/activity-logs',
  },
  {
    name: 'Settings',
    icon: Settings,
    href: '/settings',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-[#18181B] text-white p-6 flex flex-col overflow-y-auto">

      {/* LOGO */}
      <div>
        <h1 className="text-3xl font-bold tracking-wide">
          KIRA
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          Asset Management System
        </p>
      </div>

      {/* MENU */}
      <nav className="mt-10 flex flex-col gap-2">

        {menus.map((menu) => {
          const Icon = menu.icon;

          const isActive =
            pathname === menu.href ||
            pathname.startsWith(menu.href + '/');

          return (
            <div key={menu.name}>

              {/* MAIN MENU */}
              <Link
                href={menu.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />

                  <span className="font-medium">
                    {menu.name}
                  </span>
                </div>

                {menu.children && (
                  <ChevronDown size={16} />
                )}
              </Link>

              {/* SUB MENU */}
              {menu.children && (
                <div className="ml-6 mt-2 flex flex-col gap-1">

                  {menu.children.map((child) => {
                    const isChildActive =
                      pathname === child.href;

                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                          isChildActive
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Building2 size={15} />

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