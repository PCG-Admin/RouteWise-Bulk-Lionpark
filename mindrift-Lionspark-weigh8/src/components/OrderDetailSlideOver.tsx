"use client";

import { X, FileText, User, Truck, Clock, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrderDetailProps {
    order: any;
    onClose: () => void;
    onStageChange?: () => void;
}

export function OrderDetailSlideOver({ order, onClose, onStageChange }: OrderDetailProps) {
    const [activeTab, setActiveTab] = useState("details");

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
                            <h2 className="text-xl font-bold text-slate-900">{order.orderNumber}</h2>
                            <p className="text-sm text-slate-500">
                                Created on {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
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
                            onClick={() => setActiveTab("details")}
                            className={cn(
                                "py-4 text-sm font-medium border-b-2 transition-colors capitalize",
                                activeTab === "details"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Details
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">

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
                    {(order.vehicleReg || order.grossWeight || order.tareWeight || order.netWeight || order.driverName || order.ticketNo) && (
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
                                    {order.ticketNo && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Ticket Number</p>
                                            <p className="text-sm font-bold text-blue-600">{order.ticketNo}</p>
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
                                {(order.driverName || order.driverPhone || order.driverId) && (
                                    <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-3">
                                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            Driver Information
                                        </h4>
                                        {order.driverName && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Name</p>
                                                <p className="text-sm font-medium text-slate-900">{order.driverName}</p>
                                            </div>
                                        )}
                                        {order.driverPhone && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Phone</p>
                                                <p className="text-sm font-medium text-slate-900">{order.driverPhone}</p>
                                            </div>
                                        )}
                                        {order.driverId && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Driver ID</p>
                                                <p className="text-sm font-medium text-slate-900">{order.driverId}</p>
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

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    Timeline
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Created</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Requested Pickup Date</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {order.requestedPickupDate ? new Date(order.requestedPickupDate).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Requested Delivery Date</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    {order.actualPickupDate && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Actual Pickup Date</p>
                                            <p className="text-sm font-medium text-slate-900">
                                                {new Date(order.actualPickupDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                    {order.actualDeliveryDate && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Actual Delivery Date</p>
                                            <p className="text-sm font-medium text-slate-900">
                                                {new Date(order.actualDeliveryDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {order.notes && (
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                                    <h3 className="font-bold text-slate-900">Notes</h3>
                                    <p className="text-sm text-slate-600">{order.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
