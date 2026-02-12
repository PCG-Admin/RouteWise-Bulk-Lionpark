"use client";

import { BarChart2, TrendingUp, TrendingDown, Target, Truck, Weight } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
    { title: "Material Moved", planned: 50000, actual: 42500, unit: "tons", trend: "down" },
    { title: "Truck Cycles", planned: 1500, actual: 1550, unit: "trips", trend: "up" },
    { title: "Turnaround Time", planned: 45, actual: 52, unit: "mins", trend: "down" }, // Down is bad here but sticking to color logic
];

export default function PlanVsActualPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Plan vs Actual</h1>
                    <p className="text-slate-500">Performance tracking against operational targets</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, i) => {
                    const percentage = Math.round((metric.actual / metric.planned) * 100);
                    const isPositive = metric.trend === "up";
                    return (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-slate-500 font-medium mb-4">{metric.title}</h3>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-3xl font-bold text-slate-900">{metric.actual.toLocaleString()}</p>
                                    <p className="text-xs text-slate-400">Actual {metric.unit}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-semibold text-slate-500">{metric.planned.toLocaleString()}</p>
                                    <p className="text-xs text-slate-400">Planned {metric.unit}</p>
                                </div>
                            </div>

                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", percentage >= 100 ? "bg-emerald-500" : "bg-blue-500")}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-700">{percentage}%</span>
                                <span className={cn("flex items-center gap-1 font-medium", isPositive ? "text-emerald-600" : "text-amber-600")}>
                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(metric.actual - metric.planned).toLocaleString()} var
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Detailed Analytics Chart Placeholder</p>
                    <p className="text-sm">Interactive charts would go here (requires chart library)</p>
                </div>
            </div>
        </div>
    );
}
