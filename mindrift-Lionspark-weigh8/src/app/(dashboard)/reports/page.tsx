"use client";

import { BarChart3, TrendingUp, PieChart, Calendar, ArrowRight, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ReportType {
    name: string;
    type: string;
    date: string;
    icon: string;
    color: string;
    bg: string;
}

export default function ReportsPage() {
    const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/reports`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }
            const data = await response.json();
            setReportTypes(data.reportTypes || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reports');
            setReportTypes([]);
        } finally {
            setLoading(false);
        }
    };

    const getIconComponent = (iconName: string) => {
        const icons: { [key: string]: any } = {
            BarChart3,
            TrendingUp,
            PieChart,
            Calendar
        };
        return icons[iconName] || BarChart3;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-slate-500">Deep insights into operational performance.</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Error loading reports</p>
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">Loading reports...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && reportTypes.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reports Available</h3>
                    <p className="text-slate-500">No reports have been configured yet.</p>
                </div>
            )}

            {/* Available Reports List */}
            {!loading && !error && reportTypes.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900">Available Reports</h3>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {reportTypes.map((report) => {
                            const IconComponent = getIconComponent(report.icon);
                            return (
                                <div key={report.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl", report.bg)}>
                                            <IconComponent className={cn("w-5 h-5", report.color)} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">{report.name}</h4>
                                            <p className="text-sm text-slate-500">{report.type} • Updated {report.date}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
