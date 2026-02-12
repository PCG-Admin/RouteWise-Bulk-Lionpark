"use client";

import { ArrowUpRight, Clock, CheckCircle2, AlertTriangle, Truck, Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const statsConfig = [
    { name: 'Active Orders', key: 'activeOrders', change: '+12%', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
    { name: 'Completed Today', key: 'completedToday', change: '+5%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { name: 'Pending Review', key: 'pendingReview', change: '-2%', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' },
    { name: 'Total Weight', key: 'totalWeight', change: '+18%', icon: Weight, color: 'text-indigo-500', bg: 'bg-indigo-100' },
];

export default function OrderOverview() {
    const [stats, setStats] = useState<any>({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/operations/order-overview`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setStats(data.stats || {});
            setRecentOrders(data.recentOrders || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Order Overview</h1>
                <p className="text-slate-500 mt-2">Real-time status of logistics and transportation.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-4 text-center py-8 text-slate-400">Loading...</div>
                ) : error ? (
                    <div className="col-span-4 text-center py-8 text-red-400">{error}</div>
                ) : statsConfig.map((stat) => (
                    <div key={stat.name} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-2">{stats[stat.key] || '0'}</p>
                            </div>
                            <div className={cn("p-3 rounded-xl transition-colors", stat.bg)}>
                                <stat.icon className={cn("w-6 h-6", stat.color)} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-emerald-500 flex items-center font-medium">
                                {stat.change}
                                <ArrowUpRight className="w-4 h-4 ml-1" />
                            </span>
                            <span className="text-slate-500 ml-2">vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Split */}
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
                                    {recentOrders.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No recent orders</td></tr>
                                    ) : recentOrders.map((order: any) => (
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
        </div>
    );
}
