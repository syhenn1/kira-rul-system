'use client';

import Link from 'next/link';
import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AssetDetailPage() {

  const [activeTab, setActiveTab] =
    useState('overview');

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-[#F5F7FB]">

        <Sidebar />

      <div className="flex-1 ml-64 p-8">

        <Topbar />

        {/* HEADER */}
        <div className="flex items-center justify-between mt-8">

          <div className="flex items-center gap-4">

            <Link
              href="/assets"
              className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 transition text-xl"
            >
              ←
            </Link>

            <div>
              <h1 className="text-5xl font-bold text-[#111827]">
                Asset Detail
              </h1>

              <p className="text-gray-500 mt-2">
                Monitor and manage asset information
              </p>
            </div>
          </div>

          {/* ACTION */}
          <div className="flex gap-4">

            <Link
              href="/assets/edit/AST-0001"
              className="px-6 py-3 rounded-2xl border bg-white hover:bg-gray-50 transition font-medium"
            >
              Edit
            </Link>

            <button
              onClick={() =>
                alert(
                  'Asset checked out successfully!'
                )
              }
              className="px-6 py-3 rounded-2xl border bg-white hover:bg-gray-50 transition font-medium"
            >
              Check Out
            </button>

            <button
              onClick={() =>
                alert(
                  'Asset deleted!'
                )
              }
              className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 transition text-white font-medium"
            >
              Delete
            </button>
          </div>
        </div>

        {/* TOP */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">

          {/* LEFT */}
          <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">

            <div className="flex flex-col lg:flex-row gap-8">

              {/* IMAGE */}
              <img
                src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop"
                alt="asset"
                className="w-full lg:w-[280px] h-[280px] object-cover rounded-3xl"
              />

              {/* INFO */}
              <div className="flex-1">

                <div className="flex items-center gap-4 flex-wrap">

                  <h2 className="text-4xl font-bold text-[#111827]">
                    Laptop Dell XPS 13
                  </h2>

                  <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium">
                    In Use
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mt-10">

                  <Info
                    title="Asset Number"
                    value="AST-0001"
                  />

                  <Info
                    title="Category"
                    value="Laptop"
                  />

                  <Info
                    title="Brand"
                    value="Dell"
                  />

                  <Info
                    title="Model"
                    value="XPS 13"
                  />

                  <Info
                    title="Serial Number"
                    value="DLPX13-78291"
                  />

                  <Info
                    title="Purchase Date"
                    value="12 Jan 2023"
                  />

                  <Info
                    title="Location"
                    value="IT Room"
                  />

                  <Info
                    title="Description"
                    value="Laptop for software development"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="bg-white rounded-3xl border shadow-sm p-8">

            <h2 className="text-2xl font-bold text-[#111827]">
              Status Information
            </h2>

            <div className="space-y-8 mt-10">

              <Info
                title="Custodian"
                value="Yasmeen A."
              />

              <Info
                title="Assigned Date"
                value="10 Feb 2024"
              />

              <Info
                title="Last Check Out"
                value="18 May 2024"
              />

              <div>
                <p className="text-sm text-gray-400">
                  Condition
                </p>

                <p className="mt-2 text-green-600 font-semibold">
                  Good
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">

          {/* LEFT */}
          <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">

            {/* TAB */}
            <div className="flex gap-8 border-b overflow-x-auto">

              <TabButton
                title="Overview"
                active={
                  activeTab === 'overview'
                }
                onClick={() =>
                  setActiveTab(
                    'overview'
                  )
                }
              />

              <TabButton
                title="Maintenance History"
                active={
                  activeTab ===
                  'maintenance'
                }
                onClick={() =>
                  setActiveTab(
                    'maintenance'
                  )
                }
              />

              <TabButton
                title="Usage History"
                active={
                  activeTab ===
                  'usage'
                }
                onClick={() =>
                  setActiveTab('usage')
                }
              />

              <TabButton
                title="Notes"
                active={
                  activeTab === 'notes'
                }
                onClick={() =>
                  setActiveTab('notes')
                }
              />
            </div>

            {/* CONTENT */}
            <div className="mt-10">

              {activeTab ===
                'overview' && (
                <>
                  <h3 className="text-2xl font-bold text-[#111827]">
                    Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

                    <Info
                      title="Processor"
                      value="Intel Core i7 1165G7"
                    />

                    <Info
                      title="RAM"
                      value="16GB"
                    />

                    <Info
                      title="Storage"
                      value="512GB SSD"
                    />

                    <Info
                      title="OS"
                      value="Windows 11 Pro"
                    />
                  </div>
                </>
              )}

              {activeTab ===
                'maintenance' && (
                <div className="space-y-6">

                  <HistoryCard
                    title="Battery Replacement"
                    date="12 May 2024"
                    status="Completed"
                  />

                  <HistoryCard
                    title="Screen Inspection"
                    date="03 Apr 2024"
                    status="Completed"
                  />
                </div>
              )}

              {activeTab ===
                'usage' && (
                <div className="space-y-6">

                  <HistoryCard
                    title="Checked Out by Yasmeen"
                    date="18 May 2024"
                    status="In Use"
                  />

                  <HistoryCard
                    title="Returned by IT Team"
                    date="15 May 2024"
                    status="Returned"
                  />
                </div>
              )}

              {activeTab ===
                'notes' && (
                <div className="bg-gray-50 rounded-2xl p-6 text-gray-600 leading-relaxed">
                  This asset is mainly used for software engineering and AI development projects.
                </div>
              )}
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 flex flex-col items-center justify-center">

            <h2 className="text-2xl font-bold text-[#111827]">
              QR Code
            </h2>

            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=AST-0001"
              alt="qr"
              className="w-[220px] mt-8"
            />

            <p className="text-gray-500 mt-4">
              AST-0001
            </p>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400">
        {title}
      </p>

      <p className="font-semibold text-[#111827] mt-2">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 whitespace-nowrap transition font-medium ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-400 hover:text-black'
      }`}
    >
      {title}
    </button>
  );
}

function HistoryCard({
  title,
  date,
  status,
}: {
  title: string;
  date: string;
  status: string;
}) {
  return (
    <div className="border rounded-2xl p-5 flex items-center justify-between">

      <div>
        <h4 className="font-semibold text-[#111827]">
          {title}
        </h4>

        <p className="text-gray-400 text-sm mt-1">
          {date}
        </p>
      </div>

      <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
        {status}
      </span>
    </div>
  );
}