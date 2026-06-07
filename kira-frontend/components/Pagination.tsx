'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// Builds a compact page-number window around the current page (e.g. 1 … 4 5 [6] 7 8 … 49)
// instead of rendering a button for every page — unreadable once there are dozens of pages.
function getPageWindow(current: number, total: number): (number | 'ellipsis')[] {
  const SIBLINGS = 1;
  if (total <= SIBLINGS * 2 + 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const start = Math.max(2, current - SIBLINGS);
  const end = Math.min(total - 1, current + SIBLINGS);
  const pages: (number | 'ellipsis')[] = [1];

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('ellipsis');

  pages.push(total);
  return pages;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  itemLabel = 'data',
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-5">
      <p className="text-gray-500 text-sm">
        {total === 0
          ? 'Tidak ada data'
          : `Menampilkan ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} dari ${total} ${itemLabel} · halaman ${page} dari ${totalPages}`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="w-9 h-9 flex items-center justify-center rounded-xl border text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageWindow(page, totalPages).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'border hover:bg-gray-50 text-gray-600'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Halaman berikutnya"
            className="w-9 h-9 flex items-center justify-center rounded-xl border text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
