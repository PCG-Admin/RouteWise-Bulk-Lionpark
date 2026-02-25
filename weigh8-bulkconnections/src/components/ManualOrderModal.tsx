"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, CheckCircle, Loader2, AlertCircle, Building2, Users, UserCheck } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");
const SITE_ID = 2; // Bulk Connections — always pull master data from this site

// ─── Types ────────────────────────────────────────────────────────────────────
interface AllocationRow {
    id: string;
    vehicleReg: string;
    transporterId: string;    // FK for filtering drivers
    transporter: string;      // name for submission
    driverRecordId: string;   // FK driver
    driverName: string;       // name for submission
    driverPhone: string;
    driverId: string;         // ID number
    scheduledDate: string;
    ticketNo: string;
    grossWeight: string;
    tareWeight: string;
    netWeight: string;
    notes: string;
}

interface MasterOption { id: number; name?: string; firstName?: string; lastName?: string; phone?: string | null; email?: string | null; transporterId?: number | null; }

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Quick-add popup form ──────────────────────────────────────────────────────
type QuickAddType = "client" | "transporter" | "driver";

interface QuickAddState {
    type: QuickAddType;
    saving: boolean;
    error: string | null;
    transporters: MasterOption[]; // needed for driver form
}

function QuickAddModal({
    type,
    transporters,
    onSave,
    onClose,
}: {
    type: QuickAddType;
    transporters: MasterOption[];
    onSave: (created: any) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    const f = (k: string) => form[k] || "";

    const handleSave = async () => {
        setError(null);
        let url = "";
        let body: Record<string, any> = {};

        if (type === "client") {
            if (!f("name").trim()) { setError("Company name is required"); return; }
            url = `${API_BASE_URL}/clients`;
            body = { name: f("name"), code: f("code") || undefined, contactPerson: f("contactPerson") || undefined, phone: f("phone") || undefined, email: f("email") || undefined, siteId: SITE_ID };
        } else if (type === "transporter") {
            if (!f("name").trim()) { setError("Company name is required"); return; }
            url = `${API_BASE_URL}/transporters`;
            body = { name: f("name"), code: f("code") || undefined, contactPerson: f("contactPerson") || undefined, phone: f("phone") || undefined, email: f("email") || undefined, siteId: SITE_ID };
        } else if (type === "driver") {
            if (!f("firstName").trim() || !f("lastName").trim()) { setError("First and last name are required"); return; }
            url = `${API_BASE_URL}/drivers`;
            body = { firstName: f("firstName"), lastName: f("lastName"), phone: f("phone") || undefined, idNumber: f("idNumber") || undefined, licenseNumber: f("licenseNumber") || undefined, transporterId: f("transporterId") ? parseInt(f("transporterId")) : undefined };
        }

        setSaving(true);
        try {
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: 'include', body: JSON.stringify(body) });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || "Failed to create");
            onSave(result.data);
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const titles: Record<QuickAddType, string> = { client: "Add New Client / Trader", transporter: "Add New Transporter", driver: "Add New Driver" };
    const icons: Record<QuickAddType, React.ReactNode> = {
        client: <Building2 className="w-5 h-5 text-blue-600" />,
        transporter: <Building2 className="w-5 h-5 text-emerald-600" />,
        driver: <UserCheck className="w-5 h-5 text-purple-600" />,
    };
    const colors: Record<QuickAddType, string> = { client: "bg-blue-50", transporter: "bg-emerald-50", driver: "bg-purple-50" };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className={`flex items-center gap-3 p-5 border-b border-slate-200 ${colors[type]}`}>
                    <div className="p-2 bg-white rounded-xl shadow-sm">{icons[type]}</div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-900">{titles[type]}</h3>
                        <p className="text-xs text-slate-500">Will be saved to Bulk Connections records</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {(type === "client" || type === "transporter") && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={f("name")} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={type === "client" ? "e.g. Anglo American" : "e.g. FastFreight Ltd"} autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                                    <input className={inputCls} value={f("code")} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder={type === "client" ? "CLT-001" : "TRP-001"} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
                                    <input className={inputCls} value={f("contactPerson")} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="John Smith" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                                    <input className={inputCls} value={f("phone")} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27 11 000 0000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                                    <input className={inputCls} type="email" value={f("email")} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ops@company.com" />
                                </div>
                            </div>
                        </>
                    )}

                    {type === "driver" && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">First Name <span className="text-red-500">*</span></label>
                                    <input className={inputCls} value={f("firstName")} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="John" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                                    <input className={inputCls} value={f("lastName")} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                                    <input className={inputCls} value={f("phone")} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0812345678" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ID Number</label>
                                    <input className={inputCls} value={f("idNumber")} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} placeholder="8001015009087" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">License Number</label>
                                <input className={inputCls} value={f("licenseNumber")} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="DL-12345" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Transporter</label>
                                <select className={inputCls} value={f("transporterId")} onChange={e => setForm(p => ({ ...p, transporterId: e.target.value }))}>
                                    <option value="">— Not assigned —</option>
                                    {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 pb-5">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Add & Select</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── SmartSelect: dropdown with "Add New" option ──────────────────────────────
function SmartSelect({
    label,
    value,
    options,
    placeholder,
    onSelect,
    onAddNew,
    disabled,
    addNewLabel,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    placeholder: string;
    onSelect: (value: string) => void;
    onAddNew: () => void;
    disabled?: boolean;
    addNewLabel?: string;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
            <select
                value={value}
                onChange={e => {
                    if (e.target.value === "__add_new__") { onAddNew(); return; }
                    onSelect(e.target.value);
                }}
                disabled={disabled}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value="__add_new__" className="text-blue-600 font-semibold">➕ {addNewLabel || "Add New..."}</option>
            </select>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyAllocation = (): AllocationRow => ({
    id: crypto.randomUUID(),
    vehicleReg: "", transporterId: "", transporter: "",
    driverRecordId: "", driverName: "", driverPhone: "", driverId: "",
    scheduledDate: "", ticketNo: "",
    grossWeight: "", tareWeight: "", netWeight: "", notes: "",
});

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function ManualOrderModal({ onClose, onSuccess }: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Master data
    const [clients, setClients] = useState<MasterOption[]>([]);
    const [transporters, setTransporters] = useState<MasterOption[]>([]);
    const [drivers, setDrivers] = useState<MasterOption[]>([]);

    // Quick-add
    const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; forAllocationId?: string } | null>(null);

    // Order fields
    const [order, setOrder] = useState({
        orderNumber: "", product: "", clientId: "", clientName: "",
        quantity: "", unit: "tons", status: "pending", priority: "normal",
        originAddress: "", destinationAddress: "", requestedPickupDate: "",
        requestedDeliveryDate: "", notes: "", destinationSiteId: "1",
    });

    const [allocations, setAllocations] = useState<AllocationRow[]>([emptyAllocation()]);

    // Fetch master data on mount
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [cRes, tRes, dRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/clients?siteId=${SITE_ID}`, { credentials: 'include' }),
                    fetch(`${API_BASE_URL}/transporters?siteId=${SITE_ID}`, { credentials: 'include' }),
                    fetch(`${API_BASE_URL}/drivers?siteId=${SITE_ID}`, { credentials: 'include' }),
                ]);
                const [cData, tData, dData] = await Promise.all([cRes.json(), tRes.json(), dRes.json()]);
                setClients(cData.success ? cData.data : []);
                setTransporters(tData.success ? tData.data : []);
                setDrivers(dData.success ? dData.data : []);
            } catch { /* silent */ }
        };
        fetchAll();
    }, []);

    const refreshMasterData = async () => {
        try {
            const [cRes, tRes, dRes] = await Promise.all([
                fetch(`${API_BASE_URL}/clients?siteId=${SITE_ID}`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/transporters?siteId=${SITE_ID}`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/drivers?siteId=${SITE_ID}`, { credentials: 'include' }),
            ]);
            const [cData, tData, dData] = await Promise.all([cRes.json(), tRes.json(), dRes.json()]);
            if (cData.success) setClients(cData.data);
            if (tData.success) setTransporters(tData.data);
            if (dData.success) setDrivers(dData.data);
        } catch { /* silent */ }
    };

    // Quick add save handler
    const handleQuickAddSave = async (created: any, type: QuickAddType, forAllocationId?: string) => {
        await refreshMasterData();
        setQuickAdd(null);

        if (type === "client") {
            setOrder(p => ({ ...p, clientId: String(created.id), clientName: created.name }));
        } else if (type === "transporter" && forAllocationId) {
            setAllocations(prev => prev.map(a =>
                a.id === forAllocationId
                    ? { ...a, transporterId: String(created.id), transporter: created.name, driverRecordId: "", driverName: "" }
                    : a
            ));
        } else if (type === "driver" && forAllocationId) {
            const d = created;
            setAllocations(prev => prev.map(a =>
                a.id === forAllocationId
                    ? { ...a, driverRecordId: String(d.id), driverName: `${d.firstName} ${d.lastName}`, driverPhone: d.phone || "", driverId: d.idNumber || "", transporterId: d.transporterId ? String(d.transporterId) : a.transporterId }
                    : a
            ));
        }
    };

    const updateOrder = (field: string, value: string) => setOrder(prev => ({ ...prev, [field]: value }));

    const updateAllocation = (id: string, fields: Partial<AllocationRow>) =>
        setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));

    const addAllocationRow = () => setAllocations(prev => [...prev, emptyAllocation()]);
    const removeAllocationRow = (id: string) => setAllocations(prev => prev.filter(a => a.id !== id));

    // Drivers filtered by selected transporter for each row
    const driversForTransporter = (transporterId: string) => {
        if (!transporterId) return drivers;
        return drivers.filter(d => d.transporterId != null && String(d.transporterId) === transporterId);
    };

    const handleSubmit = async () => {
        setError(null);
        if (!order.product.trim()) { setError("Product is required."); return; }

        const filledAllocations = allocations.filter(a => a.vehicleReg.trim());
        setIsSaving(true);
        try {
            const orderRes = await fetch(`${API_BASE_URL}/orders`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    ...order,
                    clientName: order.clientName || undefined,
                    orderNumber: order.orderNumber.trim() || undefined,
                }),
            });
            const orderResult = await orderRes.json();
            if (!orderResult.success) { setError(orderResult.error || "Failed to create order"); return; }

            const newOrderId = orderResult.data.id;
            for (const alloc of filledAllocations) {
                await fetch(`${API_BASE_URL}/truck-allocations`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify({
                        orderId: newOrderId,
                        vehicleReg: alloc.vehicleReg.trim().toUpperCase(),
                        transporter: alloc.transporter || undefined,
                        driverName: alloc.driverName || undefined,
                        driverPhone: alloc.driverPhone || undefined,
                        driverId: alloc.driverId || undefined,
                        scheduledDate: alloc.scheduledDate || undefined,
                        ticketNo: alloc.ticketNo || undefined,
                        grossWeight: alloc.grossWeight || undefined,
                        tareWeight: alloc.tareWeight || undefined,
                        netWeight: alloc.netWeight || undefined,
                        notes: alloc.notes || undefined,
                        siteId: order.destinationSiteId,
                    }),
                });
            }
            onSuccess();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name! }));
    const transporterOptions = transporters.map(t => ({ value: String(t.id), label: t.name! }));

    return (
        <>
            {/* Quick-add popup — rendered above the modal */}
            {quickAdd && (
                <QuickAddModal
                    type={quickAdd.type}
                    transporters={transporters}
                    onSave={(created) => handleQuickAddSave(created, quickAdd.type, quickAdd.forAllocationId)}
                    onClose={() => setQuickAdd(null)}
                />
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
                        <h2 className="text-xl font-bold text-slate-900">Create Order Manually</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* ── Order Details ── */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Order Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Order Number <span className="text-slate-400">(auto if blank)</span></label>
                                    <input type="text" value={order.orderNumber} onChange={e => updateOrder("orderNumber", e.target.value)} placeholder="ORD-001"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Product <span className="text-red-500">*</span></label>
                                    <input type="text" value={order.product} onChange={e => updateOrder("product", e.target.value)} placeholder="e.g. Coal"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>

                                {/* Client Dropdown */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Client</label>
                                    <select
                                        value={order.clientId}
                                        onChange={e => {
                                            if (e.target.value === "__add_new__") { setQuickAdd({ type: "client" }); return; }
                                            const selected = clients.find(c => String(c.id) === e.target.value);
                                            updateOrder("clientId", e.target.value);
                                            updateOrder("clientName", selected?.name || "");
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">— Select client —</option>
                                        {clientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        <option value="__add_new__" className="text-blue-600 font-semibold">➕ Add New Client...</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                                    <input type="number" value={order.quantity} onChange={e => updateOrder("quantity", e.target.value)} placeholder="0"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                                    <input type="text" value={order.unit} onChange={e => updateOrder("unit", e.target.value)} placeholder="tons"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                    <select value={order.status} onChange={e => updateOrder("status", e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="in_transit">In Transit</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                                    <select value={order.priority} onChange={e => updateOrder("priority", e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="urgent">Urgent</option>
                                        <option value="high">High</option>
                                        <option value="normal">Normal</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Pickup Date</label>
                                    <input type="date" value={order.requestedPickupDate} onChange={e => updateOrder("requestedPickupDate", e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Date</label>
                                    <input type="date" value={order.requestedDeliveryDate} onChange={e => updateOrder("requestedDeliveryDate", e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Origin Address</label>
                                    <input type="text" value={order.originAddress} onChange={e => updateOrder("originAddress", e.target.value)} placeholder="Mine site / pickup location"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="md:col-span-2 lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Address</label>
                                    <input type="text" value={order.destinationAddress} onChange={e => updateOrder("destinationAddress", e.target.value)} placeholder="Port / delivery location"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Site</label>
                                    <select value={order.destinationSiteId} onChange={e => updateOrder("destinationSiteId", e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="1">Lions Park</option>
                                        <option value="2">Bulk Connections</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                                    <textarea value={order.notes} onChange={e => updateOrder("notes", e.target.value)} rows={2} placeholder="Optional notes..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                        </section>

                        {/* ── Truck Allocations ── */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Truck Allocations <span className="text-slate-400 font-normal normal-case">({allocations.filter(a => a.vehicleReg.trim()).length} trucks)</span>
                                </h3>
                                <button onClick={addAllocationRow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                                    <Plus className="w-3.5 h-3.5" /> Add Truck
                                </button>
                            </div>

                            <div className="space-y-3">
                                {allocations.map((alloc, idx) => {
                                    const availableDrivers = driversForTransporter(alloc.transporterId);
                                    const driverOptions = availableDrivers.map(d => ({ value: String(d.id), label: `${d.firstName} ${d.lastName}` }));

                                    return (
                                        <div key={alloc.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Truck {idx + 1}</span>
                                                {allocations.length > 1 && (
                                                    <button onClick={() => removeAllocationRow(alloc.id)}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

                                                {/* Plate */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Plate / Reg <span className="text-red-400">*</span></label>
                                                    <input type="text" value={alloc.vehicleReg}
                                                        onChange={e => updateAllocation(alloc.id, { vehicleReg: e.target.value.toUpperCase() })}
                                                        placeholder="ABC123GP"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase" />
                                                </div>

                                                {/* Transporter Dropdown */}
                                                <SmartSelect
                                                    label="Transporter"
                                                    value={alloc.transporterId}
                                                    options={transporterOptions}
                                                    placeholder="— Select transporter —"
                                                    addNewLabel="Add New Transporter"
                                                    onSelect={val => {
                                                        const selected = transporters.find(t => String(t.id) === val);
                                                        updateAllocation(alloc.id, { transporterId: val, transporter: selected?.name || "", driverRecordId: "", driverName: "" });
                                                    }}
                                                    onAddNew={() => setQuickAdd({ type: "transporter", forAllocationId: alloc.id })}
                                                />

                                                {/* Driver Dropdown — filtered by transporter */}
                                                <SmartSelect
                                                    label={alloc.transporterId ? `Driver (${availableDrivers.length} available)` : "Driver"}
                                                    value={alloc.driverRecordId}
                                                    options={driverOptions}
                                                    placeholder={alloc.transporterId ? "— Select driver —" : "— Select transporter first —"}
                                                    addNewLabel="Add New Driver"
                                                    onSelect={val => {
                                                        const d = drivers.find(x => String(x.id) === val);
                                                        updateAllocation(alloc.id, {
                                                            driverRecordId: val,
                                                            driverName: d ? `${d.firstName} ${d.lastName}` : "",
                                                            driverPhone: d?.phone || "",
                                                            driverId: "",
                                                        });
                                                    }}
                                                    onAddNew={() => setQuickAdd({ type: "driver", forAllocationId: alloc.id })}
                                                />

                                                {/* Driver Phone (auto-filled, editable) */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Driver Phone</label>
                                                    <input type="text" value={alloc.driverPhone}
                                                        onChange={e => updateAllocation(alloc.id, { driverPhone: e.target.value })}
                                                        placeholder="0812345678"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>

                                                {/* Scheduled Date */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Scheduled Date</label>
                                                    <input type="date" value={alloc.scheduledDate}
                                                        onChange={e => updateAllocation(alloc.id, { scheduledDate: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>

                                                {/* Ticket No */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ticket No.</label>
                                                    <input type="text" value={alloc.ticketNo}
                                                        onChange={e => updateAllocation(alloc.id, { ticketNo: e.target.value })}
                                                        placeholder="TKT-001"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>

                                                {/* Weights */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gross Weight (kg)</label>
                                                    <input type="number" value={alloc.grossWeight}
                                                        onChange={e => updateAllocation(alloc.id, { grossWeight: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tare Weight (kg)</label>
                                                    <input type="number" value={alloc.tareWeight}
                                                        onChange={e => updateAllocation(alloc.id, { tareWeight: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Net Weight (kg)</label>
                                                    <input type="number" value={alloc.netWeight}
                                                        onChange={e => updateAllocation(alloc.id, { netWeight: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>

                                                {/* Notes */}
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                                                    <input type="text" value={alloc.notes}
                                                        onChange={e => updateAllocation(alloc.id, { notes: e.target.value })}
                                                        placeholder="Optional"
                                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 p-6 border-t border-slate-200 flex items-center justify-between gap-4">
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />{error}
                            </div>
                        )}
                        <div className="flex items-center gap-3 ml-auto">
                            <button onClick={onClose} disabled={isSaving}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><CheckCircle className="w-4 h-4" />Create Order</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
