"use client";

import { Ship, Anchor, Calendar, Clock, MapPin, MoreHorizontal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const vessels = [
    { id: "VSL-001", name: "MV Atlantic Star", status: "Docked", berth: "Berth 4", eta: "2024-03-20 08:00", etd: "2024-03-23 16:00", cargo: "Coal", quantity: "45,000t" },
    { id: "VSL-002", name: "Pacific Warrior", status: "Incoming", berth: "Anchorage", eta: "2024-03-24 12:00", etd: "2024-03-27 10:00", cargo: "Iron Ore", quantity: "60,000t" },
    { id: "VSL-003", name: "Nordic Blue", status: "Departed", berth: "-", eta: "2024-03-15", etd: "2024-03-18 14:30", cargo: "Chrome", quantity: "30,000t" },
    { id: "VSL-004", name: "Eastern Pearl", status: "Incoming", berth: "Anchorage", eta: "2024-03-26 06:00", etd: "2024-03-29 18:00", cargo: "Coal", quantity: "50,000t" },
];

export default function VesselManagementPage() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <div className="space-y-6">
            <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Register New Vessel">
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Vessel Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g MV Pacific Star" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">ETA</label>
                            <input type="datetime-local" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">ETD (Est.)</label>
                            <input type="datetime-local" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Cargo Type</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option>Coal</option>
                                <option>Iron Ore</option>
                                <option>Chrome</option>
                                <option>Magnetite</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Quantity (Tons)</label>
                            <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="0" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsRegisterOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Register Vessel</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vessel Management</h1>
                    <p className="text-slate-500">Track vessel arrivals, berthing allocations, and departures</p>
                </div>
                <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    <Ship className="w-4 h-4 mr-2" />
                    Register Vessel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Columns */}
                <div className="space-y-4">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Incoming
                    </h2>
                    {vessels.filter(v => v.status === "Incoming").map(vessel => (
                        <VesselCard key={vessel.id} vessel={vessel} />
                    ))}
                </div>

                <div className="space-y-4">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        Docked / Berthing
                    </h2>
                    {vessels.filter(v => v.status === "Docked").map(vessel => (
                        <VesselCard key={vessel.id} vessel={vessel} />
                    ))}
                </div>

                <div className="space-y-4">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                        Departed
                    </h2>
                    {vessels.filter(v => v.status === "Departed").map(vessel => (
                        <VesselCard key={vessel.id} vessel={vessel} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function VesselCard({ vessel }: { vessel: any }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Ship className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{vessel.name}</h3>
                        <p className="text-xs text-slate-500">{vessel.id}</p>
                    </div>
                </div>
                {vessel.status === 'Docked' && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-100">{vessel.berth}</span>
                )}
            </div>

            <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-2"><Anchor className="w-3 h-3" /> Cargo</span>
                    <span className="font-medium text-slate-900">{vessel.cargo} ({vessel.quantity})</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-2"><Clock className="w-3 h-3" /> ETA</span>
                    <span className="font-medium text-slate-900">{vessel.eta}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-2"><ArrowRight className="w-3 h-3" /> ETD</span>
                    <span className="font-medium text-slate-900">{vessel.etd}</span>
                </div>
            </div>
        </div>
    )
}
