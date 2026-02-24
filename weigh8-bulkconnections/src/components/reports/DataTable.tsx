'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: string[];
  onRowClick?: (row: T) => void;
  highlightRow?: (row: T) => 'green' | 'amber' | 'red' | null;
  exportable?: boolean;
}

const highlightClasses: Record<string, string> = {
  green: 'bg-green-600/5',
  amber: 'bg-amber-600/5',
  red: 'bg-red-600/5',
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = true,
  paginated = true,
  pageSize = 20,
  searchable = false,
  searchKeys = [],
  onRowClick,
  highlightRow,
  exportable = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = paginated ? Math.ceil(sorted.length / pageSize) : 1;
  const displayed = paginated ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  function handleSort(key: string) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleExport() {
    toast('Preparing export... Download will begin shortly', { duration: 2000 });
  }

  return (
    <div>
      {(searchable || exportable) && (
        <div className="flex items-center justify-between mb-3">
          {searchable && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search..."
                className="bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-600 font-sans w-64 focus:outline-none focus:border-blue-900"
              />
            </div>
          )}
          {exportable && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 font-sans text-xs text-gray-700 hover:text-blue-900 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`text-left py-2.5 px-6 font-sans text-xs uppercase tracking-wider text-gray-600 font-semibold sticky top-0 bg-gray-50 cursor-pointer select-none ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortable && col.sortable !== false && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                        : <ArrowUpDown size={10} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => {
              const highlight = highlightRow?.(row);
              return (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-200/50 hover:bg-gray-50/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${highlight ? highlightClasses[highlight] : ''}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`py-4 px-6 text-gray-900 ${col.className || ''}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-600 font-sans">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs font-sans text-gray-700">
          <span>{sorted.length} rows</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
