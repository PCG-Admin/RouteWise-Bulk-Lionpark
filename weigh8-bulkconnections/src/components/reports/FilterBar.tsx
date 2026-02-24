'use client';

import { useState, useMemo } from 'react';
import { Search, X, Filter } from 'lucide-react';

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  multi?: boolean;
}

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function FilterBar({ filters, values, onFilterChange, searchValue, onSearchChange, searchPlaceholder = 'Search...' }: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    return Object.values(values).reduce((count, v) => count + v.length, 0) + (searchValue ? 1 : 0);
  }, [values, searchValue]);

  const clearAll = () => {
    filters.forEach(f => onFilterChange(f.key, []));
    onSearchChange?.('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Filter size={14} />
          <span className="font-sans text-[10px] uppercase tracking-wider">Filters</span>
        </div>

        {onSearchChange && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 font-sans text-xs text-gray-900 placeholder:text-gray-500 w-[200px] focus:outline-none focus:border-blue-900"
            />
          </div>
        )}

        {filters.map(filter => (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              className={`flex items-center gap-1.5 bg-gray-50 border rounded-lg px-3 py-1.5 font-sans text-xs transition-colors ${
                values[filter.key]?.length > 0
                  ? 'border-blue-900 text-blue-900'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {filter.label}
              {values[filter.key]?.length > 0 && (
                  <span className="ml-1 bg-blue-900 text-white rounded-full px-1.5 text-[9px] font-bold">
                  {values[filter.key].length}
                </span>
              )}
            </button>
            {openDropdown === filter.key && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] max-h-[240px] overflow-y-auto">
                {filter.options.map(opt => {
                  const isSelected = values[filter.key]?.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const current = values[filter.key] || [];
                        if (isSelected) {
                          onFilterChange(filter.key, current.filter(v => v !== opt.value));
                        } else {
                          onFilterChange(filter.key, [...current, opt.value]);
                        }
                        if (!filter.multi) setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 font-sans text-xs transition-colors ${
                        isSelected ? 'bg-blue-900/10 text-blue-900' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 font-sans text-[10px] text-gray-600 hover:text-red-600 transition-colors"
          >
            <X size={12} />
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {Object.entries(values).flatMap(([key, vals]) =>
            vals.map(v => {
              const filterDef = filters.find(f => f.key === key);
              const optLabel = filterDef?.options.find(o => o.value === v)?.label || v;
              return (
                <span key={`${key}-${v}`} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 font-sans text-[10px] text-gray-700">
                  {optLabel}
                  <button onClick={() => onFilterChange(key, values[key].filter(x => x !== v))} className="hover:text-red-600">
                    <X size={10} />
                  </button>
                </span>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
