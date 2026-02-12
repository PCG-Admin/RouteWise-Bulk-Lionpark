"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, PieChart, Calendar, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = "http://localhost:3001";

interface ReportType {
    name: string;
    type: string;
    date: string;
    icon: any;
    color: string;
    bg: string;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<ReportType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/reports`);
            if (!response.ok) throw new Error('Failed to fetch reports');
            const data = await response.json();
            setReports(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reports');
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-slate-600">Loading reports...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800">Error loading reports</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                    <button onClick={fetchReports} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition">Retry</button>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-slate-500">Deep insights into operational performance.</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />

                        <div className="relative z-10">
                            <p className="text-sm font-medium text-slate-500">Total Tonnage (March)</p>
                            <h2 className="text-3xl font-bold text-slate-900 mt-2">124,592t</h2>
                            <div className="flex items-center mt-4 text-emerald-500 text-sm font-medium">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +12.5% from last month
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Mockup Section */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-6">Daily Throughput</h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-4">
                        {[40, 60, 45, 70, 50, 80, 65].map((h, i) => (
                            <div key={i} className="w-full bg-blue-100 rounded-t-lg relative group">
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-1000"
                                    style={{ height: `${h}%` }}
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {h}00t
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Material Breakdown</h3>
                    <div className="flex items-center justify-center h-[200px]">
                        <div className="relative w-40 h-40 rounded-full border-8 border-blue-500 border-r-emerald-500 border-b-amber-500 border-l-slate-200 transform -rotate-45" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-slate-600">Coal Grade A (45%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-slate-600">Iron Ore (25%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-slate-600">Anthracite (20%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-slate-200" />
                            <span className="text-slate-600">Other (10%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Available Reports List */}
            {reports.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900">Available Reports</h3>
                </div>
                <div className="divide-y divide-slate-200">
                    {reports.map((report) => (
                        <div key={report.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-xl", report.bg)}>
                                    <report.icon className={cn("w-5 h-5", report.color)} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900">{report.name}</h4>
                                    <p className="text-sm text-slate-500">{report.type} • Updated {report.date}</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                    ))}
                </div>
            </div>
            )}
        </div>
    );
}
