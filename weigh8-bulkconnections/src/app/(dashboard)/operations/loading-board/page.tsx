"use client";

import { RefreshCw, TrendingUp, Clock, CheckCircle2, Truck, Filter, Box, X, Calendar as CalendarIcon, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { VisitDetailSlideOver } from "@/components/VisitDetailSlideOver";
import { Modal } from "@/components/ui/Modal";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

type Stage = "staging" | "pending_arrival" | "checked_in" | "departed";

type FilterBarProps = {
    filters: {
        customer: string;
        date: string;
        collection: string;
        transporter: string;
        product: string;
        search: string;
    };
    setFilters: (filters: { customer: string; date: string; collection: string; transporter: string; product: string; search: string }) => void;
    trucks: any[];
};

const stageDefinitions: { id: Stage; title: string; icon: any; color: string; bgColor: string }[] = [
    { id: "staging", title: "Staging", icon: Box, color: "text-amber-600", bgColor: "bg-amber-50" },
    { id: "pending_arrival", title: "Pending Arrival", icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50" },
    { id: "checked_in", title: "Checked In", icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { id: "departed", title: "Departed", icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-50" },
];


function CustomSelect({ label, value, onChange, options, placeholder = "Select..." }: { label: string, value: string, onChange: (val: string) => void, options: string[], placeholder?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative flex-1">
            {/* Backdrop for closing */}
            {isOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "bg-white rounded-xl border shadow-sm p-3 cursor-pointer transition-all relative z-20",
                    isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
                )}
            >
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block cursor-pointer">{label}</label>
                <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-bold truncate", value ? "text-slate-700" : "text-slate-400")}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                    >
                        {placeholder}
                    </div>
                    {options.map((option) => (
                        <div
                            key={option}
                            onClick={() => { onChange(option); setIsOpen(false); }}
                            className={cn(
                                "px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors",
                                value === option ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            {option}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">No options available</div>
                    )}
                </div>
            )}
        </div>
    );
}

function FilterBar({ filters, setFilters, trucks }: FilterBarProps) {
    const trucksArray = Array.isArray(trucks) ? trucks : [];
    const clearFilters = () => {
        setFilters({
            customer: "",
            date: "",
            collection: "",
            transporter: "",
            product: "",
            search: ""
        });
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== "");
    const uniqueProducts = Array.from(new Set(trucksArray.map((t: any) => t.product).filter(Boolean))).sort() as string[];

    return (
        <div className="flex flex-col gap-3">
            {/* Search row */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search by plate, driver, order #, product, customer..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>
            {/* Dropdown filters row */}
            <div className="flex flex-col md:flex-row gap-4">
                <CustomSelect
                    label="Customer"
                    value={filters.customer}
                    onChange={(val) => setFilters({ ...filters, customer: val })}
                    options={Array.from(new Set(trucksArray.map((t: any) => t.customer))).sort() as string[]}
                    placeholder="All Customers"
                />

                <CustomSelect
                    label="Product"
                    value={filters.product}
                    onChange={(val) => setFilters({ ...filters, product: val })}
                    options={uniqueProducts}
                    placeholder="All Products"
                />

                {/* Date Filter */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:border-slate-300 transition-colors">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Order Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full text-sm font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer min-h-[20px] font-sans"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            placeholder="yyyy/mm/dd"
                        />
                    </div>
                </div>

                <CustomSelect
                    label="Collection Point"
                    value={filters.collection}
                    onChange={(val) => setFilters({ ...filters, collection: val })}
                    options={Array.from(new Set(trucksArray.map((t: any) => t.collection))).sort() as string[]}
                    placeholder="All Sites"
                />

                <CustomSelect
                    label="Transporter"
                    value={filters.transporter}
                    onChange={(val) => setFilters({ ...filters, transporter: val })}
                    options={Array.from(new Set(trucksArray.map((t: any) => t.transporter))).sort() as string[]}
                    placeholder="All Transporters"
                />

                {/* Clear Button */}
                <div className="flex items-center justify-center">
                    <button
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap border shadow-sm h-full",
                            hasActiveFilters
                                ? "bg-white text-red-600 hover:bg-red-50 border-red-100 hover:border-red-200"
                                : "bg-transparent text-slate-300 border-transparent cursor-not-allowed hidden md:flex"
                        )}
                    >
                        <span>Clear Filters</span>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function LoadingBoardPage() {
    const { toasts, removeToast, success, error: showError, warning } = useToast();

    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTruck, setSelectedTruck] = useState<any>(null);
    const [expandedStage, setExpandedStage] = useState<Stage | null>(null);
    const [filters, setFilters] = useState({
        customer: "",
        date: "",
        collection: "",
        transporter: "",
        product: "",
        search: ""
    });
    const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
    const [manualGate, setManualGate] = useState<'entry' | 'exit'>('entry');
    const [manualPlate, setManualPlate] = useState('');
    const [searchedAllocation, setSearchedAllocation] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Compute stages with real counts from trucks data
    const stages = stageDefinitions.map(stageDef => ({
        ...stageDef,
        count: trucks.filter((truck: any) => truck.stage === stageDef.id).length
    }));

    useEffect(() => {
        fetchTrucks();

        // Auto-refresh every 5 seconds for near-real-time updates
        const interval = setInterval(() => {
            fetchTrucks();
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, []);

    const fetchTrucks = async () => {
        try {
            setLoading(true);

            // Fetch allocations — use limit=500 to ensure all active trucks are returned
            const allocationsResponse = await fetch(`${API_BASE_URL}/truck-allocations?limit=500`, { credentials: 'include' });
            if (!allocationsResponse.ok) throw new Error('Failed to fetch trucks');
            const allocationsData = await allocationsResponse.json();

            // Try to fetch journey data (non-blocking - if it fails, continue without it)
            const lionsJourneyMap = new Map();
            const bulkJourneyMap = new Map();

            try {
                const [lionsJourneyResponse, bulkJourneyResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/site-journey/site/1/latest`, { credentials: 'include' }),
                    fetch(`${API_BASE_URL}/site-journey/site/2/latest`, { credentials: 'include' })
                ]);

                if (lionsJourneyResponse.ok) {
                    const lionsJourneyData = await lionsJourneyResponse.json();
                    if (lionsJourneyData?.success && lionsJourneyData.data) {
                        lionsJourneyData.data.forEach((journey: any) => {
                            lionsJourneyMap.set(journey.allocationId, journey);
                        });
                    }
                }

                if (bulkJourneyResponse.ok) {
                    const bulkJourneyData = await bulkJourneyResponse.json();
                    if (bulkJourneyData?.success && bulkJourneyData.data) {
                        bulkJourneyData.data.forEach((journey: any) => {
                            bulkJourneyMap.set(journey.allocationId, journey);
                        });
                    }
                }
            } catch (journeyError) {
                console.warn('Journey data fetch failed (non-critical):', journeyError);
                // Continue without journey data
            }

            // BULK VIEW: Show full supply chain (Lions → Bulk)
            const transformedTrucks = (allocationsData.data || [])
                .filter((allocation: any) => {
                    // Show Bulk-bound allocations OR allocations that have visited Lions
                    // OR allocations that are simply in the system and need processing
                    return allocation.siteId === 2 || lionsJourneyMap.has(allocation.id) || !allocation.siteId;
                })
                .map((allocation: any) => {
                    const lionsJourney = lionsJourneyMap.get(allocation.id);
                    const bulkJourney = bulkJourneyMap.get(allocation.id);

                    // Determine stage based on journey status (priority: Bulk > Lions)
                    let stage: Stage = 'pending_arrival';

                    if (bulkJourney) {
                        // Priority 1: Truck has been to Bulk - use Bulk journey status
                        if (bulkJourney.status === 'arrived') {
                            stage = 'checked_in';
                        } else if (bulkJourney.status === 'departed') {
                            stage = 'departed';
                        }
                    } else if (lionsJourney) {
                        // Priority 2: Truck is at Lions - show supply chain status
                        if (lionsJourney.status === 'arrived') {
                            stage = 'staging'; // "Staging at Lions"
                        } else if (lionsJourney.status === 'departed') {
                            stage = 'pending_arrival'; // "In Transit to Bulk" (left Lions, not yet at Bulk)
                        }
                    } else {
                        // Priority 3: No journey entries yet - check allocation status
                        if (allocation.status === 'scheduled' || allocation.status === 'in_transit') {
                            stage = 'pending_arrival';
                        }
                    }

                    return {
                        id: allocation.id,
                        plate: allocation.vehicleReg,
                        vehicleReg: allocation.vehicleReg,
                        transporter: allocation.transporter || 'Unknown',
                        driver: allocation.driverName,
                        driverName: allocation.driverName,
                        driverPhone: allocation.driverPhone,
                        driverId: allocation.driverId,
                        product: allocation.product,
                        customer: allocation.customer,
                        collection: allocation.originAddress || allocation.origin,
                        orderNo: allocation.orderNumber || `ORD-${allocation.orderId}`,
                        orderNumber: allocation.orderNumber,
                        ticketNo: allocation.ticketNo,                   // Mine's order reference ticket
                        parkingTicketNumber: allocation.parkingTicketNumber, // PT... issued at Lions Park on check-in
                        scheduledDate: allocation.scheduledDate,
                        actualArrival: bulkJourney?.timestamp || lionsJourney?.timestamp || allocation.actualArrival,
                        departureTime: allocation.departureTime,
                        siteName: allocation.siteName,
                        grossWeight: allocation.grossWeight,
                        tareWeight: allocation.tareWeight,
                        netWeight: allocation.netWeight,
                        quantity: allocation.quantity,
                        unit: allocation.unit,
                        priority: allocation.priority,
                        status: allocation.status,
                        originAddress: allocation.originAddress || allocation.origin,
                        destinationAddress: allocation.destinationAddress,
                        destination: allocation.destinationAddress,
                        createdAt: allocation.createdAt,
                        stage,
                        badges: [],
                        // Include journey status for debugging
                        lionsStatus: lionsJourney?.status,
                        bulkStatus: bulkJourney?.status,
                        lionsTimestamp: lionsJourney?.timestamp,
                        bulkTimestamp: bulkJourney?.timestamp,
                    };
                });

            setTrucks(transformedTrucks);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTrucksByStage = (stage: Stage) => {
        return trucks.filter((truck: any) => {
            const matchesStage = truck.stage === stage;
            const matchesCustomer = filters.customer === "" || (truck.customer || '').toLowerCase().includes(filters.customer.toLowerCase());
            const matchesTransporter = filters.transporter === "" || (truck.transporter || '').toLowerCase().includes(filters.transporter.toLowerCase());
            const matchesCollection = filters.collection === "" || (truck.collection || '').toLowerCase().includes(filters.collection.toLowerCase());
            const matchesProduct = filters.product === "" || (truck.product || '').toLowerCase().includes(filters.product.toLowerCase());

            // Date filter
            const matchesDate = !filters.date || (truck.scheduledDate &&
                new Date(truck.scheduledDate).toISOString().split('T')[0] === filters.date);

            // Free-text search
            const q = filters.search.trim().toLowerCase();
            const matchesSearch = !q || [
                truck.plate, truck.orderNo,
                truck.driver, truck.product,
                truck.customer, truck.transporter,
            ].join(' ').toLowerCase().includes(q);

            return matchesStage && matchesCustomer && matchesTransporter && matchesCollection && matchesProduct && matchesDate && matchesSearch;
        });
    };

    const getBadgeColor = (badge: string) => {
        if (badge === "invalid_plate") return "bg-red-100 text-red-700 border-red-200";
        if (badge === "non_matched_anpr") return "bg-amber-100 text-amber-700 border-amber-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    const getBadgeLabel = (badge: string) => {
        if (badge === "invalid_plate") return "Invalid Plate";
        if (badge === "non_matched_anpr") return "Non-Matched ANPR";
        return badge;
    };

    const handleSearchPlate = async () => {
        if (!manualPlate.trim()) {
            warning('Please enter a vehicle registration number');
            return;
        }

        setIsSearching(true);
        setSearchedAllocation(null);

        try {
            const response = await fetch(`${API_BASE_URL}/truck-allocations?limit=500`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to search allocations');

            const data = await response.json();
            const normalizedPlate = manualPlate.toLowerCase().replace(/\s/g, '');
            const candidates = data.data?.filter((a: any) =>
                a.vehicleReg?.toLowerCase().replace(/\s/g, '') === normalizedPlate
            ) || [];

            if (candidates.length === 0) {
                showError(`No allocation found for plate: ${manualPlate}`);
            } else if (candidates.length === 1) {
                setSearchedAllocation(candidates[0]);
            } else {
                // Multiple allocations for same plate (different scheduled days).
                // Prefer active (not completed) allocations, then closest date to today.
                const now = new Date().getTime();
                const activeCandidates = manualGate === 'entry'
                    ? candidates.filter((a: any) => a.status === 'scheduled' || a.status === 'in_transit')
                    : candidates.filter((a: any) =>
                        a.status !== 'completed' &&
                        (a.driverValidationStatus === 'ready_for_dispatch' || a.status === 'arrived' || a.status === 'weighing')
                    );
                const pool = activeCandidates.length > 0 ? activeCandidates : candidates;
                const best = pool.sort((a: any, b: any) => {
                    const distA = a.scheduledDate ? Math.abs(new Date(a.scheduledDate).getTime() - now) : Infinity;
                    const distB = b.scheduledDate ? Math.abs(new Date(b.scheduledDate).getTime() - now) : Infinity;
                    return distA - distB;
                })[0];
                setSearchedAllocation(best);
                console.log(`Multiple allocations for ${manualPlate} — selected ID ${best.id} (status: ${best.status})`);
            }
        } catch (err) {
            console.error('Search error:', err);
            showError('Failed to search for allocation');
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirmGateAction = async () => {
        if (!searchedAllocation) return;

        setIsProcessing(true);
        try {
            const journeyPayload = {
                allocationId: searchedAllocation.id,
                siteId: 2, // Bulk Connections
                eventType: manualGate === 'entry' ? 'arrival' : 'departure',
                status: manualGate === 'entry' ? 'arrived' : 'departed',
                detectionMethod: 'manual_entry',
                detectionSource: 'Loading Board - Manual Gate Entry',
                notes: `Manual ${manualGate} gate action for ${searchedAllocation.vehicleReg}`
            };

            const response = await fetch(`${API_BASE_URL}/site-journey`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(journeyPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to record gate action');
            }

            success(`${manualGate === 'entry' ? 'Check-in' : 'Check-out'} recorded successfully for ${searchedAllocation.vehicleReg}`);

            // Reset and close
            setIsManualEntryOpen(false);
            setManualPlate('');
            setSearchedAllocation(null);
            setManualGate('entry');

            // Refresh data
            fetchTrucks();
        } catch (err) {
            console.error('Gate action error:', err);
            showError(`Failed to record gate action: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <VisitDetailSlideOver
                truck={selectedTruck}
                onClose={() => setSelectedTruck(null)}
                onStageChange={fetchTrucks}
            />

            <Modal isOpen={isManualEntryOpen} onClose={() => { setIsManualEntryOpen(false); setManualPlate(''); setSearchedAllocation(null); }} title="Manual Gate Entry - Bulk Connections">
                <div className="space-y-5">
                    {/* Gate Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Select Gate</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setManualGate('entry')}
                                className={cn(
                                    "px-4 py-3 rounded-lg font-semibold text-sm transition-all border-2",
                                    manualGate === 'entry'
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-500"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                🚪 Entry Gate
                            </button>
                            <button
                                type="button"
                                onClick={() => setManualGate('exit')}
                                className={cn(
                                    "px-4 py-3 rounded-lg font-semibold text-sm transition-all border-2",
                                    manualGate === 'exit'
                                        ? "bg-purple-50 text-purple-700 border-purple-500"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                🚛 Exit Gate
                            </button>
                        </div>
                    </div>

                    {/* Plate Search */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Vehicle Registration</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualPlate}
                                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchPlate()}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold uppercase"
                                placeholder="ABC 123 GP"
                                disabled={isSearching}
                            />
                            <button
                                type="button"
                                onClick={handleSearchPlate}
                                disabled={isSearching || !manualPlate.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchedAllocation && (
                        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-green-700 font-bold">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Allocation Found</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Vehicle Reg</p>
                                    <p className="font-bold text-slate-900">{searchedAllocation.vehicleReg}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Driver</p>
                                    <p className="font-medium text-slate-900">{searchedAllocation.driverName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Customer</p>
                                    <p className="font-medium text-slate-900">{searchedAllocation.customer || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Product</p>
                                    <p className="font-medium text-slate-900">{searchedAllocation.product || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Order No</p>
                                    <p className="font-medium text-slate-900">{searchedAllocation.orderNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Transporter</p>
                                    <p className="font-medium text-slate-900">{searchedAllocation.transporter || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 flex justify-end gap-2 border-t">
                        <button
                            type="button"
                            onClick={() => { setIsManualEntryOpen(false); setManualPlate(''); setSearchedAllocation(null); }}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmGateAction}
                            disabled={!searchedAllocation || isProcessing}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold",
                                manualGate === 'entry'
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-purple-600 hover:bg-purple-700 text-white",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {isProcessing ? 'Processing...' : `Confirm ${manualGate === 'entry' ? 'Check-In' : 'Check-Out'}`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Detailed Stage View Modal */}
            {expandedStage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setExpandedStage(null)} />
                    <div className="relative w-full max-w-6xl h-[85vh] bg-white rounded-xl shadow-2xl p-6 mx-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
                        <div className="flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const stage = stages.find(s => s.id === expandedStage);
                                    if (!stage) return null;
                                    const Icon = stage.icon;
                                    return (
                                        <>
                                            <div className={cn("p-2 rounded-lg", stage.bgColor)}>
                                                <Icon className={cn("w-6 h-6", stage.color)} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">{stage.title} - Detailed View</h3>
                                                <p className="text-sm text-slate-500">Full list of trucks currently in this stage</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <button
                                onClick={() => setExpandedStage(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>

                        {/* Filters in Modal */}
                        <div>
                            <FilterBar filters={filters} setFilters={setFilters} trucks={trucks} />
                        </div>

                        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left bg-white">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Plate</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Transporter</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Driver</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Product</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Customer</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Origin</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Order No</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b text-center">Badges</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {getTrucksByStage(expandedStage).map((truck: any) => (
                                        <tr key={truck.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{truck.plate}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{truck.transporter}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{truck.driver}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{truck.product}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{truck.customer}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{truck.collection}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{truck.orderNo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {truck.badges && truck.badges.length > 0 ? (
                                                    <div className="flex justify-center gap-1">
                                                        {truck.badges.map((badge: any, idx: any) => (
                                                            <span key={idx} className={cn("w-2 h-2 rounded-full",
                                                                badge === 'invalid_plate' ? "bg-red-500" :
                                                                    badge === 'non_matched_anpr' ? "bg-amber-500" : "bg-slate-400"
                                                            )} title={getBadgeLabel(badge)} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTruck(truck);
                                                        // Optional: Close expanded view or keep it open? detail slideover usually overlaps
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-bold"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {getTrucksByStage(expandedStage).length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                                No trucks found in this stage matching current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-slate-900">Loading Board</h1>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                <span className="font-medium">Port View - Full Operations</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition space-x-2 shadow-sm">
                            <RefreshCw className="w-4 h-4" />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={() => setIsManualEntryOpen(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20"
                        >
                            <span>Manual Entry</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar - Main View */}
                <FilterBar filters={filters} setFilters={setFilters} trucks={trucks} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-xs font-medium text-slate-500">Total Trucks</span>
                        <div className="text-lg font-bold text-slate-900">{trucks.length} Today</div>
                    </div>
                    <Truck className="w-8 h-8 text-blue-100" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-xs font-medium text-slate-500">Checked In</span>
                        <div className="text-lg font-bold text-emerald-600">
                            {trucks.filter((t: any) => t.stage === 'checked_in').length} Active
                        </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-100" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-xs font-medium text-slate-500">Departed</span>
                        <div className="text-lg font-bold text-purple-600">
                            {trucks.filter((t: any) => t.stage === 'departed').length} Today
                        </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-100" />
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-320px)]">
                {stages.map((stage) => {
                    const trucks = getTrucksByStage(stage.id);
                    return (
                        <div key={stage.id} className="flex flex-col h-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            {/* Column Header */}
                            <div
                                onClick={() => setExpandedStage(stage.id)}
                                className={cn(
                                    "p-3 border-b flex items-center justify-between cursor-pointer hover:bg-opacity-80 transition-colors",
                                    stage.id === "staging" ? "bg-amber-50/50 hover:bg-amber-100/50" :
                                        stage.id === "pending_arrival" ? "bg-blue-50/50 hover:bg-blue-100/50" :
                                            stage.id === "checked_in" ? "bg-emerald-50/50 hover:bg-emerald-100/50" : "bg-purple-50/50 hover:bg-purple-100/50"
                                )}>
                                <div className="flex items-center gap-2">
                                    <stage.icon className={cn("w-4 h-4", stage.color)} />
                                    <h3 className="font-bold text-slate-900 text-sm underlineDecoration-dotted underline-offset-4 decoration-slate-300 hover:underline">{stage.title}</h3>
                                </div>
                                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold border border-slate-200 text-slate-600">
                                    {trucks.length > 0 ? trucks.length : stage.count}
                                </span>
                            </div>

                            {/* Cards Container */}
                            <div className={cn(
                                "flex-1 p-3 space-y-3 overflow-y-auto",
                                stage.id === "staging" ? "bg-blue-50/30" :
                                    stage.id === "pending_arrival" ? "bg-slate-50/50" :
                                        stage.id === "checked_in" ? "bg-emerald-50/30" : "bg-purple-50/30"
                            )}>
                                {trucks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <Truck className="w-10 h-10 mb-2 stroke-1" />
                                        <p className="text-sm">No trucks in this stage</p>
                                    </div>
                                ) : (
                                    trucks.map((truck: any) => (
                                        <div
                                            key={truck.id}
                                            onClick={() => setSelectedTruck(truck)}
                                            className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group shadow-sm"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="bg-slate-100 text-slate-900 px-2 py-1 rounded font-mono font-bold text-xs">
                                                    {truck.plate}
                                                </div>
                                                {truck.ocrStatus === "requested" && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" title="OCR Requested"></div>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-xs text-slate-500">
                                                <div className="flex justify-between">
                                                    <span>Transporter:</span>
                                                    <span className="font-medium text-slate-700 truncate ml-2">{truck.transporter}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Customer:</span>
                                                    <span className="font-medium text-slate-700 truncate ml-2">{truck.customer}</span>
                                                </div>
                                                {truck.driver && (
                                                    <div className="flex justify-between">
                                                        <span>Driver:</span>
                                                        <span className="font-medium text-slate-700 truncate ml-2">{truck.driver}</span>
                                                    </div>
                                                )}
                                                {truck.product && (
                                                    <div className="flex justify-between">
                                                        <span>Product:</span>
                                                        <span className="font-medium text-slate-700 truncate ml-2">{truck.product}</span>
                                                    </div>
                                                )}
                                                {truck.orderNo && (
                                                    <div className="pt-2 mt-2 border-t border-slate-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-400 uppercase">Order</span>
                                                            <span className="text-[10px] font-bold text-slate-700">{truck.orderNo}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {truck.scheduledDate && (
                                                    <div className={cn("flex items-center justify-between", (truck.ticketNo || truck.orderNo) ? "" : "pt-2 mt-2 border-t border-slate-100")}>
                                                        <span className="text-[10px] text-slate-400 uppercase">Scheduled</span>
                                                        <span className="text-[10px] font-medium text-slate-600">
                                                            {new Date(truck.scheduledDate).toLocaleDateString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Timestamp for Staging trucks */}
                                                {truck.stage === 'staging' && truck.actualArrival && (
                                                    <div className="pt-2 mt-2 border-t border-amber-100 bg-amber-50/50 -mx-3 px-3 py-2 -mb-3">
                                                        <div className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">
                                                            Checked in at {truck.siteName || 'Lions Park'}
                                                        </div>
                                                        <div className="text-xs text-amber-800 font-semibold mt-1">
                                                            {new Date(truck.actualArrival).toLocaleString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Timestamp for Pending Arrival trucks */}
                                                {truck.stage === 'pending_arrival' && truck.departureTime && (
                                                    <div className="pt-2 mt-2 border-t border-blue-100 bg-blue-50/50 -mx-3 px-3 py-2 -mb-3">
                                                        <div className="text-[10px] text-blue-700 font-medium uppercase tracking-wide">
                                                            Departed {truck.siteName || 'Lions Park'}
                                                        </div>
                                                        <div className="text-xs text-blue-800 font-semibold mt-1">
                                                            {new Date(truck.departureTime).toLocaleString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Timestamp for Checked In trucks at Bulk */}
                                                {truck.stage === 'checked_in' && truck.bulkTimestamp && (
                                                    <div className="pt-2 mt-2 border-t border-emerald-100 bg-emerald-50/50 -mx-3 px-3 py-2 -mb-3">
                                                        <div className="text-[10px] text-emerald-700 font-medium uppercase tracking-wide">
                                                            Checked in at Bulk Connections
                                                        </div>
                                                        <div className="text-xs text-emerald-800 font-semibold mt-1">
                                                            {new Date(truck.bulkTimestamp).toLocaleString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Timestamp for Departed trucks from Bulk */}
                                                {truck.stage === 'departed' && truck.bulkTimestamp && (
                                                    <div className="pt-2 mt-2 border-t border-purple-100 bg-purple-50/50 -mx-3 px-3 py-2 -mb-3">
                                                        <div className="text-[10px] text-purple-700 font-medium uppercase tracking-wide">
                                                            Departed from Bulk Connections
                                                        </div>
                                                        <div className="text-xs text-purple-800 font-semibold mt-1">
                                                            {new Date(truck.bulkTimestamp).toLocaleString('en-ZA', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Badges */}
                                            {truck.badges && truck.badges.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {truck.badges.map((badge: any, idx: number) => (
                                                        <span key={idx} className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase border", getBadgeColor(badge))}>
                                                            {getBadgeLabel(badge)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Toast Notifications */}
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
