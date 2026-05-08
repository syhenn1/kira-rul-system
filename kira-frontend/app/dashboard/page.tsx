import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import StatCard from '@/components/StatCard';

import {
  AssetBarChart,
  AssetDonutChart,
} from '@/components/Charts';

import RecentActivities from '@/components/RecentActivities';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Dashboard
          </h1>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
          <StatCard
            title="Total Assets"
            value="2,500"
            subtitle="All Assets"
          />

          <StatCard
            title="In Use"
            value="936"
            subtitle="Currently Used"
          />

          <StatCard
            title="Available"
            value="800"
            subtitle="Ready To Use"
          />

          <StatCard
            title="Need Maintenance"
            value="800"
            subtitle="Require Attention"
          />
        </div>

        {/* CHART SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          {/* BAR CHART */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Asset Overview
              </h2>
            </div>

            <AssetBarChart />
          </div>

          {/* ALERT PANEL */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Alerts & Reminders
              </h2>

              <button className="text-blue-600 hover:text-blue-700 font-medium transition">
                View All
              </button>
            </div>

            <div className="space-y-5">
              <div className="border-b border-gray-100 pb-4">
                <p className="text-gray-700 font-medium">
                  12 Assets need maintenance
                </p>

                <span className="inline-flex mt-2 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  High Priority
                </span>
              </div>

              <div>
                <p className="text-gray-700 font-medium">
                  5 Assets need inspection
                </p>

                <span className="inline-flex mt-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                  Medium Priority
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          {/* DONUT CHART */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Assets by Category
            </h2>

            <AssetDonutChart />
          </div>

          {/* UPCOMING MAINTENANCE */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Upcoming Maintenance
              </h2>

              <button className="text-blue-600 hover:text-blue-700 font-medium transition">
                View All
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Printer Canon G1030
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Due on 20 May 2026
                </p>

                <span className="inline-flex mt-3 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  High
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">
                  Printer Canon G1030
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Due on 27 May 2026
                </p>

                <span className="inline-flex mt-3 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                  Medium
                </span>
              </div>
            </div>
          </div>

          {/* TOP USED */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Top Used Assets
            </h2>

            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <p className="font-medium text-gray-700">
                  AC HISENSE
                </p>

                <p className="text-gray-500">
                  35 times
                </p>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <p className="font-medium text-gray-700">
                  Printer
                </p>

                <p className="text-gray-500">
                  30 times
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-700">
                  Laptop
                </p>

                <p className="text-gray-500">
                  25 times
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-6">
          <RecentActivities />
        </div>
      </div>
    </main>
  );
}