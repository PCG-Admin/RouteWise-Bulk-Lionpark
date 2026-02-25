"use client";

import { X, Search, Truck, Package, User, Scale, Clock, Filter } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

interface Allocation {
  id: number;
  vehicleReg: string;
  driverName: string;
  transporter: string;
  netWeight: string;
  grossWeight: string;
  tareWeight: string;
  actualArrival: string;
  checkInTime: string;
  order: {
    id: number;
    orderNumber: string;
    product: string;
    clientName: string;
  };
}

interface PlateSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAllocation: (allocation: Allocation) => void;
}

export default function PlateSearchModal({
  isOpen,
  onClose,
  onSelectAllocation,
}: PlateSearchModalProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [totalWeighed, setTotalWeighed] = useState(0);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [orderFilter, setOrderFilter] = useState<string>("");
  const [transporterFilter, setTransporterFilter] = useState<string>("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [transporterSearchTerm, setTransporterSearchTerm] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [showTransporterDropdown, setShowTransporterDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCheckedInAllocations();
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowOrderDropdown(false);
        setShowTransporterDropdown(false);
      }
    };

    if (showOrderDropdown || showTransporterDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOrderDropdown, showTransporterDropdown]);

  useEffect(() => {
    let filtered = allocations;

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === "today") {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === "week") {
        cutoff.setDate(now.getDate() - 7);
      }

      filtered = filtered.filter((alloc) => {
        const checkInTime = alloc.checkInTime ? new Date(alloc.checkInTime) : null;
        return checkInTime && checkInTime >= cutoff;
      });
    }

    // Apply order filter
    if (orderFilter) {
      filtered = filtered.filter((alloc) =>
        alloc.order.orderNumber === orderFilter
      );
    }

    // Apply transporter filter
    if (transporterFilter) {
      filtered = filtered.filter((alloc) =>
        alloc.transporter === transporterFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((alloc) =>
        alloc.vehicleReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alloc.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alloc.order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAllocations(filtered);
  }, [searchTerm, allocations, dateFilter, orderFilter, transporterFilter]);

  // Extract unique orders and transporters
  const uniqueOrders = Array.from(new Set(allocations.map(a => a.order?.orderNumber || a.order_number).filter(Boolean))).sort();
  const uniqueTransporters = Array.from(new Set(allocations.map(a => a.transporter).filter(Boolean))).sort();

  const filteredOrders = uniqueOrders.filter(order =>
    order.toLowerCase().includes(orderSearchTerm.toLowerCase())
  );

  const filteredTransporters = uniqueTransporters.filter(transporter =>
    transporter.toLowerCase().includes(transporterSearchTerm.toLowerCase())
  );

  const fetchCheckedInAllocations = async () => {
    setLoading(true);
    try {
      // Fetch allocations that have checked in at Bulk Connections (site 2)
      const response = await fetch(
        `${API_BASE_URL}/internal-weighbridge/checked-in-allocations`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Fetched allocations:", {
          unweighed: data.total,
          checkedIn: data.totalCheckedIn,
          weighed: data.totalWeighed
        });
        setAllocations(data.data || []);
        setFilteredAllocations(data.data || []);
        setTotalCheckedIn(data.totalCheckedIn || 0);
        setTotalWeighed(data.totalWeighed || 0);
      } else {
        console.error("❌ Failed to fetch allocations:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (allocation: Allocation) => {
    onSelectAllocation(allocation);
    setSearchTerm("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Select Vehicle for Weighing</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose a checked-in vehicle to capture weight
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Total Checked In</p>
              <p className="text-2xl font-bold text-blue-900">{totalCheckedIn}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Ready to Weigh</p>
              <p className="text-2xl font-bold text-green-900">{allocations.length}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-600 font-medium">Already Weighed</p>
              <p className="text-2xl font-bold text-slate-900">{totalWeighed}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by plate, order number, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
              autoFocus
            />
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 w-16">Date:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter("today")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === "today"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter("week")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === "week"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setDateFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  All Time
                </button>
              </div>
              <span className="ml-auto text-sm text-slate-500">
                {filteredAllocations.length} vehicle{filteredAllocations.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Order & Transporter Filters */}
            <div className="flex items-center gap-2">
              <div className="w-4" />
              <span className="text-xs font-medium text-slate-600 w-16">Filters:</span>
              <div className="flex gap-2 flex-1">
                {/* Order Filter Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setShowOrderDropdown(!showOrderDropdown);
                      setShowTransporterDropdown(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      orderFilter
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {orderFilter || "All Orders"}
                  </button>
                  {showOrderDropdown && (
                    <div className="absolute top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-slate-200">
                        <input
                          type="text"
                          placeholder="Search orders..."
                          value={orderSearchTerm}
                          onChange={(e) => setOrderSearchTerm(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          onClick={() => {
                            setOrderFilter("");
                            setShowOrderDropdown(false);
                            setOrderSearchTerm("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          All Orders
                        </button>
                        {filteredOrders.map((order) => (
                          <button
                            key={order}
                            onClick={() => {
                              setOrderFilter(order);
                              setShowOrderDropdown(false);
                              setOrderSearchTerm("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700"
                          >
                            {order}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transporter Filter Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setShowTransporterDropdown(!showTransporterDropdown);
                      setShowOrderDropdown(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      transporterFilter
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {transporterFilter || "All Transporters"}
                  </button>
                  {showTransporterDropdown && (
                    <div className="absolute top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-slate-200">
                        <input
                          type="text"
                          placeholder="Search transporters..."
                          value={transporterSearchTerm}
                          onChange={(e) => setTransporterSearchTerm(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          onClick={() => {
                            setTransporterFilter("");
                            setShowTransporterDropdown(false);
                            setTransporterSearchTerm("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          All Transporters
                        </button>
                        {filteredTransporters.map((transporter) => (
                          <button
                            key={transporter}
                            onClick={() => {
                              setTransporterFilter(transporter);
                              setShowTransporterDropdown(false);
                              setTransporterSearchTerm("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700"
                          >
                            {transporter}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(orderFilter || transporterFilter) && (
                  <button
                    onClick={() => {
                      setOrderFilter("");
                      setTransporterFilter("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading allocations...</p>
              </div>
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Truck className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-500">No allocations found</p>
              <p className="text-sm">
                {searchTerm ? "Try a different search term" : "No vehicles have checked in yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAllocations.map((allocation) => {
                const checkInTime = allocation.checkInTime
                  ? new Date(allocation.checkInTime)
                  : null;
                const timeAgo = checkInTime
                  ? getTimeAgo(checkInTime)
                  : "Unknown";

                return (
                  <div
                    key={allocation.id}
                    onClick={() => handleSelect(allocation)}
                    className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Left: Plate & Time */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <Truck className="w-5 h-5 text-slate-600 shrink-0" />
                        <div>
                          <span className="text-lg font-bold font-mono text-slate-900 block">
                            {allocation.vehicleReg || allocation.vehicle_reg}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Order</p>
                          <p className="font-medium text-slate-900">
                            {allocation.order?.orderNumber || allocation.order_number || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Product</p>
                          <p className="font-medium text-slate-900">
                            {allocation.order?.product || allocation.product || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Customer</p>
                          <p className="font-medium text-slate-900">
                            {allocation.order?.clientName || allocation.client_name || '-'}
                          </p>
                        </div>
                        <div className="col-span-3 border-t border-slate-200 pt-2 mt-1">
                          <p className="text-xs text-slate-500 mb-1">Expected Net Weight</p>
                          <p className="font-mono font-bold text-blue-600 text-lg">
                            {parseFloat(allocation.netWeight || allocation.net_weight || "0").toLocaleString()} kg
                          </p>
                        </div>
                      </div>

                      {/* Right: Weigh Button */}
                      <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        Weigh
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
