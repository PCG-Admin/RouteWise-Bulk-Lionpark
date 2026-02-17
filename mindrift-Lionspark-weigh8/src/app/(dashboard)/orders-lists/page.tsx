"use client";

import { Search, RefreshCw, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrdersListsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterProduct, setFilterProduct] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const siteId = process.env.NEXT_PUBLIC_SITE_ID;
            const url = siteId
                ? `${API_BASE_URL}/api/orders?siteId=${siteId}`
                : `${API_BASE_URL}/api/orders`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch orders');
            const data = await res.json();
            setOrders(data.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: { [key: string]: string } = {
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
            in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            cancelled: 'bg-red-100 text-red-700 border-red-200',
        };
        return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const q = search.trim().toLowerCase();
            if (q) {
                const haystack = [order.orderNumber, order.product, order.clientName, order.originAddress, order.destinationAddress].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (filterStatus !== 'all' && order.status !== filterStatus) return false;
            if (filterProduct && !order.product?.toLowerCase().includes(filterProduct.toLowerCase())) return false;
            if (filterDateFrom && order.requestedPickupDate) {
                if (new Date(order.requestedPickupDate).toISOString().split('T')[0] < filterDateFrom) return false;
            }
            if (filterDateTo && order.requestedPickupDate) {
                if (new Date(order.requestedPickupDate).toISOString().split('T')[0] > filterDateTo) return false;
            }
            return true;
        });
    }, [orders, search, filterStatus, filterProduct, filterDateFrom, filterDateTo]);

    const hasActiveFilters = search || filterStatus !== 'all' || filterProduct || filterDateFrom || filterDateTo;
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const clearFilters = () => {
        setSearch(''); setFilterStatus('all'); setFilterProduct('');
        setFilterDateFrom(''); setFilterDateTo(''); setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Orders List</h1>
                    <p className="text-slate-500">Manage client orders and deliveries.</p>
                </div>
                <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
            )}

            {/* Summary counts */}
            {!loading && orders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Orders', value: orders.length, color: 'text-slate-900', bg: 'bg-slate-50' },
                        { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: 'text-yellow-700', bg: 'bg-yellow-50' },
                        { label: 'In Transit', value: orders.filter(o => o.status === 'in_transit').length, color: 'text-blue-700', bg: 'bg-blue-50' },
                        { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    ].map(s => (
                        <div key={s.label} className={`p-4 rounded-xl border border-slate-200 shadow-sm ${s.bg}`}>
                            <p className="text-xs font-medium text-slate-500">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by order number, product, customer..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[140px]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Filter by product..."
                        value={filterProduct}
                        onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[160px]"
                    />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Pickup Date:</span>
                    <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="text-xs text-slate-400">to</span>
                    <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    {hasActiveFilters && (
                        <button onClick={clearFilters}
                            className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition whitespace-nowrap">
                            ✕ Clear Filters
                        </button>
                    )}
                    <span className="ml-auto text-xs text-slate-400">{filteredOrders.length} of {orders.length} orders</span>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {paginatedOrders.length === 0 ? (
                        <div className="py-16 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">{hasActiveFilters ? 'No orders match your filters' : 'No orders available'}</p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline">Clear filters</button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {['Order #', 'Product', 'Customer', 'Route', 'Status', 'Pickup Date', 'Delivery Date', 'Qty'].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{order.orderNumber || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{order.product || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{order.clientName || '-'}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px]">
                                                    <div className="truncate">{order.originAddress || '-'}</div>
                                                    <div className="truncate text-slate-400">→ {order.destinationAddress || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border capitalize whitespace-nowrap", getStatusBadge(order.status))}>
                                                        {order.status?.replace('_', ' ') || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                                                    {order.requestedPickupDate ? new Date(order.requestedPickupDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                                                    {order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{order.quantity ? `${order.quantity} ${order.unit || ''}` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                                    <p className="text-xs text-slate-500">
                                        Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                                    </p>
                                    <div className="flex gap-1">
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                                            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Previous</button>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                                            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
