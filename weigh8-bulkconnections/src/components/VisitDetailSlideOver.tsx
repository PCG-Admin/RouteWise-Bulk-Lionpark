"use client";

import { X, FileText, User, Truck, Clock, ShieldCheck, MapPin, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface VisitDetailProps {
    truck: any;
    onClose: () => void;
    onStageChange?: () => void;
}

export function VisitDetailSlideOver({ truck, onClose, onStageChange }: VisitDetailProps) {
    const [activeTab, setActiveTab] = useState("overview");
    const [isUpdating, setIsUpdating] = useState(false);

    // Early return if no truck
    if (!truck) return null;

    const stages = [
        { value: "staging", label: "Staging", color: "amber", status: "arrived" },
        { value: "pending_arrival", label: "Pending Arrival", color: "blue", status: "completed" },
        { value: "checked_in", label: "Checked In", color: "emerald", status: "bulks_arrived" },
        { value: "departed", label: "Departed", color: "purple", status: "bulks_departed" }
    ];

    const currentStage = truck.stage || 'staging';

    const handleStageChange = async (newStage: string) => {
        const targetStage = stages.find(s => s.value === newStage);
        if (!targetStage || !truck.id) return;

        setIsUpdating(true);
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
            const response = await fetch(`${API_BASE_URL}/api/truck-allocations/${truck.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStage.status })
            });

            if (!response.ok) throw new Error('Failed to update stage');

            if (onStageChange) onStageChange();
            onClose();
        } catch (error) {
            console.error('Error updating stage:', error);
            alert('Failed to update truck stage. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{truck.plate}</h2>
                            <p className="text-sm text-slate-500">Visit ID: VST-{truck.id}882</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-200 bg-white">
                    <div className="flex gap-6">
                        {["overview", "compliance", "timeline"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "py-4 text-sm font-medium border-b-2 transition-colors capitalize",
                                    activeTab === tab
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Quantity</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">
                                        {truck.quantity ? `${parseFloat(truck.quantity).toLocaleString()} ${truck.unit || 'tons'}` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs font-semibold text-blue-500 uppercase">Status</p>
                                    <p className="text-lg font-bold text-blue-600 mt-1 capitalize">{truck.status || 'N/A'}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs font-semibold text-amber-500 uppercase">Priority</p>
                                    <p className="text-lg font-bold text-amber-600 mt-1 capitalize">{truck.priority || 'Normal'}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs font-semibold text-emerald-500 uppercase">Product</p>
                                    <p className="text-lg font-bold text-emerald-600 mt-1">{truck.product || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Stage Movement */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                    Move to Stage
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {stages.map((stage) => (
                                        <button
                                            key={stage.value}
                                            onClick={() => handleStageChange(stage.value)}
                                            disabled={currentStage === stage.value || isUpdating}
                                            className={cn(
                                                "px-3 py-2.5 rounded-lg font-medium text-sm transition-all",
                                                currentStage === stage.value
                                                    ? `bg-${stage.color}-100 text-${stage.color}-700 border-2 border-${stage.color}-500 cursor-default`
                                                    : "bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200 hover:border-slate-300",
                                                isUpdating && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {stage.label}
                                            {currentStage === stage.value && (
                                                <span className={cn("block text-xs mt-1", `text-${stage.color}-600`)}>Current</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {isUpdating && (
                                    <p className="text-xs text-blue-600 mt-2 text-center">Updating stage...</p>
                                )}
                            </div>

                            {/* Truck Allocation Details */}
                            {(truck.plate || truck.grossWeight || truck.tareWeight || truck.netWeight || truck.driver || truck.ticketNo) && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                        Truck Allocation Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Vehicle & Transport Info */}
                                        <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-3">
                                            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Vehicle & Transport</h4>
                                            {truck.plate && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Vehicle Registration</p>
                                                    <p className="text-sm font-bold text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded inline-block mt-1">
                                                        {truck.plate}
                                                    </p>
                                                </div>
                                            )}
                                            {truck.transporter && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Transporter</p>
                                                    <p className="text-sm font-medium text-slate-900">{truck.transporter}</p>
                                                </div>
                                            )}
                                            {truck.ticketNo && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Ticket Number</p>
                                                    <p className="text-sm font-bold text-blue-600">{truck.ticketNo}</p>
                                                </div>
                                            )}
                                            {truck.scheduledDate && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Scheduled Date</p>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {new Date(truck.scheduledDate).toLocaleDateString('en-ZA', {
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
                                        {(truck.driver || truck.driverPhone || truck.driverId) && (
                                            <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-3">
                                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                    <User className="w-3 h-3" />
                                                    Driver Information
                                                </h4>
                                                {truck.driver && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Name</p>
                                                        <p className="text-sm font-medium text-slate-900">{truck.driver}</p>
                                                    </div>
                                                )}
                                                {truck.driverPhone && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Phone</p>
                                                        <p className="text-sm font-medium text-slate-900">{truck.driverPhone}</p>
                                                    </div>
                                                )}
                                                {truck.driverId && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Driver ID</p>
                                                        <p className="text-sm font-medium text-slate-900">{truck.driverId}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Weight Information */}
                                        {(truck.grossWeight || truck.tareWeight || truck.netWeight) && (
                                            <div className="bg-white p-4 rounded-lg border border-green-100 md:col-span-2">
                                                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-4">Weight Information</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {truck.grossWeight && (
                                                        <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                            <p className="text-xs text-slate-500 uppercase mb-1">Gross Weight</p>
                                                            <p className="text-xl font-bold text-slate-900">
                                                                {parseFloat(truck.grossWeight).toLocaleString()}
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-1">kg</p>
                                                        </div>
                                                    )}
                                                    {truck.tareWeight && (
                                                        <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                            <p className="text-xs text-slate-500 uppercase mb-1">Tare Weight</p>
                                                            <p className="text-xl font-bold text-slate-900">
                                                                {parseFloat(truck.tareWeight).toLocaleString()}
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-1">kg</p>
                                                        </div>
                                                    )}
                                                    {truck.netWeight && (
                                                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                                            <p className="text-xs text-green-600 uppercase mb-1 font-semibold">Net Weight</p>
                                                            <p className="text-xl font-bold text-green-700">
                                                                {parseFloat(truck.netWeight).toLocaleString()}
                                                            </p>
                                                            <p className="text-xs text-green-500 mt-1">kg</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Origin & Destination */}
                                        {(truck.collection || truck.destination || truck.originAddress || truck.destinationAddress) && (
                                            <div className="bg-white p-4 rounded-lg border border-purple-100 md:col-span-2">
                                                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    Logistics
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Origin</p>
                                                        <p className="text-sm font-medium text-slate-900">{truck.originAddress || truck.collection || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Destination</p>
                                                        <p className="text-sm font-medium text-slate-900">{truck.destinationAddress || truck.destination || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Order Information & Logistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        Order Information
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Order Number</p>
                                            <p className="text-sm font-medium text-slate-900">{truck.orderNo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Product</p>
                                            <p className="text-sm font-medium text-slate-900">{truck.product || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Quantity</p>
                                            <p className="text-sm font-medium text-slate-900">
                                                {truck.quantity ? `${parseFloat(truck.quantity).toLocaleString()} ${truck.unit || 'tons'}` : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Status</p>
                                            <p className="text-sm font-medium text-slate-900 capitalize">{truck.status || 'N/A'}</p>
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
                                            <p className="text-sm font-medium text-slate-900">{truck.originAddress || truck.collection || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Destination</p>
                                            <p className="text-sm font-medium text-slate-900">{truck.destinationAddress || truck.destination || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Priority</p>
                                            <p className="text-sm font-medium text-slate-900 capitalize">{truck.priority || 'Normal'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "compliance" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-900">Compliance Checks</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {[
                                    { name: "Induction", status: "valid", date: "2024-01-15" },
                                    { name: "License", status: "valid", date: "2024-05-20" },
                                    { name: "Medical", status: "expiring", date: "2024-04-01" },
                                    { name: "PDP", status: "valid", date: "2024-06-10" },
                                ].map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className={cn("w-5 h-5", doc.status === "valid" ? "text-emerald-500" : "text-amber-500")} />
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{doc.name}</p>
                                                <p className="text-xs text-slate-500">Expires: {doc.date}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                            doc.status === "valid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {doc.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "timeline" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6">
                            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                                {[
                                    { event: "Booking Created", time: "08:00", active: true },
                                    { event: "Pre-Arrival Notification", time: "08:30", active: true },
                                    { event: "Arrived at Gate", time: "09:15", active: truck.stage !== 'pending_arrival' },
                                    { event: "Induction Check", time: "09:20", active: truck.stage !== 'pending_arrival' },
                                    { event: "Weighbridge In", time: "-", active: false },
                                    { event: "Loading Started", time: "-", active: false },
                                ].map((step, i) => (
                                    <div key={i} className="relative">
                                        <div className={cn(
                                            "absolute -left-[29px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white",
                                            step.active ? "border-blue-500 text-blue-500" : "border-slate-300 text-slate-300"
                                        )}>
                                            <div className={cn("w-2 h-2 rounded-full", step.active ? "bg-blue-500" : "bg-transparent")} />
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-medium", step.active ? "text-slate-900" : "text-slate-500")}>{step.event}</p>
                                            <p className="text-xs text-slate-500">{step.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
