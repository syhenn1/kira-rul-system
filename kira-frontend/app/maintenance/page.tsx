'use client';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import TourOverlay from '@/components/TourOverlay';
import Tooltip from '@/components/Tooltip';
import Swal from 'sweetalert2';
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
  latestStatus?: string;
  currentStatusFromLog?: string;
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
  assignedTechnician?: RelatedUser | null;
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
    technician?: RelatedUser | null;
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

const withCurrentStatus = (maintenance: MaintenanceItem): MaintenanceItem => {
  const latestStatus = maintenance.latestStatus || maintenance.currentStatusFromLog || maintenance.logs?.[0]?.status || maintenance.status;

  return {
    ...maintenance,
    latestStatus,
    currentStatusFromLog: latestStatus,
  };
};

const toDateTimeLocalValue = (date?: string | null) => {
  if (!date) return '';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toISOString().slice(0, 16);
};

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
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

    return params.toString();
  }, [page, search, statusFilter, severityFilter]);

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
        const fetchedMaintenances: MaintenanceItem[] = (result.data || []).map(withCurrentStatus);

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

  const getCurrentStatus = (maintenance: MaintenanceItem) => {
    return maintenance.latestStatus || maintenance.currentStatusFromLog || maintenance.logs?.[0]?.status || maintenance.status;
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
    const normalizedMaintenance = withCurrentStatus(updatedMaintenance);

    setSelectedMaintenance(normalizedMaintenance);
    setMaintenances((current) =>
      current.map((item) => item.id === normalizedMaintenance.id ? normalizedMaintenance : item)
    );
    setIsAddLogOpen(false);
    const refreshedMaintenances = await fetchMaintenances();
    const refreshedSelectedMaintenance = refreshedMaintenances.find((item) => item.id === normalizedMaintenance.id);

    if (refreshedSelectedMaintenance) {
      setSelectedMaintenance(refreshedSelectedMaintenance);
    }
  };

  const handleMaintenanceUpdated = async (updatedMaintenance: MaintenanceItem) => {
    const normalizedMaintenance = withCurrentStatus(updatedMaintenance);

    setSelectedMaintenance(normalizedMaintenance);
    setMaintenances((current) =>
      current.map((item) => item.id === normalizedMaintenance.id ? normalizedMaintenance : item)
    );
    setIsEditOpen(false);

    const refreshedMaintenances = await fetchMaintenances();
    const refreshedSelectedMaintenance = refreshedMaintenances.find((item) => item.id === normalizedMaintenance.id);

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
              <Link
                data-tour="schedule-btn"
                href="/maintenance/add"
                className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                + Schedule
              </Link>
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
                            className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors"
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

                            <td>
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

                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500">
                      Showing {maintenances.length} of {pagination.total} items
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={pagination.page <= 1}
                        className="px-4 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-50"
                      >
                        Prev
                      </button>

                      <button className="min-w-9 h-9 rounded-lg bg-blue-600 text-white px-3">
                        {pagination.page}
                      </button>

                      <button
                        onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {selectedMaintenance && (
          <MaintenanceDetailModal
            maintenance={selectedMaintenance}
            getCurrentStatus={getCurrentStatus}
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
            onClose={() => setIsAddLogOpen(false)}
            onCreated={handleLogCreated}
          />
        )}

        {selectedMaintenance && isEditOpen && (
          <EditMaintenanceModal
            maintenance={selectedMaintenance}
            currentStatus={getCurrentStatus(selectedMaintenance)}
            onClose={() => setIsEditOpen(false)}
            onUpdated={handleMaintenanceUpdated}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}

function MaintenanceDetailModal({
  maintenance,
  getCurrentStatus,
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

  return (
    <div className="fixed inset-0 z-50 bg-gray-500/30 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="bg-white w-full sm:max-w-3xl xl:max-w-6xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Maintenance Detail
            </h2>
            <p className="text-gray-500 mt-1">
              {maintenance.asset?.asset_name || 'Unknown Asset'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(currentStatus)}`}>
              {currentStatus}
            </span>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              x
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 bg-[#F5F7FB]">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="bg-white rounded-2xl p-6 shadow-sm xl:col-span-1">
              <SectionTitle title="Asset Information" />
              <div className="grid grid-cols-1 gap-5 mt-6">
                <InfoItem label="Asset Name" value={maintenance.asset?.asset_name} />
                <InfoItem label="Merk" value={maintenance.asset?.merk?.nama} />
                <InfoItem label="Kategori" value={maintenance.asset?.kategori?.nama} />
                <InfoItem label="Sub Kategori" value={maintenance.asset?.subKategori?.nama} />
                <InfoItem label="Tipe" value={maintenance.asset?.tipe?.nama} />
                <InfoItem label="Asset Status" value={maintenance.asset?.status} />
                <InfoItem label="Criticality Level" value={maintenance.asset?.criticality_level} />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm xl:col-span-2">
              <SectionTitle title="Maintenance Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
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

            <section className="bg-white rounded-2xl p-6 shadow-sm xl:col-span-1">
              <SectionTitle title="People" />
              <div className="space-y-5 mt-6">
                <PersonBlock title="Created By" user={maintenance.user} />
                <TechnicianBlock technician={maintenance.technician} />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm xl:col-span-2">
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
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
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-white flex flex-col md:flex-row justify-end gap-3">
          <Tooltip content="Ubah detail jadwal dan informasi maintenance" position="top">
            <button
              onClick={() => onAction('Edit Maintenance', maintenance)}
              className="px-5 py-3 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition font-medium"
            >
              Edit Maintenance
            </button>
          </Tooltip>
          <Tooltip content="Tambahkan update status terbaru ke timeline" position="top">
            <button
              onClick={onAddLog}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-medium"
            >
              Add Status Log
            </button>
          </Tooltip>
          <Tooltip content="Hapus record maintenance ini secara permanen" position="top">
            <button
              onClick={() => onAction('Delete Maintenance', maintenance)}
              className="px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition text-white font-medium"
            >
              Delete Maintenance
            </button>
          </Tooltip>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function EditMaintenanceModal({
  maintenance,
  currentStatus,
  onClose,
  onUpdated,
}: {
  maintenance: MaintenanceItem;
  currentStatus: string;
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
    status: currentStatus || maintenance.status || 'Scheduled',
    scheduled_date: toDateTimeLocalValue(maintenance.scheduled_date),
    start_date: toDateTimeLocalValue(maintenance.start_date),
    completion_date: toDateTimeLocalValue(maintenance.completion_date),
    down_time: String(maintenance.down_time || 0),
    cost: String(maintenance.cost || 0),
    note: '',
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
    if (!formData.id_asset || !formData.scheduled_date) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Asset and scheduled date are required.',
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
          status: formData.status,
          scheduled_date: formData.scheduled_date,
          start_date: formData.start_date || undefined,
          completion_date: formData.completion_date || undefined,
          down_time: formData.down_time,
          cost: formData.cost,
          note: formData.note || undefined,
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

  const statusChanged = formData.status !== currentStatus;

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
              <EditSelect label="Status" value={formData.status} options={['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled']} onChange={(value) => handleChange('status', value)} />
              <EditInput label="Scheduled Date" type="datetime-local" value={formData.scheduled_date} onChange={(value) => handleChange('scheduled_date', value)} />
              <EditInput label="Start Date" type="datetime-local" value={formData.start_date} onChange={(value) => handleChange('start_date', value)} />
              <EditInput label="Completion Date" type="datetime-local" value={formData.completion_date} onChange={(value) => handleChange('completion_date', value)} />
              <EditInput label="Downtime" type="number" value={formData.down_time} onChange={(value) => handleChange('down_time', value)} />
              <EditInput label="Cost" type="number" value={formData.cost} onChange={(value) => handleChange('cost', value)} />

              {statusChanged && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Status Change Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => handleChange('note', e.target.value)}
                    rows={3}
                    placeholder={`Optional note for ${currentStatus} to ${formData.status}`}
                    className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
                  />
                </div>
              )}
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddStatusLogModal({
  maintenance,
  onClose,
  onCreated,
}: {
  maintenance: MaintenanceItem;
  onClose: () => void;
  onCreated: (maintenance: MaintenanceItem) => void;
}) {
  const [formData, setFormData] = useState({
    status: 'In Progress',
    note: '',
    technician_id: maintenance.assignedTechnician?.id || '',
    start_date: '',
    completion_date: '',
    cost: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.status || !formData.note.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Status dan note harus diisi.',
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
          status: formData.status,
          note: formData.note,
          technician_id: formData.technician_id || undefined,
          start_date: formData.start_date || undefined,
          completion_date: formData.completion_date || undefined,
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
        text: 'Status log berhasil ditambahkan.',
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
              Add Status Log
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
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Technician ID
                </label>
                <input
                  value={formData.technician_id}
                  onChange={(e) => handleChange('technician_id', e.target.value)}
                  placeholder="Optional user id"
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Completion Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.completion_date}
                  onChange={(e) => handleChange('completion_date', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
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
            {isSubmitting ? 'Saving...' : 'Save Log'}
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
