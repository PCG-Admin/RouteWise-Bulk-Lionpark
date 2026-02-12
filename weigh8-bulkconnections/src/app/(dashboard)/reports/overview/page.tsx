"use client";

import { BarChart2, TrendingUp, Users, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsOverviewPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Reports Overview</h1>
                    <p className="text-slate-500">Key performance indicators and reporting metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Reports Generated</span>
                        <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">1,245</div>
                    <p className="text-xs text-slate-500 mt-1">Total this month</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Most Active</span>
                        <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 line-clamp-1">Daily Summary</div>
                    <p className="text-xs text-slate-500 mt-1">Top report type</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Recipients</span>
                        <Users className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">142</div>
                    <p className="text-xs text-slate-500 mt-1">Active subscribers</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">System Load</span>
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">Low</div>
                    <p className="text-xs text-slate-500 mt-1">Processing status</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Report Generation Volume (Chart Placeholder)</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Category Distribution (Chart Placeholder)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
