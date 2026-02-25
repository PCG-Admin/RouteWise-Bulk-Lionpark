"use client";

import { Search, Filter, ArrowUpDown, FileText, CheckCircle2, Clock, AlertCircle, Activity, Upload, Trash2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import InternalWeighbridgeUploadModal from "@/components/InternalWeighbridgeUploadModal";
import InternalWeighbridgeDetailModal from "@/components/InternalWeighbridgeDetailModal";
import PlateSearchModal from "@/components/PlateSearchModal";
import WeightCaptureModal from "@/components/WeightCaptureModal";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

interface InternalWeighbridgeTicket {
    id: number;
    ticket_number: string;
    truck_reg: string;
    order_number: string;
    product: string;
    net_mass: number;
    match_status: 'matched' | 'unmatched';
    has_weight_discrepancy: boolean;
    weight_discrepancy_percentage: number | null;
    weight_discrepancy_amount: number | null;
    created_at: string;
    customer_name: string;
    driver_name: string;
}

export default function InternalWeighbridgePage() {
    const { toasts, removeToast, success, error: showError } = useToast();
    const { isOpen: confirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirm();

    const [tickets, setTickets] = useState<InternalWeighbridgeTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [plateSearchModalOpen, setPlateSearchModalOpen] = useState(false);
    const [weightCaptureModalOpen, setWeightCaptureModalOpen] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState<any>(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/internal-weighbridge/tickets`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch tickets');
            const data = await response.json();
            setTickets(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (ticketId: number, ticketNumber: string) => {
        const confirmed = await confirm({
            title: 'Delete Ticket',
            message: `Are you sure you want to delete ticket ${ticketNumber}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/internal-weighbridge/tickets/${ticketId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete ticket');

            success('Ticket deleted successfully');
            // Refresh the list
            await fetchTransactions();
        } catch (err: any) {
            showError(`Error deleting ticket: ${err.message}`);
        }
    };

    const handleSelectAllocation = (allocation: any) => {
        setSelectedAllocation(allocation);
        setWeightCaptureModalOpen(true);
    };

    const handleWeightCaptureSuccess = () => {
        fetchTransactions();
        setSelectedAllocation(null);
    };

    const filteredTickets = tickets.filter((t: any) =>
        t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.truck_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Internal Weighbridge</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <p>Internal weighbridge ticket tracking and allocation matching</p>
                        <span className="w-1 h-1 bg-slate-400 rounded-full" />
                        <p>Showing {filteredTickets.length} of {tickets.length} tickets</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPlateSearchModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Scale className="w-5 h-5" />
                        Capture Weight
                    </button>
                    <button
                        onClick={() => setUploadModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Upload className="w-5 h-5" />
                        Upload Ticket
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search transactions, tickets, vehicle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        All Operators
                    </button>
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Activity className="w-4 h-4 mr-2" />
                        All Status
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Internal Weighbridge Transactions</h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                        <p className="text-lg font-medium text-slate-500">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-400">
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <p className="text-lg font-medium text-red-500">{error}</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No tickets found</p>
                        <p className="text-sm">Upload an internal weighbridge ticket to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Ticket Number</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Truck Reg</th>
                                    <th className="px-6 py-4">Order Number</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4 text-right">Net Weight</th>
                                    <th className="px-6 py-4 text-center">Match Status</th>
                                    <th className="px-6 py-4 text-center">Discrepancy</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{ticket.ticket_number || `#${ticket.id}`}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(ticket.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-medium text-slate-700">
                                                {ticket.truck_reg}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{ticket.order_number || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600">{ticket.customer_name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600">{ticket.product || '-'}</td>
                                        <td className="px-6 py-4 text-right font-mono font-medium">
                                            {ticket.net_mass ? ticket.net_mass.toLocaleString() : '-'} kg
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                ticket.match_status === 'matched'
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                {ticket.match_status === 'matched' ? (
                                                    <CheckCircle2 className="w-3 h-3" />
                                                ) : (
                                                    <AlertCircle className="w-3 h-3" />
                                                )}
                                                <span className="capitalize">{ticket.match_status === 'matched' ? 'Matched' : 'Non-Matched'}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {ticket.weight_discrepancy_percentage !== null && ticket.weight_discrepancy_percentage !== undefined ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                        ticket.has_weight_discrepancy
                                                            ? "bg-red-50 text-red-700 border-red-200"
                                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                                    )}>
                                                        {ticket.has_weight_discrepancy && <AlertCircle className="w-3 h-3" />}
                                                        {ticket.weight_discrepancy_percentage ? Number(ticket.weight_discrepancy_percentage).toFixed(1) : '0.0'}%
                                                    </span>
                                                    {ticket.weight_discrepancy_amount !== null && (
                                                        <span className={cn(
                                                            "text-xs font-mono",
                                                            ticket.has_weight_discrepancy ? "text-red-600 font-medium" : "text-slate-500"
                                                        )}>
                                                            {Math.abs(Number(ticket.weight_discrepancy_amount || 0)).toLocaleString()} kg
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTicketId(ticket.id);
                                                        setDetailModalOpen(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ticket.id, ticket.ticket_number)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete ticket"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <InternalWeighbridgeUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onSuccess={() => {
                    fetchTransactions();
                }}
            />

            {/* Detail Modal */}
            <InternalWeighbridgeDetailModal
                ticketId={selectedTicketId}
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedTicketId(null);
                }}
            />

            {/* Plate Search Modal */}
            <PlateSearchModal
                isOpen={plateSearchModalOpen}
                onClose={() => setPlateSearchModalOpen(false)}
                onSelectAllocation={handleSelectAllocation}
            />

            {/* Weight Capture Modal */}
            <WeightCaptureModal
                isOpen={weightCaptureModalOpen}
                onClose={() => {
                    setWeightCaptureModalOpen(false);
                    setSelectedAllocation(null);
                }}
                allocation={selectedAllocation}
                onSuccess={handleWeightCaptureSuccess}
            />

            {/* Toast Notifications */}
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => removeToast(toast.id)}
                />
            ))}

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={confirmOptions.title}
                message={confirmOptions.message}
                confirmText={confirmOptions.confirmText}
                cancelText={confirmOptions.cancelText}
                variant={confirmOptions.variant}
            />
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
