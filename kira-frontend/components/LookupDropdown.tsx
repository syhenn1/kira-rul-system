'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { authApi } from '@/lib/auth';

type LookupItem = {
  id: string;
  kode: string;
  nama: string;
};

type Props = {
  label: string;
  table: 'merk' | 'kategori' | 'sub_kategori' | 'tipe';
  value: LookupItem | null;
  onChange: (item: LookupItem | null) => void;
  placeholder?: string;
  /** If provided, skip the API fetch and use these items directly */
  overrideItems?: LookupItem[];
  /** Disable the dropdown (e.g. waiting for parent selection) */
  disabled?: boolean;
  /** Helper text shown below the trigger when disabled */
  disabledHint?: string;
};

export default function LookupDropdown({
  label,
  table,
  value,
  onChange,
  placeholder,
  overrideItems,
  disabled = false,
  disabledHint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fetchedItems, setFetchedItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch from API only when overrideItems is NOT provided
  useEffect(() => {
    if (overrideItems !== undefined) return; // skip fetch
    const token = authApi.getToken();
    setLoading(true);
    apiFetch(`/api/lookup/${table}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setFetchedItems(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [table, overrideItems]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // If disabled, close the dropdown
  useEffect(() => {
    if (disabled) { setOpen(false); setQuery(''); }
  }, [disabled]);

  const items = overrideItems !== undefined ? overrideItems : fetchedItems;

  const filtered = items.filter(
    (item) =>
      item.nama.toLowerCase().includes(query.toLowerCase()) ||
      item.kode.toLowerCase().includes(query.toLowerCase()),
  );

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  const handleOpen = () => {
    if (disabled) return;
    setOpen((o) => !o);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full mt-2 border rounded-2xl px-4 py-3 outline-none text-left flex items-center gap-3 bg-white transition
          ${disabled
            ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
            : 'border-gray-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 cursor-pointer'
          }`}
      >
        {value ? (
          <>
            {/* Image placeholder with initials */}
            <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              {initials(value.nama)}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-xs text-gray-400 leading-none">{value.kode}</span>
              <span className="text-sm font-medium text-gray-800 truncate">{value.nama}</span>
            </span>
          </>
        ) : (
          <span className={`text-sm ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
            {disabledHint && disabled ? disabledHint : (placeholder ?? `Pilih ${label}`)}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${disabled ? 'text-gray-300' : 'text-gray-400'}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* List */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {loading && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">Memuat...</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</li>
            )}
            {filtered.map((item) => {
              const selected = value?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(item); setOpen(false); setQuery(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition text-left ${selected ? 'bg-blue-50' : ''}`}
                  >
                    {/* Image placeholder with initials */}
                    <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(item.nama)}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-xs text-gray-400 leading-none">{item.kode}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{item.nama}</span>
                    </span>
                    {selected && <Check size={14} className="ml-auto text-blue-600 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
