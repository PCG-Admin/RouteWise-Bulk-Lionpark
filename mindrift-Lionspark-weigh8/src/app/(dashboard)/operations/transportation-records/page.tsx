"use client";

import { useState, useEffect } from "react";
import { FileText, Filter, Download, Calendar, Loader2, AlertCircle, X, Truck, User, Phone, Weight, MapPin, Package, ClipboardCheck } from "lucide-react";
import ParkingTicketModal from "@/components/ParkingTicketModal";
import ParkingTicketViewModal from "@/components/ParkingTicketViewModal";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";
import Pagination from "@/components/Pagination";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

interface TruckAllocation {
    id: number;
    tenantId: string;
    orderId: number;
    allocationRef?: string;
    vehicleReg: string;
    driverName: string | null;
    driverPhone: string | null;
    driverId: string | null;
    grossWeight: string | null;
    tareWeight: string | null;
    netWeight: string | null;
    ticketNo: string | null;
    scheduledDate: string | null;
    actualArrival: string | null;
    departureTime: string | null;
    transporter: string | null;
    status: string;
    driverValidationStatus: string | null;
    parkingTicketStatus: string | null;
    parkingTicketNumber: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    orderNumber?: string;
    product?: string;
    customer?: string;
    origin?: string;
}

export default function TransportationRecordsPage() {
    const [allocations, setAllocations] = useState<TruckAllocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<TruckAllocation | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [viewingTicketAllocationId, setViewingTicketAllocationId] = useState<number | null>(null);
    const [validatingAllocationId, setValidatingAllocationId] = useState<number | null>(null);
    const [issuingPermitId, setIssuingPermitId] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        transporter: 'All',
        orderNumber: '',
        plateNumber: '',
        ticketNumber: '',
        verificationStatus: 'All',
        loadingStatus: 'All',
    });

    useEffect(() => {
        fetchAllocations();
    }, []);

    const handleViewDetails = (allocation: TruckAllocation) => {
        setSelectedAllocation(allocation);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedAllocation(null);
    };

    const fetchAllocations = async () => {
        try {
            setLoading(true);
            setError(null);
            // Filter by site ID for Lions Park (only show allocations for this site)
            const url = SITE_ID
                ? `${API_BASE_URL}/api/truck-allocations?siteId=${SITE_ID}`
                : `${API_BASE_URL}/api/truck-allocations`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch truck allocations');
            const result = await response.json();
            setAllocations(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load truck allocations');
            setAllocations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleIssuePermit = async (allocationId: number, vehicleReg: string) => {
        if (!confirm(`Issue permit for ${vehicleReg}? This will mark the truck as "Ready for Dispatch".`)) {
            return;
        }

        setIssuingPermitId(allocationId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/truck-allocations/${allocationId}/issue-permit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await response.json();

            if (result.success) {
                await fetchAllocations();
                alert(`Permit issued successfully for ${vehicleReg}!`);
            } else {
                alert(`Failed to issue permit: ${result.error}`);
            }
        } catch (error) {
            console.error('Issue permit error:', error);
            alert('Failed to issue permit. Please try again.');
        } finally {
            setIssuingPermitId(null);
        }
    };

    // Helper functions (must be defined before use in filters)
    const getLoadingBoardStatus = (status: string) => {
        // Map database status to loading board stages for Lionspark
        if (['scheduled', 'in_transit'].includes(status)) return 'Pending Arrival';
        if (['arrived', 'weighing'].includes(status)) return 'Checked In';
        if (status === 'ready_for_dispatch') return 'Ready for Dispatch';
        if (['completed', 'cancelled'].includes(status)) return 'Departed';
        return status;
    };

    const getStatusColor = (status: string) => {
        if (['scheduled', 'in_transit'].includes(status)) return 'bg-blue-100 text-blue-600 border-blue-200';
        if (['arrived', 'weighing'].includes(status)) return 'bg-green-100 text-green-600 border-green-200';
        if (status === 'ready_for_dispatch') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
        if (['completed'].includes(status)) return 'bg-purple-100 text-purple-600 border-purple-200';
        if (['cancelled'].includes(status)) return 'bg-red-100 text-red-600 border-red-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const getVerificationStatusColor = (driverStatus: string | null, ticketStatus: string | null) => {
        if (driverStatus === 'ready_for_dispatch') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (driverStatus === 'verified') return 'bg-green-100 text-green-700 border-green-200';
        if (ticketStatus === 'partially_processed') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (driverStatus === 'pending_verification') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    };

    const getVerificationStatusText = (driverStatus: string | null, ticketStatus: string | null, loadingStatus: string) => {
        if (!['arrived', 'weighing', 'completed'].includes(loadingStatus)) return 'Not Checked In';
        if (driverStatus === 'ready_for_dispatch') return 'Ready for Dispatch';
        if (driverStatus === 'verified') return 'Verified';
        if (ticketStatus === 'partially_processed') return 'Partially Filled';
        if (driverStatus === 'pending_verification') return 'Pending';
        return 'Unknown';
    };

    // Filter allocations
    const filteredAllocations = allocations.filter((allocation) => {
        // Date range filter
        if (filters.dateFrom && allocation.scheduledDate) {
            const allocDate = new Date(allocation.scheduledDate).toISOString().split('T')[0];
            if (allocDate < filters.dateFrom) return false;
        }
        if (filters.dateTo && allocation.scheduledDate) {
            const allocDate = new Date(allocation.scheduledDate).toISOString().split('T')[0];
            if (allocDate > filters.dateTo) return false;
        }

        // Transporter filter
        if (filters.transporter !== 'All' && allocation.transporter !== filters.transporter) {
            return false;
        }

        // Order number filter
        if (filters.orderNumber && allocation.orderNumber) {
            if (!allocation.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())) {
                return false;
            }
        }

        // Plate number filter (space-insensitive)
        if (filters.plateNumber && allocation.vehicleReg) {
            const cleanedFilter = filters.plateNumber.replace(/\s+/g, '').toLowerCase();
            const cleanedPlate = allocation.vehicleReg.replace(/\s+/g, '').toLowerCase();
            if (!cleanedPlate.includes(cleanedFilter)) {
                return false;
            }
        }

        // Ticket number filter
        if (filters.ticketNumber && allocation.parkingTicketNumber) {
            if (!allocation.parkingTicketNumber.toLowerCase().includes(filters.ticketNumber.toLowerCase())) {
                return false;
            }
        }

        // Verification status filter
        if (filters.verificationStatus !== 'All') {
            if (filters.verificationStatus === 'Verified' && allocation.driverValidationStatus !== 'verified') {
                return false;
            }
            if (filters.verificationStatus === 'Partially Filled' && allocation.parkingTicketStatus !== 'partially_processed') {
                return false;
            }
            if (filters.verificationStatus === 'Pending' && (allocation.driverValidationStatus !== 'pending_verification' || allocation.parkingTicketStatus === 'partially_processed')) {
                return false;
            }
            if (filters.verificationStatus === 'Not Checked In' && ['arrived', 'weighing', 'completed'].includes(allocation.status)) {
                return false;
            }
        }

        // Loading status filter
        if (filters.loadingStatus !== 'All') {
            const boardStatus = getLoadingBoardStatus(allocation.status);
            if (boardStatus !== filters.loadingStatus) {
                return false;
            }
        }

        return true;
    });

    // Get unique values for filters
    const uniqueTransporters: string[] = ['All', ...Array.from(new Set(allocations.map(a => a.transporter).filter((t): t is string => Boolean(t))))];

    // Pagination calculations
    const totalItems = filteredAllocations.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAllocations = filteredAllocations.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                <p className="text-slate-600">Loading transportation records...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Error loading transportation records</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                    <button
                        onClick={fetchAllocations}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (allocations.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Transportation Records</h1>
                        <p className="text-slate-500">Historical log of all vehicle movements.</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No truck allocations found</p>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transportation Records</h1>
                    <p className="text-slate-500">Historical log of all vehicle movements and truck allocations.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Date From</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Date To</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Plate Number</label>
                        <input
                            type="text"
                            value={filters.plateNumber}
                            onChange={(e) => setFilters({ ...filters, plateNumber: e.target.value.toUpperCase() })}
                            placeholder="Search plate..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Ticket Number</label>
                        <input
                            type="text"
                            value={filters.ticketNumber}
                            onChange={(e) => setFilters({ ...filters, ticketNumber: e.target.value })}
                            placeholder="Search ticket..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Transporter</label>
                        <select
                            value={filters.transporter}
                            onChange={(e) => setFilters({ ...filters, transporter: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {uniqueTransporters.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Order Number</label>
                        <input
                            type="text"
                            value={filters.orderNumber}
                            onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
                            placeholder="Search order..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Verification Status</label>
                        <select
                            value={filters.verificationStatus}
                            onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="All">All</option>
                            <option value="Verified">Verified</option>
                            <option value="Partially Filled">Partially Filled</option>
                            <option value="Pending">Pending</option>
                            <option value="Not Checked In">Not Checked In</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Loading Status</label>
                        <select
                            value={filters.loadingStatus}
                            onChange={(e) => setFilters({ ...filters, loadingStatus: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="All">All</option>
                            <option value="Pending Arrival">Pending Arrival</option>
                            <option value="Checked In">Checked In</option>
                            <option value="Ready for Dispatch">Ready for Dispatch</option>
                            <option value="Departed">Departed</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                        Showing <span className="font-semibold text-slate-900">{filteredAllocations.length}</span> of{' '}
                        <span className="font-semibold text-slate-900">{allocations.length}</span> records
                    </p>
                    <button
                        onClick={() => setFilters({
                            dateFrom: '',
                            dateTo: '',
                            transporter: 'All',
                            orderNumber: '',
                            plateNumber: '',
                            ticketNumber: '',
                            verificationStatus: 'All',
                            loadingStatus: 'All',
                        })}
                        className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plate Number</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Number</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net Weight</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Board Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedAllocations.map((allocation) => (
                                <tr key={allocation.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            {allocation.allocationRef && (
                                                <span className="text-xs font-semibold text-blue-600 mb-0.5">
                                                    {allocation.allocationRef}
                                                </span>
                                            )}
                                            <span className="text-sm font-medium text-slate-900">
                                                {allocation.orderNumber || `Order #${allocation.orderId}`}
                                            </span>
                                            {allocation.customer && (
                                                <span className="text-xs text-slate-500">{allocation.customer}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {allocation.scheduledDate
                                            ? new Date(allocation.scheduledDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                              })
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900">
                                                {allocation.origin || '-'}
                                            </span>
                                            {allocation.product && (
                                                <span className="text-xs text-slate-500">{allocation.product}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{allocation.vehicleReg}</span>
                                            {allocation.driverName && (
                                                <span className="text-xs text-slate-500">{allocation.driverName}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {allocation.parkingTicketNumber ? (
                                            <button
                                                onClick={() => setViewingTicketAllocationId(allocation.id)}
                                                className="font-mono text-blue-600 font-medium hover:text-blue-700 hover:underline transition"
                                            >
                                                {allocation.parkingTicketNumber}
                                            </button>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono text-right">
                                        {allocation.netWeight ? `${allocation.netWeight}t` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(allocation.status)}`}>
                                            {getLoadingBoardStatus(allocation.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getVerificationStatusColor(allocation.driverValidationStatus, allocation.parkingTicketStatus)}`}>
                                                {getVerificationStatusText(allocation.driverValidationStatus, allocation.parkingTicketStatus, allocation.status)}
                                            </span>
                                            {/* Show Complete Validation button for checked-in trucks that are not yet verified */}
                                            {['arrived', 'weighing'].includes(allocation.status) && allocation.driverValidationStatus !== 'verified' && allocation.driverValidationStatus !== 'ready_for_dispatch' && (
                                                <button
                                                    onClick={() => setValidatingAllocationId(allocation.id)}
                                                    className="text-green-600 hover:text-green-700 text-xs font-medium flex items-center gap-1"
                                                >
                                                    <ClipboardCheck className="w-3 h-3" /> Complete Validation
                                                </button>
                                            )}
                                            {/* Show Issue Permit button for verified trucks */}
                                            {allocation.driverValidationStatus === 'verified' && allocation.status !== 'completed' && (
                                                <button
                                                    onClick={() => handleIssuePermit(allocation.id, allocation.vehicleReg)}
                                                    disabled={issuingPermitId === allocation.id}
                                                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {issuingPermitId === allocation.id ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" /> Issuing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileText className="w-3 h-3" /> Issue Permit
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleViewDetails(allocation)}
                                            className="text-blue-600 hover:text-blue-500 text-sm font-medium flex items-center gap-1"
                                        >
                                            <FileText className="w-3 h-3" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    itemsPerPageOptions={[10, 25, 50, 100]}
                />
            </div>

            {/* Allocation Details Modal */}
            <OrderDetailSlideOver
                order={selectedAllocation}
                onClose={closeModal}
                onStageChange={fetchAllocations}
            />

            {/* Parking Ticket View Modal (Read-Only) */}
            {viewingTicketAllocationId && (
                <ParkingTicketViewModal
                    allocationId={viewingTicketAllocationId}
                    onClose={() => setViewingTicketAllocationId(null)}
                />
            )}

            {/* Driver Validation Modal (Editable) */}
            {validatingAllocationId && (
                <ParkingTicketModal
                    allocationId={validatingAllocationId}
                    onClose={() => setValidatingAllocationId(null)}
                    onSuccess={() => {
                        fetchAllocations();
                        setValidatingAllocationId(null);
                    }}
                />
            )}
        </div>
    );
}
