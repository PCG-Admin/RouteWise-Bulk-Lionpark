"use client";

import { Building2, Phone, Mail, MapPin, MoreHorizontal } from "lucide-react";

const partners = [
    { id: 1, name: "Anglo American", type: "Client", contact: "James Wilson", email: "j.wilson@anglo.com", phone: "+27 11 000 0000", status: "Active" },
    { id: 2, name: "Glencore", type: "Client", contact: "Sarah Brown", email: "contact@glencore.com", phone: "+27 11 000 0001", status: "Active" },
    { id: 3, name: "Unitrans", type: "Transporter", contact: "Mike Davis", email: "ops@unitrans.co.za", phone: "+27 11 000 0002", status: "Active" },
    { id: 4, name: "Imperial Logistics", type: "Transporter", contact: "Lisa Ray", email: "dispatch@imperial.com", phone: "+27 11 000 0003", status: "Review" },
];

export default function PartnersPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Business Partners</h1>
                    <p className="text-slate-500">Manage clients, transporters, and suppliers.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20">
                    Add Partner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((partner) => (
                    <div key={partner.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{partner.name}</h3>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 mb-6">
                            {partner.type}
                        </span>

                        <div className="space-y-3">
                            <div className="flex items-center text-sm text-slate-500">
                                <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                                Johannesburg, SA
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                                <Mail className="w-4 h-4 mr-3 text-slate-400" />
                                {partner.email}
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                                <Phone className="w-4 h-4 mr-3 text-slate-400" />
                                {partner.phone}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                                ))}
                            </div>
                            <button className="text-sm font-medium text-blue-600 hover:underline">View Profile</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
