'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AddAssetPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    asset_name: '',
    purchase_date: '',
    brand: '',
    category: '',
    sub_category: '',
    type: '',
    type: '',
    criticality_level: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('kira_token');
      const response = await fetch('http://localhost:3001/api/assets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create asset');
      }
      
      const result = await response.json();
      await Swal.fire({
        title: 'Berhasil!',
        html: `Asset berhasil ditambahkan!<br><br><b>RUL Prediksi:</b> ${result.data?.predicted_rul !== undefined ? result.data.predicted_rul : 'N/A'} bulan`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Kembali ke List'
      });
      router.push('/assets');
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Terjadi Kesalahan',
        text: 'Gagal menyimpan data aset ke server.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
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
              
              <Input
                label="Asset Name"
                placeholder="Enter asset name"
                value={formData.asset_name}
                onChange={(e) => handleInputChange('asset_name', e.target.value)}
              />

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>

              <Input
                label="Brand"
                placeholder="e.g. Sharp"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
              />

              <Input
                label="Category"
                placeholder="e.g. Mechanical"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              />

              <Input
                label="Sub Category"
                placeholder="e.g. Tata Udara"
                value={formData.sub_category}
                onChange={(e) => handleInputChange('sub_category', e.target.value)}
              />

              <Input
                label="Type"
                placeholder="e.g. Generator Portable"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
              />

              <Select
                label="Criticality Level"
                value={formData.criticality_level}
                onChange={(e) => handleInputChange('criticality_level', e.target.value)}
                options={['Critical', 'High', 'Medium', 'Low']}
              />

            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#111827]">
                Upload Image
              </h2>
              <label className="border-2 border-dashed border-gray-300 rounded-3xl h-[420px] mt-6 flex flex-col items-center justify-center text-center px-6 cursor-pointer hover:border-blue-500 transition overflow-hidden">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
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
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
    </div>
  );
}

function Select({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select 
        value={value}
        onChange={onChange}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      >
        <option value="">
          Select {label}
        </option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}