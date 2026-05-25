'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type AssetOption = {
  id: string;
  asset_name: string;
  brand: string;
  category: string;
  sub_category: string;
  type: string;
  status: string;
  criticality_level: string;
};

export default function AddMaintenancePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [preselectedAssetId] = useState(() => {
    if (typeof window === 'undefined') return '';

    return new URLSearchParams(window.location.search).get('assetId') || '';
  });
  const [preselectedAssetError, setPreselectedAssetError] = useState<string | null>(null);
  const [hasAppliedPreselectedAsset, setHasAppliedPreselectedAsset] = useState(false);
  
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

  const handleAssetSelect = (assetId: string) => {
    setPreselectedAssetError(null);
    handleInputChange('id_asset', assetId);
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      setAssetError(null);

      try {
        const token = localStorage.getItem('kira_token');
        const response = await fetch(`${API_URL}/api/assets`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || err?.details || 'Failed to fetch assets');
        }

        const result = await response.json();
        setAssets(result.data || []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAssetError((error as Error).message);
        }
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!preselectedAssetId || isLoadingAssets || assetError || hasAppliedPreselectedAsset) return;

    const matchedAsset = assets.find((asset) => asset.id === preselectedAssetId);
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) return;

      if (matchedAsset) {
        setFormData((prev) => ({ ...prev, id_asset: matchedAsset.id }));
        setAssetSearch(matchedAsset.asset_name);
        setPreselectedAssetError(null);
      } else {
        setPreselectedAssetError('The asset from the link is not available for your account. Please choose another asset.');
      }

      setHasAppliedPreselectedAsset(true);
    });

    return () => {
      isActive = false;
    };
  }, [assetError, assets, hasAppliedPreselectedAsset, isLoadingAssets, preselectedAssetId]);

  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();

    if (!keyword) return assets;

    return assets.filter((asset) =>
      [
        asset.asset_name,
        asset.brand,
        asset.category,
        asset.sub_category,
        asset.type,
        asset.status,
        asset.criticality_level,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [assets, assetSearch]);

  const selectedAsset = assets.find((asset) => asset.id === formData.id_asset);

  const handleSubmit = async () => {
    if (!formData.id_asset || !formData.scheduled_date) {
      Swal.fire({
        title: 'Perhatian',
        text: 'Asset dan Scheduled Date harus diisi',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('kira_token');
      const response = await fetch(`${API_URL}/api/maintenances`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || err?.details || 'Failed to create maintenance');
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
        text: (error as Error).message || 'Gagal menyimpan data maintenance ke server.',
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
            
            <AssetSelect
              assets={filteredAssets}
              selectedAsset={selectedAsset}
              search={assetSearch}
              isLoading={isLoadingAssets}
              error={assetError}
              notice={preselectedAssetError}
              onSearchChange={setAssetSearch}
              onSelect={handleAssetSelect}
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
              disabled={isSubmitting || isLoadingAssets || assets.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition text-white py-4 rounded-2xl font-medium shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? 'Saving...' : 'Schedule Maintenance'}
            </button>
          </div>
        </div>
      </div>
      </main>
    </ProtectedRoute>
  );
}

function AssetSelect({
  assets,
  selectedAsset,
  search,
  isLoading,
  error,
  notice,
  onSearchChange,
  onSelect,
}: {
  assets: AssetOption[];
  selectedAsset?: AssetOption;
  search: string;
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  onSearchChange: (value: string) => void;
  onSelect: (assetId: string) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium text-gray-700">
        Asset
      </label>

      <input
        type="text"
        placeholder="Search asset by name, brand, category, or type"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full mt-2 border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />

      {selectedAsset && (
        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="font-semibold text-blue-900">
            {selectedAsset.asset_name}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            {selectedAsset.brand} - {selectedAsset.category} / {selectedAsset.sub_category} - {selectedAsset.type}
          </p>
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          {notice}
        </div>
      )}

      <div className="mt-3 border border-gray-200 rounded-2xl overflow-hidden bg-white">
        {isLoading && (
          <div className="p-4 text-gray-500">
            Loading assets...
          </div>
        )}

        {!isLoading && error && (
          <div className="p-4 text-red-600 bg-red-50">
            {error}
          </div>
        )}

        {!isLoading && !error && assets.length === 0 && (
          <div className="p-4 text-gray-500">
            No assets available. Please add an asset first.
          </div>
        )}

        {!isLoading && !error && assets.length > 0 && (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {assets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset.id)}
                  className={`w-full text-left p-4 transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {asset.asset_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {asset.brand} - {asset.category} / {asset.sub_category} - {asset.type}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        {asset.status}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {asset.criticality_level}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
