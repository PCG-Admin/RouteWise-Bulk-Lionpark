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

                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
