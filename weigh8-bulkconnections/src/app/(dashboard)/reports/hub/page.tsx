"use client";

import { FileText, BarChart, PieChart, Settings, Download, Calendar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const reports = [
    { title: "Daily Weighbridge Summary", type: "Operational", frequency: "Daily", format: "PDF, Excel", icon: FileText, color: "bg-blue-50 text-blue-600" },
    { title: "Stockpile Reconciliation", type: "Inventory", frequency: "Weekly", format: "PDF", icon: BarChart, color: "bg-emerald-50 text-emerald-600" },
    { title: "Transporter Performance", type: "Logistics", frequency: "Monthly", format: "Excel", icon: PieChart, color: "bg-purple-50 text-purple-600" },
    { title: "Visitor Access Log", type: "Security", frequency: "Daily", format: "PDF, CSV", icon: FileText, color: "bg-amber-50 text-amber-600" },
    { title: "Vessel Loading Report", type: "Operational", frequency: "Per Vessel", format: "PDF", icon: FileText, color: "bg-blue-50 text-blue-600" },
    { title: "Shift Efficiency Stats", type: "Performance", frequency: "Shiftly", format: "Excel", icon: BarChart, color: "bg-rose-50 text-rose-600" },
];

export default function ReportsHubPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Reports Hub</h1>
                    <p className="text-slate-500">Centralized access to all operational and management reports</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <Settings className="w-4 h-4 mr-2" />
                        Report Settings
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-3 rounded-xl", report.color)}>
                                <report.icon className="w-6 h-6" />
                            </div>
                            <button className="text-slate-400 hover:text-blue-600">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                        <div className="flex gap-2 mb-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded border border-slate-200">{report.type}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded border border-slate-200">{report.frequency}</span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                            <span>Available in: {report.format}</span>
                            <span className="flex items-center gap-1 hover:text-blue-600"><Mail className="w-3 h-3" /> Email</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Scheduled Reports</h2>
                        <p className="text-blue-200 max-w-lg">Configure automated report generation and email distribution for key stakeholders.</p>
                    </div>
                    <button className="px-6 py-3 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition shadow-lg">
                        Manage Schedule
                    </button>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>
        </div>
    );
}
