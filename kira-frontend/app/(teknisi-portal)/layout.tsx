'use client';

import TeknisiSidebar from '@/components/TeknisiSidebar';
import TeknisiBottomNav from '@/components/TeknisiBottomNav';

export default function TeknisiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-gray-100">
      <div className="sb-spacer" />
      <TeknisiSidebar />
      {children}
      <TeknisiBottomNav />
    </div>
  );
}
