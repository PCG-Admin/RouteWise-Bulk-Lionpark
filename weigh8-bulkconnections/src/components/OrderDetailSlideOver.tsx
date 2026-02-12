"use client";

import { X, FileText, User, Truck, Clock, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrderDetailProps {
    order: any;
    onClose: () => void;
}

export function OrderDetailSlideOver({ order, onClose }: OrderDetailProps) {
    const [activeTab, setActiveTab] = useState("details");

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
