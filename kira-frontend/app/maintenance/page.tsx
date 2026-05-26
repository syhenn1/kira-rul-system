import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';

const TOUR_STEPS = [
  {
    target: 'schedule-btn',
    title: 'Buat Jadwal Maintenance',
    desc: 'Klik tombol ini untuk membuat jadwal maintenance baru — pilih aset, tetapkan prioritas, dan tugaskan teknisi.',
  },
  {
    target: 'maintenance-search',
    title: 'Cari Maintenance',
    desc: 'Cari permintaan maintenance berdasarkan ID, nama aset, atau masalah yang dilaporkan.',
  },
  {
    target: 'maintenance-status-filter',
    title: 'Filter Status',
    desc: 'Filter tampilan berdasarkan status penyelesaian: Pending (belum dikerjakan) atau Complete (selesai).',
  },
  {
    target: 'maintenance-priority-filter',
    title: 'Filter Prioritas',
    desc: 'Filter berdasarkan tingkat urgensi: High (segera), Medium (dalam waktu dekat), atau Low (dapat ditunda).',
  },
  {
    target: 'maintenance-table',
    title: 'Tabel Maintenance',
    desc: 'Setiap baris menampilkan ID, aset terkait, masalah, prioritas, status, teknisi yang bertugas, dan tanggal target.',
  },
];

export default function MaintenancePage() {
  const maintenances = [
    { id: 'MNT-0001', asset: 'Laptop Dell XPS 13',       issue: 'Battery replacement',   priority: 'Medium',  status: 'Pending',  assigned: 'Rudi Hermawan', due: '21 May, 2024' },
    { id: 'MNT-0002', asset: 'Printer Canon 1200D',      issue: 'Paper jam',             priority: 'Pending', status: 'Pending',  assigned: '-',             due: '-' },
    { id: 'MNT-0003', asset: 'Monitor LG 24MD43',        issue: 'Flickering screen',     priority: 'Low',     status: 'Complete', assigned: 'Adi Nugroho',   due: '19 May, 2024' },
    { id: 'MNT-0004', asset: 'Projector Epson X200',     issue: 'Lamp replacement',      priority: 'High',    status: 'Pending',  assigned: '-',             due: '23 May, 2024' },
    { id: 'MNT-0005', asset: 'Keyboard Logitech K380',   issue: 'Some keys not working', priority: 'Low',     status: 'Complete', assigned: 'Rudi Hermawan', due: '18 May, 2024' },
  ];

  const getPriority = (p: string) =>
    p === 'High'   ? 'bg-red-100 text-red-600'    :
    p === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
    p === 'Low'    ? 'bg-green-100 text-green-700'  :
                    'bg-blue-100 text-blue-600';

  const getStatus = (s: string) =>
    s === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600';

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_maintenance" delay={800} />

      <main className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1 ml-64 p-8">
          <Topbar />

          {/* HEADER */}
          <div className="flex items-center justify-between mt-8 animate-[enterUp_0.5s_ease-out_both]">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Maintenance</h1>
              <p className="text-gray-500 mt-2">Manage asset maintenance schedules and requests</p>
            </div>

            <Tooltip content="Buat jadwal maintenance baru untuk aset" position="left">
              <Link
                data-tour="schedule-btn"
                href="/maintenance/add"
                className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-blue-600/20"
              >
                + Schedule
              </Link>
            </Tooltip>
          </div>

          {/* FILTER */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mt-6 animate-[enterUp_0.5s_0.1s_ease-out_both]">
            <div className="flex flex-col lg:flex-row gap-4">
              <Tooltip content="Cari berdasarkan ID atau nama aset" position="bottom">
                <input
                  data-tour="maintenance-search"
                  type="text"
                  placeholder="Search..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </Tooltip>

              <Tooltip content="Filter berdasarkan status penyelesaian maintenance" position="bottom">
                <select data-tour="maintenance-status-filter" className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600 cursor-pointer">
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Complete</option>
                </select>
              </Tooltip>

              <Tooltip content="Filter berdasarkan tingkat prioritas" position="bottom">
                <select data-tour="maintenance-priority-filter" className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600 cursor-pointer">
                  <option>All Priority</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </Tooltip>
            </div>
          </div>

          {/* TABLE */}
          <div
            className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto mt-6 animate-[enterUp_0.5s_0.18s_ease-out_both]"
            data-tour="maintenance-table"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-400">
                  <th className="pb-4 font-medium">Request ID</th>
                  <th className="pb-4 font-medium">Asset</th>
                  <th className="pb-4 font-medium">Issue</th>
                  <th className="pb-4 font-medium">Priority</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Assigned To</th>
                  <th className="pb-4 font-medium">Due Date</th>
                </tr>
              </thead>

              <tbody>
                {maintenances.map((item, i) => (
                  <tr
                    key={i}
                    className="stagger-item border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <td className="py-5 font-medium text-gray-800">{item.id}</td>
                    <td className="text-gray-500">{item.asset}</td>
                    <td className="text-gray-500">{item.issue}</td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriority(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-gray-500">{item.assigned}</td>
                    <td className="text-gray-500">{item.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">Showing 1-5 of 63 items</p>
              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-lg bg-blue-600 text-white font-medium">1</button>
                <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">2</button>
                <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">3</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
