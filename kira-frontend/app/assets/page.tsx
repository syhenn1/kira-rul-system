'use client';

import Link from 'next/link';
import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddAssetModal from '@/components/AddAssetModal';
import Tooltip from '@/components/Tooltip';
import TourOverlay from '@/components/TourOverlay';

const assets = [
  { id: 'AST-0001', name: 'Laptop Dell XPS 13',    category: 'Laptop',    condition: 'In Use',      location: 'IT Room',        lastAction: '16 May, 2024' },
  { id: 'AST-0002', name: 'Monitor LG 24MD43',     category: 'Monitor',   condition: 'Available',   location: 'Bricks Eatery',  lastAction: '15 May, 2024' },
  { id: 'AST-0003', name: 'Chair Ergonomic X200',  category: 'Furniture', condition: 'In Use',      location: 'Marketing Room', lastAction: '14 May, 2024' },
  { id: 'AST-0004', name: 'Projector Epson X200',  category: 'Projector', condition: 'Maintenance', location: 'Meeting Room',   lastAction: '13 May, 2024' },
  { id: 'AST-0005', name: 'Printer Canon E3200',   category: 'Printer',   condition: 'Available',   location: 'Finance Room',   lastAction: '12 May, 2024' },
];

const TOUR_STEPS = [
  {
    target: 'add-asset-btn',
    title: 'Tambah Aset Baru',
    desc: 'Klik tombol ini untuk mendaftarkan aset baru. Anda akan memilih gedung lokasi lalu mengisi detail aset. PIN keamanan diperlukan saat menyimpan.',
  },
  {
    target: 'asset-search',
    title: 'Cari Aset',
    desc: 'Ketik nama aset untuk menyaringnya secara real-time. Hasil pencarian muncul langsung di tabel di bawah.',
  },
  {
    target: 'asset-status-filter',
    title: 'Filter Status',
    desc: 'Filter aset berdasarkan kondisi: Available (siap pakai), In Use (sedang dipakai), atau Maintenance (dalam perbaikan).',
  },
  {
    target: 'asset-table',
    title: 'Tabel Aset',
    desc: 'Klik nama aset untuk melihat detail lengkap termasuk prediksi RUL. Gunakan tombol "View" atau "Delete" di kolom Action.',
  },
];

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <TourOverlay steps={TOUR_STEPS} storageKey="kira_tour_assets" delay={800} />
      <Sidebar />

      <main className="min-h-screen bg-[#F5F7FB] ml-64 p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 animate-[enterUp_0.5s_ease-out_both]">
          <div>
            <h1 className="text-5xl font-bold text-[#111827]">Assets</h1>
            <p className="text-gray-500 mt-3 text-lg">Manage and monitor all company assets</p>
          </div>

          <Tooltip content="Daftarkan aset baru ke dalam sistem" position="left">
            <button
              data-tour="add-asset-btn"
              onClick={() => setAddOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              + Add Asset
            </button>
          </Tooltip>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-6 mb-8 animate-[enterUp_0.5s_0.08s_ease-out_both]">
          <StatCard title="Total Assets" value="2,500" />
          <StatCard title="In Use"       value="936" />
          <StatCard title="Available"    value="800" />
          <StatCard title="Maintenance"  value="120" />
        </div>

        {/* SEARCH + FILTER */}
        <div className="bg-white rounded-3xl border shadow-sm p-6 mb-8 animate-[enterUp_0.5s_0.14s_ease-out_both]">
          <div className="flex gap-4">
            <Tooltip content="Cari aset berdasarkan nama" position="bottom">
              <input
                data-tour="asset-search"
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400 transition"
              />
            </Tooltip>

            <Tooltip content="Filter aset berdasarkan status kondisi" position="bottom">
              <select data-tour="asset-status-filter" className="border rounded-2xl px-5 py-4 text-gray-500 cursor-pointer">
                <option>All Status</option>
                <option>Available</option>
                <option>In Use</option>
                <option>Maintenance</option>
              </select>
            </Tooltip>
          </div>
        </div>

        {/* TABLE */}
        <div
          className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-[enterUp_0.5s_0.2s_ease-out_both]"
          data-tour="asset-table"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-5">Asset Name</th>
                  <th className="px-6 py-5">Asset ID</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Condition</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Last Action</th>
                  <th className="px-6 py-5">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAssets.map((asset, i) => (
                  <tr
                    key={asset.id}
                    className="stagger-item border-b hover:bg-gray-50 transition"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <td className="px-6 py-5 font-semibold text-[#111827]">
                      <Link href={`/assets/${asset.id}`} className="hover:text-blue-600 transition">
                        {asset.name}
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-gray-500">{asset.id}</td>
                    <td className="px-6 py-5 text-gray-600">{asset.category}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        asset.condition === 'Available'   ? 'bg-green-100 text-green-700'  :
                        asset.condition === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
                                                           'bg-blue-100 text-blue-700'
                      }`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-gray-600">{asset.location}</td>
                    <td className="px-6 py-5 text-gray-500">{asset.lastAction}</td>
                    <td className="px-6 py-5">
                      <div className="flex gap-3">
                        <Tooltip content="Lihat detail aset" position="top">
                          <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-700 font-medium transition">
                            View
                          </Link>
                        </Tooltip>
                        <Tooltip content="Hapus aset dari sistem" position="top">
                          <button className="text-red-500 hover:text-red-600 font-medium transition">
                            Delete
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-6 py-5">
            <p className="text-gray-500 text-sm">Showing 1-5 of 100 assets</p>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-xl bg-blue-600 text-white font-medium">1</button>
              <button className="w-10 h-10 rounded-xl border hover:bg-gray-50 transition">2</button>
              <button className="w-10 h-10 rounded-xl border hover:bg-gray-50 transition">3</button>
            </div>
          </div>
        </div>
      </main>

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => setAddOpen(false)}
      />
    </ProtectedRoute>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-4xl font-bold text-[#111827] mt-3">{value}</h2>
    </div>
  );
}
