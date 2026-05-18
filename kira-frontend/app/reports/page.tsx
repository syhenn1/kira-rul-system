'use client';

import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function ReportsPage() {

  const reports = [
    {
      id: 'RPT-0001',
      asset: 'Laptop Dell XPS 13',
      category: 'Hardware',
      severity: 'High',
      status: 'Open',
      reporter: 'Yasmeen A.',
      date: '21 May, 2024',
    },

    {
      id: 'RPT-0002',
      asset: 'Printer Canon G3010',
      category: 'Printer',
      severity: 'Medium',
      status: 'Pending',
      reporter: 'Rudi Hermawan',
      date: '20 May, 2024',
    },

    {
      id: 'RPT-0003',
      asset: 'Projector Epson X200',
      category: 'Projector',
      severity: 'Low',
      status: 'Resolved',
      reporter: 'Adi Nugroho',
      date: '19 May, 2024',
    },

    {
      id: 'RPT-0004',
      asset: 'Monitor LG 24MK600',
      category: 'Monitor',
      severity: 'High',
      status: 'Open',
      reporter: 'Dimas Saputra',
      date: '18 May, 2024',
    },

    {
      id: 'RPT-0005',
      asset: 'Keyboard Logitech K380',
      category: 'Peripheral',
      severity: 'Low',
      status: 'Resolved',
      reporter: 'Aqila Setiawan',
      date: '17 May, 2024',
    },
  ];

  const [search, setSearch] = useState('');

  const filteredReports = reports.filter((item) =>
    item.asset.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    item.reporter.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverity = (severity: string) => {
    if (severity === 'High') {
      return 'bg-red-100 text-red-600';
    }

    if (severity === 'Medium') {
      return 'bg-yellow-100 text-yellow-700';
    }

    return 'bg-green-100 text-green-700';
  };

  const getStatus = (status: string) => {
    if (status === 'Resolved') {
      return 'bg-green-100 text-green-700';
    }

    if (status === 'Pending') {
      return 'bg-yellow-100 text-yellow-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  return (
    <main className="flex min-h-screen bg-gray-100">

      <Sidebar />

      <div className="flex-1 ml-64 p-8">

        <Topbar />

        {/* HEADER */}
        <div className="flex items-center justify-between mt-8">

          <div>

            <h1 className="text-4xl font-bold text-gray-900">
              Reports
            </h1>

            <p className="text-gray-500 mt-2">
              Analyze asset reports and maintenance issues
            </p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium">
            + New Report
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            <p className="text-gray-400 text-sm">
              Total Reports
            </p>

            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              248
            </h2>

            <p className="text-green-600 text-sm mt-3">
              +12% this month
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            <p className="text-gray-400 text-sm">
              Open Issues
            </p>

            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              32
            </h2>

            <p className="text-red-500 text-sm mt-3">
              Requires attention
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            <p className="text-gray-400 text-sm">
              Resolved Reports
            </p>

            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              216
            </h2>

            <p className="text-blue-600 text-sm mt-3">
              System running stable
            </p>
          </div>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-8">

          <div className="flex flex-col lg:flex-row gap-4">

            {/* SEARCH */}
            <input
  type="text"
  placeholder="Search reports..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400"
/>

            {/* STATUS */}
            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Status</option>
              <option>Open</option>
              <option>Pending</option>
              <option>Resolved</option>
            </select>

            {/* SEVERITY */}
            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Severity</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            {/* CATEGORY */}
            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Category</option>
              <option>Hardware</option>
              <option>Printer</option>
              <option>Projector</option>
              <option>Monitor</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto mt-6">

          <table className="w-full">

            <thead>

              <tr className="border-b border-gray-100 text-left text-sm text-gray-400">

                <th className="pb-4 font-medium">
                  Report ID
                </th>

                <th className="pb-4 font-medium">
                  Asset
                </th>

                <th className="pb-4 font-medium">
                  Category
                </th>

                <th className="pb-4 font-medium">
                  Severity
                </th>

                <th className="pb-4 font-medium">
                  Status
                </th>

                <th className="pb-4 font-medium">
                  Reporter
                </th>

                <th className="pb-4 font-medium">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>

              {filteredReports.length > 0 ? (

                filteredReports.map((item, index) => (

                  <tr
                    key={index}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >

                    <td className="py-5 font-medium text-gray-800">
                      {item.id}
                    </td>

                    <td className="text-gray-500">
                      {item.asset}
                    </td>

                    <td className="text-gray-500">
                      {item.category}
                    </td>

                    <td>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverity(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="text-gray-500">
                      {item.reporter}
                    </td>

                    <td className="text-gray-500">
                      {item.date}
                    </td>
                  </tr>
                ))
              ) : (

                <tr>

                  <td
                    colSpan={7}
                    className="py-10 text-center text-gray-400"
                  >
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-6">

            <p className="text-sm text-gray-500">
              Showing {filteredReports.length} reports
            </p>

            <div className="flex gap-2">

              <button className="w-9 h-9 rounded-lg bg-blue-600 text-white">
                1
              </button>

              <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                2
              </button>

              <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                3
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}