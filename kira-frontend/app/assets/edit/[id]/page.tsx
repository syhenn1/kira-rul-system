'use client';

import Link from 'next/link';
import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function EditAssetPage() {

  const [image, setImage] =
    useState<string | null>(
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop'
    );

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (file) {
      setImage(
        URL.createObjectURL(file)
      );
    }
  };

  return (
    <main className="flex min-h-screen bg-[#F5F7FB]">

      <Sidebar />

      <div className="flex-1 ml-64 p-8">

        <Topbar />

        {/* HEADER */}
        <div className="flex items-center gap-4 mt-8">

          <Link
            href="/assets/AST-0001"
            className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 transition text-xl"
          >
            ←
          </Link>

          <div>

            <h1 className="text-5xl font-bold text-[#111827]">
              Edit Asset
            </h1>

            <p className="text-gray-500 mt-3 text-lg">
              Update and manage asset information
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">

          {/* LEFT */}
          <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <Input
                label="Asset Name"
                defaultValue="Laptop Dell XPS 13"
              />

              <Input
                label="Purchase Date"
                defaultValue="2023-01-12"
                type="date"
              />

              <Input
                label="Category"
                defaultValue="Laptop"
              />

              <Select
                label="Location"
                options={[
                  'Gedung A',
                  'Gedung B',
                  'Gedung C',
                ]}
                defaultValue="Gedung A"
              />

              <Select
                label="Brand"
                options={[
                  'Dell',
                  'HP',
                  'Canon',
                  'Apple',
                ]}
                defaultValue="Dell"
              />

              <Select
                label="Custodian"
                options={[
                  'IT Department',
                  'Finance',
                  'Marketing',
                ]}
                defaultValue="IT Department"
              />

              <Input
                label="Model"
                defaultValue="XPS 13"
              />

              <Select
                label="Condition"
                options={[
                  'Available',
                  'In Use',
                  'Maintenance',
                ]}
                defaultValue="In Use"
              />

              <Input
                label="Serial Number"
                defaultValue="DLPX13-78291"
              />

              <Input
                label="Description"
                defaultValue="Laptop for software development"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between">

            <div>

              <h2 className="text-2xl font-bold text-[#111827]">
                Asset Image
              </h2>

              {/* UPLOAD */}
              <label className="border-2 border-dashed border-gray-300 rounded-3xl h-[420px] mt-6 flex flex-col items-center justify-center text-center px-6 cursor-pointer hover:border-blue-500 transition overflow-hidden">

                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={
                    handleImageChange
                  }
                />

                {image ? (
                  <img
                    src={image}
                    alt="preview"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-5xl text-blue-600">
                      ↑
                    </div>

                    <p className="mt-8 font-semibold text-gray-700 text-lg">
                      Click to upload
                    </p>

                    <p className="text-sm text-gray-400 mt-2">
                      PNG, JPG, JPEG
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* BUTTON */}
            <div className="flex gap-4 mt-6">

              <Link
                href="/assets/AST-0001"
                className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-4 rounded-2xl font-medium text-center"
              >
                Cancel
              </Link>

              <button
                onClick={() =>
                  alert(
                    'Asset updated successfully!'
                  )
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  defaultValue,
  type = 'text',
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>

      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Select({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue: string;
}) {
  return (
    <div>

      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        defaultValue={defaultValue}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
      >

        {options.map((item) => (
          <option key={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}