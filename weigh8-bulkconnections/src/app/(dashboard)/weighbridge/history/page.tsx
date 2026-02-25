"use client";

import { Calendar, Download, TrendingUp, BarChart3, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3000/api");

interface HistoryDay {
    date: string;
    transactions: number;
    totalWeight: number;
    avgWeight: string;
    vehicles: number;
}

interface TopProduct {
    name: string;
    weight: number;
    transactions: number;
    percentage: number;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryDay[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/weighbridge/history`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            setHistory(data.history || []);
            setTopProducts(data.topProducts || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Pagination calculations
    const totalItems = history.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedHistory = history.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Weighbridge History</h1>
                    <p className="text-slate-500">Historical transaction data and analytics</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition space-x-2 shadow-sm">
                        <Calendar className="w-4 h-4" />
                        <span>Last 7 Days</span>
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        <div className="text-right">
                            <p className="text-xs text-blue-700 font-medium uppercase tracking-wider">Total Transactions</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">723</p>
                    <p className="text-xs text-slate-600 mt-1">Last 7 days</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="w-8 h-8 text-emerald-600" />
                        <div className="text-right">
                            <p className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Total Weight</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">30,653t</p>
                    <p className="text-xs text-slate-600 mt-1">Cumulative</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <BarChart3 className="w-8 h-8 text-purple-600" />
                        <div className="text-right">
                            <p className="text-xs text-purple-700 font-medium uppercase tracking-wider">Avg Daily</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">103</p>
                    <p className="text-xs text-slate-600 mt-1">Transactions/day</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="w-8 h-8 text-amber-600" />
                        <div className="text-right">
                            <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Peak Day</p>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">152</p>
                    <p className="text-xs text-slate-600 mt-1">Jan 19, 2026</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily History Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Daily Transaction History</h3>
                        <button className="text-sm text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Transactions</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Weight</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Avg Weight</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Vehicles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                                ) : history.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No history data available</td></tr>
                                ) : paginatedHistory.map((day: any, idx) => {
                                    const originalIdx = startIndex + idx;
                                    return (
                                    <tr key={day.date} className={cn(
                                        "hover:bg-slate-50 transition-colors",
                                        originalIdx === 0 && "bg-blue-50/50"
                                    )}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                {originalIdx === 0 && <span className="text-xs text-blue-600 font-semibold">Today</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-mono font-semibold text-slate-900">{day.transactions}</td>
                                        <td className="px-6 py-4 text-sm text-right font-mono text-emerald-600 font-semibold">{day.totalWeight.toLocaleString()}t</td>
                                        <td className="px-6 py-4 text-sm text-right font-mono text-slate-600">{day.avgWeight}t</td>
                                        <td className="px-6 py-4 text-sm text-right font-mono text-slate-600">{day.vehicles}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {!loading && !error && totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                            itemsPerPageOptions={[10, 25, 50, 100]}
                        />
                    )}
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-900">Top Products</h3>
                        <p className="text-xs text-slate-500 mt-1">By weight (last 7 days)</p>
                    </div>
                    <div className="p-6 space-y-5">
                        {topProducts.map((product, idx) => (
                            <div key={product.name}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                                        <p className="text-xs text-slate-500">{product.transactions} transactions</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">{product.weight.toLocaleString()}t</p>
                                        <p className="text-xs text-blue-600 font-semibold">{product.percentage}%</p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            idx === 0 ? "bg-blue-600" : idx === 1 ? "bg-emerald-600" : "bg-purple-600"
                                        )}
                                        style={{ width: `${product.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
