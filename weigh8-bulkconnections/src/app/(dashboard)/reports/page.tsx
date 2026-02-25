"use client";

import { useState, useEffect, useMemo } from "react";
import {
    BarChart3, TrendingUp, TrendingDown, Package, Truck, Clock, Weight,
    Users, Calendar, Download, Filter, ArrowUpRight, ArrowDownRight,
    Loader2, AlertCircle, PieChart as PieChartIcon, Activity, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");
const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || "2";

interface Allocation {
    id: number;
    orderId: number;
    vehicleReg: string;
    driverName: string | null;
    grossWeight: string | null;
    tareWeight: string | null;
    netWeight: string | null;
    scheduledDate: string | null;
    actualArrival: string | null;
    departureTime: string | null;
    transporter: string | null;
    status: string;
    product: string | null;
    customer: string | null;
    orderNumber: string | null;
    createdAt: string;
    updatedAt: string;
    lionsJourney?: { timestamp: string; status: string };
    bulkJourney?: { timestamp: string; status: string };
}

export default function ReportsPage() {
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        to: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const allocationsUrl = `${API_BASE_URL}/truck-allocations?siteId=${SITE_ID}&limit=1000`;
            const journeyUrl = `${API_BASE_URL}/site-journey/site/${SITE_ID}/latest`;

            const [allocationsRes, journeyRes] = await Promise.all([
                fetch(allocationsUrl, { credentials: 'include' }),
                fetch(journeyUrl, { credentials: 'include' })
            ]);

            if (!allocationsRes.ok) throw new Error('Failed to fetch allocations');

            const allocationsData = await allocationsRes.json();

            // Merge journey data
            const journeyMap = new Map();
            if (journeyRes.ok) {
                const journeyData = await journeyRes.json();
                if (journeyData?.success && journeyData.data) {
                    journeyData.data.forEach((j: any) => {
                        if (!journeyMap.has(j.allocationId)) journeyMap.set(j.allocationId, []);
                        journeyMap.get(j.allocationId).push(j);
                    });
                }
            }

            const enriched = (allocationsData.data || []).map((a: any) => {
                const journeys = journeyMap.get(a.id) || [];
                const lionsJourney = journeys.find((j: any) => j.siteId === 1);
                const bulkJourney = journeys.find((j: any) => j.siteId === 2);
                return { ...a, lionsJourney, bulkJourney };
            });

            setAllocations(enriched);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate analytics
    const analytics = useMemo(() => {
        const filtered = allocations.filter(a => {
            const date = a.scheduledDate || a.createdAt;
            if (!date) return false;
            const d = new Date(date).toISOString().split('T')[0];
            return d >= dateRange.from && d <= dateRange.to;
        });

        // Total tonnage
        const totalTonnage = filtered.reduce((sum, a) => {
            const net = parseFloat(a.netWeight || '0');
            return sum + net;
        }, 0);

        // Total trucks
        const totalTrucks = filtered.length;
        const completedTrucks = filtered.filter(a => a.status === 'completed').length;

        // Average turnaround time (from arrival to departure)
        const turnaroundTimes: number[] = [];
        filtered.forEach(a => {
            const arrival = a.bulkJourney?.timestamp || a.actualArrival;
            const departure = a.departureTime;
            if (arrival && departure) {
                const diff = new Date(departure).getTime() - new Date(arrival).getTime();
                turnaroundTimes.push(diff / (1000 * 60)); // minutes
            }
        });
        const avgTurnaround = turnaroundTimes.length > 0
            ? turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length
            : 0;

        // Product breakdown
        const productMap = new Map<string, number>();
        filtered.forEach(a => {
            const product = a.product || 'Unknown';
            const weight = parseFloat(a.netWeight || '0');
            productMap.set(product, (productMap.get(product) || 0) + weight);
        });
        const products = Array.from(productMap.entries())
            .map(([name, tonnage]) => ({ name, tonnage, percentage: (tonnage / totalTonnage) * 100 }))
            .sort((a, b) => b.tonnage - a.tonnage);

        // Transporter performance
        const transporterMap = new Map<string, { count: number; tonnage: number; avgTime: number; times: number[] }>();
        filtered.forEach(a => {
            const transporter = a.transporter || 'Unknown';
            const weight = parseFloat(a.netWeight || '0');
            const arrival = a.bulkJourney?.timestamp || a.actualArrival;
            const departure = a.departureTime;
            const time = (arrival && departure) ? (new Date(departure).getTime() - new Date(arrival).getTime()) / (1000 * 60) : null;

            if (!transporterMap.has(transporter)) {
                transporterMap.set(transporter, { count: 0, tonnage: 0, avgTime: 0, times: [] });
            }
            const t = transporterMap.get(transporter)!;
            t.count++;
            t.tonnage += weight;
            if (time !== null) t.times.push(time);
        });
        const transporters = Array.from(transporterMap.entries())
            .map(([name, data]) => ({
                name,
                count: data.count,
                tonnage: data.tonnage,
                avgTime: data.times.length > 0 ? data.times.reduce((a, b) => a + b, 0) / data.times.length : 0
            }))
            .sort((a, b) => b.tonnage - a.tonnage)
            .slice(0, 10);

        // Daily throughput (last 14 days)
        const dailyMap = new Map<string, number>();
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyMap.set(key, 0);
        }
        filtered.forEach(a => {
            const date = (a.scheduledDate || a.createdAt)?.split('T')[0];
            const weight = parseFloat(a.netWeight || '0');
            if (date && dailyMap.has(date)) {
                dailyMap.set(date, dailyMap.get(date)! + weight);
            }
        });
        const dailyThroughput = Array.from(dailyMap.entries()).map(([date, tonnage]) => ({ date, tonnage }));

        // Peak hours analysis (hourly distribution of arrivals)
        const hourlyMap = new Map<number, number>();
        for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
        filtered.forEach(a => {
            const arrival = a.bulkJourney?.timestamp || a.actualArrival;
            if (arrival) {
                const hour = new Date(arrival).getHours();
                hourlyMap.set(hour, hourlyMap.get(hour)! + 1);
            }
        });
        const hourlyDistribution = Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count }));

        // Status breakdown
        const statusMap = new Map<string, number>();
        filtered.forEach(a => {
            statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1);
        });
        const statuses = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

        // Compare to previous period
        const periodDays = Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24));
        const prevFrom = new Date(new Date(dateRange.from).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const prevTo = dateRange.from;
        const prevPeriod = allocations.filter(a => {
            const date = a.scheduledDate || a.createdAt;
            if (!date) return false;
            const d = new Date(date).toISOString().split('T')[0];
            return d >= prevFrom && d < prevTo;
        });
        const prevTonnage = prevPeriod.reduce((sum, a) => sum + parseFloat(a.netWeight || '0'), 0);
        const tonnageChange = prevTonnage > 0 ? ((totalTonnage - prevTonnage) / prevTonnage) * 100 : 0;

        const prevTrucks = prevPeriod.length;
        const trucksChange = prevTrucks > 0 ? ((totalTrucks - prevTrucks) / prevTrucks) * 100 : 0;

        return {
            totalTonnage,
            totalTrucks,
            completedTrucks,
            avgTurnaround,
            products,
            transporters,
            dailyThroughput,
            hourlyDistribution,
            statuses,
            tonnageChange,
            trucksChange,
        };
    }, [allocations, dateRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-slate-600 font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-6">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-800">Error loading reports</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                    <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const maxDailyTonnage = Math.max(...analytics.dailyThroughput.map(d => d.tonnage), 1);
    const maxHourlyCount = Math.max(...analytics.hourlyDistribution.map(h => h.count), 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
                    <p className="text-slate-500 mt-1">Operational insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="text-sm font-medium text-slate-700 border-none outline-none bg-transparent"
                        />
                        <span className="text-slate-400">—</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="text-sm font-medium text-slate-700 border-none outline-none bg-transparent"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Tonnage */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <Weight className="w-8 h-8 opacity-80" />
                            <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                analytics.tonnageChange >= 0 ? "bg-emerald-500/20" : "bg-red-500/20")}>
                                {analytics.tonnageChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(analytics.tonnageChange).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Tonnage</h3>
                        <p className="text-3xl font-bold mt-1">{analytics.totalTonnage.toLocaleString('en-US', { maximumFractionDigits: 0 })}t</p>
                        <p className="text-xs opacity-75 mt-2">vs previous period</p>
                    </div>
                </div>

                {/* Total Trucks */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <Truck className="w-8 h-8 opacity-80" />
                            <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                analytics.trucksChange >= 0 ? "bg-emerald-500/20" : "bg-red-500/20")}>
                                {analytics.trucksChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(analytics.trucksChange).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Trucks</h3>
                        <p className="text-3xl font-bold mt-1">{analytics.totalTrucks.toLocaleString()}</p>
                        <p className="text-xs opacity-75 mt-2">{analytics.completedTrucks} completed</p>
                    </div>
                </div>

                {/* Avg Turnaround */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 opacity-80" />
                            <Zap className="w-5 h-5 opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Avg Turnaround</h3>
                        <p className="text-3xl font-bold mt-1">
                            {analytics.avgTurnaround > 0 ? (
                                analytics.avgTurnaround >= 60
                                    ? `${(analytics.avgTurnaround / 60).toFixed(1)}h`
                                    : `${analytics.avgTurnaround.toFixed(0)}m`
                            ) : 'N/A'}
                        </p>
                        <p className="text-xs opacity-75 mt-2">Arrival to departure</p>
                    </div>
                </div>

                {/* Active Products */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <Package className="w-8 h-8 opacity-80" />
                            <Activity className="w-5 h-5 opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Products</h3>
                        <p className="text-3xl font-bold mt-1">{analytics.products.length}</p>
                        <p className="text-xs opacity-75 mt-2">Material types</p>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Daily Throughput */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Daily Throughput (Last 14 Days)
                        </h3>
                    </div>
                    <div className="flex items-end justify-between gap-1 h-48 px-2">
                        {analytics.dailyThroughput.map((day, i) => {
                            const height = (day.tonnage / maxDailyTonnage) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                    <div className="relative w-full bg-slate-100 rounded-t-lg flex-1 flex items-end">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {day.tonnage.toFixed(0)}t
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                        {new Date(day.date).getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Product Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-emerald-600" />
                            Material Breakdown by Tonnage
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {analytics.products.slice(0, 6).map((product, i) => {
                            const colors = [
                                'bg-blue-600',
                                'bg-emerald-600',
                                'bg-amber-600',
                                'bg-purple-600',
                                'bg-pink-600',
                                'bg-cyan-600'
                            ];
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className={cn("w-3 h-3 rounded-full flex-shrink-0", colors[i % colors.length])} />
                                            <span className="text-slate-700 font-medium truncate">{product.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                            <span className="text-slate-500 text-xs">{product.percentage.toFixed(1)}%</span>
                                            <span className="text-slate-900 font-bold">{product.tonnage.toFixed(0)}t</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500", colors[i % colors.length])}
                                            style={{ width: `${product.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Peak Hours */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-600" />
                            Peak Hours (Arrival Distribution)
                        </h3>
                    </div>
                    <div className="flex items-end justify-between gap-px h-40">
                        {analytics.hourlyDistribution.filter(h => h.hour >= 6 && h.hour <= 18).map((hour, i) => {
                            const height = (hour.count / maxHourlyCount) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                    <div className="relative w-full bg-slate-100 rounded-t flex-1 flex items-end">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t transition-all duration-500"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {hour.count} trucks
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {hour.hour.toString().padStart(2, '0')}:00
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Transporters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Top Transporters by Volume
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {analytics.transporters.slice(0, 5).map((transporter, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{transporter.name}</p>
                                        <p className="text-xs text-slate-500">{transporter.count} trucks</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-sm font-bold text-slate-900">{transporter.tonnage.toFixed(0)}t</p>
                                    {transporter.avgTime > 0 && (
                                        <p className="text-xs text-slate-500">
                                            {transporter.avgTime >= 60 ? `${(transporter.avgTime / 60).toFixed(1)}h` : `${transporter.avgTime.toFixed(0)}m`} avg
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Status Distribution
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {analytics.statuses.map((status, i) => {
                        const colors: Record<string, string> = {
                            scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                            in_transit: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            arrived: 'bg-green-50 text-green-700 border-green-200',
                            weighing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            ready_for_dispatch: 'bg-teal-50 text-teal-700 border-teal-200',
                            completed: 'bg-purple-50 text-purple-700 border-purple-200',
                            cancelled: 'bg-red-50 text-red-700 border-red-200',
                        };
                        return (
                            <div key={i} className={cn("p-4 rounded-xl border-2", colors[status.status] || 'bg-slate-50 text-slate-700 border-slate-200')}>
                                <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{status.status.replace('_', ' ')}</p>
                                <p className="text-2xl font-bold mt-1">{status.count}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
