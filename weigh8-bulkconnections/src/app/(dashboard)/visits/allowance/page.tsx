"use client";

import { Search, Filter, Plus, BarChart, Clock, Truck, Weight, MoreHorizontal, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function AllowanceManagementPage() {
    const [allowances, setAllowances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAllowanceOpen, setIsAllowanceOpen] = useState(false);

    useEffect(() => {
        fetchAllowances();
    }, []);

    const fetchAllowances = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/visits/allowances`);
            if (!response.ok) throw new Error('Failed to fetch allowances');
            const data = await response.json();
            setAllowances(data.allowances || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Modal isOpen={isAllowanceOpen} onClose={() => setIsAllowanceOpen(false)} title="Add New Allowance">
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Entity Name (Client / Transporter)</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Anglo American" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Allowance Type</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option>Tonnage</option>
                                <option>Truck Count</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Allocation Amount</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 1000 tons" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Period / Frequency</label>
                        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                            <option>Daily</option>
                            <option>Weekly</option>
                            <option>Monthly</option>
                            <option>Perpetual</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Valid From</label>
                            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Valid Until</label>
                            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAllowanceOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Set Allowance</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Allowance Management</h1>
                    <p className="text-slate-500">Manage truck and tonnage allocations for clients and transporters</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    <button
                        onClick={() => setIsAllowanceOpen(true)}
                        className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Allowance
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Active Allowances</span>
                        <BarChart className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-emerald-600">3</div>
                    <p className="text-xs text-slate-400 mt-1">Currently active</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Expired</span>
                        <Clock className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-red-600">1</div>
                    <p className="text-xs text-slate-400 mt-1">Need renewal</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Truck Allowances</span>
                        <Truck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-blue-600">2</div>
                    <p className="text-xs text-slate-400 mt-1">Vehicle based</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Tonnage Allowances</span>
                        <Weight className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-orange-600">2</div>
                    <p className="text-xs text-slate-400 mt-1">Weight based</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Search Allowances</h3>
                    <p className="text-sm text-slate-500">Find specific allocation rules by entity or type</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by entity name, type, or allocation..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Current Allowances</h3>
                    <p className="text-sm text-slate-500">Active allocation rules and their details</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Allocation</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Valid From</th>
                                <th className="px-6 py-4">Valid Until</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                            ) : allowances.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No allowances found</td></tr>
                            ) : allowances.map((allowance: any) => (
                                <tr key={allowance.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{allowance.entity}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {allowance.type === "Tonnage" ? <Weight className="w-4 h-4 text-orange-500" /> : <Truck className="w-4 h-4 text-blue-500" />}
                                            <span className="text-slate-600">{allowance.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{allowance.allocation}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                                            {allowance.period}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{allowance.validFrom}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{allowance.validUntil}</td>
                                    <td className="px-6 py-4 text-center">
                                        {allowance.status === 'active' ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                Expired
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-slate-400 hover:text-blue-600 transition">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
