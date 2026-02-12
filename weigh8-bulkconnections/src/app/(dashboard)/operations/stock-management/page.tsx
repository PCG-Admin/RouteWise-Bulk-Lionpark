"use client";

import { LayoutGrid, Map as MapIcon, Box, Activity, Plus, MapPin, Layers, Truck, AreaChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function StockManagementPage() {
    const [piles, setPiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchPiles();
    }, []);

    const fetchPiles = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/operations/stock-management`);
            if (!response.ok) throw new Error('Failed to fetch piles');
            const data = await response.json();
            setPiles(data.piles || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Stock Management</h1>
                    <p className="text-slate-500">Manage stock areas, piles, allocations, and access allowances</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <MapPin className="w-4 h-4 mr-2" />
                        New Area
                    </button>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        New Pile
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {[
                    { id: "overview", label: "Overview", icon: AreaChart },
                    { id: "areas", label: "Areas", icon: MapPin },
                    { id: "piles", label: "Piles", icon: Layers },
                    { id: "map", label: "Map View", icon: MapIcon },
                    { id: "allocations", label: "Allocations", icon: Truck },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center justify-center flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap gap-2",
                            activeTab === tab.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Total Areas</span>
                        <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">5</div>
                    <p className="text-xs text-slate-400 mt-1">Stock storage areas</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Total Piles</span>
                        <Box className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">47</div>
                    <p className="text-xs text-slate-400 mt-1">Material piles</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Active Allocations</span>
                        <Activity className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">0</div>
                    <p className="text-xs text-slate-400 mt-1">Pending deliveries</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Truck Utilization</span>
                        <Truck className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">0 / 0</div>
                    <p className="text-xs text-slate-400 mt-1">Trucks allocated / max</p>
                </div>
            </div>

            {/* Area Detail Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <MapPin className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 uppercase">ISLAND VIEW</h2>
                                <p className="text-sm text-slate-500">A001 • storage</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-full">
                            Active
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">215,000 tons</div>
                            <div className="text-xs font-medium text-slate-500 uppercase mt-1">Current Stock</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-600">215,000 tons</div>
                            <div className="text-xs font-medium text-slate-500 uppercase mt-1">Available</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">0 tons</div>
                            <div className="text-xs font-medium text-slate-500 uppercase mt-1">Allocated</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-slate-700">250,000 tons</div>
                            <div className="text-xs font-medium text-slate-500 uppercase mt-1">Capacity</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-slate-600">Utilization</span>
                            <span className="text-slate-900">86.0%</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: "86%" }}></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Piles in this area:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {loading ? (
                            <div className="col-span-3 text-center py-8 text-slate-400">Loading piles...</div>
                        ) : error ? (
                            <div className="col-span-3 text-center py-8 text-red-400">{error}</div>
                        ) : piles.length === 0 ? (
                            <div className="col-span-3 text-center py-8 text-slate-400">No piles found</div>
                        ) : (() => {
                            const totalItems = piles.length;
                            const totalPages = Math.ceil(totalItems / itemsPerPage);
                            const startIndex = (currentPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const paginatedPiles = piles.slice(startIndex, endIndex);

                            return (
                                <>
                                    {paginatedPiles.map((pile: any) => (
                                        <div key={pile.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-slate-800 text-sm">{pile.name}</h4>
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded border border-emerald-100">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mb-3">{pile.id}</p>

                                            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Material:</span>
                                                    <span className="font-medium text-slate-900">{pile.material}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Current:</span>
                                                    <span className="font-medium text-slate-900">{pile.current.toLocaleString()} tons</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Available:</span>
                                                    <span className="font-medium text-slate-900">{pile.available.toLocaleString()} tons</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            );
                        })()}
                    </div>
                    {!loading && piles.length > 0 && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(piles.length / itemsPerPage)}
                                itemsPerPage={itemsPerPage}
                                totalItems={piles.length}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={(newItemsPerPage) => {
                                    setItemsPerPage(newItemsPerPage);
                                    setCurrentPage(1);
                                }}
                                itemsPerPageOptions={[10, 25, 50, 100]}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
