"use client";

import { Search, Filter, User, Clock, CheckCircle2, MapPin, Building2, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const visits = [
    { id: "VST-8821", visitor: "James Wilson", type: "Business", host: "Sarah Connor", location: "Admin Block", checkIn: "08:15", status: "active" },
    { id: "VST-8822", visitor: "Mike Brown", type: "Contractor", host: "Maintenance Dept", location: "Workshop", checkIn: "09:00", status: "active" },
    { id: "VST-8823", visitor: "Lisa Ray", type: "Delivery", host: "Stores", location: "Warehouse B", checkIn: "09:30", status: "completed" },
    { id: "VST-8824", visitor: "Tom Hardy", type: "Business", host: "John Doe", location: "Meeting Room 1", checkIn: "10:00", status: "scheduled" },
];

export default function VisitsPage() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <div className="space-y-6">
            <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Pre-Register Visitor">
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Visitor Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Type</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option>Business</option>
                                <option>Contractor</option>
                                <option>Delivery</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Date</label>
                            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Host / Department</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsRegisterOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Register</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Visits Log</h1>
                    <p className="text-slate-500">Track and manage daily site visits</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                    >
                        Pre-Register Visit
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search visits..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700">
                        <Filter className="w-4 h-4 mr-2" />
                        Status
                    </button>
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700">
                        <Calendar className="w-4 h-4 mr-2" />
                        Date
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visits.map(visit => (
                    <div key={visit.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-100 rounded-full text-slate-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{visit.visitor}</h3>
                                    <p className="text-xs text-slate-500">{visit.type}</p>
                                </div>
                            </div>
                            <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase border",
                                visit.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    visit.status === 'completed' ? "bg-slate-50 text-slate-600 border-slate-200" :
                                        "bg-blue-50 text-blue-700 border-blue-200"
                            )}>
                                {visit.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-4 h-4 text-slate-400" />
                                <span>Host: {visit.host}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <span>{visit.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>Check-in: {visit.checkIn}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                            <button className="text-xs font-medium text-slate-500 hover:text-slate-900">Details</button>
                            {visit.status === 'active' && <button className="text-xs font-bold text-red-600 hover:text-red-700">Check Out</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
