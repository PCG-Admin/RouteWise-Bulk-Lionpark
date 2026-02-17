"use client";

import { Search, RefreshCw, CheckCircle2, Clock, TrendingUp, Scale, X, ChevronDown, Edit, Save } from "lucide-react";
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

function getDisplayStatus(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;
    const allocationStatus = allocation.status?.toLowerCase();

    if (bulkJourney) {
        if (bulkJourney.status === 'arrived') return 'Checked In at Bulk';
        if (bulkJourney.status === 'departed') return 'Departed from Bulk';
    } else if (lionsJourney) {
        if (lionsJourney.status === 'arrived') return 'Staging at Lions Park';
        if (lionsJourney.status === 'departed') return 'In Transit to Bulk';
    } else {
        if (allocationStatus === 'scheduled' || allocationStatus === 'in_transit') return 'Scheduled';
        if (allocationStatus === 'completed') return 'Completed';
        if (allocationStatus === 'cancelled') return 'Cancelled';
    }
    return allocationStatus || 'Scheduled';
}

function getStatusColor(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;

    if (bulkJourney) {
        if (bulkJourney.status === 'arrived') return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (bulkJourney.status === 'departed') return "bg-purple-50 text-purple-700 border-purple-200";
    } else if (lionsJourney) {
        if (lionsJourney.status === 'arrived') return "bg-blue-50 text-blue-700 border-blue-200";
        if (lionsJourney.status === 'departed') return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
}

function getDisplayTimestamp(allocation: any) {
    const lionsJourney = allocation.lionsJourney;
    const bulkJourney = allocation.bulkJourney;
    if (bulkJourney?.timestamp) return new Date(bulkJourney.timestamp);
    if (lionsJourney?.timestamp) return new Date(lionsJourney.timestamp);
    if (allocation.scheduledDate) return new Date(allocation.scheduledDate);
    return null;
}

function formatTimestamp(date: Date | null) {
    if (!date) return 'N/A';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function OrdersReceivedPage() {
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

    // Edit state
    const [editingAllocation, setEditingAllocation] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchAllocations();
    }, []);

    const fetchAllocations = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/truck-allocations`);
            if (!response.ok) throw new Error('Failed to fetch allocations');
            const data = await response.json();

            const lionsJourneyMap = new Map();
            const bulkJourneyMap = new Map();

            try {
                const [lionsRes, bulkRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/site-journey/site/1/latest`),
                    fetch(`${API_BASE_URL}/site-journey/site/2/latest`)
                ]);
                if (lionsRes.ok) {
                    const d = await lionsRes.json();
                    if (d?.success && d.data) d.data.forEach((j: any) => lionsJourneyMap.set(j.allocationId, j));
                }
                if (bulkRes.ok) {
                    const d = await bulkRes.json();
                    if (d?.success && d.data) d.data.forEach((j: any) => bulkJourneyMap.set(j.allocationId, j));
                }
            } catch (e) {
                console.warn('Journey fetch failed (non-critical):', e);
            }

            const enriched = (data.data || []).map((a: any) => ({
                ...a,
                lionsJourney: lionsJourneyMap.get(a.id),
                bulkJourney: bulkJourneyMap.get(a.id),
            }));
            setAllocations(enriched);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter options
    const customerOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.customer).filter(Boolean))).sort() as string[],
        [allocations]
    );
    const productOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.product).filter(Boolean))).sort() as string[],
        [allocations]
    );
    const transporterOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.transporter).filter(Boolean))).sort() as string[],
        [allocations]
    );
    const orderNumberOptions = useMemo(() =>
        Array.from(new Set(allocations.map((a: any) => a.orderNumber).filter(Boolean))).sort() as string[],
        [allocations]
    );

    const filteredAllocations = useMemo(() => {
        return allocations.filter((a: any) => {
            const matchesSearch = !searchTerm ||
                a.vehicleReg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.ticketNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.driverName?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCustomer = !filters.customer || a.customer === filters.customer;
            const matchesProduct = !filters.product || a.product === filters.product;
            const matchesTransporter = !filters.transporter || a.transporter === filters.transporter;
            const matchesStatus = !filters.status || a.status === filters.status;
            const matchesOrderNumber = !filters.orderNumber || a.orderNumber === filters.orderNumber;
            const matchesDate = !filters.date || (a.scheduledDate &&
                new Date(a.scheduledDate).toISOString().split('T')[0] === filters.date);

            return matchesSearch && matchesCustomer && matchesProduct && matchesTransporter && matchesStatus && matchesOrderNumber && matchesDate;
        });
    }, [allocations, searchTerm, filters]);

    const stats = useMemo(() => {
        const totalWeight = filteredAllocations.reduce((sum: number, a: any) =>
            sum + (parseFloat(a.netWeight) || 0), 0
        );
        const uniqueCustomers = new Set(filteredAllocations.map((a: any) => a.customer).filter(Boolean)).size;
        return {
            totalAllocations: filteredAllocations.length,
            totalWeight: (totalWeight / 1000).toFixed(2),
            uniqueCustomers
        };
    }, [filteredAllocations]);

    const clearFilters = () => {
        setFilters({ customer: "", product: "", transporter: "", status: "", date: "", orderNumber: "" });
        setSearchTerm("");
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== "") || searchTerm !== "";

    // Edit handlers
    const openEdit = (allocation: any) => {
        setEditingAllocation(allocation);
        setEditForm({
            vehicleReg: allocation.vehicleReg || '',
            driverName: allocation.driverName || '',
            transporter: allocation.transporter || '',
            scheduledDate: allocation.scheduledDate ? new Date(allocation.scheduledDate).toISOString().split('T')[0] : '',
            netWeight: allocation.netWeight || '',
            grossWeight: allocation.grossWeight || '',
            tareWeight: allocation.tareWeight || '',
            notes: allocation.notes || '',
        });
        setSaveMessage(null);
    };

    const closeEdit = () => {
        setEditingAllocation(null);
        setEditForm({});
        setSaveMessage(null);
    };

    const handleSave = async () => {
        if (!editingAllocation) return;
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const response = await fetch(`${API_BASE_URL}/truck-allocations/${editingAllocation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const result = await response.json();
            if (result.success) {
                setSaveMessage({ type: 'success', text: 'Allocation updated successfully. Changes are reflected across both systems.' });
                await fetchAllocations();
                setTimeout(() => closeEdit(), 1500);
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Failed to update allocation' });
            }
        } catch (err: any) {
            setSaveMessage({ type: 'error', text: 'Network error while saving' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Edit Modal */}
            {editingAllocation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Edit Allocation</h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {editingAllocation.vehicleReg} — {editingAllocation.orderNumber}
                                    {editingAllocation.scheduledDate && ` — ${new Date(editingAllocation.scheduledDate).toLocaleDateString()}`}
                                </p>
                            </div>
                            <button onClick={closeEdit} className="p-2 hover:bg-slate-100 rounded-lg transition">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {saveMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                    {saveMessage.text}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Vehicle Reg</label>
                                    <input type="text" value={editForm.vehicleReg} onChange={e => setEditForm({ ...editForm, vehicleReg: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Driver Name</label>
                                    <input type="text" value={editForm.driverName} onChange={e => setEditForm({ ...editForm, driverName: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Transporter</label>
                                    <input type="text" value={editForm.transporter} onChange={e => setEditForm({ ...editForm, transporter: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Customer <span className="text-slate-400 normal-case font-normal">(from order)</span></label>
                                    <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">{editingAllocation.customer || 'N/A'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Product <span className="text-slate-400 normal-case font-normal">(from order)</span></label>
                                    <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">{editingAllocation.product || 'N/A'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Scheduled Date</label>
                                    <input type="date" value={editForm.scheduledDate} onChange={e => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Gross Weight (kg)</label>
                                    <input type="number" value={editForm.grossWeight} onChange={e => setEditForm({ ...editForm, grossWeight: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tare Weight (kg)</label>
                                    <input type="number" value={editForm.tareWeight} onChange={e => setEditForm({ ...editForm, tareWeight: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Net Weight (kg)</label>
                                    <input type="number" value={editForm.netWeight} onChange={e => setEditForm({ ...editForm, netWeight: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Notes</label>
                                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                            <button onClick={closeEdit} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm font-medium">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isSaving}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                                {isSaving ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                                ) : (
                                    <><Save className="w-4 h-4" /><span>Save Changes</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Orders Received</h1>
                    <p className="text-slate-500">All truck allocations across active orders</p>
                </div>
                <button
                    onClick={fetchAllocations}
                    className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm"
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Allocations</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalAllocations}</p>
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
                        placeholder="Search by vehicle, ticket, order, customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <CustomSelect label="Customer" value={filters.customer} onChange={(val) => setFilters({ ...filters, customer: val })} options={customerOptions} placeholder="All Customers" />
                    <CustomSelect label="Product" value={filters.product} onChange={(val) => setFilters({ ...filters, product: val })} options={productOptions} placeholder="All Products" />
                    <CustomSelect label="Transporter" value={filters.transporter} onChange={(val) => setFilters({ ...filters, transporter: val })} options={transporterOptions} placeholder="All Transporters" />
                    <CustomSelect label="Order Number" value={filters.orderNumber} onChange={(val) => setFilters({ ...filters, orderNumber: val })} options={orderNumberOptions} placeholder="All Orders" />
                    <CustomSelect label="Status" value={filters.status} onChange={(val) => setFilters({ ...filters, status: val })} options={["scheduled", "in_transit", "arrived", "weighing", "completed", "cancelled"]} placeholder="All Statuses" />
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
                            <button onClick={clearFilters}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap border shadow-sm h-full bg-white text-red-600 hover:bg-red-50 border-red-100 hover:border-red-200">
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
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                                Loading allocations...
                            </td></tr>
                        ) : error ? (
                            <tr><td colSpan={11} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                        ) : filteredAllocations.length === 0 ? (
                            <tr><td colSpan={11} className="px-6 py-12 text-center text-slate-400">No allocations found</td></tr>
                        ) : filteredAllocations.map((allocation: any) => (
                            <tr key={allocation.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-blue-600">{allocation.ticketNo || 'N/A'}</div>
                                    <div className="text-xs text-slate-400">{formatTimestamp(getDisplayTimestamp(allocation))}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">{allocation.customer || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="font-mono text-sm bg-slate-100 px-2 py-1 rounded inline-block">{allocation.vehicleReg || 'N/A'}</div>
                                    {allocation.driverName && <div className="text-xs text-slate-400 mt-1">{allocation.driverName}</div>}
                                </td>
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
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => openEdit(allocation)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
