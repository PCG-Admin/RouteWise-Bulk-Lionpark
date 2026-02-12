"use client";

import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";

const orders = [
    { id: "ORD-9901", client: "Anglo American", date: "2024-03-22", volume: "50,000t", material: "Coal Grade A", progress: 65, status: "Active" },
    { id: "ORD-9902", client: "Glencore", date: "2024-03-24", volume: "30,000t", material: "Iron Ore", progress: 12, status: "Active" },
    { id: "ORD-9903", client: "South32", date: "2024-03-18", volume: "15,000t", material: "Coal Grade B", progress: 100, status: "Completed" },
    { id: "ORD-9904", client: "Exxaro", date: "2024-03-25", volume: "45,000t", material: "Coal Grade A", progress: 0, status: "Scheduled" },
];

export default function OrdersListsPage() {
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

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

            <div className="grid gap-4">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md cursor-pointer transition-all group"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-semibold text-slate-900">{order.client}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${order.status === 'Active' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">{order.id} • {order.material} • Due {order.date}</p>
                            </div>

                            <div className="flex items-center gap-8 w-full md:w-auto">
                                <div className="flex-1 md:w-48">
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-slate-500">Progress</span>
                                        <span className="font-medium text-slate-700">{order.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${order.progress}%` }} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 text-right">{order.volume} Target</p>
                                </div>

                                <button className="text-sm font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap">
                                    Manage Order
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
