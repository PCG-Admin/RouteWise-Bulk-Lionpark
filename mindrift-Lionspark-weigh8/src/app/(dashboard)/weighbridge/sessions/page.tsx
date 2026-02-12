"use client";

import { PlayCircle, StopCircle, Scale, Clock, Truck, Package, User, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";

const API_BASE_URL = "http://localhost:3001";

interface Session {
    id: string;
    visitId: string;
    lane: string;
    orderNo: string;
    vehicle: string;
    driver: string;
    product: string;
    status: string;
    tare: number | null;
    gross: number | null;
    net: number | null;
    startTime: string;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/weighbridge/sessions`);
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const data = await response.json();
            setSessions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const activeSessions = sessions.filter(s => s.status === "active");
    const closedSessions = sessions.filter(s => s.status === "closed");

    // Pagination calculations for closed sessions
    const totalItems = closedSessions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClosedSessions = closedSessions.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">Weighbridge Sessions</h1>
                        {activeSessions.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="font-medium">{activeSessions.length} Active Session{activeSessions.length !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-500">Manage active and recent weighbridge sessions</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition space-x-2 shadow-lg shadow-blue-500/20">
                        <PlayCircle className="w-5 h-5" />
                        <span>Start New Session</span>
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Error loading sessions</p>
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">Loading sessions...</p>
                    </div>
                </div>
            )}

            {/* Active Sessions Grid */}
            {!loading && !error && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Sessions</h2>
                    {activeSessions.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600">No active weighbridge sessions</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {activeSessions.map((session) => (
                        <div
                            key={session.id}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg"
                        >
                            {/* Session Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Scale className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-xl font-bold text-slate-900">{session.lane}</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 font-mono">{session.id}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-300">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase">Active</span>
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <div className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Truck className="w-4 h-4" />
                                            <span className="text-xs font-semibold">Vehicle</span>
                                        </div>
                                        <p className="font-mono font-bold text-slate-900">{session.vehicle}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <User className="w-4 h-4" />
                                            <span className="text-xs font-semibold">Driver</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{session.driver}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Package className="w-4 h-4" />
                                            <span className="text-xs font-semibold">Product</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{session.product}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-semibold">Started</span>
                                        </div>
                                        <p className="font-mono text-slate-900 text-xs">{session.startTime}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Weights */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Tare</p>
                                    <p className="text-lg font-bold text-blue-600 font-mono">{session.tare}t</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Gross</p>
                                    <p className="text-lg font-bold text-slate-400 font-mono">-</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Net</p>
                                    <p className="text-lg font-bold text-slate-400 font-mono">-</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-md">
                                    <Scale className="w-4 h-4" />
                                    Continue
                                </button>
                                <button className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition border border-red-200">
                                    <StopCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Sessions Table */}
            {!loading && !error && closedSessions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-900">Recent Completed Sessions</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session ID</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tare (t)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross (t)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net (t)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedClosedSessions.map((session) => (
                                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{session.id}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{session.vehicle}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{session.product}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{session.tare}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{session.gross}</td>
                                    <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600">{session.net}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border-slate-200 border">
                                            Closed
                                        </span>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
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
            )}
        </div>
    );
}
