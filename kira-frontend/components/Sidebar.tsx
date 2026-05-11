'use client';

import {
  LayoutDashboard,
  Boxes,
  Wrench,
  Users,
  Bell,
  FileText,
  History,
  Settings,
} from 'lucide-react';

const menus = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    active: true,
  },
  {
    name: 'Assets',
    icon: Boxes,
  },
  {
    name: 'Maintenance',
    icon: Wrench,
  },
  {
    name: 'Users',
    icon: Users,
  },
  {
    name: 'Alerts',
    icon: Bell,
  },
  {
    name: 'Reports',
    icon: FileText,
  },
  {
    name: 'Activity Logs',
    icon: History,
  },
  {
    name: 'Settings',
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-[#18181B] text-white p-6 flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-wide">
          KIRA
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          Asset Management System
        </p>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.name}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left hover:bg-white/10 ${
                menu.active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300'
              }`}
            >
              <Icon size={20} />

              <span className="font-medium">
                {menu.name}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}