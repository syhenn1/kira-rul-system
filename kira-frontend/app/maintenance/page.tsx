'use client';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import PaginationBar from '@/components/Pagination';
import ProtectedRoute from '@/components/ProtectedRoute';
import TourOverlay from '@/components/TourOverlay';
import Tooltip from '@/components/Tooltip';
import AddMaintenanceModal from '@/components/AddMaintenanceModal';
import MaintenanceScheduledModal, { type MaintenanceScheduledResult } from '@/components/MaintenanceScheduledModal';
import Swal from 'sweetalert2';
import { Maximize2, PanelRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const TOUR_STEPS = [
  {
    target: 'schedule-btn',
    title: 'Buat Jadwal Maintenance',
    desc: 'Klik tombol ini untuk membuat jadwal maintenance baru — pilih aset, tentukan severity, dan tugaskan teknisi.',
  },
  {
    target: 'maintenance-search',
    title: 'Cari Maintenance',
    desc: 'Cari record maintenance berdasarkan nama aset, tipe maintenance, atau kata kunci lainnya secara real-time.',
  },
  {
    target: 'maintenance-status-filter',
    title: 'Filter Status',
    desc: 'Filter berdasarkan status pekerjaan: Scheduled (terjadwal), In Progress (dikerjakan), atau Completed (selesai).',
  },
  {
    target: 'maintenance-severity-filter',
    title: 'Filter Severity',
    desc: 'Filter berdasarkan tingkat keparahan: Critical/High (segera), Medium (menengah), atau Low (dapat ditunda).',
  },
  {
    target: 'maintenance-table',
    title: 'Tabel Maintenance',
    desc: 'Setiap baris menampilkan aset terkait, tipe, severity, status, jadwal, biaya, dan prediksi RUL terbaru. Klik "View" untuk detail lengkap dan timeline.',
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Terbaru' },
  { value: 'date_asc',   label: 'Terlama' },
  { value: 'name_asc',   label: 'Nama Aset A–Z' },
  { value: 'name_desc',  label: 'Nama Aset Z–A' },
  { value: 'cost_desc',  label: 'Biaya Tertinggi' },
  { value: 'cost_asc',   label: 'Biaya Terendah' },
];

type RelatedUser = {
  id: string;
  name: string;
  email: string;
};

type LookupRef = { id: string; kode: string; nama: string } | null;

type TechnicianOption = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  phone?: string | null;
  status: string;
};

type MaintenanceItem = {
  id: string;
  maintenance_type: string;
  severity: string;
  scheduled_date: string;
  start_date?: string | null;
  completion_date?: string | null;
  down_time?: number;
  cost: number;
  status: string;
  asset?: {
    id: string;
    asset_name: string;
    merk?:        LookupRef;
    kategori?:    LookupRef;
    subKategori?: LookupRef;
    tipe?:        LookupRef;
    criticality_level?: string;
    status?: string;
  };
  user?: RelatedUser;
  assignedTechnician?: TechnicianOption | null;
  technician?: TechnicianOption | null;
  logs?: Array<{
    id: string;
    status: string;
    note: string;
    start_date?: string | null;
    completion_date?: string | null;
    down_time?: number;
    cost?: number;
    created_at: string;
    user?: RelatedUser;
    technician?: TechnicianOption | null;
  }>;
  prediction_history?: Array<{
    id: string;
    predicted_rul: number;
    recorded_at: string;
  }>;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AssetOption = {
  id: string;
  asset_name: string;
  merk?:        LookupRef;
  kategori?:    LookupRef;
  subKategori?: LookupRef;
  tipe?:        LookupRef;
  status?: string;
  criticality_level?: string;
};

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduledResult, setScheduledResult] = useState<MaintenanceScheduledResult | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '10',
    });

    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (severityFilter) params.set('severity', severityFilter);
    if (sortBy) params.set('sort_by', sortBy);

    return params.toString();
  }, [page, search, statusFilter, severityFilter, sortBy]);

  const fetchMaintenances = useCallback(async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('kira_token');
        const response = await fetch(`${API_URL}/api/maintenances?${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || err?.details || 'Failed to fetch maintenances');
        }

        const result = await response.json();
        const fetchedMaintenances: MaintenanceItem[] = result.data || [];

        setMaintenances(fetchedMaintenances);
        setPagination(result.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 1,
        });

        return fetchedMaintenances;
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError((fetchError as Error).message);
        }

        return [];
      } finally {
        setIsLoading(false);
      }
  }, [query, page]);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      fetchMaintenances(controller.signal);
    });

    return () => controller.abort();
  }, [fetchMaintenances]);

  const getSeverity = (severity: string) => {
    if (severity === 'Critical' || severity === 'High') {
      return 'bg-red-100 text-red-600';
    }

    if (severity === 'Medium') {
      return 'bg-yellow-100 text-yellow-700';
    }

    if (severity === 'Low') {
      return 'bg-green-100 text-green-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  const getStatus = (status: string) => {
    if (status === 'Completed') {
      return 'bg-green-100 text-green-700';
    }

    if (status === 'In Progress') {
      return 'bg-yellow-100 text-yellow-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const getCurrentStatus = (maintenance: MaintenanceItem) => {
    return maintenance.status;
  };

  // Progresi alami status maintenance: Scheduled -> In Progress -> Completed.
  // Completed adalah status akhir (tidak ada status berikutnya).
  const getNextStatus = (currentStatus: string): string | null => {
    if (currentStatus === 'Scheduled') return 'In Progress';
    if (currentStatus === 'In Progress') return 'Completed';
    return null;
  };

  const handleDeleteMaintenance = async (maintenance: MaintenanceItem) => {
    const confirmation = await Swal.fire({
      title: 'Delete maintenance?',
      text: `This will delete the maintenance record and its timeline for ${maintenance.asset?.asset_name || 'this asset'}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });

    if (!confirmation.isConfirmed) return;

    try {
      const token = localStorage.getItem('kira_token');
      const deleteUrl = `${API_URL}/api/maintenances/${maintenance.id}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        console.error('Delete maintenance failed', {
          url: deleteUrl,
          maintenanceId: maintenance.id,
          status: response.status,
          response: err,
        });
        throw new Error(err?.details || err?.error || 'Failed to delete maintenance');
      }

      setMaintenances((current) => current.filter((item) => item.id !== maintenance.id));
      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      setSelectedMaintenance(null);
      setIsAddLogOpen(false);
      await Swal.fire({
        title: 'Deleted',
        text: 'Maintenance has been deleted.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (deleteError) {
      await Swal.fire({
        title: 'Delete failed',
        text: (deleteError as Error).message,
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleDetailAction = (action: string, maintenance: MaintenanceItem) => {
    if (action === 'Delete Maintenance') {
      void handleDeleteMaintenance(maintenance);
      return;
    }

    if (action === 'Edit Maintenance') {
      setIsEditOpen(true);
      return;
    }

    console.log(action, maintenance);
  };

  const handleLogCreated = async (updatedMaintenance: MaintenanceItem) => {
    setSelectedMaintenance(updatedMaintenance);
    setMaintenances((current) =>
      current.map((item) => item.id === updatedMaintenance.id ? updatedMaintenance : item)
    );
    setIsAddLogOpen(false);
    const refreshedMaintenances = await fetchMaintenances();
    const refreshedSelectedMaintenance = refreshedMaintenances.find((item) => item.id === updatedMaintenance.id);

    if (refreshedSelectedMaintenance) {
      setSelectedMaintenance(refreshedSelectedMaintenance);
    }
  };

  const handleMaintenanceUpdated = async (updatedMaintenance: MaintenanceItem) => {
    setSelectedMaintenance(updatedMaintenance);
    setMaintenances((current) =>
      current.map((item) => item.id === updatedMaintenance.id ? updatedMaintenance : item)
    );
    setIsEditOpen(false);

    const refreshedMaintenances = await fetchMaintenances();
    const refreshedSelectedMaintenance = refreshedMaintenances.find((item) => item.id === updatedMaintenance.id);

    if (refreshedSelectedMaintenance) {
      setSelectedMaintenance(refreshedSelectedMaintenance);
    }
  };

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_maintenance" delay={800} />

      <main className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1 ml-64 p-8">
          <Topbar />

          <div className="flex items-center justify-between mt-8 animate-[enterUp_0.5s_ease-out_both]">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Kelola jadwal dan permintaan maintenance aset
              </p>
            </div>

            <Tooltip content="Buat jadwal maintenance baru untuk aset" position="left">
              <button
                data-tour="schedule-btn"
                onClick={() => setAddOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                + Schedule
              </button>
            </Tooltip>
          </div>

          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm mt-6 animate-[enterUp_0.5s_0.1s_ease-out_both]">
            <div className="flex flex-col lg:flex-row gap-3">
              <Tooltip content="Cari berdasarkan nama aset atau tipe maintenance" position="bottom">
                <input
                  data-tour="maintenance-search"
                  type="text"
                  placeholder="Cari aset atau tipe maintenance..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                />
              </Tooltip>

              <Tooltip content="Filter berdasarkan status pekerjaan maintenance" position="bottom">
                <select
                  data-tour="maintenance-status-filter"
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </Tooltip>

              <Tooltip content="Filter berdasarkan tingkat keparahan" position="bottom">
                <select
                  data-tour="maintenance-severity-filter"
                  value={severityFilter}
                  onChange={(e) => handleSeverityChange(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </Tooltip>

              <Tooltip content="Urutkan daftar maintenance" position="bottom">
                <select
                  data-tour="maintenance-sort"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mt-4 animate-[enterUp_0.5s_0.18s_ease-out_both]">
            <div
              className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm overflow-x-auto"
              data-tour="maintenance-table"
            >
              {error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-5 text-red-600">
                  {error}
                </div>
              ) : isLoading ? (
                <div className="py-16 text-center text-gray-400">
                  Loading maintenance data...
                </div>
              ) : maintenances.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  No maintenance records found
                </div>
              ) : (
                <>
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-sm text-gray-400">
                        <th className="pb-4 font-medium">Asset Name</th>
                        <th className="pb-4 font-medium">Maintenance Type</th>
                        <th className="pb-4 font-medium">Severity</th>
                        <th className="pb-4 font-medium">Status</th>
                        <th className="pb-4 font-medium">Scheduled Date</th>
                        <th className="pb-4 font-medium">Cost</th>
                        <th className="pb-4 font-medium">Predicted RUL</th>
                        <th className="pb-4 font-medium">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {maintenances.map((item, i) => {
                        const latestPrediction = item.prediction_history?.[0];
                        const currentStatus = getCurrentStatus(item);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedMaintenance(item)}
                            className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            style={{ animationDelay: `${i * 35}ms` }}
                          >
                            <td className="py-5 font-medium text-gray-800">
                              {item.asset?.asset_name || '-'}
                            </td>

                            <td className="text-gray-500">
                              {item.maintenance_type}
                            </td>

                            <td>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverity(item.severity)}`}>
                                {item.severity}
                              </span>
                            </td>

                            <td>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(currentStatus)}`}>
                                {currentStatus}
                              </span>
                            </td>

                            <td className="text-gray-500">
                              {formatDate(item.scheduled_date)}
                            </td>

                            <td className="text-gray-500">
                              {formatCurrency(item.cost)}
                            </td>

                            <td className="text-gray-500">
                              {latestPrediction ? `${latestPrediction.predicted_rul} bulan` : 'N/A'}
                            </td>

                            <td onClick={(e) => e.stopPropagation()}>
                              <Tooltip content="Lihat detail dan timeline maintenance" position="left">
                                <button
                                  onClick={() => setSelectedMaintenance(item)}
                                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition"
                                >
                                  View
                                </button>
                              </Tooltip>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <PaginationBar
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    itemLabel="maintenance"
                    onPageChange={(p) => setPage(p)}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {selectedMaintenance && (
          <MaintenanceDetailModal
            maintenance={selectedMaintenance}
            getCurrentStatus={getCurrentStatus}
            getNextStatus={getNextStatus}
            getSeverity={getSeverity}
            getStatus={getStatus}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            onClose={() => setSelectedMaintenance(null)}
            onAction={handleDetailAction}
            onAddLog={() => setIsAddLogOpen(true)}
          />
        )}

        {selectedMaintenance && isAddLogOpen && (
          <AddStatusLogModal
            maintenance={selectedMaintenance}
            targetStatus={getNextStatus(getCurrentStatus(selectedMaintenance)) || 'Completed'}
            formatCurrency={formatCurrency}
            onClose={() => setIsAddLogOpen(false)}
            onCreated={handleLogCreated}
          />
        )}

        {selectedMaintenance && isEditOpen && (
          <EditMaintenanceModal
            maintenance={selectedMaintenance}
            onClose={() => setIsEditOpen(false)}
            onUpdated={handleMaintenanceUpdated}
          />
        )}
      </main>

      <AddMaintenanceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(result) => setScheduledResult(result)}
      />

      {scheduledResult && (
        <MaintenanceScheduledModal
          result={scheduledResult}
          onAddAnother={() => {
            setScheduledResult(null);
            setAddOpen(true);
          }}
          onViewAll={() => {
            setScheduledResult(null);
            void fetchMaintenances();
          }}
        />
      )}
    </ProtectedRoute>
  );
}

function MaintenanceDetailModal({
  maintenance,
  getCurrentStatus,
  getNextStatus,
  getSeverity,
  getStatus,
  formatDate,
  formatCurrency,
  onClose,
  onAction,
  onAddLog,
}: {
  maintenance: MaintenanceItem;
  getCurrentStatus: (maintenance: MaintenanceItem) => string;
  getNextStatus: (currentStatus: string) => string | null;
  getSeverity: (severity: string) => string;
  getStatus: (status: string) => string;
  formatDate: (date?: string | null) => string;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onAction: (action: string, maintenance: MaintenanceItem) => void;
  onAddLog: () => void;
}) {
  const latestPrediction = maintenance.prediction_history?.[0];
  const logs = maintenance.logs || [];
  const currentStatus = getCurrentStatus(maintenance);
  const nextStatus = getNextStatus(currentStatus);

  const [mode, setMode] = useState<'drawer' | 'modal'>('drawer');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const isModal = mode === 'modal';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Positioner */}
      <div
        className={
          isModal
            ? 'absolute inset-0 flex items-center justify-center p-6'
            : 'absolute inset-y-0 right-0 flex'
        }
      >
        {/* Panel */}
        <div
          className={
            isModal
              ? `bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
              : `bg-white shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Tooltip content={isModal ? 'Tampilkan sebagai panel samping' : 'Tampilkan sebagai jendela tengah'} position="bottom">
                <button
                  onClick={() => setMode(isModal ? 'drawer' : 'modal')}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 flex items-center justify-center transition shrink-0"
                  aria-label="Ubah tampilan panel detail"
                >
                  {isModal ? <PanelRight size={16} /> : <Maximize2 size={16} />}
                </button>
              </Tooltip>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">Maintenance Detail</h2>
                <p className="text-gray-500 text-sm truncate">{maintenance.asset?.asset_name || 'Unknown Asset'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatus(currentStatus)}`}>
                {currentStatus}
              </span>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
                aria-label="Tutup panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#F5F7FB] space-y-5">
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <SectionTitle title="Asset Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                <InfoItem label="Asset Name" value={maintenance.asset?.asset_name} />
                <InfoItem label="Merk" value={maintenance.asset?.merk?.nama} />
                <InfoItem label="Kategori" value={maintenance.asset?.kategori?.nama} />
                <InfoItem label="Sub Kategori" value={maintenance.asset?.subKategori?.nama} />
                <InfoItem label="Tipe" value={maintenance.asset?.tipe?.nama} />
                <InfoItem label="Asset Status" value={maintenance.asset?.status} />
                <InfoItem label="Criticality Level" value={maintenance.asset?.criticality_level} />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <SectionTitle title="Maintenance Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                <InfoItem label="Maintenance Type" value={maintenance.maintenance_type} />
                <InfoItem
                  label="Severity"
                  value={
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverity(maintenance.severity)}`}>
                      {maintenance.severity}
                    </span>
                  }
                />
                <InfoItem
                  label="Current Status"
                  value={
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(currentStatus)}`}>
                      {currentStatus}
                    </span>
                  }
                />
                <InfoItem label="Scheduled Date" value={formatDate(maintenance.scheduled_date)} />
                <InfoItem label="Start Date" value={formatDate(maintenance.start_date)} />
                <InfoItem label="Completion Date" value={formatDate(maintenance.completion_date)} />
                <InfoItem label="Downtime" value={`${maintenance.down_time || 0} hari`} />
                <InfoItem label="Cost" value={formatCurrency(maintenance.cost)} />
                <InfoItem label="Predicted RUL" value={latestPrediction ? `${latestPrediction.predicted_rul} bulan` : 'N/A'} />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <SectionTitle title="People" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                <PersonBlock title="Created By" user={maintenance.user} />
                <TechnicianBlock technician={maintenance.technician} />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <SectionTitle title="Maintenance Timeline" />
              {logs.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  No maintenance logs available
                </div>
              ) : (
                <div className="mt-6 space-y-0">
                  {logs.map((log, index) => (
                    <div key={log.id} className="relative pl-8 pb-7 last:pb-0">
                      {index !== logs.length - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-200" />
                      )}
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-blue-100" />
                      <div className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className={`w-fit px-3 py-1 rounded-full text-sm font-medium ${getStatus(log.status)}`}>
                            {log.status}
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        <p className="text-gray-600 mt-4 leading-relaxed">
                          {log.note || 'No note provided'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                          <InfoItem label="Technician" value={log.technician ? `${log.technician.name} (${log.technician.email})` : '-'} />
                          <InfoItem label="Created By" value={log.user ? `${log.user.name} (${log.user.email})` : '-'} />
                          <InfoItem label="Cost" value={formatCurrency(log.cost)} />
                          <InfoItem label="Downtime" value={`${log.down_time || 0} hari`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-3 shrink-0">
            <Tooltip content="Ubah detail jadwal dan informasi maintenance" position="top">
              <button
                onClick={() => onAction('Edit Maintenance', maintenance)}
                className="px-5 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition font-medium text-sm"
              >
                Edit Maintenance
              </button>
            </Tooltip>
            {nextStatus && (
              <Tooltip content={`Tandai maintenance ini sebagai "${nextStatus}" dan catat ke timeline`} position="top">
                <button
                  onClick={onAddLog}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-medium text-sm"
                >
                  Eksekusi ke {nextStatus}
                </button>
              </Tooltip>
            )}
            <Tooltip content="Hapus record maintenance ini secara permanen" position="top">
              <button
                onClick={() => onAction('Delete Maintenance', maintenance)}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 transition text-white font-medium text-sm"
              >
                Delete Maintenance
              </button>
            </Tooltip>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditMaintenanceModal({
  maintenance,
  onClose,
  onUpdated,
}: {
  maintenance: MaintenanceItem;
  onClose: () => void;
  onUpdated: (maintenance: MaintenanceItem) => void;
}) {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id_asset: maintenance.asset?.id || '',
    id_teknisi: maintenance.technician?.id || '',
    maintenance_type: maintenance.maintenance_type || 'Preventive',
    severity: maintenance.severity || 'Medium',
    down_time: String(maintenance.down_time || 0),
    cost: String(maintenance.cost || 0),
  });

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('kira_token');

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      setAssetError(null);
      try {
        const response = await fetch(`${API_URL}/api/assets`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || err?.details || 'Failed to fetch assets');
        }
        const result = await response.json();
        setAssets(result.data || []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setAssetError((fetchError as Error).message);
        }
      } finally {
        setIsLoadingAssets(false);
      }
    };

    const fetchTechnicians = async () => {
      try {
        const response = await fetch(`${API_URL}/api/technicians`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          setTechnicians(result.technicians || []);
        }
      } catch { /* non-fatal */ }
    };

    fetchAssets();
    fetchTechnicians();

    return () => controller.abort();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.id_asset) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Asset is required.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('kira_token');
      const response = await fetch(`${API_URL}/api/maintenances/${maintenance.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_asset: formData.id_asset,
          id_teknisi: formData.id_teknisi || undefined,
          maintenance_type: formData.maintenance_type,
          severity: formData.severity,
          down_time: formData.down_time,
          cost: formData.cost,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        console.error('Edit maintenance failed', {
          maintenanceId: maintenance.id,
          status: response.status,
          response: err,
        });
        throw new Error(err?.details || err?.error || 'Failed to update maintenance');
      }

      const result = await response.json();
      await Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: 'Maintenance has been updated.',
        confirmButtonColor: '#2563eb',
        timer: 1400,
        showConfirmButton: false,
      });
      onUpdated(result.data);
    } catch (submitError) {
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: (submitError as Error).message,
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-500/30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Edit Maintenance
            </h2>
            <p className="text-gray-500 mt-1">
              {maintenance.asset?.asset_name || 'Unknown Asset'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            x
          </button>
        </div>

        <div className="p-6 bg-[#F5F7FB] max-h-[75vh] overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Asset
                </label>
                <select
                  value={formData.id_asset}
                  onChange={(e) => handleChange('id_asset', e.target.value)}
                  disabled={isLoadingAssets}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 disabled:bg-gray-50"
                >
                  {maintenance.asset && (
                    <option value={maintenance.asset.id}>
                      {maintenance.asset.asset_name}
                    </option>
                  )}
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_name} - {asset.merk?.nama || '-'} / {asset.kategori?.nama || '-'}
                    </option>
                  ))}
                </select>
                {assetError && (
                  <p className="text-sm text-red-600 mt-2">
                    {assetError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Teknisi</label>
                <select
                  value={formData.id_teknisi}
                  onChange={(e) => handleChange('id_teknisi', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="">— Pilih Teknisi —</option>
                  {technicians.filter(t => t.status !== 'Tidak Aktif').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.specialization}
                    </option>
                  ))}
                </select>
              </div>
              <EditSelect label="Maintenance Type" value={formData.maintenance_type} options={['Preventive', 'Corrective', 'Predictive', 'Condition-Based']} onChange={(value) => handleChange('maintenance_type', value)} />
              <EditSelect label="Severity" value={formData.severity} options={['Low', 'Medium', 'High', 'Critical']} onChange={(value) => handleChange('severity', value)} />
              <EditInput label="Downtime" type="number" value={formData.down_time} onChange={(value) => handleChange('down_time', value)} />
              <EditInput label="Cost" type="number" value={formData.cost} onChange={(value) => handleChange('cost', value)} />
            </div>

            <p className="mt-5 text-xs text-gray-400 flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Status dan tanggal-tanggal (scheduled, start, completion) diambil otomatis dari riwayat status log — gunakan &quot;Add Status Log&quot; untuk mencatat atau mengubah status maintenance.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddStatusLogModal({
  maintenance,
  targetStatus,
  formatCurrency,
  onClose,
  onCreated,
}: {
  maintenance: MaintenanceItem;
  targetStatus: string;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onCreated: (maintenance: MaintenanceItem) => void;
}) {
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('kira_token');

    const fetchTechnicians = async () => {
      try {
        const response = await fetch(`${API_URL}/api/technicians`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          setTechnicians(result.technicians || []);
        }
      } catch { /* non-fatal */ }
    };

    fetchTechnicians();
    return () => controller.abort();
  }, []);

  // Log paling baru pada riwayat maintenance ini — jadi acuan nilai default,
  // sehingga pengguna tidak perlu mengisi ulang data yang sebenarnya tidak berubah.
  const previousLog = useMemo(() => {
    const sorted = [...(maintenance.logs || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted[sorted.length - 1] || null;
  }, [maintenance.logs]);

  const defaultTechnicianId =
    previousLog?.technician?.id || maintenance.assignedTechnician?.id || maintenance.technician?.id || '';
  const defaultCost = previousLog ? String(previousLog.cost ?? 0) : (maintenance.cost ? String(maintenance.cost) : '');

  const [formData, setFormData] = useState({
    note: '',
    technician_id: defaultTechnicianId,
    cost: defaultCost,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.note.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Catatan (note) harus diisi.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('kira_token');
      const response = await fetch(`${API_URL}/api/maintenances/${maintenance.id}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          note: formData.note,
          technician_id: formData.technician_id || undefined,
          cost: formData.cost || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || err?.details || 'Failed to add status log');
      }

      const result = await response.json();
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Status maintenance berhasil diubah ke "${targetStatus}".`,
        confirmButtonColor: '#2563eb',
        timer: 1600,
        showConfirmButton: false,
      });
      onCreated(result.data);
    } catch (submitError) {
      await Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: (submitError as Error).message,
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-500/30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Eksekusi ke {targetStatus}
            </h2>
            <p className="text-gray-500 mt-1">
              {maintenance.asset?.asset_name || 'Unknown Asset'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            x
          </button>
        </div>

        <div className="p-6 bg-[#F5F7FB]">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status Baru
                </label>
                <div className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 font-medium">
                  {targetStatus}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Mengikuti progresi alami status maintenance, sehingga tidak bisa dipilih bebas.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Teknisi Pelaksana
                </label>
                <select
                  value={formData.technician_id}
                  onChange={(e) => handleChange('technician_id', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="">— Pilih Teknisi —</option>
                  {technicians.filter((t) => t.status !== 'Tidak Aktif' || t.id === formData.technician_id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.specialization}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  {previousLog?.technician
                    ? `Default mengikuti log sebelumnya: ${previousLog.technician.name}. Ubah jika ada pergantian teknisi.`
                    : 'Pilih teknisi yang menangani progres ini (opsional).'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cost
                </label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => handleChange('cost', e.target.value)}
                  placeholder="Optional"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {previousLog
                    ? `Default mengikuti log sebelumnya: ${formatCurrency(previousLog.cost)}. Ubah jika biaya berubah.`
                    : 'Biarkan kosong jika belum ada biaya yang tercatat.'}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  rows={4}
                  placeholder="Describe the latest maintenance status..."
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : `Eksekusi ke ${targetStatus}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-xl font-semibold text-gray-800">
      {title}
    </h3>
  );
}

function EditInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
      />
    </div>
  );
}

function EditSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400">
        {label}
      </p>
      <div className="font-semibold text-gray-800 mt-2">
        {value || '-'}
      </div>
    </div>
  );
}

function PersonBlock({
  title,
  user,
}: {
  title: string;
  user?: RelatedUser | null;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="font-semibold text-gray-800 mt-2">{user?.name || '-'}</p>
      <p className="text-sm text-gray-500 mt-1">{user?.email || '-'}</p>
    </div>
  );
}

function TechnicianBlock({ technician }: { technician?: TechnicianOption | null }) {
  return (
    <div className="border border-gray-100 rounded-2xl p-5">
      <p className="text-sm text-gray-400">Teknisi</p>
      {technician ? (
        <>
          <p className="font-semibold text-gray-800 mt-2">{technician.name}</p>
          <p className="text-sm text-blue-600 font-medium mt-0.5">{technician.specialization}</p>
          <p className="text-sm text-gray-500 mt-0.5">{technician.email}</p>
          {technician.phone && <p className="text-sm text-gray-500">{technician.phone}</p>}
        </>
      ) : (
        <p className="font-semibold text-gray-400 mt-2">-</p>
      )}
    </div>
  );
}
