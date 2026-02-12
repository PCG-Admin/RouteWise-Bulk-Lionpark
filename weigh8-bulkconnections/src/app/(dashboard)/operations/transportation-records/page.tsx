"use client";

import { useState } from "react";
import { FileText, Filter, Download, Calendar } from "lucide-react";
import Pagination from "@/components/Pagination";

const records = [
    { id: "TR-8821", date: "2024-03-21", origin: "Mine A", destination: "Port A", truck: "HINO-772", driver: "John Doe", weight_in: "15.2t", weight_out: "44.5t", net: "29.3t", status: "Closed" },
    { id: "TR-8822", date: "2024-03-21", origin: "Mine B", destination: "Depot C", truck: "MAN-992", driver: "Mike Smith", weight_in: "16.1t", weight_out: "45.2t", net: "29.1t", status: "Closed" },
    { id: "TR-8823", date: "2024-03-20", origin: "Mine A", destination: "Port A", truck: "VOLVO-112", driver: "Sarah Jones", weight_in: "15.8t", weight_out: "44.9t", net: "29.1t", status: "Flagged" },
    { id: "TR-8824", date: "2024-03-20", origin: "Mine C", destination: "Port B", truck: "MERC-445", driver: "Paul Wilson", weight_in: "15.5t", weight_out: "-", net: "-", status: "In Transit" },
];

export default function TransportationRecordsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Pagination calculations
    const totalItems = records.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transportation Records</h1>
                    <p className="text-slate-500">Historical log of all vehicle movements.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Date Range</span>
                    </button>
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Record ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net Weight</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedRecords.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{row.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900">{row.origin} → {row.destination}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{row.truck}</span>
                                            <span className="text-xs text-slate-500">{row.driver}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono text-right">{row.net}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${row.status === 'Closed' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                            row.status === 'Flagged' ? "bg-red-100 text-red-600 border-red-200" :
                                                "bg-blue-100 text-blue-600 border-blue-200"
                                            }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-600 hover:text-blue-500 text-sm font-medium flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {records.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                    />
                )}
            </div>
        </div>
    );
}
