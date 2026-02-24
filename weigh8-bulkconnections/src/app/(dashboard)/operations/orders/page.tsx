"use client";

import { Eye, Edit, Trash2, Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Search, Package, Clock, Truck, CheckSquare, ChevronDown, PenLine, Settings2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";
import Pagination from "@/components/Pagination";
import ManualOrderModal from "@/components/ManualOrderModal";
import ManageAllocationsModal from "@/components/ManageAllocationsModal";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrdersPage() {
    const { toasts, removeToast, success, error } = useToast();
    const { isOpen: confirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirm();

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [destinationSiteId, setDestinationSiteId] = useState<string>("1"); // Default to Lions Park
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMethodChooser, setShowMethodChooser] = useState(false);
    const [showManualOrderModal, setShowManualOrderModal] = useState(false);
    const [managingAllocationsOrder, setManagingAllocationsOrder] = useState<any>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterProduct, setFilterProduct] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    // Fetch orders from API
    useEffect(() => {
        let isMounted = true;

        async function fetchOrders() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders`, { credentials: 'include' });
                const data = await response.json();

                if (isMounted && data.success) {
                    setOrders(data.data || []);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchOrders();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            setUploadResult(null);
        }
    };

    const refetchOrders = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/orders`, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setOrders(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;

        setIsUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('excelFile', uploadFile);

            // First, get preview of the data
            const response = await fetch(`${API_BASE_URL}/api/bulk-orders/preview`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                // Show confirmation modal with preview data
                setPreviewData(result.data);
                setShowUploadModal(false);
                setShowConfirmModal(true);
            } else {
                setUploadResult({
                    success: false,
                    message: result.error || 'Failed to parse file'
                });
            }
        } catch (error) {
            console.error('Preview error:', error);
            setUploadResult({
                success: false,
                message: 'Network error occurred'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmUpload = async () => {
        if (!uploadFile) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('excelFile', uploadFile);
            formData.append('destinationSiteId', destinationSiteId);

            const response = await fetch(`${API_BASE_URL}/api/bulk-orders/excel-upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                // Close confirmation modal
                setShowConfirmModal(false);
                setPreviewData(null);
                setUploadFile(null);

                // Refresh orders list
                await refetchOrders();

                // Show success message
                success(`Success! Created order ${result.data.order.orderNumber} with ${result.data.allocations.length} truck allocations.`);
            } else {
                error(`Failed to create order: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            error('Network error occurred while creating order');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelConfirm = () => {
        setShowConfirmModal(false);
        setPreviewData(null);
        setShowUploadModal(true);
    };

    const handleDelete = async (orderId: number, orderNumber: string) => {
        const confirmed = await confirm({
            title: 'Delete Order',
            message: `Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            const result = await response.json();

            if (result.success) {
                await refetchOrders();
                success('Order deleted successfully');
            } else {
                error(`Failed to delete order: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Delete error:', err);
            error('Network error occurred while deleting order');
        }
    };

    const handleEditOrder = (order: any) => {
        setEditingOrder({...order});
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${editingOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editingOrder),
            });

            const result = await response.json();

            if (result.success) {
                await refetchOrders();
                setShowEditModal(false);
                setEditingOrder(null);
                success('Order updated successfully');
            } else {
                error(`Failed to update order: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Update error:', err);
            error('Network error occurred while updating order');
        }
    };

    // Customer options derived from orders
    const customerOptions = useMemo(() =>
        Array.from(new Set(orders.map((o: any) => o.clientName).filter(Boolean))).sort() as string[],
        [orders]
    );

    // KPI stats
    const kpiStats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter((o: any) => o.status === 'pending').length,
        inTransit: orders.filter((o: any) => o.status === 'in_transit').length,
        delivered: orders.filter((o: any) => o.status === 'delivered').length,
        cancelled: orders.filter((o: any) => o.status === 'cancelled').length,
    }), [orders]);

    // Filter logic
    const filteredOrders = orders.filter(order => {
        const q = search.trim().toLowerCase();
        if (q) {
            const haystack = [order.orderNumber, order.product, order.clientName, order.originAddress, order.destinationAddress].join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (filterStatus !== 'all' && order.status !== filterStatus) return false;
        if (filterProduct && !order.product?.toLowerCase().includes(filterProduct.toLowerCase())) return false;
        if (filterCustomer && order.clientName !== filterCustomer) return false;
        if (filterDateFrom && order.requestedPickupDate) {
            if (new Date(order.requestedPickupDate).toISOString().split('T')[0] < filterDateFrom) return false;
        }
        if (filterDateTo && order.requestedPickupDate) {
            if (new Date(order.requestedPickupDate).toISOString().split('T')[0] > filterDateTo) return false;
        }
        return true;
    });

    const hasActiveFilters = search || filterStatus !== 'all' || filterProduct || filterCustomer || filterDateFrom || filterDateTo;

    // Pagination calculations
    const totalItems = filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <OrderDetailSlideOver
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            {/* Method chooser dialog */}
            {showMethodChooser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">Create New Order</h2>
                            <button onClick={() => setShowMethodChooser(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => { setShowMethodChooser(false); setShowManualOrderModal(true); }}
                                className="w-full flex items-center gap-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 hover:border-blue-400 transition text-left"
                            >
                                <div className="p-2.5 bg-blue-600 rounded-lg shrink-0">
                                    <PenLine className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm">Manual Entry</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Fill in order and truck details manually</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setShowMethodChooser(false); setShowUploadModal(true); }}
                                className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition text-left"
                            >
                                <div className="p-2.5 bg-slate-700 rounded-lg shrink-0">
                                    <FileSpreadsheet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm">Upload Excel</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Import order data from an Excel file</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual order creation modal */}
            {showManualOrderModal && (
                <ManualOrderModal
                    onClose={() => setShowManualOrderModal(false)}
                    onSuccess={async () => {
                        setShowManualOrderModal(false);
                        await refetchOrders();
                    }}
                />
            )}

            {/* Manage allocations modal */}
            {managingAllocationsOrder && (
                <ManageAllocationsModal
                    order={managingAllocationsOrder}
                    onClose={() => setManagingAllocationsOrder(null)}
                    onSuccess={refetchOrders}
                />
            )}

            {/* Edit Order Modal */}
            {showEditModal && editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Order: {editingOrder.orderNumber}</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Order Number */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Order Number</label>
                                    <input
                                        type="text"
                                        value={editingOrder.orderNumber}
                                        onChange={(e) => setEditingOrder({...editingOrder, orderNumber: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Product */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Product</label>
                                    <input
                                        type="text"
                                        value={editingOrder.product}
                                        onChange={(e) => setEditingOrder({...editingOrder, product: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Customer Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Customer Name</label>
                                    <input
                                        type="text"
                                        value={editingOrder.clientName || ''}
                                        onChange={(e) => setEditingOrder({...editingOrder, clientName: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        value={editingOrder.quantity}
                                        onChange={(e) => setEditingOrder({...editingOrder, quantity: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Unit */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                                    <input
                                        type="text"
                                        value={editingOrder.unit || 'kg'}
                                        onChange={(e) => setEditingOrder({...editingOrder, unit: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                    <select
                                        value={editingOrder.status}
                                        onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="in_transit">In Transit</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Origin Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Origin Address</label>
                                    <input
                                        type="text"
                                        value={editingOrder.originAddress}
                                        onChange={(e) => setEditingOrder({...editingOrder, originAddress: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Destination Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Destination Address</label>
                                    <input
                                        type="text"
                                        value={editingOrder.destinationAddress}
                                        onChange={(e) => setEditingOrder({...editingOrder, destinationAddress: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                                    <select
                                        value={editingOrder.priority || 'normal'}
                                        onChange={(e) => setEditingOrder({...editingOrder, priority: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="urgent">Urgent</option>
                                        <option value="high">High</option>
                                        <option value="normal">Normal</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>

                                {/* Requested Pickup Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Date</label>
                                    <input
                                        type="date"
                                        value={editingOrder.requestedPickupDate ? new Date(editingOrder.requestedPickupDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditingOrder({...editingOrder, requestedPickupDate: e.target.value ? new Date(e.target.value).toISOString() : null})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Requested Delivery Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Date</label>
                                    <input
                                        type="date"
                                        value={editingOrder.requestedDeliveryDate ? new Date(editingOrder.requestedDeliveryDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditingOrder({...editingOrder, requestedDeliveryDate: e.target.value ? new Date(e.target.value).toISOString() : null})}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                                    <textarea
                                        value={editingOrder.notes || ''}
                                        onChange={(e) => setEditingOrder({...editingOrder, notes: e.target.value})}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Orders Dashboard</h1>
                    <p className="text-slate-500">Manage active orders and allocations</p>
                </div>
                <button
                    onClick={() => setShowMethodChooser(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                    <Package className="w-5 h-5" />
                    <span>New Order</span>
                </button>
            </div>

            {/* KPI Cards */}
            {!isLoading && orders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Orders', value: kpiStats.total, icon: Package, color: 'text-slate-700', bg: 'bg-slate-50', iconBg: 'bg-slate-100' },
                        { label: 'Pending', value: kpiStats.pending, icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-50', iconBg: 'bg-yellow-100' },
                        { label: 'In Transit', value: kpiStats.inTransit, icon: Truck, color: 'text-blue-700', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
                        { label: 'Delivered', value: kpiStats.delivered, icon: CheckSquare, color: 'text-emerald-700', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
                        { label: 'Cancelled', value: kpiStats.cancelled, icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50', iconBg: 'bg-red-100' },
                    ].map(s => (
                        <div key={s.label} className={`p-4 rounded-xl border border-slate-200 shadow-sm ${s.bg} flex items-center justify-between gap-3`}>
                            <div>
                                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                            <div className={`p-2.5 rounded-lg ${s.iconBg}`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by order number, product, customer..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[140px]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Product search */}
                    <input
                        type="text"
                        placeholder="Filter by product..."
                        value={filterProduct}
                        onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[160px]"
                    />

                    {/* Customer dropdown */}
                    <div className="relative min-w-[160px]">
                        {customerDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setCustomerDropdownOpen(false)} />}
                        <button
                            onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none flex items-center justify-between gap-2 bg-white"
                        >
                            <span className={filterCustomer ? 'text-slate-900' : 'text-slate-500'}>
                                {filterCustomer || 'All Customers'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {customerDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
                                <div onClick={() => { setFilterCustomer(''); setCurrentPage(1); setCustomerDropdownOpen(false); }}
                                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                                    All Customers
                                </div>
                                {customerOptions.map((c) => (
                                    <div key={c} onClick={() => { setFilterCustomer(c); setCurrentPage(1); setCustomerDropdownOpen(false); }}
                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${filterCustomer === c ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                                        {c}
                                    </div>
                                ))}
                                {customerOptions.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">No customers available</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Date range row */}
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Pickup Date:</span>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterProduct(''); setFilterCustomer(''); setFilterDateFrom(''); setFilterDateTo(''); setCurrentPage(1); }}
                            className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition whitespace-nowrap"
                        >
                            ✕ Clear Filters
                        </button>
                    )}
                    <span className="ml-auto text-xs text-slate-400">{filteredOrders.length} of {orders.length} orders</span>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && previewData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Confirm Order Import</h2>
                            </div>
                            <button
                                onClick={handleCancelConfirm}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3">Summary</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-blue-700 mb-1">Total Trucks</p>
                                        <p className="text-2xl font-bold text-blue-900">{previewData.summary.totalTrucks}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-700 mb-1">Total Weight</p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {parseFloat(previewData.summary.totalWeight).toFixed(2)} {previewData.summary.unit}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Order Details</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase mb-1">Order Number</p>
                                        <p className="text-sm font-semibold text-slate-900">{previewData.summary.orderNumber}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase mb-1">Product</p>
                                        <p className="text-sm font-semibold text-slate-900">{previewData.summary.product}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase mb-1">Client</p>
                                        <p className="text-sm font-semibold text-slate-900">{previewData.summary.clientName || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase mb-1">Format Detected</p>
                                        <p className="text-sm font-semibold text-slate-900 capitalize">{previewData.format}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 uppercase mb-1">Origin</p>
                                    <p className="text-sm font-semibold text-slate-900">{previewData.summary.origin || 'N/A'}</p>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 uppercase mb-1">Destination</p>
                                    <p className="text-sm font-semibold text-slate-900">{previewData.summary.destination || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Truck Allocations Preview */}
                            {previewData.allocations && previewData.allocations.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                        Truck Allocations ({previewData.allocations.length})
                                    </h3>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {previewData.allocations.slice(0, 5).map((allocation: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{allocation.vehicleReg}</p>
                                                        {allocation.driverName && (
                                                            <p className="text-slate-600 mt-1">Driver: {allocation.driverName}</p>
                                                        )}
                                                        {allocation.transporter && (
                                                            <p className="text-slate-600">Transporter: {allocation.transporter}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {allocation.netWeight && (
                                                            <p className="font-semibold text-blue-900">
                                                                {parseFloat(allocation.netWeight).toFixed(2)} kg
                                                            </p>
                                                        )}
                                                        {allocation.ticketNo && (
                                                            <p className="text-slate-500 text-xs mt-1">Ticket: {allocation.ticketNo}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {previewData.allocations.length > 5 && (
                                            <p className="text-xs text-slate-500 text-center py-2">
                                                ... and {previewData.allocations.length - 5} more trucks
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white flex gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={handleCancelConfirm}
                                disabled={isUploading}
                                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpload}
                                disabled={isUploading}
                                className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Creating Order...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Confirm & Create Order</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Upload Excel Order</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                    setUploadResult(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Order File (Excel or PDF)
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.pdf"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100
                                        file:cursor-pointer cursor-pointer
                                        border border-slate-300 rounded-lg"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Supported formats: Excel (.xlsx, .xls, .csv) or PDF (.pdf)
                                </p>
                                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    PDF files are processed using AI for automatic data extraction
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Destination Site
                                </label>
                                <select
                                    value={destinationSiteId}
                                    onChange={(e) => setDestinationSiteId(e.target.value)}
                                    disabled={isUploading}
                                    className="block w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    <option value="1">Lions Park</option>
                                    {/* Future sites will be added here */}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    Select the destination site for this order
                                </p>
                            </div>

                            {uploadFile && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-700">{uploadFile.name}</span>
                                        <span className="text-xs text-slate-500 ml-auto">
                                            {(uploadFile.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                </div>
                            )}

                            {uploadResult && (
                                <div className={`flex items-start gap-3 p-4 rounded-lg ${
                                    uploadResult.success
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-red-50 border border-red-200'
                                }`}>
                                    {uploadResult.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${
                                            uploadResult.success ? 'text-green-900' : 'text-red-900'
                                        }`}>
                                            {uploadResult.success ? 'Success!' : 'Error'}
                                        </p>
                                        <p className={`text-sm mt-1 ${
                                            uploadResult.success ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {uploadResult.message}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                    setUploadResult(null);
                                }}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFile || isUploading}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        <span>Upload & Create</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-slate-500 mt-3">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
                    <p className="text-slate-500">No orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Header Row with Actions */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800">{order.orderNumber}</h3>
                                    {/* Allocation count badge */}
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700">
                                        <Truck className="w-3 h-3" />
                                        {order.allocationCount ?? 0} truck{(order.allocationCount ?? 0) !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>Details</span>
                                    </button>
                                    <button
                                        onClick={() => setManagingAllocationsOrder(order)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                        <span>Manage Trucks</span>
                                    </button>
                                    <button
                                        onClick={() => handleEditOrder(order)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(order.id, order.orderNumber)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Sub Header info */}
                            <div className="text-sm text-slate-500 mb-6">
                                Status: <span className="font-medium text-slate-700 capitalize">{order.status}</span>
                                <span className="mx-2">•</span>
                                Priority: <span className="font-medium text-slate-700 capitalize">{order.priority || 'normal'}</span>
                            </div>

                            {/* Main Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                                <div className="space-y-1">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Product</span>
                                    <div className="text-lg font-bold text-slate-900 truncate">
                                        {order.product}
                                    </div>
                                    <div className="h-1 w-full bg-orange-500 rounded-full mt-1"></div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Customer</span>
                                    <div className="text-lg font-semibold text-slate-700 truncate">
                                        {order.clientName || 'N/A'}
                                    </div>
                                    <div className="h-1 w-full bg-purple-500 rounded-full mt-1"></div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Origin</span>
                                    <div className="text-lg font-semibold text-slate-700 truncate">
                                        {order.originAddress || 'N/A'}
                                    </div>
                                    <div className="h-1 w-full bg-blue-500 rounded-full mt-1"></div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Destination</span>
                                    <div className="text-lg font-semibold text-slate-700 truncate">
                                        {order.destinationAddress || 'N/A'}
                                    </div>
                                    <div className="h-1 w-full bg-green-500 rounded-full mt-1"></div>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100">
                                <div>
                                    <span className="text-xs text-slate-500 uppercase">Quantity</span>
                                    <div className="text-sm font-medium text-slate-900">
                                        {parseFloat(order.quantity).toFixed(2)} {order.unit}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase">Pickup Date</span>
                                    <div className="text-sm font-medium text-slate-900">
                                        {order.requestedPickupDate
                                            ? new Date(order.requestedPickupDate).toLocaleDateString()
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase">Delivery Date</span>
                                    <div className="text-sm font-medium text-slate-900">
                                        {order.requestedDeliveryDate
                                            ? new Date(order.requestedDeliveryDate).toLocaleDateString()
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase">Created</span>
                                    <div className="text-sm font-medium text-slate-900">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && orders.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    itemsPerPageOptions={[10, 25, 50]}
                />
            )}

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
