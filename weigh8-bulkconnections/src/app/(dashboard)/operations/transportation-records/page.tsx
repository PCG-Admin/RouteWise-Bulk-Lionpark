"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Building2, Users, Plus, Edit2, Trash2, CheckCircle, Loader2, Search, X } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");
const SITE_ID = 2;

type Tab = "transporters" | "drivers";

interface Transporter {
    id: number;
    name: string;
    code: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
}

interface Driver {
    id: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    licenseNumber: string | null;
    idNumber: string | null;
    transporterId: number | null;
    transporterName?: string;
    inductionCompleted: boolean;
}

const emptyTransporter = () => ({
    name: "", code: "", contactPerson: "", phone: "", email: "", address: "",
});

const emptyDriver = () => ({
    firstName: "", lastName: "", phone: "", email: "",
    licenseNumber: "", idNumber: "", transporterId: "",
});

// ─── Quick inline modal ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

// ─── Transporters Tab ─────────────────────────────────────────────────────────
function TransportersTab() {
    const [data, setData] = useState<Transporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Transporter | null>(null);
    const [form, setForm] = useState(emptyTransporter());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/transporters?siteId=${SITE_ID}`, { credentials: 'include' });
            const result = await res.json();
            setData(result.success ? result.data : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setEditing(null); setForm(emptyTransporter()); setError(null); setShowModal(true); };
    const openEdit = (t: Transporter) => {
        setEditing(t);
        setForm({ name: t.name, code: t.code || "", contactPerson: t.contactPerson || "", phone: t.phone || "", email: t.email || "", address: t.address || "" });
        setError(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true); setError(null);
        try {
            const url = editing ? `${API_BASE_URL}/transporters/${editing.id}` : `${API_BASE_URL}/transporters`;
            const method = editing ? "PUT" : "POST";
            const payload = {
                name: form.name.trim(),
                siteId: SITE_ID,
                code: form.code.trim() || null,
                contactPerson: form.contactPerson.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                address: form.address.trim() || null,
            };
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || result.message || `HTTP ${res.status}`);
            setShowModal(false);
            setSearch(""); // clear search so new item is visible
            await fetchData();
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete transporter "${name}"?`)) return;
        setDeletingId(id);
        try {
            await fetch(`${API_BASE_URL}/transporters/${id}`, { method: "DELETE", credentials: 'include' });
            fetchData();
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = data.filter(t => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [t.name, t.code, t.contactPerson, t.phone, t.email].filter(Boolean).join(" ").toLowerCase().includes(q);
    });

    return (
        <div className="space-y-4">
            {showModal && (
                <Modal title={editing ? "Edit Transporter" : "Add Transporter"} onClose={() => setShowModal(false)}>
                    <div className="space-y-3">
                        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                        <FieldGroup label="Company Name *">
                            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Transporter Co." />
                        </FieldGroup>
                        <div className="grid grid-cols-2 gap-3">
                            <FieldGroup label="Code">
                                <input className={inputCls} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="TRP-001" />
                            </FieldGroup>
                            <FieldGroup label="Contact Person">
                                <input className={inputCls} value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="John Smith" />
                            </FieldGroup>
                            <FieldGroup label="Phone">
                                <input className={inputCls} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27 11 000 0000" />
                            </FieldGroup>
                            <FieldGroup label="Email">
                                <input className={inputCls} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ops@company.com" />
                            </FieldGroup>
                        </div>
                        <FieldGroup label="Address">
                            <input className={inputCls} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Johannesburg, SA" />
                        </FieldGroup>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle className="w-4 h-4" />Save</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search transporters..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Add Transporter
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">{search ? "No results found" : "No transporters yet. Add your first one."}</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-semibold text-slate-900 text-sm">{t.name}</td>
                                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{t.code || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{t.contactPerson || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{t.phone || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{t.email || "—"}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                                            {t.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(t.id, t.name)} disabled={deletingId === t.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                                                {deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <p className="text-xs text-slate-400">{filtered.length} transporter{filtered.length !== 1 ? "s" : ""}{search ? ` matching "${search}"` : ""}</p>
        </div>
    );
}

// ─── Drivers Tab ──────────────────────────────────────────────────────────────
function DriversTab() {
    const [data, setData] = useState<Driver[]>([]);
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTransporter, setFilterTransporter] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Driver | null>(null);
    const [form, setForm] = useState(emptyDriver());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [driversRes, transportersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/drivers?siteId=${SITE_ID}`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/transporters?siteId=${SITE_ID}`, { credentials: 'include' }),
            ]);
            const [driversResult, transportersResult] = await Promise.all([driversRes.json(), transportersRes.json()]);
            setData(driversResult.success ? driversResult.data : []);
            setTransporters(transportersResult.success ? transportersResult.data : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setEditing(null); setForm(emptyDriver()); setError(null); setShowModal(true); };
    const openEdit = (d: Driver) => {
        setEditing(d);
        setForm({ firstName: d.firstName, lastName: d.lastName, phone: d.phone || "", email: d.email || "", licenseNumber: d.licenseNumber || "", idNumber: d.idNumber || "", transporterId: d.transporterId?.toString() || "" });
        setError(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.firstName.trim() || !form.lastName.trim()) { setError("First and last name are required"); return; }
        setSaving(true); setError(null);
        try {
            const url = editing ? `${API_BASE_URL}/drivers/${editing.id}` : `${API_BASE_URL}/drivers`;
            const method = editing ? "PUT" : "POST";
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                licenseNumber: form.licenseNumber.trim() || null,
                idNumber: form.idNumber.trim() || null,
                transporterId: form.transporterId ? parseInt(form.transporterId) : null,
            };
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || result.message || `HTTP ${res.status}`);
            setShowModal(false);
            setSearch(""); // clear search so new item is visible
            await fetchData();
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete driver "${name}"?`)) return;
        setDeletingId(id);
        try {
            await fetch(`${API_BASE_URL}/drivers/${id}`, { method: "DELETE", credentials: 'include' });
            fetchData();
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = data.filter(d => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q || [d.firstName, d.lastName, d.phone, d.idNumber, d.licenseNumber, d.transporterName].filter(Boolean).join(" ").toLowerCase().includes(q);
        const matchTransporter = !filterTransporter || d.transporterId?.toString() === filterTransporter;
        return matchSearch && matchTransporter;
    });

    return (
        <div className="space-y-4">
            {showModal && (
                <Modal title={editing ? "Edit Driver" : "Add Driver"} onClose={() => setShowModal(false)}>
                    <div className="space-y-3">
                        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                        <div className="grid grid-cols-2 gap-3">
                            <FieldGroup label="First Name *">
                                <input className={inputCls} value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="John" />
                            </FieldGroup>
                            <FieldGroup label="Last Name *">
                                <input className={inputCls} value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
                            </FieldGroup>
                            <FieldGroup label="Phone">
                                <input className={inputCls} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0812345678" />
                            </FieldGroup>
                            <FieldGroup label="Email">
                                <input className={inputCls} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="driver@email.com" />
                            </FieldGroup>
                            <FieldGroup label="ID Number">
                                <input className={inputCls} value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} placeholder="8001015009087" />
                            </FieldGroup>
                            <FieldGroup label="License Number">
                                <input className={inputCls} value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="DL-12345" />
                            </FieldGroup>
                        </div>
                        <FieldGroup label="Transporter">
                            <select className={inputCls} value={form.transporterId} onChange={e => setForm(p => ({ ...p, transporterId: e.target.value }))}>
                                <option value="">— Not assigned —</option>
                                {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </FieldGroup>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle className="w-4 h-4" />Save</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <select value={filterTransporter} onChange={e => setFilterTransporter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Transporters</option>
                    {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Add Driver
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">{search || filterTransporter ? "No results found" : "No drivers yet. Add your first one."}</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Driver</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">ID Number</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">License</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Transporter</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Induction</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-slate-900 text-sm">{d.firstName} {d.lastName}</p>
                                        {d.email && <p className="text-xs text-slate-400">{d.email}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{d.idNumber || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{d.licenseNumber || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{d.phone || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{d.transporterName || "—"}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.inductionCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                            {d.inductionCompleted ? "Done" : "Pending"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(d.id, `${d.firstName} ${d.lastName}`)} disabled={deletingId === d.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                                                {deletingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <p className="text-xs text-slate-400">{filtered.length} driver{filtered.length !== 1 ? "s" : ""}</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TransportationRecordsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("transporters");

    const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
        { id: "transporters", label: "Transporters", icon: <Building2 className="w-4 h-4" /> },
        { id: "drivers", label: "Drivers", icon: <Users className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transportation Management</h1>
                <p className="text-slate-500 mt-0.5">Manage transporters and drivers for Bulk Connections.</p>
            </div>

            {/* Tab bar */}
            <div className="border-b border-slate-200">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div>
                {activeTab === "transporters" && <TransportersTab />}
                {activeTab === "drivers" && <DriversTab />}
            </div>
        </div>
    );
}
