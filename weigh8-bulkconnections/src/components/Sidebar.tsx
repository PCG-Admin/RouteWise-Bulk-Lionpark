"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Truck,
    Camera,
    ClipboardList,
    FileText,
    Scale,
    BarChart3,
    Building2,
    Users,
    ChevronDown,
    LogOut,
    ChevronLeft,
    Pickaxe,
    Clock,
    Warehouse,
    ArrowUpDown,
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";

interface NavigationItem {
    name: string;
    icon: any;
    current: false;
    href?: string;
    children?: {
        name: string;
        href: string;
        icon: any;
    }[];
}

const navigation: NavigationItem[] = [
    {
        name: "Operations",
        icon: LayoutDashboard,
        current: false,
        children: [
            { name: "Loading Board", href: "/operations/loading-board", icon: ClipboardList },
            { name: "Orders Dashboard", href: "/operations/orders", icon: FileText },
            { name: "Orders Received", href: "/operations/order-overview", icon: FileText },
            { name: "CCTV", href: "/operations/cctv", icon: Camera },
            { name: "Calendar View", href: "/operations/calendar", icon: BarChart3 },
            { name: "Transportation", href: "/operations/transportation", icon: Truck },
            { name: "Stock Management", href: "/operations/stock-management", icon: ClipboardList },
            { name: "Vessel Management", href: "/operations/vessel-management", icon: Scale },
        ],
    },
    {
        name: "Weighbridge",
        icon: Scale,
        current: false,
        children: [
            { name: "Sessions", href: "/weighbridge/sessions", icon: ClipboardList },
            { name: "Weighbridge [Internal]", href: "/weighbridge/internal", icon: Scale },
            { name: "Client Weighbridge [External]", href: "/weighbridge/external", icon: Scale },
            { name: "History", href: "/weighbridge/history", icon: BarChart3 },
        ],
    },
    {
        name: "Visits & Access Controls",
        icon: Users,
        current: false,
        children: [
            { name: "Visits", href: "/visits/visits", icon: Users },
            { name: "Visitor Compliance", href: "/visits/compliance", icon: ClipboardList },
            { name: "Bookings", href: "/visits/bookings", icon: FileText },
            { name: "Allowance", href: "/visits/allowance", icon: Scale },
            { name: "Plan vs Actual", href: "/visits/plan-vs-actual", icon: BarChart3 },
        ],
    },
    {
        name: "Business",
        icon: Building2,
        current: false,
        children: [
            { name: "Partners", href: "/business/partners", icon: Users },
        ],
    },
    {
        name: "Reports",
        icon: BarChart3,
        current: false,
        children: [
            { name: "Overview", href: "/reports/overview", icon: LayoutDashboard },
            { name: "Order Reports", href: "/reports/order-reports", icon: Pickaxe },
            { name: "Logistics", href: "/reports/logistics", icon: Clock },
            { name: "Stockpiles", href: "/reports/stockpiles", icon: Warehouse },
            { name: "Analysis", href: "/reports/analysis", icon: ArrowUpDown },
            { name: "Intelligence", href: "/reports/intelligence", icon: AlertTriangle },
        ],
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>(["Operations", "Weighbridge", "Business"]);
    const [isHovered, setIsHovered] = useState(false);
    const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

    useEffect(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (data.success) setUser(data.user); })
            .catch(() => {});
    }, []);

    // Sidebar is open if it's NOT manually collapsed OR if it's being hovered
    const isSidebarOpen = !isCollapsed || isHovered;

    const toggleGroup = (name: string) => {
        if (!isSidebarOpen) return;
        setOpenGroups(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev);
    };

    return (
        <div
            className={cn(
                "flex flex-col h-screen fixed left-0 top-0 border-r transition-all duration-300 z-50",
                !isSidebarOpen ? "w-20" : "w-72",
                "bg-slate-900 border-slate-800"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "h-28 flex items-center border-b border-slate-800 relative",
                !isSidebarOpen ? "justify-center px-4" : "justify-between px-6"
            )}>
                {/* Logo - Always use the light/inverted version for dark background */}
                {isSidebarOpen ? (
                    <div className="relative w-[200px] h-[80px] flex items-center justify-start">
                        <Image
                            src="/Mindrift_Logo-05.png"
                            alt="Mindrift"
                            fill
                            className="object-contain object-left brightness-0 invert"
                            priority
                        />
                    </div>
                ) : (
                    <Image
                        src="/Mindrift_Logo-06.png"
                        alt="M"
                        width={40}
                        height={40}
                        className="object-contain brightness-0 invert"
                    />
                )}

                <button
                    onClick={toggleSidebar}
                    className={cn(
                        "absolute -right-3 top-8 bg-slate-800 border border-slate-700 rounded-full p-1 shadow-md hover:bg-slate-700 transition-colors",
                        isCollapsed ? "rotate-180" : ""
                    )}
                >
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar scrollbar-hide">
                {navigation.map((item) => (
                    <div key={item.name}>
                        {item.children ? (
                            <div className="space-y-1">
                                <button
                                    onClick={() => toggleGroup(item.name)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                                        "text-slate-400 hover:text-white hover:bg-slate-800",
                                        !isSidebarOpen ? "justify-center" : ""
                                    )}
                                    title={!isSidebarOpen ? item.name : undefined}
                                >
                                    <div className="flex items-center">
                                        <item.icon className={cn("h-5 w-5", !isSidebarOpen ? "mr-0" : "mr-3", "group-hover:text-blue-400 transition-colors")} />
                                        {isSidebarOpen && <span>{item.name}</span>}
                                    </div>
                                    {isSidebarOpen && (
                                        <ChevronDown
                                            className={cn(
                                                "h-4 w-4 transition-transform duration-200",
                                                openGroups.includes(item.name) ? "transform rotate-180" : ""
                                            )}
                                        />
                                    )}
                                </button>

                                {(isSidebarOpen && openGroups.includes(item.name)) && (
                                    <div className="pl-11 space-y-1 mt-1 transition-all">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                href={child.href}
                                                className={cn(
                                                    "block px-3 py-2 text-sm font-medium rounded-lg transition-colors relative",
                                                    pathname === child.href
                                                        ? "text-blue-400 bg-blue-900/20"
                                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                                )}
                                            >
                                                {child.name}
                                                {pathname === child.href && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-md" />
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href={item.href || "#"}
                                className={cn(
                                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group relative",
                                    pathname === item.href
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                                    !isSidebarOpen ? "justify-center" : ""
                                )}
                                title={!isSidebarOpen ? item.name : undefined}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5",
                                    !isSidebarOpen ? "mr-0" : "mr-3",
                                    pathname === item.href ? "text-white" : "group-hover:text-blue-400 transition-colors"
                                )} />
                                {isSidebarOpen && item.name}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-3">
                {/* User info */}
                {isSidebarOpen ? (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
                        <div className="h-8 w-8 rounded-full bg-blue-900/60 flex items-center justify-center text-blue-300 font-bold text-xs shrink-0">
                            {user?.fullName
                                ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                : '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{user?.fullName || '—'}</p>
                            <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role || ''}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="h-8 w-8 rounded-full bg-blue-900/60 flex items-center justify-center text-blue-300 font-bold text-xs" title={user?.fullName || ''}>
                            {user?.fullName
                                ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                : '?'}
                        </div>
                    </div>
                )}
                <Link href="/login" className={cn(
                    "flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-500/10 transition-colors",
                    !isSidebarOpen ? "justify-center" : ""
                )}>
                    <LogOut className={cn("h-5 w-5", !isSidebarOpen ? "mr-0" : "mr-3")} />
                    {isSidebarOpen && "Sign Out"}
                </Link>
            </div>
        </div>
    );
}
