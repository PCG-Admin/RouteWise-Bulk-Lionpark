"use client";

import { Save, Mail, FileText, Globe, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Report Settings</h1>
                    <p className="text-slate-500">Configure global reporting preferences and defaults</p>
                </div>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-slate-400" />
                        Email Configuration
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Sender Name</label>
                            <input type="text" defaultValue="Weigh8 System" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Reply-To Address</label>
                            <input type="email" defaultValue="noreply@weigh8.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        Default Formats
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-700">PDF Orientation</span>
                        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50">
                            <option>Landscape</option>
                            <option>Portrait</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-700">Primary Paper Size</span>
                        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50">
                            <option>A4</option>
                            <option>Letter</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
