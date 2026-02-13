'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Transporter {
  id: number;
  code: string;
  name: string;
  phone: string | null;
}

interface TransporterSelectProps {
  value: string;
  onChange: (transporterName: string, transporterPhone: string | null, transporterCode: string | null, transporterId?: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TransporterSelect({
  value,
  onChange,
  placeholder = "Select transporter...",
  disabled = false
}: TransporterSelectProps) {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch transporters from API
  useEffect(() => {
    fetchTransporters();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTransporters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/transporters');
      const result = await response.json();
      if (result.success) {
        setTransporters(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch transporters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter transporters based on search query
  const filteredTransporters = transporters.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (transporter: Transporter) => {
    onChange(transporter.name, transporter.phone, transporter.code, transporter.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange('', null, null, undefined);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }
        }}
        className={`
          w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
          transition cursor-pointer flex items-center justify-between gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-slate-400'}
        `}
      >
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : value}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-slate-100 rounded transition"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-500 mt-2">Loading transporters...</p>
            </div>
          ) : filteredTransporters.length > 0 ? (
            <div className="py-1">
              {filteredTransporters.map((transporter) => (
                <button
                  key={transporter.id}
                  onClick={() => handleSelect(transporter)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      {transporter.name}
                    </span>
                    {transporter.code && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {transporter.code}
                      </span>
                    )}
                  </div>
                  {transporter.phone && (
                    <span className="text-xs text-slate-500">{transporter.phone}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500">
                {searchQuery ? `No transporters found matching "${searchQuery}"` : 'No transporters available'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
