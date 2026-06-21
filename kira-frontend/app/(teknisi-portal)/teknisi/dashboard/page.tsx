'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi, AuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Wrench } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  asset?: { name: string };
}

export default function TeknisiDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = authApi.getUser();
    if (!u) { router.push('/auth/login'); return; }
    if (u.role !== 'teknisi') { router.push('/dashboard'); return; }
    setUser(u);

    const token = authApi.getToken();
    fetch(`${API_URL}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Ticket[]) => {
        const mine = Array.isArray(data) ? data.filter((t: any) => t.id_reporter === u.id) : [];
        setTickets(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const open     = tickets.filter(t => t.status === 'Open').length;
  const progress = tickets.filter(t => t.status === 'In Progress').length;
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const recentTickets = [...tickets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const priorityColor: Record<string, string> = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };

  const statusColor: Record<string, string> = {
    Open: 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-yellow-100 text-yellow-700',
    Resolved: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-100 text-gray-600',
  };

  return (
    <ProtectedRoute>
      <main className="flex-1 sb-content p-4 md:p-8 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

          {/* Welcome header */}
          <div className="animate-[enterUp_0.4s_ease-out_both]">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Selamat Datang, {user?.name ?? '—'} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Berikut ringkasan aktivitas komplain Anda.</p>
          </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-[enterUp_0.5s_ease-out_both]">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <AlertCircle size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : open}</p>
                  <p className="text-sm text-gray-500">Komplain Terbuka</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Clock size={22} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : progress}</p>
                  <p className="text-sm text-gray-500">Sedang Ditangani</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : resolved}</p>
                  <p className="text-sm text-gray-500">Selesai</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-[enterUp_0.55s_ease-out_both]">
              <button
                onClick={() => router.push('/teknisi/tambah')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-5 text-left hover:opacity-90 transition shadow-lg shadow-blue-600/20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardList size={20} />
                  <span className="font-semibold">Buat Komplain Baru</span>
                </div>
                <p className="text-blue-100 text-sm">Laporkan kerusakan atau masalah aset</p>
              </button>
              <button
                onClick={() => router.push('/teknisi/riwayat')}
                className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:bg-gray-50 transition shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2 text-gray-700">
                  <Wrench size={20} />
                  <span className="font-semibold">Lihat Riwayat</span>
                </div>
                <p className="text-gray-400 text-sm">Cek status komplain yang sudah dibuat</p>
              </button>
            </div>

            {/* Recent tickets */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-[enterUp_0.6s_ease-out_both]">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Komplain Terbaru</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Memuat data...</div>
              ) : recentTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Belum ada komplain yang dibuat.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentTickets.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.asset?.name ?? '—'} · {new Date(t.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColor[t.priority] ?? 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
      </main>
    </ProtectedRoute>
  );
}

