'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, Filter, Ticket, Wrench, CheckCircle2, Clock, AlertCircle, Wifi, WifiOff, X, Sparkles } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Pagination from '@/components/Pagination';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';
import TicketDemoFlow from '@/components/TicketDemoFlow';
import Swal from 'sweetalert2';
import { authApi } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import MaintenanceScheduledModal, { type MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';

const TOUR_STEPS = [
  {
    target: 'ticket-search',
    title: 'Cari Ticket',
    desc: 'Cari ticket berdasarkan judul atau nama aset secara real-time.',
  },
  {
    target: 'ticket-priority-filter',
    title: 'Filter Prioritas',
    desc: 'Filter ticket berdasarkan level prioritas: Critical, High, Medium, atau Low.',
  },
  {
    target: 'ticket-table',
    title: 'Tabel Ticket',
    desc: 'Klik baris mana saja untuk membuka detail ticket — update status, tugaskan teknisi, atau buat maintenance dari ticket.',
  },
];

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low'];

const PRIORITY_STYLE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:      'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_STYLE: Record<string, string> = {
  Open:        'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved:    'bg-green-100 text-green-700',
  Closed:      'bg-gray-100 text-gray-500',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Open:          AlertCircle,
  'In Progress': Clock,
  Resolved:      CheckCircle2,
  Closed:        CheckCircle2,
};

type TicketItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  maintenance_id: string | null;
  asset: { id: string; asset_name: string; status: string };
  reporter: { id: string; name: string; email: string };
  assigned: { id: string; name: string; email: string; specialization: string; teknisi_status: string } | null;
  maintenance: { id: string; maintenance_type: string; severity: string } | null;
};

type TeknisiUser = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  status: string;
};

