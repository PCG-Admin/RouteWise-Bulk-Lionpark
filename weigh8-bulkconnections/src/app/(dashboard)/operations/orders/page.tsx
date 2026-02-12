"use client";

import { Eye, Edit, Trash2, Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { OrderDetailSlideOver } from "@/components/OrderDetailSlideOver";
import Pagination from "@/components/Pagination";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrdersPage() {
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch orders from API
    useEffect(() => {
        let isMounted = true;

        async function fetchOrders() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders`);
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
            const response = await fetch(`${API_BASE_URL}/api/orders`);
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
                alert(`Success! Created order ${result.data.order.orderNumber} with ${result.data.allocations.length} truck allocations.`);
            } else {
                alert(`Failed to create order: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Network error occurred while creating order');
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
        if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                await refetchOrders();
                alert('Order deleted successfully');
            } else {
                alert(`Failed to delete order: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Network error occurred while deleting order');
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
                body: JSON.stringify(editingOrder),
            });

            const result = await response.json();

            if (result.success) {
                await refetchOrders();
                setShowEditModal(false);
                setEditingOrder(null);
                alert('Order updated successfully');
            } else {
                alert(`Failed to update order: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Network error occurred while updating order');
        }
    };

    // Pagination calculations
    const totalItems = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <OrderDetailSlideOver
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

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
                    <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
                    <p className="text-slate-500">Manage active orders and allocations</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                    <Upload className="w-5 h-5" />
                    <span>New Order</span>
                </button>
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
                                    Excel File
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
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
                                    Supported formats: .xlsx, .xls, .csv
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
                                <h3 className="text-xl font-bold text-slate-800">{order.orderNumber}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>Details</span>
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
        </div>
    );
}
