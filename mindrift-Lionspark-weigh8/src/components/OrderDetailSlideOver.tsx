"use client";

import { X, FileText, User, Truck, Clock, Download, Printer, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

interface OrderDetailProps {
    order: any;
    onClose: () => void;
    onStageChange?: () => void;
}

export function OrderDetailSlideOver({ order, onClose, onStageChange }: OrderDetailProps) {
    const [activeTab, setActiveTab] = useState("allocation");
    const [parkingTicket, setParkingTicket] = useState<any>(null);
    const [loadingTicket, setLoadingTicket] = useState(true);
    const [journeyHistory, setJourneyHistory] = useState<any[]>([]);

    // Fetch journey history when order is loaded
    useEffect(() => {
        if (order?.id) {
            const fetchJourneyHistory = async () => {
                try {
                    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                    const response = await fetch(`${API_BASE_URL}/api/site-journey/allocation/${order.id}`, { credentials: 'include' });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            setJourneyHistory(data.data);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch journey history:', error);
                }
            };
            fetchJourneyHistory();
        }
    }, [order?.id]);

    // Debug: Log order data to see what we're working with
    useEffect(() => {
        console.log('🔍 Order data for timeline:', {
            createdAt: order?.createdAt,
            scheduledDate: order?.scheduledDate,
            actualArrival: order?.actualArrival,
            departureTime: order?.departureTime,
            journeyHistory,
            fullOrder: order
        });
    }, [order, journeyHistory]);

    // Build timeline events - memoized so it recalculates when order or journey changes
    const timelineEvents = useMemo(() => {
        const events: any[] = [];
        console.log('🎯 Building timeline for order:', order);

        if (!order) return events;

        // 1. Order Created
        if (order.createdAt || order.scheduledDate) {
            events.push({
                event: "Order Created",
                timestamp: order.createdAt || order.scheduledDate,
                active: true,
                color: "blue"
            });
        }

        // 2. Scheduled for Lions Park
        if (order.scheduledDate) {
            events.push({
                event: "Scheduled for Lions Park",
                timestamp: order.scheduledDate,
                active: true,
                color: "blue"
            });
        }

        // 3-4. Process journey history to add check-in and departure events (Lions only - siteId 1)
        journeyHistory
            .filter((journey: any) => journey.siteId === 1) // Only show Lions Park events
            .forEach((journey: any) => {
                if (journey.eventType === 'arrival' && journey.status === 'arrived') {
                    events.push({
                        event: `Checked In at Lions Park Truck Stop`,
                        timestamp: journey.timestamp,
                        active: true,
                        color: "green"
                    });
                } else if (journey.eventType === 'departure' && journey.status === 'departed') {
                    events.push({
                        event: `Departed Lions Park`,
                        timestamp: journey.timestamp,
                        active: true,
                        color: "purple"
                    });
                }
            });

        // Sort timeline events by timestamp (chronological order)
        events.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        console.log('📋 Timeline events:', events);
        console.log('📊 Timeline events count:', events.length);

        return events;
    }, [order, journeyHistory]);

    // Fetch parking ticket data
    useEffect(() => {
        if (order?.id) {
            // Clear previous parking ticket data immediately when allocation changes
            setParkingTicket(null);
            setLoadingTicket(true);
            fetchParkingTicket();
        }
    }, [order?.id]);

    const fetchParkingTicket = async () => {
        try {
            setLoadingTicket(true);
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/parking-tickets/allocation/${order.id}`, { credentials: 'include' });
            const result = await response.json();
            if (result.success && result.data) {
                setParkingTicket(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch parking ticket:', error);
        } finally {
            setLoadingTicket(false);
        }
    };

    // Early return if no order
    if (!order) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-4xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Truck Allocation Details</h2>
                            <p className="text-sm text-slate-500">
                                Allocation ID: #{order.id} | {order.orderNumber || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600">
                            <Printer className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab("allocation")}
                            className={cn(
                                "py-4 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-2",
                                activeTab === "allocation"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Truck className="w-4 h-4" />
                            Allocation Details
                        </button>
                        <button
                            onClick={() => setActiveTab("details")}
                            className={cn(
                                "py-4 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-2",
                                activeTab === "details"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Info className="w-4 h-4" />
                            Details & Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab("parking-ticket")}
                            className={cn(
                                "py-4 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-2",
                                activeTab === "parking-ticket"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            Parking Ticket
                            {parkingTicket?.status === 'processed' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">

                    {/* Allocation Details Tab */}
                    {activeTab === "allocation" && (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Quantity</p>
                            <p className="text-lg font-bold text-slate-900 mt-1">
                                {order.quantity ? `${parseFloat(order.quantity).toLocaleString()} ${order.unit || 'tons'}` : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-semibold text-blue-500 uppercase">Status</p>
                            <p className="text-lg font-bold text-blue-600 mt-1 capitalize">{order.status || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-semibold text-amber-500 uppercase">Priority</p>
                            <p className="text-lg font-bold text-amber-600 mt-1 capitalize">{order.priority || 'Normal'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-semibold text-emerald-500 uppercase">Product</p>
                            <p className="text-lg font-bold text-emerald-600 mt-1">{order.product || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Truck Allocation Details */}
                    {(order.vehicleReg || order.grossWeight || order.tareWeight || order.netWeight || order.driverName || order.ticketNo || order.parkingTicketNumber) && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <Truck className="w-5 h-5 text-blue-600" />
                                Truck Allocation Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vehicle & Transport Info */}
                                <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-3">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Vehicle & Transport</h4>
                                    {order.vehicleReg && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Vehicle Registration</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded inline-block mt-1">
                                                {order.vehicleReg}
                                            </p>
                                        </div>
                                    )}
                                    {order.transporter && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Transporter</p>
                                            <p className="text-sm font-medium text-slate-900">{order.transporter}</p>
                                        </div>
                                    )}
                                    {order.customer && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Customer</p>
                                            <p className="text-sm font-medium text-slate-900">{order.customer}</p>
                                        </div>
                                    )}
                                    {order.product && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Product</p>
                                            <p className="text-sm font-medium text-slate-900">{order.product}</p>
                                        </div>
                                    )}
                                    {order.ticketNo && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Mine Order Ticket</p>
                                            <p className="text-sm font-medium text-slate-900">{order.ticketNo}</p>
                                        </div>
                                    )}
                                    {order.parkingTicketNumber && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Lions Park Parking Ticket</p>
                                            <p className="text-sm font-bold text-blue-600">{order.parkingTicketNumber}</p>
                                        </div>
                                    )}
                                    {order.scheduledDate && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Scheduled Date</p>
                                            <p className="text-sm font-medium text-slate-900">
                                                {new Date(order.scheduledDate).toLocaleDateString('en-ZA', {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Driver Info */}
                                {(parkingTicket?.driverName || order.driverName || parkingTicket?.driverContactNumber || order.driverPhone || parkingTicket?.driverIdNumber || order.driverId) && (
                                    <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-3">
                                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            Driver Information
                                            {parkingTicket?.status === 'processed' && (
                                                <span className="ml-auto">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                </span>
                                            )}
                                        </h4>
                                        {(parkingTicket?.driverName || order.driverName) && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Name</p>
                                                <p className="text-sm font-medium text-slate-900">{parkingTicket?.driverName || order.driverName}</p>
                                            </div>
                                        )}
                                        {(parkingTicket?.driverContactNumber || order.driverPhone) && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Phone</p>
                                                <p className="text-sm font-medium text-slate-900">{parkingTicket?.driverContactNumber || order.driverPhone}</p>
                                            </div>
                                        )}
                                        {(parkingTicket?.driverIdNumber || order.driverId) && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Driver ID Number</p>
                                                <p className="text-sm font-medium text-slate-900">{parkingTicket?.driverIdNumber || order.driverId}</p>
                                            </div>
                                        )}
                                        {parkingTicket?.driverPermitNumber && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Permit/License Number</p>
                                                <p className="text-sm font-medium text-slate-900">{parkingTicket.driverPermitNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Weight Information */}
                                {(order.grossWeight || order.tareWeight || order.netWeight) && (
                                    <div className="bg-white p-4 rounded-lg border border-green-100 md:col-span-2">
                                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-4">Weight Information</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            {order.grossWeight && (
                                                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <p className="text-xs text-slate-500 uppercase mb-1">Gross Weight</p>
                                                    <p className="text-xl font-bold text-slate-900">
                                                        {parseFloat(order.grossWeight).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">kg</p>
                                                </div>
                                            )}
                                            {order.tareWeight && (
                                                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <p className="text-xs text-slate-500 uppercase mb-1">Tare Weight</p>
                                                    <p className="text-xl font-bold text-slate-900">
                                                        {parseFloat(order.tareWeight).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">kg</p>
                                                </div>
                                            )}
                                            {order.netWeight && (
                                                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <p className="text-xs text-green-600 uppercase mb-1 font-semibold">Net Weight</p>
                                                    <p className="text-xl font-bold text-green-700">
                                                        {parseFloat(order.netWeight).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-green-500 mt-1">kg</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                )}

                    {activeTab === "details" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    Order Information
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Order Number</p>
                                        <p className="text-sm font-medium text-slate-900">{order.orderNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Product</p>
                                        <p className="text-sm font-medium text-slate-900">{order.product || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Quantity</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {order.quantity ? `${parseFloat(order.quantity).toLocaleString()} ${order.unit || 'tons'}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Status</p>
                                        <p className="text-sm font-medium text-slate-900 capitalize">{order.status || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-slate-400" />
                                    Logistics
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Origin</p>
                                        <p className="text-sm font-medium text-slate-900">{order.originAddress || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Destination</p>
                                        <p className="text-sm font-medium text-slate-900">{order.destinationAddress || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Priority</p>
                                        <p className="text-sm font-medium text-slate-900 capitalize">{order.priority || 'Normal'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Journey Timeline */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 md:col-span-2">
                                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    Journey Timeline
                                </h3>

                                {timelineEvents.length > 0 ? (
                                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                                        {timelineEvents.map((step, i) => {
                                            const getEventColor = (color: string) => {
                                                switch (color) {
                                                    case 'green': return 'border-green-500 text-green-500 bg-green-500';
                                                    case 'purple': return 'border-purple-500 text-purple-500 bg-purple-500';
                                                    case 'amber': return 'border-amber-500 text-amber-500 bg-amber-500';
                                                    default: return 'border-blue-500 text-blue-500 bg-blue-500';
                                                }
                                            };

                                            const formatTimestamp = (timestamp: string | null) => {
                                                if (!timestamp) return "-";
                                                try {
                                                    const date = new Date(timestamp);
                                                    return date.toLocaleString('en-ZA', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                } catch {
                                                    return "-";
                                                }
                                            };

                                            return (
                                                <div key={i} className="relative">
                                                    <div className={cn(
                                                        "absolute -left-[29px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white",
                                                        step.active ? getEventColor(step.color).split(' ')[0] + ' ' + getEventColor(step.color).split(' ')[1] : "border-slate-300 text-slate-300"
                                                    )}>
                                                        <div className={cn("w-2 h-2 rounded-full", step.active ? getEventColor(step.color).split(' ')[2] : "bg-transparent")} />
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-sm font-semibold mb-1", step.active ? "text-slate-900" : "text-slate-500")}>
                                                            {step.event}
                                                        </p>
                                                        <p className="text-xs text-slate-600 font-medium">
                                                            {formatTimestamp(step.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm font-medium">No timeline events available yet</p>
                                        <p className="text-xs mt-1">Events will appear as the truck progresses through the system</p>
                                    </div>
                                )}
                            </div>

                            {order.notes && (
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                                    <h3 className="font-bold text-slate-900">Notes</h3>
                                    <p className="text-sm text-slate-600">{order.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Parking Ticket Tab */}
                    {activeTab === "parking-ticket" && (
                        <div className="space-y-6">
                            {loadingTicket ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-slate-600">Loading parking ticket...</p>
                                    </div>
                                </div>
                            ) : !parkingTicket ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center max-w-md">
                                        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                            <AlertCircle className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Pending Completion</h3>
                                        <p className="text-sm text-slate-600">
                                            The parking ticket verification has not been completed yet.
                                            Please complete the verification process to view ticket details.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Status Banner */}
                                    <div className={cn(
                                        "p-4 rounded-xl border-2 flex items-center gap-3",
                                        parkingTicket.status === 'processed'
                                            ? "bg-green-50 border-green-200"
                                            : "bg-amber-50 border-amber-200"
                                    )}>
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            parkingTicket.status === 'processed'
                                                ? "bg-green-100"
                                                : "bg-amber-100"
                                        )}>
                                            {parkingTicket.status === 'processed' ? (
                                                <CheckCircle className="w-6 h-6 text-green-600" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-amber-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={cn(
                                                "font-semibold",
                                                parkingTicket.status === 'processed'
                                                    ? "text-green-900"
                                                    : "text-amber-900"
                                            )}>
                                                {parkingTicket.status === 'processed' ? 'Verification Completed' : 'Pending Verification'}
                                            </h3>
                                            <p className={cn(
                                                "text-sm",
                                                parkingTicket.status === 'processed'
                                                    ? "text-green-700"
                                                    : "text-amber-700"
                                            )}>
                                                Ticket #{parkingTicket.ticketNumber}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Parking Ticket Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Arrival Information */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-blue-600" />
                                                Arrival Information
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Arrival Date & Time</p>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {parkingTicket.arrivalDatetime ?
                                                            new Date(parkingTicket.arrivalDatetime).toLocaleString() :
                                                            'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Person on Duty</p>
                                                    <p className="text-sm font-medium text-slate-900">{parkingTicket.personOnDuty || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Terminal Number</p>
                                                    <p className="text-sm font-medium text-slate-900">{parkingTicket.terminalNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Freight Company */}
                                        <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                                            <h3 className="font-bold text-purple-900 mb-4">Freight Company</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-purple-700 uppercase">Company Name</p>
                                                    <p className="text-sm font-medium text-purple-900">{parkingTicket.freightCompanyName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-purple-700 uppercase">Delivery Address</p>
                                                    <p className="text-sm text-purple-800">{parkingTicket.deliveryAddress || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer */}
                                        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                                            <h3 className="font-bold text-green-900 mb-4">Customer / Trader</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-green-700 uppercase">Name</p>
                                                    <p className="text-sm font-medium text-green-900">{parkingTicket.customerName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-700 uppercase">Code</p>
                                                    <p className="text-sm text-green-800">{parkingTicket.customerNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-700 uppercase">Phone</p>
                                                    <p className="text-sm text-green-800">{parkingTicket.customerPhone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transporter */}
                                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                                            <h3 className="font-bold text-indigo-900 mb-4">Transporter</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-indigo-700 uppercase">Name</p>
                                                    <p className="text-sm font-medium text-indigo-900">{parkingTicket.transporterName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-700 uppercase">Code</p>
                                                    <p className="text-sm text-indigo-800">{parkingTicket.transporterNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-700 uppercase">Phone</p>
                                                    <p className="text-sm text-indigo-800">{parkingTicket.transporterPhone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Driver */}
                                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 md:col-span-2">
                                            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Driver Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-xs text-blue-700 uppercase">Name</p>
                                                    <p className="text-sm font-medium text-blue-900">{parkingTicket.driverName || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-700 uppercase">ID Number</p>
                                                    <p className="text-sm text-blue-800">{parkingTicket.driverIdNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-700 uppercase">Contact</p>
                                                    <p className="text-sm text-blue-800">{parkingTicket.driverContactNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-700 uppercase">Permit Number</p>
                                                    <p className="text-sm text-blue-800">{parkingTicket.driverPermitNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-700 uppercase">Board Number</p>
                                                    <p className="text-sm text-blue-800">{parkingTicket.boardNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Details */}
                                        {parkingTicket.remarks && (
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
                                                <h3 className="font-bold text-slate-900 mb-2">Remarks</h3>
                                                <p className="text-sm text-slate-600">{parkingTicket.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
