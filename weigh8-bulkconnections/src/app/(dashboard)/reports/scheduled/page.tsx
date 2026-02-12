"use client";

import { Clock, Mail, Calendar, MoreHorizontal, Plus, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

const schedules = [
    { id: "SCH-01", name: "Daily Management Summary", recipients: ["management@pcg.com", "ops@pcg.com"], frequency: "Daily @ 06:00", nextRun: "Tomorrow, 06:00", status: "active" },
    { id: "SCH-02", name: "Weekly Stock Reconciliation", recipients: ["inventory@pcg.com"], frequency: "Monday @ 08:00", nextRun: "Mon 25 Mar, 08:00", status: "active" },
    { id: "SCH-03", name: "Client Tonnage Reports", recipients: ["clients@pcg.com"], frequency: "Monthly (1st)", nextRun: "1 Apr, 00:00", status: "paused" },
    { id: "SCH-04", name: "Safety Compliance Audit", recipients: ["safety@pcg.com", "hr@pcg.com"], frequency: "Weekly @ 09:00", nextRun: "Wed 27 Mar, 09:00", status: "active" },
];

export default function ScheduledReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Scheduled Reports</h1>
                    <p className="text-slate-500">Automated report generation and email distribution</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Schedule
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {schedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4 flex-1">
                            <div className={cn("p-3 rounded-full", schedule.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{schedule.name}</h3>
                                <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {schedule.frequency}</span>
                                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {schedule.recipients.length} recipients</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {schedule.recipients.map((email, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                                            {email}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-slate-500 font-medium uppercase">Next Run</p>
                                <p className="text-sm font-bold text-slate-900">{schedule.nextRun}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
                                    schedule.status === 'active'
                                        ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                )}>
                                    {schedule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    <span>{schedule.status === 'active' ? 'Pause' : 'Resume'}</span>
                                </button>
                                <button className="p-2 text-slate-400 hover:text-blue-600 transition hover:bg-slate-50 rounded-lg">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
