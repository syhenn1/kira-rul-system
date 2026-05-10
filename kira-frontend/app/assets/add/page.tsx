'use client';

import { useState } from 'react';
import { PackagePlus, Server, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddAssetPage() {
  const [formData, setFormData] = useState({
    asset_name: '',
    purchase_date: '',
    initial_useful_life: 60,
    current_rul: 60,
    status: 'Active',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:5000/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Gagal menambahkan aset');
      }

      setSuccess(true);
      // Reset form on success
      setFormData({
        asset_name: '',
        purchase_date: '',
        initial_useful_life: 60,
        current_rul: 60,
        status: 'Active',
      });
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat menambahkan aset. Pastikan backend server berjalan di port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] selection:bg-blue-500/30 py-20 px-6 relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-6">
            <PackagePlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
            Simulasi Tambah Aset
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Masukkan detail aset baru. Data ini akan disimpan ke PostgreSQL dan digunakan untuk simulasi perhitungan Remaining Useful Life (RUL).
          </p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/20 shadow-2xl relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-400">Berhasil!</h3>
                <p className="text-sm text-green-700 dark:text-green-300/80 mt-1">Aset telah berhasil ditambahkan ke database.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">Gagal</h3>
                <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="asset_name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nama Aset
              </label>
              <input
                id="asset_name"
                name="asset_name"
                type="text"
                required
                value={formData.asset_name}
                onChange={handleChange}
                placeholder="Misal: Mesin CNC Milling"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="purchase_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tanggal Pembelian
              </label>
              <input
                id="purchase_date"
                name="purchase_date"
                type="date"
                required
                value={formData.purchase_date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="initial_useful_life" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Umur Standar (Bulan)
                </label>
                <div className="relative">
                  <input
                    id="initial_useful_life"
                    name="initial_useful_life"
                    type="number"
                    required
                    min="1"
                    value={formData.initial_useful_life}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">bln</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="current_rul" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Sisa Umur (RUL Saat Ini)
                </label>
                <div className="relative">
                  <input
                    id="current_rul"
                    name="current_rul"
                    type="number"
                    required
                    min="1"
                    value={formData.current_rul}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">bln</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status Aset
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-white appearance-none"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  Simpan Aset <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Connection hint */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Server className="w-4 h-4" />
            <span>Terhubung ke PostgreSQL via Express Server di port 5000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
