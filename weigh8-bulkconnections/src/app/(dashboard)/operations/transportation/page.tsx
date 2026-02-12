"use client";

import { Truck, Users, Activity, Settings, Plus, Search, Map, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const transporters = [
    { id: "TR-001", name: "LogiTrans Ltd", fleetSize: 45, drivers: 52, status: "active", contact: "+27 11 123 4567" },
    { id: "TR-002", name: "Dube Transport", fleetSize: 12, drivers: 15, status: "active", contact: "+27 11 987 6543" },
    { id: "TR-003", name: "FastHaul Logistics", fleetSize: 28, drivers: 30, status: "warning", contact: "+27 82 555 0000" },
    { id: "TR-004", name: "Mega Moves", fleetSize: 8, drivers: 8, status: "inactive", contact: "+27 73 111 2222" },
];

export default function TransportationPage() {
    const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <Modal isOpen={isTransporterModalOpen} onClose={() => setIsTransporterModalOpen(false)} title="Register New Transporter">
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Company Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. ABC Logistics" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Registration Number</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Contact Number</label>
                            <input type="tel" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="+27..." />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Fleet Size (Est.)</label>
                            <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Initial Drivers</label>
                            <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsTransporterModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Register Transporter</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Transportation</h1>
                    <p className="text-slate-500">Manage transporters, fleets, and driver allocations</p>
                </div>
                <button
                    onClick={() => setIsTransporterModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Transporter
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transporters..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-50">
                    {transporters.map(transporter => (
                        <div key={transporter.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-600">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{transporter.name}</h3>
                                        <span className={cn(
                                            "inline-flex items-center text-[10px] font-bold uppercase tracking-wide",
                                            transporter.status === 'active' ? "text-emerald-600" :
                                                transporter.status === 'warning' ? "text-amber-600" : "text-slate-400"
                                        )}>
                                            {transporter.status}
                                        </span>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-blue-600">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                    <span className="text-slate-500 flex items-center gap-2"><Truck className="w-4 h-4" /> Fleet Size</span>
                                    <span className="font-medium text-slate-900">{transporter.fleetSize} Trucks</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                    <span className="text-slate-500 flex items-center gap-2"><Users className="w-4 h-4" /> Drivers</span>
                                    <span className="font-medium text-slate-900">{transporter.drivers} Active</span>
                                </div>
                                <div className="flex justify-between text-sm pt-1">
                                    <span className="text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Contact</span>
                                    <span className="font-medium text-slate-700">{transporter.contact}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
