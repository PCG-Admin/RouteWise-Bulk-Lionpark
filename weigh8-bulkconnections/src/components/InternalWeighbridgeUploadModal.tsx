"use client";

import { useState } from "react";
import { X, Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Truck, Package, Scale } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ExtractedData {
  ticketNumber: string;
  instructionOrderNumber?: string;
  truckReg?: string;
  trailerReg?: string;
  haulier?: string;
  driverName?: string;
  driverIdNumber?: string;
  orderNumber?: string;
  customerName?: string;
  product?: string;
  grade?: string;
  destination?: string;
  stockpile?: string;
  grossMass?: number;
  tareMass?: number;
  netMass?: number;
  arrivalTime?: string;
  departureTime?: string;
  incomingClerkEmail?: string;
}

interface MatchedAllocation {
  id: number;
  orderNumber: string;
  truckReg: string;
  trailerReg?: string;
  freightCompanyName: string;
  driverName: string;
  product: string;
  quantity: number;
  quantityUnit: string;
  status: string;
  checkInTime?: string;
  siteName?: string;
}

interface WeightDiscrepancy {
  hasDiscrepancy: boolean;
  amount: number;
  percentage: number;
  allocationWeight: number;
  ticketWeight: number;
}

interface OCRResult {
  extractedData: ExtractedData;
  matchingAllocations: MatchedAllocation[];
  bestMatch?: MatchedAllocation;
  weightDiscrepancy?: WeightDiscrepancy;
  ocrConfidence: number;
  pdfFileName: string;
}

