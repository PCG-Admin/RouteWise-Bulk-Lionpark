"use client";

import { Calculator, Calendar, CheckCircle2, Clock, AlertTriangle, UserPlus, RefreshCw, Search, Filter, ShieldCheck, FileText, AlertCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3000/api");

export default function VisitorCompliancePage() {
    const [visitors, setVisitors] = useState([]);
    const [docTypes, setDocTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/visits/compliance`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch compliance data');
            const data = await response.json();
            setVisitors(data.visitors || []);
            setDocTypes(data.docTypes || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Visitor Compliance</h1>
                    <p className="text-slate-500">Monitor visitor documents and certification expiry dates</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <PlusUserIcon className="w-4 h-4 mr-2" />
                        Add Visitor
                    </button>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, email..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm tablet:text-sm"
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition text-slate-600 shadow-sm">
                        <span>Filter by status</span>
                        <Filter className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">124</div>
                        <p className="text-sm font-medium text-slate-500">Fully Compliant</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">12</div>
                        <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-full text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">5</div>
                        <p className="text-sm font-medium text-slate-500">Expired Docs</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">141</div>
                        <p className="text-sm font-medium text-slate-500">Total Visitors</p>
                    </div>
                </div>
            </div>

            {/* Compliance Requirements Overview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Compliance Requirements Overview</h3>
                <p className="text-sm text-slate-500 mb-6">Required documents for site access with expiry tracking</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-3 text-center py-8 text-slate-400">Loading...</div>
                    ) : docTypes.map((doc: any) => (
                        <div key={doc.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <p className="font-bold text-slate-900">{doc.name}</p>
                                <p className="text-xs text-slate-500">{doc.count} documents</p>
                            </div>
                            {doc.status === "all_current" && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">All Current</span>
                            )}
                            {doc.status === "expiring" && (
                                <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">Expiring</span>
                            )}
                            {doc.status === "expired" && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">Action Req.</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Visitor Compliance Status Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Visitor Compliance Status</h3>
                    <p className="text-sm text-slate-500">Document status and compliance tracking for all visitors</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">ID / Passport</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Compliance Status</th>
                                <th className="px-6 py-4 text-center">Last Check</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                            ) : visitors.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No visitors found</td></tr>
                            ) : visitors.map((visitor: any) => (
                                <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{visitor.name}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-sm">{visitor.idNumber}</td>
                                    <td className="px-6 py-4 text-slate-600">{visitor.company}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                            visitor.status === 'compliant' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                visitor.status === 'expiring_soon' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {visitor.status === 'compliant' && <ShieldCheck className="w-3 h-3" />}
                                            {visitor.status === 'expiring_soon' && <Clock className="w-3 h-3" />}
                                            {visitor.status === 'non_compliant' && <AlertCircle className="w-3 h-3" />}
                                            <span className="capitalize">{visitor.status.replace('_', ' ')}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500 text-sm">{visitor.lastCheck}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-bold hover:underline">
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PlusUserIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" x2="20" y1="8" y2="14" />
            <line x1="23" x2="17" y1="11" y2="11" />
        </svg>
    )
}
