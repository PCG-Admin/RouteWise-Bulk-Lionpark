"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Edit2, Trash2, CheckCircle, Loader2, Search, X, Mail, Phone, MapPin, User } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_ID = 2; // Bulk Connections

interface Client {
    id: number;
    name: string;
    code: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
}

const emptyForm = () => ({
    name: "", code: "", contactPerson: "", phone: "", email: "", address: "",
});

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function PartnersPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Client | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients?siteId=${SITE_ID}`, { credentials: 'include' });
            const result = await res.json();
            setClients(result.success ? result.data : []);
        } catch {
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm());
        setError(null);
        setShowModal(true);
    };

    const openEdit = (c: Client) => {
        setEditing(c);
        setForm({ name: c.name, code: c.code || "", contactPerson: c.contactPerson || "", phone: c.phone || "", email: c.email || "", address: c.address || "" });
        setError(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Company name is required"); return; }
        setSaving(true); setError(null);
        try {
            const url = editing ? `${API_BASE_URL}/api/clients/${editing.id}` : `${API_BASE_URL}/api/clients`;
            const method = editing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ ...form, siteId: SITE_ID }),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || "Failed to save");
            setShowModal(false);
            fetchClients();
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            await fetch(`${API_BASE_URL}/api/clients/${id}`, { method: "DELETE", credentials: 'include' });
            fetchClients();
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = clients.filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [c.name, c.code, c.contactPerson, c.phone, c.email, c.address].filter(Boolean).join(" ").toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6">

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{editing ? "Edit Client / Trader" : "Add New Client / Trader"}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Bulk Connections — Site records only</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <X className="w-4 h-4 shrink-0" />{error}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Company / Trader Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Anglo American" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Client Code</label>
                                    <input className={inputCls} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="CLT-001" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
                                    <input className={inputCls} value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="James Wilson" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                                    <input className={inputCls} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27 11 000 0000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                                    <input className={inputCls} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contact@company.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                                <input className={inputCls} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Johannesburg, South Africa" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 pb-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle className="w-4 h-4" />{editing ? "Update" : "Add Client"}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Clients &amp; Traders</h1>
                    <p className="text-slate-500 mt-0.5">Manage your business partners — Bulk Connections records.</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Add Client
                </button>
            </div>

            {/* Search + view toggle */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search by name, code, contact, email..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                    <button onClick={() => setViewMode("cards")} className={`px-3 py-2 text-sm font-medium transition ${viewMode === "cards" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Cards</button>
                    <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-sm font-medium transition ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Table</button>
                </div>
            </div>

            {/* KPI row */}
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                        <p className="text-xs text-blue-600 font-semibold uppercase">Total Clients</p>
                        <p className="text-xl font-bold text-blue-700">{clients.length}</p>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                        <p className="text-xs text-emerald-600 font-semibold uppercase">Active</p>
                        <p className="text-xl font-bold text-emerald-700">{clients.filter(c => c.isActive).length}</p>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-semibold">{search ? "No clients match your search" : "No clients yet"}</p>
                    <p className="text-slate-400 text-sm mt-1">{search ? "Try a different search term" : "Add your first client or trader to get started"}</p>
                    {!search && (
                        <button onClick={openAdd} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition mx-auto">
                            <Plus className="w-4 h-4" /> Add First Client
                        </button>
                    )}
                </div>
            ) : viewMode === "cards" ? (
                /* Card Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(c => (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-blue-50 rounded-xl">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(c.id, c.name)} disabled={deletingId === c.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 disabled:opacity-40">
                                        {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-base font-bold text-slate-900 mb-0.5">{c.name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                {c.code && <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{c.code}</span>}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                                    {c.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                {c.contactPerson && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{c.contactPerson}</span>
                                    </div>
                                )}
                                {c.phone && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{c.phone}</span>
                                    </div>
                                )}
                                {c.email && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                                {c.address && (
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{c.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Client / Trader</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-semibold text-slate-900 text-sm">{c.name}</td>
                                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{c.code || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{c.contactPerson || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{c.phone || "—"}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600">{c.email || "—"}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                                            {c.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(c.id, c.name)} disabled={deletingId === c.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                                                {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <p className="text-xs text-slate-400">
                    {search ? `${filtered.length} of ${clients.length} clients` : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
                </p>
            )}
        </div>
    );
}
