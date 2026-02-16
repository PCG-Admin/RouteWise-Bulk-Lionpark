"use client";

import { Search, RefreshCw, CheckCircle2, Clock, TrendingUp, Scale, Download, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

function CustomSelect({ label, value, onChange, options, placeholder = "All" }: { label: string, value: string, onChange: (val: string) => void, options: string[], placeholder?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative flex-1">
            {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "bg-white rounded-lg border shadow-sm p-3 cursor-pointer transition-all relative z-20",
                    isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
                )}
            >
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block cursor-pointer">{label}</label>
                <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-bold truncate", value ? "text-slate-700" : "text-slate-400")}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-30 max-h-60 overflow-y-auto">
                    <div onClick={() => { onChange(""); setIsOpen(false); }} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                        {placeholder}
                    </div>
                    {options.map((option) => (
                        <div key={option} onClick={() => { onChange(option); setIsOpen(false); }} className={cn("px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors", value === option ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50")}>
                            {option}
                        </div>
                    ))}
                    {options.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">No options available</div>}
                </div>
            )}
        </div>
    );
}

// Helper function to get display status for Bulk Connections view (journey-based)
function getDisplayStatus(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;
    const allocationStatus = allocation.status?.toLowerCase();

    // Priority: Bulk journey > Lions journey > Allocation status
    if (bulkJourney) {
        // Truck has been to Bulk
        if (bulkJourney.status === 'arrived') {
            return 'Checked In at Bulk';
        } else if (bulkJourney.status === 'departed') {
            return 'Departed from Bulk';
        }
    } else if (lionsJourney) {
        // Truck is at Lions (staging area)
        if (lionsJourney.status === 'arrived') {
            return 'Staging at Lions Park';
        } else if (lionsJourney.status === 'departed') {
            return 'In Transit to Bulk';
        }
    } else {
        // No journey entries - use allocation status
        if (allocationStatus === 'scheduled' || allocationStatus === 'in_transit') {
            return 'Scheduled';
        } else if (allocationStatus === 'completed') {
            return 'Completed';
        } else if (allocationStatus === 'cancelled') {
            return 'Cancelled';
        }
    }

    return allocationStatus || 'Scheduled';
}

// Helper function to get status color (journey-based)
function getStatusColor(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;

    // Priority: Bulk journey > Lions journey > Allocation status
    if (bulkJourney) {
        if (bulkJourney.status === 'arrived') {
            return "bg-emerald-50 text-emerald-700 border-emerald-200"; // Checked in at Bulk
        } else if (bulkJourney.status === 'departed') {
            return "bg-purple-50 text-purple-700 border-purple-200"; // Departed from Bulk
        }
    } else if (lionsJourney) {
        if (lionsJourney.status === 'arrived') {
            return "bg-blue-50 text-blue-700 border-blue-200"; // Staging at Lions
        } else if (lionsJourney.status === 'departed') {
            return "bg-amber-50 text-amber-700 border-amber-200"; // In transit to Bulk
        }
    }

    // Default: Scheduled or unknown
    return "bg-slate-50 text-slate-700 border-slate-200";
}

// Helper function to get the most relevant timestamp to display
function getDisplayTimestamp(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;

    // Priority: Use the most recent journey timestamp
    if (bulkJourney?.timestamp) {
        return new Date(bulkJourney.timestamp);
    } else if (lionsJourney?.timestamp) {
        return new Date(lionsJourney.timestamp);
    } else if (allocation.scheduledDate) {
        return new Date(allocation.scheduledDate);
    }
    return null;
}

// Helper function to format timestamp with date and time
function formatTimestamp(date: Date | null) {
    if (!date) return 'N/A';
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
}

export default function ClientWeighbridgePage() {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        customer: "",
        product: "",
        transporter: "",
        status: "",
        date: "",
        orderNumber: ""
    });

    useEffect(() => {
        fetchAllocations();
    }, []);

    const fetchAllocations = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch allocations
            const response = await fetch(`${API_BASE_URL}/truck-allocations`);
            if (!response.ok) throw new Error('Failed to fetch allocations');
            const data = await response.json();

            // Fetch journey data for both sites (Lions + Bulk)
            const lionsJourneyMap = new Map();
            const bulkJourneyMap = new Map();

            try {
                const [lionsJourneyResponse, bulkJourneyResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/site-journey/site/1/latest`),
                    fetch(`${API_BASE_URL}/site-journey/site/2/latest`)
                ]);

                if (lionsJourneyResponse.ok) {
                    const lionsJourneyData = await lionsJourneyResponse.json();
                    if (lionsJourneyData?.success && lionsJourneyData.data) {
                        lionsJourneyData.data.forEach((journey: any) => {
                            lionsJourneyMap.set(journey.allocationId, journey);
                        });
                    }
                }

                if (bulkJourneyResponse.ok) {
                    const bulkJourneyData = await bulkJourneyResponse.json();
                    if (bulkJourneyData?.success && bulkJourneyData.data) {
                        bulkJourneyData.data.forEach((journey: any) => {
                            bulkJourneyMap.set(journey.allocationId, journey);
                        });
                    }
                }
            } catch (journeyError) {
                console.warn('Journey data fetch failed (non-critical):', journeyError);
            }

            // Merge journey data with allocations
            const allocationsWithJourney = (data.data || []).map((allocation: any) => {
                const lionsJourney = lionsJourneyMap.get(allocation.id);
                const bulkJourney = bulkJourneyMap.get(allocation.id);

                return {
                    ...allocation,
                    lionsJourney,
                    bulkJourney,
                };
            });

            setAllocations(allocationsWithJourney);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter options
    const customerOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.customer).filter(Boolean))).sort(),
        [allocations]
    );
    const productOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.product).filter(Boolean))).sort(),
        [allocations]
    );
    const transporterOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.transporter).filter(Boolean))).sort(),
        [allocations]
    );
    const orderNumberOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.orderNumber).filter(Boolean))).sort(),
        [allocations]
    );

    // Filtered allocations
    const filteredAllocations = useMemo(() => {
        return allocations.filter((allocation: any) => {
            const matchesSearch = !searchTerm ||
                allocation.vehicleReg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                allocation.ticketNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                allocation.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                allocation.customer?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCustomer = !filters.customer || allocation.customer === filters.customer;
            const matchesProduct = !filters.product || allocation.product === filters.product;
            const matchesTransporter = !filters.transporter || allocation.transporter === filters.transporter;
            const matchesStatus = !filters.status || allocation.status === filters.status;
            const matchesOrderNumber = !filters.orderNumber || allocation.orderNumber === filters.orderNumber;
            const matchesDate = !filters.date || (allocation.scheduledDate &&
                new Date(allocation.scheduledDate).toISOString().split('T')[0] === filters.date);

            return matchesSearch && matchesCustomer && matchesProduct && matchesTransporter && matchesStatus && matchesOrderNumber && matchesDate;
        });
    }, [allocations, searchTerm, filters]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalWeight = filteredAllocations.reduce((sum: number, a: any) =>
            sum + (parseFloat(a.netWeight) || 0), 0
        );
        const uniqueCustomers = new Set(filteredAllocations.map((a: any) => a.customer).filter(Boolean)).size;

        return {
            totalTransactions: filteredAllocations.length,
            totalWeight: (totalWeight / 1000).toFixed(2), // Convert kg to tons
            uniqueCustomers
        };
    }, [filteredAllocations]);

    const clearFilters = () => {
        setFilters({ customer: "", product: "", transporter: "", status: "", date: "", orderNumber: "" });
        setSearchTerm("");
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== "") || searchTerm !== "";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Client Weighbridge (External)</h1>
                    <p className="text-slate-500">Mine weighbridge tickets and client allocations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAllocations}
                        className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Allocations</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalTransactions}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <Scale className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Net Weight</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalWeight} t</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Active Customers</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.uniqueCustomers}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tickets, vehicles, orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <CustomSelect
                        label="Customer"
                        value={filters.customer}
                        onChange={(val) => setFilters({ ...filters, customer: val })}
                        options={customerOptions as string[]}
                        placeholder="All Customers"
                    />
                    <CustomSelect
                        label="Product"
                        value={filters.product}
                        onChange={(val) => setFilters({ ...filters, product: val })}
                        options={productOptions as string[]}
                        placeholder="All Products"
                    />
                    <CustomSelect
                        label="Transporter"
                        value={filters.transporter}
                        onChange={(val) => setFilters({ ...filters, transporter: val })}
                        options={transporterOptions as string[]}
                        placeholder="All Transporters"
                    />
                    <CustomSelect
                        label="Order Number"
                        value={filters.orderNumber}
                        onChange={(val) => setFilters({ ...filters, orderNumber: val })}
                        options={orderNumberOptions as string[]}
                        placeholder="All Orders"
                    />
                    <CustomSelect
                        label="Status"
                        value={filters.status}
                        onChange={(val) => setFilters({ ...filters, status: val })}
                        options={["scheduled", "in_transit", "arrived", "weighing", "completed", "cancelled"]}
                        placeholder="All Statuses"
                    />
                    <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm p-3 hover:border-slate-300 transition-colors">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
                        <input
                            type="date"
                            className="w-full text-sm font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer min-h-[20px] font-sans"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        />
                    </div>
                    {hasActiveFilters && (
                        <div className="flex items-center justify-center">
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap border shadow-sm h-full bg-white text-red-600 hover:bg-red-50 border-red-100 hover:border-red-200"
                            >
                                <span>Clear Filters</span>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">Ticket No</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Vehicle</th>
                            <th className="px-6 py-4">Transporter</th>
                            <th className="px-6 py-4">Product</th>
                            <th className="px-6 py-4 text-right">Gross</th>
                            <th className="px-6 py-4 text-right">Tare</th>
                            <th className="px-6 py-4 text-right">Net</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4">Order No</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Loading allocations...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={10} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                        ) : filteredAllocations.length === 0 ? (
                            <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">No allocations found</td></tr>
                        ) : filteredAllocations.map((allocation: any) => (
                            <tr key={allocation.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-blue-600">{allocation.ticketNo || 'N/A'}</div>
                                    <div className="text-xs text-slate-400">
                                        {formatTimestamp(getDisplayTimestamp(allocation))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">{allocation.customer || 'N/A'}</td>
                                <td className="px-6 py-4"><span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{allocation.vehicleReg || 'N/A'}</span></td>
                                <td className="px-6 py-4 text-slate-600">{allocation.transporter || 'N/A'}</td>
                                <td className="px-6 py-4 text-slate-600">{allocation.product || 'N/A'}</td>
                                <td className="px-6 py-4 text-right font-mono text-sm text-slate-700">
                                    {allocation.grossWeight ? `${parseFloat(allocation.grossWeight).toLocaleString()} kg` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-sm text-slate-700">
                                    {allocation.tareWeight ? `${parseFloat(allocation.tareWeight).toLocaleString()} kg` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-green-700">
                                    {allocation.netWeight ? `${parseFloat(allocation.netWeight).toLocaleString()} kg` : '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                        getStatusColor(allocation)
                                    )}>
                                        {(allocation.status === 'completed' || allocation.status === 'departed') ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        <span>{getDisplayStatus(allocation)}</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-500">{allocation.orderNumber || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