interface InternalWeighbridgeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InternalWeighbridgeUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: InternalWeighbridgeUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isPDF = selectedFile.type === "application/pdf";
      const isImage = selectedFile.type.startsWith("image/");

      if (!isPDF && !isImage) {
        setError("Please select a PDF or image file (JPG, PNG, etc.)");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/internal-weighbridge/upload-ticket`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process ticket");
      }

      const result = await response.json();
      setOcrResult(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to upload and process ticket");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!ocrResult) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/internal-weighbridge/save-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData: ocrResult.extractedData,
          matchedAllocationId: ocrResult.bestMatch?.id,
          weightDiscrepancy: ocrResult.weightDiscrepancy,
          ocrConfidence: ocrResult.ocrConfidence,
          pdfFileName: ocrResult.pdfFileName,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save ticket");
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to save ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setOcrResult(null);
    setError(null);
    setUploading(false);
    setProcessing(false);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Upload Weighbridge Ticket</h2>
            <p className="text-sm text-slate-500 mt-1">Upload PDF ticket for OCR processing and allocation matching</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={uploading || saving}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Section */}
          {!ocrResult && (
            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium text-slate-900 mb-1">
                    {file ? file.name : "Choose PDF or image to upload"}
                  </p>
                  <p className="text-sm text-slate-500">Supports PDF, JPG, PNG - Click to browse or drag and drop</p>
                </div>
              </label>

              {file && !uploading && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{file.name}</p>
                    <p className="text-xs text-blue-600">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Processing ticket with OCR...</p>
                    <p className="text-xs text-blue-600">This may take a few moments</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OCR Results */}
          {ocrResult && (
            <div className="space-y-6">
              {/* Weight Discrepancy Alert */}
              {ocrResult.weightDiscrepancy?.hasDiscrepancy && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 text-lg mb-2">Weight Discrepancy Detected</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-amber-700 font-medium">Allocation Weight</p>
                          <p className="text-amber-900 font-bold text-lg">
                            {ocrResult.weightDiscrepancy.allocationWeight.toLocaleString()} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-700 font-medium">Ticket Weight</p>
                          <p className="text-amber-900 font-bold text-lg">
                            {ocrResult.weightDiscrepancy.ticketWeight.toLocaleString()} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-700 font-medium">Difference</p>
                          <p className="text-amber-900 font-bold text-lg">
                            {ocrResult.weightDiscrepancy.amount.toLocaleString()} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-700 font-medium">Percentage</p>
                          <p className="text-amber-900 font-bold text-lg">
                            {ocrResult.weightDiscrepancy.percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Matched Allocation */}
              {ocrResult.bestMatch ? (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-900 text-lg mb-3">Matched Allocation Found</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-emerald-700 font-medium">Order Number</p>
                          <p className="text-emerald-900 font-bold">{ocrResult.bestMatch.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 font-medium">Truck Reg</p>
                          <p className="text-emerald-900 font-mono font-bold">{ocrResult.bestMatch.truckReg}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 font-medium">Driver</p>
                          <p className="text-emerald-900">{ocrResult.bestMatch.driverName}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 font-medium">Freight Company</p>
                          <p className="text-emerald-900">{ocrResult.bestMatch.freightCompanyName}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 font-medium">Product</p>
                          <p className="text-emerald-900">{ocrResult.bestMatch.product}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 font-medium">Allocated Quantity</p>
                          <p className="text-emerald-900 font-bold">
                            {ocrResult.bestMatch.quantity} {ocrResult.bestMatch.quantityUnit}
                          </p>
                        </div>
                        {ocrResult.bestMatch.checkInTime && (
                          <div className="col-span-2">
                            <p className="text-emerald-700 font-medium">Checked In At</p>
                            <p className="text-emerald-900">
                              {ocrResult.bestMatch.siteName} - {new Date(ocrResult.bestMatch.checkInTime).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg mb-1">No Matching Allocation Found</h3>
                      <p className="text-amber-700 text-sm">
                        Could not find an allocation checked in at Bulk Connections matching the truck registration and order number from this ticket.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Extracted Data Summary */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-lg">Extracted Ticket Data</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    OCR Confidence: {ocrResult.ocrConfidence ? ocrResult.ocrConfidence.toFixed(1) : '85'}%
                  </p>
                </div>
                <div className="p-6 grid grid-cols-3 gap-6">
                  {/* Vehicle Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-4">
                      <Truck className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-wide">Vehicle</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Truck Registration</p>
                      <p className="font-mono font-bold text-slate-900">{ocrResult.extractedData.truckReg || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Trailer Registration</p>
                      <p className="font-mono font-medium text-slate-700">{ocrResult.extractedData.trailerReg || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Haulier</p>
                      <p className="text-slate-900">{ocrResult.extractedData.haulier || "N/A"}</p>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-4">
                      <Package className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-wide">Order</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ticket Number</p>
                      <p className="font-mono font-bold text-slate-900">{ocrResult.extractedData.ticketNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Order Number</p>
                      <p className="font-mono font-medium text-slate-700">{ocrResult.extractedData.orderNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Product</p>
                      <p className="text-slate-900">{ocrResult.extractedData.product || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Customer</p>
                      <p className="text-slate-900">{ocrResult.extractedData.customerName || "N/A"}</p>
                    </div>
                  </div>

                  {/* Weight Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-4">
                      <Scale className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-wide">Weights</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Gross Mass</p>
                      <p className="font-mono font-bold text-slate-900">
                        {ocrResult.extractedData.grossMass ? `${ocrResult.extractedData.grossMass.toLocaleString()} kg` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tare Mass</p>
                      <p className="font-mono font-medium text-slate-700">
                        {ocrResult.extractedData.tareMass ? `${ocrResult.extractedData.tareMass.toLocaleString()} kg` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Net Mass</p>
                      <p className="font-mono font-bold text-emerald-700">
                        {ocrResult.extractedData.netMass ? `${ocrResult.extractedData.netMass.toLocaleString()} kg` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Driver Info */}
                  {ocrResult.extractedData.driverName && (
                    <div className="space-y-3 col-span-3 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Driver Information</p>
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-slate-500">Name</p>
                          <p className="text-slate-900 font-medium">{ocrResult.extractedData.driverName}</p>
                        </div>
                        {ocrResult.extractedData.driverIdNumber && (
                          <div>
                            <p className="text-xs text-slate-500">ID Number</p>
                            <p className="text-slate-900 font-mono">{ocrResult.extractedData.driverIdNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            disabled={uploading || saving}
          >
            Cancel
          </button>
          {!ocrResult ? (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Process Ticket
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Save
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
