'use client';

import Link from 'next/link';
import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function AddAssetPage() {

  const [image, setImage] =
    useState<string | null>(null);

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
            href="/assets"
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center hover:bg-gray-50 transition text-xl"
          >
            ←
          </Link>

          <div>
            <h1 className="text-5xl font-bold text-[#111827]">
              Add New Asset
            </h1>

            <p className="text-gray-500 mt-3 text-lg">
              Create and manage company assets
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">

          {/* LEFT */}
          <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm p-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Asset Name */}
              <Input
                label="Asset Name"
                placeholder="Enter asset name"
              />

              {/* Purchase Date */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Purchase Date
                </label>

                <input
                  type="date"
                  className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <Input
                label="Category"
                placeholder="Enter category"
              />

              {/* Location */}
              <Select
                label="Location"
                options={[
                  'Gedung A',
                  'Gedung B',
                  'Gedung C',
                ]}
              />

              {/* Brand */}
              <Select
                label="Brand"
                options={[
                  'Dell',
                  'HP',
                  'Canon',
                  'Apple',
                ]}
              />

              {/* Custodian */}
              <Select
                label="Custodian"
                options={[
                  'IT Department',
                  'Finance',
                  'Marketing',
                ]}
              />

              {/* Model */}
              <Input
                label="Model"
                placeholder="Enter model"
              />

              {/* Condition */}
              <Select
                label="Condition"
                options={[
                  'Available',
                  'In Use',
                  'Maintenance',
                ]}
              />

              {/* Serial Number */}
              <Input
                label="Serial Number"
                placeholder="Enter serial number"
              />

              {/* Description */}
              <Input
                label="Description"
                placeholder="Enter description"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between">

            <div>

              <h2 className="text-2xl font-bold text-[#111827]">
                Upload Image
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
                href="/assets"
                className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-4 rounded-2xl font-medium text-center"
              >
                Cancel
              </Link>

              <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20">
                Save Asset
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
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type="text"
        placeholder={placeholder}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Select({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <select className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500">

        <option>
          Select {label}
        </option>

        {options.map((item) => (
          <option key={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}