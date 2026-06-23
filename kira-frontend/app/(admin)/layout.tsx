'use client';

import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[#F5F7FB]">
      <div className="sb-spacer" />
      <Sidebar />
      {children}
    </div>
  );
}
