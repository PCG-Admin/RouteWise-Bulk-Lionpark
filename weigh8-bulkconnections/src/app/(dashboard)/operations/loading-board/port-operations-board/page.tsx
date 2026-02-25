"use client";

import { RefreshCw, Calendar, TrendingUp, Clock, AlertCircle, CheckCircle2, Truck, User, Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3000/api");

type Stage = "staging" | "pending_arrival" | "checked_in" | "departed";

const stages: { id: Stage; title: string; icon: any; color: string; bgColor: string; count: number }[] = [
    { id: "staging", title: "Staging", icon: Layers, color: "text-amber-600", bgColor: "bg-amber-50", count: 802 },
    { id: "pending_arrival", title: "Pending Arrival", icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50", count: 198 },
    { id: "checked_in", title: "Checked In", icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50", count: 0 },
    { id: "departed", title: "Departed", icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-50", count: 0 },
];

export default function PortOperationsBoardPage() {
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTrucks();
    }, []);

    const fetchTrucks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/operations/port-operations`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch trucks');
            const data = await response.json();
            setTrucks(data.trucks || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTrucksByStage = (stage: Stage) => {
        return trucks.filter((truck: any) => truck.stage === stage);
    };

    const getBadgeColor = (badge: string) => {
        if (badge === "invalid_plate") return "bg-red-100 text-red-700 border-red-200";
        if (badge === "non_matched_anpr") return "bg-amber-100 text-amber-700 border-amber-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    const getBadgeLabel = (badge: string) => {
        if (badge === "invalid_plate") return "Invalid Plate";
        if (badge === "non_matched_anpr") return "Non-Matched ANPR";
        return badge;
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">Port Operations Board</h1>
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-medium">Port View - Full Operations</span>
                        </div>
                    </div>
                    <p className="text-slate-500">Real-time vehicle tracking and staging management</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition space-x-2 shadow-sm">
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20">
                        <span>Manual Entry</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Today Total</span>
                        <Truck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">93</div>
                    <p className="text-xs text-slate-500 mt-1">Total Trucks</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">This Hour</span>
                        <Clock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">16</div>
                    <p className="text-xs text-slate-500 mt-1">Trucks/Hour</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Avg. Time</span>
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">25h 54m</div>
                    <p className="text-xs text-slate-500 mt-1">Avg. Time in Park</p>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stages.map((stage) => {
                    const trucks = getTrucksByStage(stage.id);
                    return (
                        <div key={stage.id} className="flex flex-col h-full">
                            {/* Column Header */}
                            <div className={cn(
                                "rounded-t-xl p-4 border-b-4",
                                stage.id === "staging" ? "bg-amber-50 border-amber-500" :
                                    stage.id === "pending_arrival" ? "bg-blue-50 border-blue-500" :
                                        stage.id === "checked_in" ? "bg-emerald-50 border-emerald-500" :
                                            "bg-purple-50 border-purple-500"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <stage.icon className={cn("w-5 h-5", stage.color)} />
                                        <h3 className="font-semibold text-slate-900">{stage.title}</h3>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-sm font-bold shadow-sm",
                                        stage.id === "staging" ? "bg-amber-600 text-white" :
                                            stage.id === "pending_arrival" ? "bg-blue-600 text-white" :
                                                stage.id === "checked_in" ? "bg-emerald-600 text-white" :
                                                    "bg-purple-600 text-white"
                                    )}>
                                        {stage.count > 0 ? stage.count : trucks.length}
                                    </div>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-xl p-4 space-y-3 flex-1 min-h-[500px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                        <Truck className="w-8 h-8 mb-2 opacity-50 animate-pulse" />
                                        <span className="text-sm">Loading...</span>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-red-400">
                                        <AlertCircle className="w-8 h-8 mb-2" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                ) : trucks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                        <Truck className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm">No trucks in this stage</span>
                                    </div>
                                ) : (
                                    trucks.map((truck: any) => (
                                        <div
                                            key={truck.id}
                                            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group shadow-sm text-sm"
                                        >
                                            {/* Badges */}
                                            {truck.badges && truck.badges.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {truck.badges.map((badge: any, idx: number) => (
                                                        <span
                                                            key={idx}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                getBadgeColor(badge)
                                                            )}
                                                        >
                                                            {getBadgeLabel(badge)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Truck & Driver */}
                                            <div className="mb-3">
                                                <div className="font-bold text-slate-900 mb-0.5">{truck.plate}</div>
                                                <div className="text-slate-500 text-xs">{truck.transporter} - {truck.driver}</div>
                                            </div>

                                            {/* Product & Order */}
                                            <div className="mb-3 pt-3 border-t border-slate-100">
                                                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                                                    <span>Product</span>
                                                    <span>Order</span>
                                                </div>
                                                <div className="flex justify-between items-center font-medium text-slate-900 text-xs">
                                                    <span>{truck.product || 'No product'}</span>
                                                    <span>{truck.orderNo}</span>
                                                </div>
                                            </div>

                                            {/* Timing */}
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(truck.expectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
