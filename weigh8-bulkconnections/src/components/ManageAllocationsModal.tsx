"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, CheckCircle, Loader2, Truck, AlertCircle, Search, Weight } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

interface Allocation {
    id: number;
    vehicleReg: string;
    driverName: string | null;
    driverPhone: string | null;
    driverId: string | null;
    transporter: string | null;
    scheduledDate: string | null;
    grossWeight: string | null;
    tareWeight: string | null;
    netWeight: string | null;
    ticketNo: string | null;
    status: string;
    driverValidationStatus: string | null;
    notes: string | null;
}

interface Props {
    order: { id: number; orderNumber: string };
    onClose: () => void;
    onSuccess: () => void;
}

const emptyNewRow = () => ({
    vehicleReg: "",
    driverName: "",
    driverPhone: "",
    driverId: "",
    transporter: "",
    scheduledDate: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
    ticketNo: "",
    notes: "",
});

export default function ManageAllocationsModal({ order, onClose, onSuccess }: Props) {
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<Partial<Allocation>>({});
    const [showAddRow, setShowAddRow] = useState(false);
    const [newRow, setNewRow] = useState(emptyNewRow());
    const [savingId, setSavingId] = useState<number | "new" | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    const fetchAllocations = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE_URL}/truck-allocations/${order.id}`, { credentials: 'include' });
            const result = await res.json();
            setAllocations(result.success ? result.data : []);
        } catch {
            setError("Failed to load allocations");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAllocations(); }, []);

    const startEdit = (alloc: Allocation) => {
        setEditingId(alloc.id);
        setEditRow({
            vehicleReg: alloc.vehicleReg,
            driverName: alloc.driverName || "",
            driverPhone: alloc.driverPhone || "",
            driverId: alloc.driverId || "",
            transporter: alloc.transporter || "",
            scheduledDate: alloc.scheduledDate
                ? new Date(alloc.scheduledDate).toISOString().split("T")[0]
                : "",
            grossWeight: alloc.grossWeight || "",
            tareWeight: alloc.tareWeight || "",
            netWeight: alloc.netWeight || "",
            ticketNo: alloc.ticketNo || "",
            notes: alloc.notes || "",
        });
    };

    const cancelEdit = () => { setEditingId(null); setEditRow({}); };

    const saveEdit = async (id: number) => {
        setSavingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/truck-allocations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(editRow),
            });
            const result = await res.json();
            if (result.success) {
                await fetchAllocations();
                setEditingId(null);
                onSuccess();
            } else {
                setError(result.error || "Failed to update");
            }
        } catch {
            setError("Network error");
        } finally {
            setSavingId(null);
        }
    };

    const deleteAllocation = async (id: number, plate: string) => {
        if (!confirm(`Delete allocation for ${plate}?`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/truck-allocations/${id}`, { method: "DELETE", credentials: 'include' });
            const result = await res.json();
            if (result.success) {
                await fetchAllocations();
                onSuccess();
            } else {
                setError(result.error || "Failed to delete");
            }
        } catch {
            setError("Network error");
        } finally {
            setDeletingId(null);
        }
    };

    const addAllocation = async () => {
        if (!newRow.vehicleReg.trim()) {
            setError("Plate / Reg is required");
            return;
        }
        setSavingId("new");
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/truck-allocations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    orderId: order.id,
                    vehicleReg: newRow.vehicleReg.trim().toUpperCase(),
                    driverName: newRow.driverName || undefined,
                    driverPhone: newRow.driverPhone || undefined,
                    driverId: newRow.driverId || undefined,
                    transporter: newRow.transporter || undefined,
                    scheduledDate: newRow.scheduledDate || undefined,
                    grossWeight: newRow.grossWeight || undefined,
                    tareWeight: newRow.tareWeight || undefined,
                    netWeight: newRow.netWeight || undefined,
                    ticketNo: newRow.ticketNo || undefined,
                    notes: newRow.notes || undefined,
                }),
            });
            const result = await res.json();
            if (result.success) {
                await fetchAllocations();
                setNewRow(emptyNewRow());
                setShowAddRow(false);
                onSuccess();
            } else {
                setError(result.error || "Failed to add");
            }
        } catch {
            setError("Network error");
        } finally {
            setSavingId(null);
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            scheduled: "bg-blue-50 text-blue-700",
            in_transit: "bg-amber-50 text-amber-700",
            arrived: "bg-green-50 text-green-700",
            completed: "bg-purple-50 text-purple-700",
            cancelled: "bg-red-50 text-red-700",
        };
        return map[status] || "bg-slate-50 text-slate-600";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Manage Truck Allocations</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Order: {order.orderNumber}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by plate, driver, transporter, ticket..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">

                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-slate-500 text-sm">Loading allocations...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Existing allocations */}
                            {allocations.length === 0 && !showAddRow && (
                                <div className="text-center py-12">
                                    <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">No truck allocations yet.</p>
                                </div>
                            )}

                            {allocations.filter(a => {
                                if (!search.trim()) return true;
                                const q = search.trim().toLowerCase();
                                return [a.vehicleReg, a.driverName, a.transporter, a.ticketNo, a.driverPhone, a.driverId]
                                    .filter(Boolean).join(' ').toLowerCase().includes(q);
                            }).map(alloc => (
                                <div key={alloc.id} className={`border rounded-xl p-4 ${editingId === alloc.id ? "border-blue-300 bg-blue-50/30" : "border-slate-200 bg-white"}`}>
                                    {editingId === alloc.id ? (
                                        /* Edit mode */
                                        <div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                                                {[
                                                    { field: "vehicleReg", label: "Plate *", mono: true, upper: true },
                                                    { field: "driverName", label: "Driver Name" },
                                                    { field: "driverPhone", label: "Driver Phone" },
                                                    { field: "driverId", label: "Driver ID" },
                                                    { field: "transporter", label: "Transporter" },
                                                    { field: "scheduledDate", label: "Scheduled Date", type: "date" },
                                                    { field: "ticketNo", label: "Ticket No" },
                                                    { field: "grossWeight", label: "Gross Weight (kg)", type: "number" },
                                                    { field: "tareWeight", label: "Tare Weight (kg)", type: "number" },
                                                    { field: "netWeight", label: "Net Weight (kg)", type: "number" },
                                                    { field: "notes", label: "Notes", span: 2 },
                                                ].map(f => (
                                                    <div key={f.field} className={f.span ? `col-span-${f.span}` : ""}>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                                                        <input
                                                            type={f.type || "text"}
                                                            value={(editRow as any)[f.field] || ""}
                                                            onChange={e => setEditRow(prev => ({ ...prev, [f.field]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                                                            className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${f.mono ? "font-mono uppercase" : ""}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                                                <button onClick={() => saveEdit(alloc.id)} disabled={savingId === alloc.id}
                                                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                                                    {savingId === alloc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View mode */
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Top row: plate + status */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-block px-2.5 py-1 border border-slate-300 rounded text-xs font-bold font-mono bg-white text-slate-900 shadow-sm">
                                                        {alloc.vehicleReg}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(alloc.status)}`}>
                                                        {alloc.status?.toUpperCase()}
                                                    </span>
                                                    {alloc.ticketNo && (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">#{alloc.ticketNo}</span>
                                                    )}
                                                </div>
                                                {/* Info row */}
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                    {alloc.driverName && <span>Driver: <span className="text-slate-700 font-medium">{alloc.driverName}</span></span>}
                                                    {alloc.transporter && <span>Transporter: <span className="text-slate-700 font-medium">{alloc.transporter}</span></span>}
                                                    {alloc.scheduledDate && <span>Scheduled: <span className="text-slate-700 font-medium">{new Date(alloc.scheduledDate).toLocaleDateString()}</span></span>}
                                                    {alloc.driverPhone && <span>Phone: <span className="text-slate-700">{alloc.driverPhone}</span></span>}
                                                </div>
                                                {/* Weight row */}
                                                {(alloc.grossWeight || alloc.tareWeight || alloc.netWeight) && (
                                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                                                        {alloc.grossWeight && (
                                                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                                <span className="font-semibold text-slate-600">G:</span>
                                                                <span className="font-medium text-slate-800">{parseFloat(alloc.grossWeight).toLocaleString()} kg</span>
                                                            </span>
                                                        )}
                                                        {alloc.tareWeight && (
                                                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                                <span className="font-semibold text-slate-600">T:</span>
                                                                <span className="font-medium text-slate-800">{parseFloat(alloc.tareWeight).toLocaleString()} kg</span>
                                                            </span>
                                                        )}
                                                        {alloc.netWeight && (
                                                            <span className="flex items-center gap-1 text-[11px]">
                                                                <span className="font-semibold text-green-600">N:</span>
                                                                <span className="font-bold text-green-700">{parseFloat(alloc.netWeight).toLocaleString()} kg</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => startEdit(alloc)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteAllocation(alloc.id, alloc.vehicleReg)}
                                                    disabled={deletingId === alloc.id}
                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                                                    {deletingId === alloc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add row */}
                            {showAddRow && (
                                <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/30">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">New Truck</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                                        {[
                                            { field: "vehicleReg", label: "Plate *", mono: true, upper: true },
                                            { field: "driverName", label: "Driver Name" },
                                            { field: "driverPhone", label: "Driver Phone" },
                                            { field: "driverId", label: "Driver ID" },
                                            { field: "transporter", label: "Transporter" },
                                            { field: "scheduledDate", label: "Scheduled Date", type: "date" },
                                            { field: "ticketNo", label: "Ticket No" },
                                            { field: "grossWeight", label: "Gross Weight (kg)", type: "number" },
                                            { field: "tareWeight", label: "Tare Weight (kg)", type: "number" },
                                            { field: "netWeight", label: "Net Weight (kg)", type: "number" },
                                            { field: "notes", label: "Notes", span: 2 },
                                        ].map(f => (
                                            <div key={f.field} className={f.span ? `col-span-${f.span}` : ""}>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                                                <input
                                                    type={f.type || "text"}
                                                    value={(newRow as any)[f.field] || ""}
                                                    onChange={e => setNewRow(prev => ({ ...prev, [f.field]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                                                    className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${f.mono ? "font-mono uppercase" : ""}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => { setShowAddRow(false); setNewRow(emptyNewRow()); setError(null); }}
                                            className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">
                                            Cancel
                                        </button>
                                        <button onClick={addAllocation} disabled={savingId === "new"}
                                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                                            {savingId === "new" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                            Add Truck
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 p-6 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {search.trim()
                            ? `${allocations.filter(a => { const q = search.trim().toLowerCase(); return [a.vehicleReg, a.driverName, a.transporter, a.ticketNo, a.driverPhone, a.driverId].filter(Boolean).join(' ').toLowerCase().includes(q); }).length} of ${allocations.length} trucks`
                            : `${allocations.length} truck${allocations.length !== 1 ? "s" : ""} allocated`}
                    </p>
                    <div className="flex gap-3">
                        {!showAddRow && (
                            <button onClick={() => { setShowAddRow(true); setError(null); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                                <Plus className="w-4 h-4" /> Add Truck
                            </button>
                        )}
                        <button onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
