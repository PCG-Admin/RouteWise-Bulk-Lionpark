"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <main
                className={cn(
                    "flex-1 min-h-screen relative bg-slate-50 p-8 overflow-y-auto transition-all duration-300",
                    isCollapsed ? "ml-20" : "ml-72"
                )}
            >
                {/* Background Gradients */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl opacity-50" />
                </div>

                {/* Header with User Profile */}
                <div className="relative z-20 flex justify-end mb-6">
                    <div className="flex items-center gap-3 bg-white pl-4 pr-1.5 py-1.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900">Bulk Admin</p>
                            <p className="text-[10px] text-slate-500 font-medium tracking-wide">Administrator</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                            BA
                        </div>
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
