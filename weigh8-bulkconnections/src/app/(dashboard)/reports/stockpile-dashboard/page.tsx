"use client";

import { LayoutDashboard, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const stockpiles = [
    { id: "SP-001", name: "Main Coal Yard", material: "Thermal Coal", current: 45000, capacity: 100000, status: "healthy", dailyChange: "+2.5%" },
    { id: "SP-002", name: "Iron Ore Heap A", material: "Iron Ore Fines", current: 82000, capacity: 90000, status: "warning", dailyChange: "+1.2%" },
    { id: "SP-003", name: "Chrome Stockpile", material: "Chrome Concentrate", current: 12000, capacity: 50000, status: "healthy", dailyChange: "-5.0%" },
    { id: "SP-004", name: "Magnetite Pad", material: "Magnetite", current: 5000, capacity: 30000, status: "low", dailyChange: "-0.5%" },
];

export default function StockpileDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Stockpile Dashboard</h1>
                    <p className="text-slate-500">Real-time inventory levels and capacity monitoring</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Total Volume</span>
                        <LayoutDashboard className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">144,000 t</div>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>1.2% this week</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Avg Utilization</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">53%</div>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-slate-500">
                        <span>Across all yards</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Alerts</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-amber-600">1</div>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-slate-500">
                        <span>Capacity warning</span>
                    </div>
                </div>
            </div>

            {/* Stockpile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stockpiles.map((stockpile) => {
                    const percentage = Math.round((stockpile.current / stockpile.capacity) * 100);
                    return (
                        <div key={stockpile.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{stockpile.name}</h3>
                                    <p className="text-sm text-slate-500">{stockpile.material}</p>
                                </div>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                                    stockpile.status === 'healthy' ? "bg-emerald-50 text-emerald-700" :
                                        stockpile.status === 'warning' ? "bg-amber-50 text-amber-700" :
                                            "bg-blue-50 text-blue-700"
                                )}>
                                    {stockpile.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="font-medium text-slate-700">{percentage}% Capacity</span>
                                        <span className="text-slate-500">{stockpile.current.toLocaleString()} / {stockpile.capacity.toLocaleString()} tons</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500",
                                                percentage > 90 ? "bg-red-500" :
                                                    percentage > 75 ? "bg-amber-500" : "bg-blue-500"
                                            )}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Daily Change</span>
                                        <div className={cn("text-sm font-bold flex items-center gap-1",
                                            stockpile.dailyChange.startsWith('+') ? "text-emerald-600" : "text-red-500"
                                        )}>
                                            {stockpile.dailyChange.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {stockpile.dailyChange}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Est. Days Remaining</span>
                                        <div className="text-sm font-bold text-slate-700">14 Days</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
