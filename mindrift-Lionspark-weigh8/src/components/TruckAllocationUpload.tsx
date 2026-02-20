"use client";

import { useState } from "react";
import { X, Upload, FileSpreadsheet, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TruckAllocationUploadProps {
    order: any;
    onClose: () => void;
    onSuccess: () => void;
}

export function TruckAllocationUpload({ order, onClose, onSuccess }: TruckAllocationUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !order) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('truckFile', file);
            formData.append('orderId', order.id.toString());

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_BASE_URL}/api/truck-allocations/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'Upload failed');
            }

            setResult(data);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload truck allocations');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 mx-4 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Allocate Trucks</h2>
                            <p className="text-sm text-slate-500">Order: {order?.orderNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Order Info */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Product</p>
                            <p className="font-medium text-slate-900">{order?.product}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Quantity</p>
                            <p className="font-medium text-slate-900">
                                {order?.quantity ? `${parseFloat(order.quantity).toLocaleString()} ${order.unit || 'tons'}` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* File Upload */}
                {!result && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="truck-file-input"
                            />
                            <label
                                htmlFor="truck-file-input"
                                className="cursor-pointer flex flex-col items-center"
                            >
                                <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-3" />
                                <p className="text-sm font-medium text-slate-700 mb-1">
                                    {file ? file.name : 'Click to select Excel file'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Supports .xlsx, .xls, .csv files (max 10MB)
                                </p>
                            </label>
                        </div>

                        {file && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800 font-medium mb-2">Selected File:</p>
                                <p className="text-sm text-blue-700">{file.name}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                        )}

                        {/* Expected Format Info */}
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">Expected Excel Columns:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                <div>• Vehicle Reg / Truck Number</div>
                                <div>• Driver Name</div>
                                <div>• Driver Phone</div>
                                <div>• Gross Weight (optional)</div>
                                <div>• Tare Weight (optional)</div>
                                <div>• Scheduled Date (optional)</div>
                                <div>• Transporter (optional)</div>
                                <div>• Notes (optional)</div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic">
                                * Column names are flexible - the system will automatically detect and map them
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">Upload Failed</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className={cn(
                                    "px-6 py-2 rounded-lg font-medium text-white transition flex items-center gap-2",
                                    !file || uploading
                                        ? "bg-slate-300 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                )}
                            >
                                <Upload className="w-4 h-4" />
                                {uploading ? 'Uploading...' : 'Upload Trucks'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Result */}
                {result && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <p className="text-lg font-medium text-green-800 mb-2">
                                {result.message}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white rounded-lg p-3">
                                    <p className="text-2xl font-bold text-green-600">
                                        {result.data.totalImported}
                                    </p>
                                    <p className="text-sm text-slate-600">Trucks Imported</p>
                                </div>
                                {result.data.totalSkipped > 0 && (
                                    <div className="bg-white rounded-lg p-3">
                                        <p className="text-2xl font-bold text-amber-600">
                                            {result.data.totalSkipped}
                                        </p>
                                        <p className="text-sm text-slate-600">Duplicates Skipped</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-center text-slate-500">
                            Closing automatically...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
