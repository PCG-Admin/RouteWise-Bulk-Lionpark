'use client';

import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, Loader2, FileText } from 'lucide-react';

interface DriverVerificationModalProps {
  allocationId: number;
  vehicleReg: string;
  onClose: () => void;
  onVerified: () => void;
}

export default function DriverVerificationModal({
  allocationId,
  vehicleReg,
  onClose,
  onVerified,
}: DriverVerificationModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'license' | 'id' | 'passport' | 'permit'>('license');
  const [uploading, setUploading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'ocr' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', documentType);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${API_BASE_URL}/api/driver-verification/${allocationId}/upload`,
        { method: 'POST', credentials: 'include', body: formData }
      );

      const result = await response.json();

      if (result.success) {
        setStep('ocr');
        setOcrProcessing(true);
        setDocumentId(result.data.documentId);

        // Poll for OCR results
        pollOcrResults(result.data.documentId);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const pollOcrResults = async (docId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const checkOcr = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(
          `${API_BASE_URL}/api/driver-verification/${allocationId}/documents`,
          { credentials: 'include' }
        );
        const result = await response.json();

        if (result.success) {
          const doc = result.data.find((d: any) => d.id === docId);

          if (doc?.ocrStatus === 'success') {
            setOcrResults(doc.extractedFields);
            setOcrProcessing(false);
            setStep('review');
            return;
          } else if (doc?.ocrStatus === 'failed') {
            setError('OCR processing failed');
            setOcrProcessing(false);
            return;
          }
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkOcr, 1000);
        } else {
          setError('OCR processing timeout');
          setOcrProcessing(false);
        }
      } catch (err) {
        console.error('OCR polling error:', err);
        setError('Failed to check OCR status');
        setOcrProcessing(false);
      }
    };

    checkOcr();
  };

  const handleMatchDriver = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${API_BASE_URL}/api/driver-verification/${allocationId}/match-driver`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: documentId,
            overrideFields: {},
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Driver verified! ${result.data.isNew ? 'New driver created.' : 'Existing driver matched.'}`);
        onVerified();
        onClose();
      } else {
        setError(result.error || 'Driver matching failed');
      }
    } catch (err) {
      setError('Failed to match driver');
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Driver Verification</h2>
            <p className="text-sm text-slate-600 mt-1">Vehicle: {vehicleReg}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="license">Driver&apos;s License</option>
                  <option value="id">ID Card</option>
                  <option value="passport">Passport</option>
                  <option value="permit">Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Document
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 hover:border-blue-400 transition cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="text-sm font-medium text-slate-700">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      JPEG, PNG, WebP (max 5MB)
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: OCR Processing */}
          {step === 'ocr' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Processing Document...
              </h3>
              <p className="text-sm text-slate-600 text-center">
                Extracting information using OCR. This may take a few seconds.
              </p>
            </div>
          )}

          {/* Step 3: Review OCR Results */}
          {step === 'review' && ocrResults && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    OCR Completed Successfully
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Extracted Information:</h3>

                {ocrResults.licenseNumber && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">License Number</label>
                    <input
                      type="text"
                      value={ocrResults.licenseNumber}
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                {ocrResults.name && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Name</label>
                    <input
                      type="text"
                      value={ocrResults.name}
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                {ocrResults.idNumber && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">ID Number</label>
                    <input
                      type="text"
                      value={ocrResults.idNumber}
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                {ocrResults.confidence !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Confidence</label>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${ocrResults.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {ocrResults.confidence}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>

          {step === 'upload' && (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Process
                </>
              )}
            </button>
          )}

          {step === 'review' && (
            <button
              onClick={handleMatchDriver}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Verify Driver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
