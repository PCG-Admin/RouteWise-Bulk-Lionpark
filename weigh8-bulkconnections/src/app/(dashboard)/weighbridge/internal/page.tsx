"use client";

import { Search, Filter, ArrowUpDown, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function InternalWeighbridgePage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/weighbridge/internal`);
            if (!response.ok) throw new Error('Failed to fetch transactions');
            const data = await response.json();
            setTransactions(data.transactions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter((t: any) =>
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Internal Weighbridge</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <p>Showing transactions from all mine users</p>
                        <span className="w-1 h-1 bg-slate-400 rounded-full" />
                        <p>Showing {filteredTransactions.length} of {transactions.length} transactions</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search transactions, tickets, vehicle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        All Operators
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <ActivityIcon className="w-4 h-4 mr-2" />
                        All Status
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Internal Weighbridge Transactions</h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                        <p className="text-lg font-medium text-slate-500">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-400">
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <p className="text-lg font-medium text-red-500">{error}</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No transactions found</p>
                        <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Operator</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4 text-right">Net Weight</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{t.id}</td>
                                        <td className="px-6 py-4 text-slate-500">{t.date}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-medium text-slate-700">
                                                {t.vehicle}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{t.operator}</td>
                                        <td className="px-6 py-4 text-slate-600">{t.product}</td>
                                        <td className="px-6 py-4 text-right font-mono font-medium">{t.weight.toLocaleString()} kg</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                t.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    t.status === 'pending' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {t.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                                {t.status === 'pending' && <Clock className="w-3 h-3" />}
                                                {t.status === 'error' && <AlertCircle className="w-3 h-3" />}
                                                <span className="capitalize">{t.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
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
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
