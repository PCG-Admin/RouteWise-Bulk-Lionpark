"use client";

import { Download, Printer, Eye, Search, Filter, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Ticket {
    id: string;
    vehicle: string;
    driver: string;
    product: string;
    tare: number;
    gross: number;
    net: number;
    timestamp: string;
    status: string;
}

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/weighbridge/tickets`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch tickets');
            }
            const data = await response.json();
            setTickets(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tickets');
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    // Pagination calculations
    const totalItems = tickets.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTickets = tickets.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Weighbridge Tickets</h1>
                    <p className="text-slate-500">View and manage weighbridge transaction tickets</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition space-x-2 shadow-sm">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by ticket ID, vehicle, driver, or product..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Error loading tickets</p>
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">Loading tickets...</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {!loading && !error && tickets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Tickets</p>
                        <p className="text-2xl font-bold text-slate-900">{tickets.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Weight</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {tickets.reduce((sum, t) => sum + t.net, 0).toFixed(1)}t
                        </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-slate-500 mb-1">Avg. Net Weight</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            {(tickets.reduce((sum, t) => sum + t.net, 0) / tickets.length).toFixed(1)}t
                        </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-slate-500 mb-1">Last Ticket</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {tickets.length > 0 ? new Date(tickets[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && tickets.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tickets Found</h3>
                    <p className="text-slate-500">No weighbridge tickets have been created yet.</p>
                </div>
            )}

            {/* Tickets Table */}
            {!loading && !error && tickets.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Tare (t)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Gross (t)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net (t)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-mono font-semibold text-slate-900">{ticket.id}</span>
                                            <span className="text-xs text-emerald-600 font-medium">Completed</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{ticket.timestamp}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{ticket.vehicle}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.driver}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.product}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-900">{ticket.tare}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-900">{ticket.gross}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono font-bold text-emerald-600">{ticket.net}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="View">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Print">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Download">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    itemsPerPageOptions={[10, 25, 50, 100]}
                />
            </div>
            )}
        </div>
    );
}
