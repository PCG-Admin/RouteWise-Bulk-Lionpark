"use client";

import { ArrowUpRight, Clock, CheckCircle2, AlertTriangle, Truck, Weight, RefreshCw, AlertCircle as AlertIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:3001";

interface Stat {
    name: string;
    value: string;
    change: string;
    icon: string;
    color: string;
    bg: string;
}

interface Order {
    id: string;
    client: string;
    destination: string;
    status: string;
    weight: string;
    truck: string;
}

export default function OrderOverview() {
    const [stats, setStats] = useState<Stat[]>([]);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            // Filter by site ID for Lions Park (only show orders destined for this site)
            const siteId = process.env.NEXT_PUBLIC_SITE_ID;
            const url = siteId
                ? `${API_BASE_URL}/api/orders?siteId=${siteId}`
                : `${API_BASE_URL}/api/orders`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            const data = await response.json();
            setStats(data.stats || []);
            setRecentOrders(data.recentOrders || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load orders');
            setStats([]);
            setRecentOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const getIconComponent = (iconName: string) => {
        const icons: { [key: string]: any } = {
            Clock,
            CheckCircle2,
            AlertTriangle,
            Weight
        };
        return icons[iconName] || Clock;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Order Overview</h1>
                <p className="text-slate-500 mt-2">Real-time status of logistics and transportation.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertIcon className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Error loading orders</p>
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">Loading orders...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && stats.length === 0 && recentOrders.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Orders Available</h3>
                    <p className="text-slate-500">No order data found.</p>
                </div>
            )}

            {/* Stats Grid */}
            {!loading && !error && stats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => {
                        const IconComponent = getIconComponent(stat.icon);
                        return (
                            <div key={stat.name} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                                        <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                                    </div>
                                    <div className={cn("p-3 rounded-xl transition-colors", stat.bg)}>
                                        <IconComponent className={cn("w-6 h-6", stat.color)} />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center text-sm">
                                    <span className={cn("flex items-center font-medium", stat.change.startsWith('+') ? "text-emerald-500" : "text-red-500")}>
                                        {stat.change}
                                        <ArrowUpRight className="w-4 h-4 ml-1" />
                                    </span>
                                    <span className="text-slate-500 ml-2">vs last month</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Main Content Split */}
            {!loading && !error && recentOrders.length > 0 && (
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column - Recent Activity */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3>
                                <button className="text-sm text-blue-600 hover:underline font-medium">View All</button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-500 text-sm border-b border-slate-100">
                                            <th className="pb-4 font-medium pl-2">Order ID</th>
                                            <th className="pb-4 font-medium">Client</th>
                                            <th className="pb-4 font-medium">Destination</th>
                                            <th className="pb-4 font-medium">Status</th>
                                            <th className="pb-4 font-medium">Weight</th>
                                            <th className="pb-4 font-medium">Truck</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 pl-2 text-slate-900 font-medium">{order.id}</td>
                                                <td className="py-4 text-slate-600">{order.client}</td>
                                                <td className="py-4 text-slate-600">{order.destination}</td>
                                                <td className="py-4">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                                                        order.status === 'Completed' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                                            order.status === 'In Transit' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                                order.status === 'Loading' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                                    "bg-slate-100 text-slate-700 border-slate-200"
                                                    )}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-slate-600">{order.weight}</td>
                                                <td className="py-4 text-slate-500 font-mono text-xs">{order.truck}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Fleet Status or similar */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Traffic Status</h3>
                            <div className="relative aspect-video rounded-xl bg-slate-100 overflow-hidden group">
                                {/* Placeholder for Map/CCTV */}
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    <Truck className="w-12 h-12 opacity-50" />
                                </div>
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <p className="text-white font-medium">Main Gate Complex</p>
                                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Live Feed
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm text-slate-700">Weighbridge A</span>
                                    </div>
                                    <span className="text-xs text-slate-500">Available</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-sm text-slate-700">Weighbridge B</span>
                                    </div>
                                    <span className="text-xs text-slate-500">Busy (Queue: 2)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
