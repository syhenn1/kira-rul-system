'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AddMaintenancePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id_asset: '',
    maintenance_type: 'Preventive',
    severity: 'Medium',
    scheduled_date: '',
    completion_date: '',
    cost: '',
    status: 'Scheduled',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.id_asset || !formData.scheduled_date) {
      Swal.fire({
        title: 'Perhatian',
        text: 'Asset ID dan Scheduled Date harus diisi',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/maintenances', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create maintenance');
      }
      
      const result = await response.json();
      await Swal.fire({
        title: 'Berhasil!',
        html: `Maintenance berhasil dijadwalkan!<br><br><b>RUL Prediksi:</b> ${result.data?.predicted_rul !== undefined ? result.data.predicted_rul : '0'} bulan`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Kembali ke List'
      });
      router.push('/maintenance');
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Terjadi Kesalahan',
        text: 'Gagal menyimpan data maintenance ke server.',
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
            href="/maintenance"
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center hover:bg-gray-50 transition text-xl"
          >
            ←
          </Link>
          <div>
            <h1 className="text-5xl font-bold text-[#111827]">
              Schedule Maintenance
            </h1>
            <p className="text-gray-500 mt-3 text-lg">
              Create a new maintenance record for an asset
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-3xl border shadow-sm p-8 mt-8 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Input
              label="Asset ID"
              placeholder="Enter Asset ID"
              value={formData.id_asset}
              onChange={(e) => handleInputChange('id_asset', e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-gray-700">
                Scheduled Date
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            <Select
              label="Maintenance Type"
              value={formData.maintenance_type}
              onChange={(e) => handleInputChange('maintenance_type', e.target.value)}
              options={['Preventive', 'Corrective', 'Predictive', 'Condition-Based']}
            />

            <Select
              label="Severity"
              value={formData.severity}
              onChange={(e) => handleInputChange('severity', e.target.value)}
              options={['Low', 'Medium', 'High', 'Critical']}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              options={['Scheduled', 'In Progress', 'Completed']}
            />

            <div>
              <label className="text-sm font-medium text-gray-700">
                Completion Date (Tanggal Selesai)
              </label>
              <input
                type="datetime-local"
                value={formData.completion_date}
                onChange={(e) => handleInputChange('completion_date', e.target.value)}
                className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            <Input
              label="Maintenance Cost (Biaya Perbaikan)"
              placeholder="e.g. 500000"
              type="number"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
            />

          </div>

          {/* BUTTON */}
          <div className="flex gap-4 mt-8 pt-8 border-t">
            <Link
              href="/maintenance"
              className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 transition py-4 rounded-2xl font-medium text-center"
            >
              Cancel
            </Link>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? 'Saving...' : 'Schedule Maintenance'}
            </button>
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
