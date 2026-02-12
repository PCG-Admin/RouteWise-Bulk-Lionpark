"use client";

import { Plus, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";
import Pagination from "@/components/Pagination";

export default function OrdersListsPage() {
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch orders from API
    const fetchOrders = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/orders');
            const data = await response.json();
            if (data.success) {
                setOrders(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Pagination calculations
    const totalItems = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <OrderDetailSlideOver
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Orders List</h1>
                    <p className="text-slate-500">Manage client orders and deliveries.</p>
                </div>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20">
                    <Plus className="w-4 h-4" />
                    <span>New Order</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                    />
                </div>
                <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-600">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-slate-500 mt-3">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
                    <p className="text-slate-500">No orders found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {paginatedOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all group"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${order.status === 'active' || order.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">{order.product} • {parseFloat(order.quantity).toLocaleString()} {order.unit}</p>
                                    <p className="text-xs text-slate-400 mt-1">{order.originAddress} → {order.destinationAddress}</p>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="flex-1 md:w-48">
                                        <div className="text-xs text-slate-500">
                                            {order.requestedPickupDate && (
                                                <div>Pickup: {new Date(order.requestedPickupDate).toLocaleDateString()}</div>
                                            )}
                                            {order.requestedDeliveryDate && (
                                                <div>Delivery: {new Date(order.requestedDeliveryDate).toLocaleDateString()}</div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrder(order);
                                        }}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap px-3 py-1.5"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && orders.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    itemsPerPageOptions={[10, 25, 50]}
                />
            )}
        </div>
    );
}