const PAGE_SIZE = 15;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAuthHeaders() {
  const token = authApi.getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const [teknisiList, setTeknisiList] = useState<TeknisiUser[]>([]);

  // Detail panel state
  const [detailStatus, setDetailStatus] = useState('');
  const [detailAssigned, setDetailAssigned] = useState('');
  const [detailUpdating, setDetailUpdating] = useState(false);
  const [creatingMaintenance, setCreatingMaintenance] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<MaintenanceScheduledResult | null>(null);

  // WebSocket realtime
  const [wsConnected, setWsConnected] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
      ...(priorityFilter !== 'All' ? { priority: priorityFilter } : {}),
    });
    try {
      const res = await fetch(`${API_URL}/api/tickets?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setTickets(data.data || []);
      setTotal(data.pagination?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  const fetchTeknisi = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/technicians`, { headers: getAuthHeaders() });
    const data = await res.json();
    setTeknisiList((data.technicians || []).filter((t: TeknisiUser) => t.status !== 'Tidak Aktif'));
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchTeknisi(); }, [fetchTeknisi]);

  // WebSocket connection for realtime updates
  useEffect(() => {
    const token = authApi.getToken();
    if (!token) return;

    const wsUrl = `${API_URL.replace(/^http/, 'ws')}/ws`;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsOpen(true);
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        try {
          const { event: evt, data } = JSON.parse(event.data);
          if (evt === 'connected') {
            setWsConnected(true);
          } else if (evt === 'ticket:created') {
            setTickets((prev) => {
              if (prev.find((t) => t.id === data.id)) return prev;
              return [data, ...prev];
            });
            setTotal((n) => n + 1);
          } else if (evt === 'ticket:updated') {
            setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)));
            setSelectedTicket((sel) => (sel?.id === data.id ? data : sel));
          } else if (evt === 'ticket:maintenance_created') {
            // Refresh to get updated ticket with maintenance linked
            fetchTickets();
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setWsOpen(false);
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [API_URL, fetchTickets]);

  // Polling fallback — refresh every 5s when WebSocket is not authenticated
  useEffect(() => {
    if (wsConnected) return;
    const interval = setInterval(() => fetchTickets(), 5000);
    return () => clearInterval(interval);
  }, [wsConnected, fetchTickets]);

  const filtered = tickets.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.asset.asset_name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    Open:        tickets.filter((t) => t.status === 'Open').length,
    'In Progress': tickets.filter((t) => t.status === 'In Progress').length,
    Resolved:    tickets.filter((t) => t.status === 'Resolved').length,
    Closed:      tickets.filter((t) => t.status === 'Closed').length,
  };

  const openDetail = (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setDetailStatus(ticket.status);
    setDetailAssigned(ticket.assigned?.id || '');
  };

  const closePanel = () => {
    setPanelClosing(true);
    setTimeout(() => {
      setSelectedTicket(null);
      setPanelClosing(false);
    }, 250);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setDetailUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: detailStatus, id_assigned: detailAssigned || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal update ticket');
      const json = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? json.data : t)));
      setSelectedTicket(json.data);
      await Swal.fire({ icon: 'success', title: 'Ticket diupdate!', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Gagal', (err as Error).message, 'error');
    } finally {
      setDetailUpdating(false);
    }
  };

  const handleCreateMaintenance = () => {
    if (!selectedTicket) return;
    setShowMaintenanceForm(true);
  };

  const handleMaintenanceFormSuccess = (result: MaintenanceScheduledResult) => {
    setShowMaintenanceForm(false);
    setMaintenanceResult(result);
    fetchTickets();
    closePanel();
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Ticket?',
      text: 'Tindakan ini tidak dapat dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;
    try {
      await fetch(`${API_URL}/api/tickets/${ticketId}`, { method: 'DELETE', headers: getAuthHeaders() });
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
    } catch {
      Swal.fire('Gagal', 'Ticket tidak bisa dihapus', 'error');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="flex-1 min-h-screen bg-[#F5F7FB]">

      <div className="flex-1 sb-content p-8">
        <Topbar />

        <div className="mt-8 flex items-center justify-between animate-[enterUp_0.5s_ease-out_both]">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ticketing</h1>
            <p className="text-gray-500 mt-1 text-sm flex items-center gap-2">
              Kelola permintaan maintenance dan laporan kerusakan aset
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${wsConnected ? 'bg-green-100 text-green-700' : wsOpen ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-600'}`}>
                {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {wsConnected ? 'Realtime' : wsOpen ? 'Authenticating...' : 'Auto-refresh 5s'}
              </span>
            </p>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-4 gap-4 mt-6 animate-[enterUp_0.5s_0.08s_ease-out_both]">
          {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => {
            const Icon = STATUS_ICON[s];
            const active = statusFilter === s;
            const colorMap: Record<string, string> = { Open: 'text-blue-600', 'In Progress': 'text-yellow-600', Resolved: 'text-green-600', Closed: 'text-gray-400' };
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(active ? 'All' : s); setPage(1); }}
                className={`rounded-2xl p-5 text-left transition-all duration-300 ${active ? 'bg-gray-800 text-white shadow-lg scale-[1.02]' : 'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'}`}
              >
                <div className={`text-3xl font-bold ${active ? 'text-white' : colorMap[s]}`}>{counts[s]}</div>
                <div className={`text-sm font-medium mt-1 ${active ? 'text-white/70' : 'text-gray-500'}`}>{s}</div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-4 flex flex-col lg:flex-row gap-3 animate-[enterUp_0.5s_0.15s_ease-out_both]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-tour="ticket-search"
              type="text"
              placeholder="Cari ticket atau nama aset..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <select
              data-tour="ticket-priority-filter"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
            >
              {PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div data-tour="ticket-table" className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden animate-[enterUp_0.5s_0.22s_ease-out_both]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-6 py-4 font-medium">Ticket</th>
                  <th className="px-6 py-4 font-medium">Aset</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Teknisi</th>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Maintenance</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Memuat data...</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Tidak ada ticket yang sesuai.</td>
                  </tr>
                )}
                {filtered.map((ticket, i) => (
                  <tr
                    key={ticket.id}
                    className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => openDetail(ticket)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <Ticket size={14} className="text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-800 text-sm line-clamp-1">{ticket.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">oleh {ticket.reporter.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.asset.asset_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${PRIORITY_STYLE[ticket.priority] || ''}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[ticket.status] || ''}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ticket.assigned ? (
                        <div>
                          <p className="font-medium text-gray-700">{ticket.assigned.name}</p>
                          <p className="text-xs text-gray-400">{ticket.assigned.specialization}</p>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(ticket.created_at)}</td>
                    <td className="px-6 py-4">
                      {ticket.maintenance_id ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Wrench size={12} />
                          Dibuat
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Hapus ticket" position="left">
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              itemLabel="ticket"
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {(selectedTicket || panelClosing) && (
        <div className="fixed inset-0 z-9999">
          <div onClick={closePanel} className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] ${panelClosing ? 'panel-bg-fade-out' : 'panel-bg-fade'}`} />
          <div className="absolute inset-y-0 right-0 flex">
            <div className={`${panelClosing ? 'panel-slide-out' : 'panel-slide-in'} bg-white shadow-2xl w-full max-w-md h-full flex flex-col overflow-hidden`}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Detail Ticket</h2>
                <button onClick={closePanel} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <Plus size={18} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${PRIORITY_STYLE[selectedTicket.priority]}`}>
                    {selectedTicket.priority}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-3">{selectedTicket.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-xs text-gray-400">Aset</p>
                    <p className="mt-1 font-semibold text-gray-800 text-sm">{selectedTicket.asset.asset_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-xs text-gray-400">Reporter</p>
                    <p className="mt-1 font-semibold text-gray-800 text-sm">{selectedTicket.reporter.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-xs text-gray-400">Dibuat</p>
                    <p className="mt-1 font-semibold text-gray-800 text-sm">{fmtDate(selectedTicket.created_at)}</p>
                  </div>
                  {selectedTicket.resolved_at && (
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-xs text-gray-400">Diselesaikan</p>
                      <p className="mt-1 font-semibold text-gray-800 text-sm">{fmtDate(selectedTicket.resolved_at)}</p>
                    </div>
                  )}
                </div>

                {selectedTicket.maintenance_id && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Wrench size={14} className="text-green-600" />
                    <div>
                      <p className="text-xs text-green-700 font-semibold">Maintenance Terkait</p>
                      <p className="text-xs text-green-600">{selectedTicket.maintenance?.maintenance_type} — {selectedTicket.maintenance?.severity}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Update Ticket</p>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value)}
                      className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                    >
                      {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Tugaskan Teknisi</label>
                    <select
                      value={detailAssigned}
                      onChange={(e) => setDetailAssigned(e.target.value)}
                      className="w-full mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                    >
                      <option value="">— Belum Ditugaskan —</option>
                      {teknisiList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-gray-100 space-y-2">
                {!selectedTicket.maintenance_id && (
                  <button
                    onClick={handleCreateMaintenance}
                    disabled={creatingMaintenance}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-2xl font-medium text-sm transition shadow-lg shadow-green-600/20"
                  >
                    <Wrench size={15} />
                    {creatingMaintenance ? 'Membuat Maintenance...' : 'Buat Maintenance dari Ticket'}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={closePanel}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateTicket}
                    disabled={detailUpdating}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20"
                  >
                    {detailUpdating ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance form modal */}
      {showMaintenanceForm && selectedTicket && (
        <MaintenanceFormModal
          ticket={selectedTicket}
          teknisiList={teknisiList}
          onClose={() => setShowMaintenanceForm(false)}
          onSuccess={handleMaintenanceFormSuccess}
        />
      )}

      {/* Prediction result modal */}
      {maintenanceResult && (
        <MaintenanceScheduledModal
          result={maintenanceResult}
          onAddAnother={() => setMaintenanceResult(null)}
          onViewAll={() => setMaintenanceResult(null)}
        />
      )}

      <TourOverlay steps={TOUR_STEPS} storageKey="tickets-tour-v1" />
      <TicketDemoFlow />
    </main>
  );
}

// ── Maintenance Form Modal ─────────────────────────────────────────────────────

function MaintenanceFormModal({
  ticket,
  teknisiList,
  onClose,
  onSuccess,
}: {
  ticket: TicketItem;
  teknisiList: TeknisiUser[];
  onClose: () => void;
  onSuccess: (result: MaintenanceScheduledResult) => void;
}) {
  const [form, setForm] = useState({
    jenis_kerusakan: '',
    penyebab: '',
    spare_part_digunakan: '',
    maintenance_type: 'Corrective',
    cost: '',
    id_teknisi: ticket.assigned?.id ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jenis_kerusakan.trim() || !form.penyebab.trim()) {
      setError('Jenis kerusakan dan penyebab wajib diisi agar AI dapat memprediksi severity.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const token = authApi.getToken();
      const res = await fetch(`${API_URL}/api/tickets/${ticket.id}/create-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          cost: form.cost ? parseFloat(form.cost) : undefined,
          id_teknisi: form.id_teknisi || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal membuat maintenance');
      const { data } = await res.json();
      onSuccess({
        predicted_rul:       data.predicted_rul       ?? 0,
        predicted_severity:  data.predicted_severity  ?? null,
        severity_confidence: data.severity_confidence ?? null,
        asset_name:          data.asset_name          ?? ticket.asset.asset_name,
        brand:               data.brand               ?? '',
        category:            data.category            ?? '',
        sub_category:        data.sub_category        ?? '',
        gedung_nama:         data.gedung_nama         ?? '',
        criticality_level:   data.criticality_level   ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
              <Wrench size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Buat Maintenance</h2>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{ticket.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
            <Sparkles size={15} className="text-violet-500 shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 leading-relaxed">
              Isi jenis kerusakan dan penyebab agar AI memprediksi <strong>severity</strong> dan <strong>sisa umur aset (RUL)</strong> secara otomatis.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Jenis Kerusakan <span className="text-red-500">*</span>
              <span className="ml-1.5 text-xs text-violet-500 font-normal">(prediksi AI)</span>
            </label>
            <input type="text" value={form.jenis_kerusakan}
              onChange={e => setForm(p => ({ ...p, jenis_kerusakan: e.target.value }))}
              placeholder="cth: Mati mendadak, Kebocoran, Retak/pecah"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Penyebab <span className="text-red-500">*</span>
              <span className="ml-1.5 text-xs text-violet-500 font-normal">(prediksi AI)</span>
            </label>
            <input type="text" value={form.penyebab}
              onChange={e => setForm(p => ({ ...p, penyebab: e.target.value }))}
              placeholder="cth: Overload, Kelembaban tinggi, Usia pakai"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Maintenance</label>
              <select value={form.maintenance_type}
                onChange={e => setForm(p => ({ ...p, maintenance_type: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Corrective', 'Preventive', 'Predictive', 'Condition-Based'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Biaya (Rp)</label>
              <input type="number" min="0" value={form.cost}
                onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                placeholder="cth: 500000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Spare Part Digunakan <span className="text-xs text-gray-400 font-normal">(opsional)</span></label>
            <input type="text" value={form.spare_part_digunakan}
              onChange={e => setForm(p => ({ ...p, spare_part_digunakan: e.target.value }))}
              placeholder="cth: PCB board, Seal ring, Kompresor"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teknisi Pelaksana <span className="text-xs text-gray-400 font-normal">(opsional)</span></label>
            <select value={form.id_teknisi}
              onChange={e => setForm(p => ({ ...p, id_teknisi: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Belum Ditugaskan —</option>
              {teknisiList.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-green-600/20 transition">
              {submitting ? 'Memproses AI...' : 'Buat & Prediksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
