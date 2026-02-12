"use client";

import { Camera } from "lucide-react";
import { CCTVDisplay } from "@/components/camera/CCTVDisplay";

export default function CCTVPage() {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">CCTV Security System</h1>
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-medium">Lions Park Live</span>
                        </div>
                    </div>
                    <p className="text-slate-500">Live monitoring and security surveillance for weighbridge operations</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Total Cameras</span>
                        <Camera className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">-</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Online Cameras</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">-</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Active Recordings</span>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">-</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Last Update</span>
                        <div className="w-4 h-4">🔄</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">Live</div>
                </div>
            </div>

            {/* CCTV Display Component */}
            <CCTVDisplay />
        </div>
    );
}
