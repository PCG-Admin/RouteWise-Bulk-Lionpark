"use client";

import { RefreshCw, Calendar, Truck, Clock, User, Package, ChevronRight, Search, Filter, MoreHorizontal, AlertCircle, ArrowLeft, Maximize2, Minimize2, X, ChevronDown, CheckCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";
import ManualEntryModal from "@/components/ManualEntryModal";
import Image from "next/image";

type Stage = "pending_arrival" | "checked_in" | "departed";

// LIONSPARK LOADING BOARD - 3 Stages
// Flow: Mine → Lionspark → Bulk Port
// Sync Rules:
// - Lionspark "Checked In" = Bulk "Staging"
// - Lionspark "Departed" = Bulk "Pending Arrival"
// Note: Non-matched plates (detected by ANPR without allocation) use status='arrived' and driverValidationStatus='non_matched'
const stages: { id: Stage; title: string; color: string; icon: any; statuses: string[] }[] = [
    { id: "pending_arrival", title: "Pending Arrival", color: "text-blue-500", icon: Clock, statuses: ['scheduled', 'in_transit'] },
    { id: "checked_in", title: "Checked In", color: "text-green-500", icon: CheckCircle, statuses: ['arrived', 'weighing'] },
    { id: "departed", title: "Departed", color: "text-purple-500", icon: Truck, statuses: ['departed', 'completed', 'cancelled'] },
];

export default function LoadingBoardPage() {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

    const [allocations, setAllocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTruck, setSelectedTruck] = useState<any | null>(null);
    const [expandedStage, setExpandedStage] = useState<Stage | null>(null);
    const [showManualEntry, setShowManualEntry] = useState(false);

    // Fetch truck allocations and non-matched visits
    const fetchAllocations = async () => {
        try {
            // Filter by site ID for Lions Park (only show allocations for this site)
            const allocationsUrl = SITE_ID
                ? `${API_BASE_URL}/api/truck-allocations?siteId=${SITE_ID}`
                : `${API_BASE_URL}/api/truck-allocations`;

            const visitsUrl = SITE_ID
                ? `${API_BASE_URL}/api/visits?siteId=${SITE_ID}`
                : `${API_BASE_URL}/api/visits`;

            const journeyUrl = SITE_ID
                ? `${API_BASE_URL}/api/site-journey/site/${SITE_ID}/latest`
                : null;

            // Fetch allocations and visits
            const [allocationsResponse, visitsResponse] = await Promise.all([
                fetch(allocationsUrl),
                fetch(visitsUrl)
            ]);

            const allocationsData = await allocationsResponse.json();
            const visitsData = await visitsResponse.json();

            // Try to fetch journey data (non-blocking - if it fails, continue without it)
            const journeyMap = new Map();
            if (journeyUrl) {
                try {
                    const journeyResponse = await fetch(journeyUrl);
                    if (journeyResponse.ok) {
                        const journeyData = await journeyResponse.json();
                        if (journeyData?.success && journeyData.data) {
                            journeyData.data.forEach((journey: any) => {
                                journeyMap.set(journey.allocationId, {
                                    siteStatus: journey.status,
                                    lastEvent: journey.eventType,
                                    lastUpdated: journey.timestamp,
                                });
                            });
                        }
                    }
                } catch (journeyError) {
                    console.warn('Journey data fetch failed (non-critical):', journeyError);
                    // Continue without journey data
                }
            }

            // Merge journey status with allocations
            // LIONS VIEW: Only show allocations that have visited Lions (have journey entry)
            const allocationsWithJourney = (allocationsData.success ? allocationsData.data : [])
                .map((alloc: any) => {
                    const journey = journeyMap.get(alloc.id);
                    return {
                        ...alloc,
                        siteStatus: journey?.siteStatus || alloc.status, // Use journey status if available
                        lastEvent: journey?.lastEvent,
                        lastUpdated: journey?.lastUpdated || alloc.updatedAt,
                        lionsTimestamp: journey?.lastUpdated, // Lions-specific journey timestamp (departure/arrival at Lions)
                        hasJourneyEntry: !!journey, // Track if allocation has journey entry
                    };
                })
                .filter((alloc: any) => {
                    // Lions only sees allocations that have visited Lions (have journey entry at site 1)
                    // OR allocations specifically assigned to Lions (siteId = 1)
                    return alloc.hasJourneyEntry || alloc.siteId === 1;
                });

            // Combine allocations and visits
            const combined = [
                ...allocationsWithJourney,
                ...(visitsData.success ? visitsData.data : [])
            ];

            setAllocations(combined);
        } catch (error) {
            console.error('Failed to fetch truck allocations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllocations();

        // Auto-refresh every 30 seconds for ANPR updates
        const interval = setInterval(() => {
            fetchAllocations();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Handle verification completion
    const handleRefresh = () => {
        fetchAllocations();
    };

    // Filters State
    const [filters, setFilters] = useState({
        customer: "All Customers",
        date: "",
        origin: "All Sites",
        transporter: "All Transporters",
        product: "All Products",
        search: ""
    });

    // Separate open states for Main view and Modal view to prevent conflict
    const [isMainFilterOpen, setIsMainFilterOpen] = useState({
        customer: false,
        origin: false,
        transporter: false,
        product: false
    });

    const [isModalFilterOpen, setIsModalFilterOpen] = useState({
        customer: false,
        origin: false,
        transporter: false,
        product: false
    });

    // Normalize helper for case/space-insensitive comparison
    const normalizeStr = (s: string) => s?.trim().toLowerCase().replace(/\s+/g, ' ') || '';

    // Derived Data for Filters - deduplicate transporters by normalized name
    const uniqueCustomers = ["All Customers", ...Array.from(new Set(allocations.map(t => t.customer).filter(Boolean))).sort()];
    const uniqueOrigins = ["All Sites", ...Array.from(new Set(allocations.map(t => t.origin).filter(Boolean))).sort()];
    const uniqueProducts = ["All Products", ...Array.from(new Set(allocations.map(t => t.product).filter(Boolean))).sort()];
    const transporterMap = new Map<string, string>();
    allocations.forEach(a => {
        if (a.transporter) {
            const key = normalizeStr(a.transporter);
            if (!transporterMap.has(key)) transporterMap.set(key, a.transporter.trim());
        }
    });
    const uniqueTransporters = ["All Transporters", ...Array.from(transporterMap.values()).sort()];

    // Filter Logic
    const filteredAllocations = useMemo(() => {
        return allocations.filter(allocation => {
            const matchCustomer = filters.customer === "All Customers" || allocation.customer === filters.customer;
            const matchOrigin = filters.origin === "All Sites" || allocation.origin === filters.origin;
            const matchTransporter = filters.transporter === "All Transporters" ||
                normalizeStr(allocation.transporter) === normalizeStr(filters.transporter);
            const matchProduct = filters.product === "All Products" || allocation.product === filters.product;

            // Date filter: check if scheduledDate matches the selected date
            const matchDate = !filters.date || (allocation.scheduledDate &&
                new Date(allocation.scheduledDate).toISOString().split('T')[0] === filters.date);

            // Free-text search across key fields
            const q = filters.search.trim().toLowerCase();
            const matchSearch = !q || [
                allocation.vehicleReg, allocation.plate,
                allocation.orderNumber, allocation.driverName,
                allocation.driver, allocation.product,
                allocation.customer, allocation.transporter,
            ].join(' ').toLowerCase().includes(q);

            return matchCustomer && matchOrigin && matchTransporter && matchDate && matchProduct && matchSearch;
        });
    }, [allocations, filters]);

    const getTrucksByStage = (stage: Stage) => {
        const stageConfig = stages.find(s => s.id === stage);
        if (!stageConfig) return [];
        return filteredAllocations.filter(allocation => {
            // Use siteStatus (from journey table) if available, otherwise fall back to status
            const effectiveStatus = allocation.siteStatus || allocation.status;
            return stageConfig.statuses.includes(effectiveStatus?.toLowerCase() || 'scheduled');
        });
    };

    const clearFilters = () => {
        setFilters({
            customer: "All Customers",
            date: "",
            origin: "All Sites",
            transporter: "All Transporters",
            product: "All Products",
            search: ""
        });
    };

    const hasActiveFilters = filters.customer !== "All Customers" || filters.origin !== "All Sites" || filters.transporter !== "All Transporters" || filters.date !== "" || filters.product !== "All Products" || filters.search !== "";

    // Component for Filter Dropdowns
    const FilterDropdown = ({
        label,
        value,
        options,
        isOpen,
        setIsOpen,
        onSelect
    }: {
        label: string,
        value: string,
        options: string[],
        isOpen: boolean,
        setIsOpen: (v: boolean) => void,
        onSelect: (v: string) => void
    }) => (
        <div className="relative flex-1">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-slate-50/50 rounded-lg hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200"
            >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {options.map(option => (
                        <button
                            key={option}
                            onClick={() => {
                                onSelect(option);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    // Modified FilterBar to accept openState props
    const FilterBar = ({
        onExpandMode = false,
        openState,
        setOpenState
    }: {
        onExpandMode?: boolean,
        openState: typeof isMainFilterOpen,
        setOpenState: (v: typeof isMainFilterOpen) => void
    }) => (
        <div className={cn(
            "bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all",
            onExpandMode ? "border-0 shadow-none p-0" : ""
        )}>
            {/* Search row */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search by plate, driver, order #, product, customer..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>
            {/* Dropdown filters row */}
            <div className="flex flex-col md:flex-row gap-2">
                <FilterDropdown
                    label="Customer"
                    value={filters.customer}
                    options={uniqueCustomers}
                    isOpen={openState.customer}
                    setIsOpen={(v) => setOpenState({ ...openState, customer: v })}
                    onSelect={(v) => setFilters({ ...filters, customer: v })}
                />

                <FilterDropdown
                    label="Product"
                    value={filters.product}
                    options={uniqueProducts}
                    isOpen={openState.product}
                    setIsOpen={(v) => setOpenState({ ...openState, product: v })}
                    onSelect={(v) => setFilters({ ...filters, product: v })}
                />

                <div className="flex-1 p-2 bg-slate-50/50 rounded-lg transition border border-transparent hover:border-slate-200">
                    <label htmlFor="order-date" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block cursor-pointer">Order Date</label>
                    <div className="flex items-center justify-between gap-2">
                        <input
                            id="order-date"
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none w-full cursor-pointer"
                            placeholder="yyyy-mm-dd"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                </div>

                <FilterDropdown
                    label="Collection Point"
                    value={filters.origin}
                    options={uniqueOrigins}
                    isOpen={openState.origin}
                    setIsOpen={(v) => setOpenState({ ...openState, origin: v })}
                    onSelect={(v) => setFilters({ ...filters, origin: v })}
                />

                <FilterDropdown
                    label="Transporter"
                    value={filters.transporter}
                    options={uniqueTransporters}
                    isOpen={openState.transporter}
                    setIsOpen={(v) => setOpenState({ ...openState, transporter: v })}
                    onSelect={(v) => setFilters({ ...filters, transporter: v })}
                />

                <div className="flex items-center gap-2 shrink-0">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition whitespace-nowrap"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </button>
                    )}
                    <span className="text-xs text-slate-400 whitespace-nowrap">{filteredAllocations.length} of {allocations.length}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 font-sans">
            <OrderDetailSlideOver
                order={selectedTruck}
                onClose={() => setSelectedTruck(null)}
                onStageChange={handleRefresh}
            />

            {showManualEntry && (
                <ManualEntryModal
                    onClose={() => setShowManualEntry(false)}
                    onSuccess={() => {
                        setShowManualEntry(false);
                        handleRefresh();
                    }}
                />
            )}

            {/* Expanded Modal View */}
            {expandedStage && (() => {
                const stage = stages.find(s => s.id === expandedStage)!;
                const trucks = getTrucksByStage(expandedStage);

                return (
                    <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-2 rounded-xl bg-slate-100", stage.color)}>
                                        <stage.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{stage.title} - Detailed View</h2>
                                        <p className="text-sm text-slate-500">Full list of trucks currently in this stage</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setExpandedStage(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900"
                                >
                                    <span className="sr-only">Close</span>
                                    <span className="text-sm font-medium mr-2">Close</span>
                                    {/* <X className="w-5 h-5" /> */}
                                </button>
                            </div>

                            {/* Modal Filters */}
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <FilterBar
                                    onExpandMode={true}
                                    openState={isModalFilterOpen}
                                    setOpenState={setIsModalFilterOpen}
                                />
                            </div>

                            {/* Modal Table Content */}
                            <div className="overflow-y-auto p-6 bg-slate-50/30">
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {[
                                                    "PLATE", "TRANSPORTER", "DRIVER", "PRODUCT", "CUSTOMER", "ORIGIN", "ORDER NO", "STATUS", "ACTIONS"
                                                ].map((header) => (
                                                    <th key={header} scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {trucks.length > 0 ? trucks.map((allocation) => (
                                                <tr key={allocation.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-900 text-xs font-bold font-mono shadow-sm">
                                                            {allocation.vehicleReg}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                                        {allocation.transporter || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {allocation.driverName || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {allocation.product || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {allocation.customer || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {allocation.origin || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                                        {allocation.orderNumber || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-full text-xs font-medium",
                                                            allocation.status === 'scheduled' && "bg-blue-50 text-blue-700",
                                                            allocation.status === 'in_transit' && "bg-amber-50 text-amber-700",
                                                            allocation.status === 'arrived' && "bg-purple-50 text-purple-700",
                                                            allocation.status === 'weighing' && "bg-purple-50 text-purple-700",
                                                            allocation.status === 'completed' && "bg-emerald-50 text-emerald-700"
                                                        )}>
                                                            {allocation.status?.toUpperCase() || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => setSelectedTruck(allocation)}
                                                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500 text-sm">
                                                        No trucks found in this stage matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Loading Board</h1>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                        Port View - Full Operations
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* User Profile - Demo */}
                    <div className="flex items-center gap-3 mr-4 pr-4 border-r border-slate-200">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-slate-900">Lionspark Ops</p>
                            <p className="text-xs text-slate-500">Administrator</p>
                        </div>
                        <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                            LO
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm text-slate-700"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowManualEntry(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
                    >
                        Manual Entry
                    </button>
                </div>
            </div>

            {/* Main view Filter Bar */}
            <FilterBar
                openState={isMainFilterOpen}
                setOpenState={setIsMainFilterOpen}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Total Trucks</p>
                            <h3 className="text-2xl font-bold text-slate-900">{filteredAllocations.length} Active</h3>
                        </div>
                        <Truck className="w-8 h-8 text-blue-100" strokeWidth={1.5} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Trucks/Hour</p>
                            <h3 className="text-2xl font-bold text-slate-900">12 This Hour</h3>
                        </div>
                        <Clock className="w-8 h-8 text-emerald-100" strokeWidth={1.5} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Avg. Time in Park</p>
                            <h3 className="text-2xl font-bold text-slate-900">56h 42m</h3>
                        </div>
                        <div className="text-amber-300">
                            {/* Simple trend icon representation */}
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[600px] bg-white rounded-xl border border-slate-200">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-500">Loading truck allocations...</p>
                    </div>
                </div>
            ) : filteredAllocations.length === 0 ? (
                <div className="flex items-center justify-center min-h-[600px] bg-white rounded-xl border border-slate-200">
                    <div className="text-center px-6">
                        <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Truck Allocations</h3>
                        <p className="text-slate-500 mb-4">
                            No trucks have been allocated yet. Go to Orders List to allocate trucks to an order.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[600px]">
                    {stages.map((stage) => {
                    const trucks = getTrucksByStage(stage.id);
                    return (
                        <div
                            key={stage.id}
                            className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 transition-all duration-300"
                        >
                            {/* Column Header */}
                            <div
                                onClick={() => setExpandedStage(stage.id)}
                                className="p-3 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between sticky top-0 z-10 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Stage Icon */}
                                    <stage.icon className={cn("w-4 h-4", stage.color)} />
                                    <h3 className="font-bold text-sm text-slate-900">{stage.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {trucks.length}
                                    </span>
                                    <Maximize2 className="w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-hide">
                                {trucks.map((allocation) => (
                                    <div
                                        key={allocation.id}
                                        onClick={() => setSelectedTruck(allocation)}
                                        className={cn(
                                            "bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group relative h-fit",
                                            allocation.driverValidationStatus === 'non_matched'
                                                ? "border-2 border-red-500"
                                                : "border border-slate-200"
                                        )}
                                    >
                                        {/* Status Indicator */}
                                        {allocation.driverValidationStatus === 'non_matched' ? (
                                            <div className="absolute top-3 right-3">
                                                <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded text-[10px] font-bold text-red-700 border border-red-300">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Non-Matched Plate
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="absolute top-3 right-3 text-blue-500">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            </div>
                                        )}

                                        {/* Plate (Top Left) */}
                                        <div className="mb-4">
                                            <span className={cn(
                                                "inline-block text-xs font-bold px-2 py-1 rounded border uppercase tracking-wide",
                                                allocation.driverValidationStatus === 'non_matched'
                                                    ? "bg-red-50 text-red-700 border-red-300"
                                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                            )}>
                                                {allocation.vehicleReg}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-1 mb-4">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Driver:</span>
                                                <span className="font-semibold text-slate-700 text-right truncate max-w-[120px]">{allocation.driverName || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Transporter:</span>
                                                <span className="font-semibold text-slate-700 text-right truncate max-w-[120px]">{allocation.transporter || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Customer:</span>
                                                <span className="font-semibold text-slate-700 text-right truncate max-w-[120px]">{allocation.customer || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {/* Order No */}
                                        <div className="text-[10px] text-slate-400 mb-2">
                                            Order: <span className="text-blue-500 font-medium">{allocation.orderNumber || 'N/A'}</span>
                                        </div>

                                        {/* Product */}
                                        <div className="text-[10px] text-slate-400 mb-2">
                                            Product: <span className="text-slate-600 font-medium">{allocation.product || 'N/A'}</span>
                                        </div>

                                        {/* Additional Details */}
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-slate-400">
                                                Ticket: <span className="text-slate-600 font-medium">{allocation.parkingTicketNumber || 'N/A'}</span>
                                            </div>
                                            {allocation.scheduledDate && (
                                                <div className="text-[10px] text-slate-400">
                                                    Scheduled: <span className="text-slate-600 font-medium">{new Date(allocation.scheduledDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Arrival Time Display & Verify Driver Button (Checked In Stage) */}
                                        {stage.id === 'checked_in' && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                                {(allocation.lionsTimestamp || allocation.lastUpdated || allocation.actualArrival) && (
                                                    <div className="pt-2 border-t border-emerald-100 bg-emerald-50/50 -mx-3 px-3 py-2">
                                                        <div className="text-[10px] text-emerald-700 font-medium uppercase tracking-wide">
                                                            Checked in at Lions Park Truck Stop
                                                        </div>
                                                        <div className="text-xs text-emerald-800 font-semibold mt-1">
                                                            {new Date(allocation.lionsTimestamp || allocation.lastUpdated || allocation.actualArrival).toLocaleString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Driver Validation Status Badge */}
                                                <div className={cn(
                                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold",
                                                    allocation.driverValidationStatus === 'ready_for_dispatch'
                                                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                        : allocation.driverValidationStatus === 'verified'
                                                        ? "bg-green-100 text-green-700 border border-green-200"
                                                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                                )}>
                                                    {allocation.driverValidationStatus === 'ready_for_dispatch' ? (
                                                        <>
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span>Ready for Dispatch</span>
                                                        </>
                                                    ) : allocation.driverValidationStatus === 'verified' ? (
                                                        <>
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span>Driver Verified</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>Pending Verification</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Departure Time Display (Departed Stage) */}
                                        {stage.id === 'departed' && (allocation.lionsTimestamp || allocation.departureTime) && (
                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                <div className="pt-2 border-t border-purple-100 bg-purple-50/50 -mx-3 px-3 py-2">
                                                    <div className="text-[10px] text-purple-700 font-medium uppercase tracking-wide">
                                                        Departed Lions Park
                                                    </div>
                                                    <div className="text-xs text-purple-800 font-semibold mt-1">
                                                        {new Date(allocation.lionsTimestamp || allocation.departureTime).toLocaleString('en-ZA', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {trucks.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                        <Filter className="w-8 h-8 text-slate-200 mb-2" />
                                        <p className="text-xs text-slate-500 font-medium">No trucks match current filters</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
}
