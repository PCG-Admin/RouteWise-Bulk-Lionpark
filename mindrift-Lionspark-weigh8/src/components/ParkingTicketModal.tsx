'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Truck, Clock, User, Package, MapPin, Building, CheckCircle, Loader2, Upload, Camera } from 'lucide-react';
import TransporterSelect from './TransporterSelect';
import { createWorker } from 'tesseract.js';

interface ParkingTicketModalProps {
  allocationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParkingTicket {
  id: number;
  ticketNumber: string;
  arrivalDatetime: string;
  personOnDuty: string;
  terminalNumber: string;
  vehicleReg: string;
  status: string;
  reference: string;
  remarks: string;
  trailerRegNumber: string;
  driverPermitNumber: string;
  boardNumber: string;
  freightCompanyNumber: string;
  freightCompanyName: string;
  deliveryAddress: string;
  customerNumber: string;
  customerName: string;
  customerPhone: string;
  transporterNumber: string;
  transporterName: string;
  transporterPhone: string;
  driverName: string;
  driverIdNumber: string;
  driverContactNumber: string;
}

export default function ParkingTicketModal({ allocationId, onClose, onSuccess }: ParkingTicketModalProps) {
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    personOnDuty: '',
    terminalNumber: '1',
    remarks: 'Booked',
    trailerRegNumber: '',
    driverPermitNumber: '',
    boardNumber: '',
    freightCompanyName: 'Bulk Connections',
    deliveryAddress: '',
    customerNumber: '',
    customerName: '',
    customerPhone: '',
    transporterNumber: '',
    transporterName: '',
    transporterPhone: '',
    driverName: '',
    driverIdNumber: '',
    driverContactNumber: '',
  });

  useEffect(() => {
    fetchParkingTicket();
  }, [allocationId]);

  const fetchParkingTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/parking-tickets/allocation/${allocationId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setTicket(result.data);
        // Populate form with existing data
        setFormData({
          personOnDuty: result.data.personOnDuty || '',
          terminalNumber: result.data.terminalNumber || '1',
          remarks: result.data.remarks || 'Booked',
          trailerRegNumber: result.data.trailerRegNumber || '',
          driverPermitNumber: result.data.driverPermitNumber || '',
          boardNumber: result.data.boardNumber || '',
          freightCompanyName: result.data.freightCompanyName || 'Bulk Connections',
          deliveryAddress: result.data.deliveryAddress || '',
          customerNumber: result.data.customerNumber || '',
          customerName: result.data.customerName || '',
          customerPhone: result.data.customerPhone || '',
          transporterNumber: result.data.transporterNumber || '',
          transporterName: result.data.transporterName || '',
          transporterPhone: result.data.transporterPhone || '',
          driverName: result.data.driverName || '',
          driverIdNumber: result.data.driverIdNumber || '',
          driverContactNumber: result.data.driverContactNumber || '',
        });
      } else {
        setError('Parking ticket not found for this allocation');
      }
    } catch (err) {
      console.error('Failed to fetch parking ticket:', err);
      setError('Failed to load parking ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!ticket) return;

    try {
      setIsSaving(true);
      setError(null);

      // Update parking ticket
      const updateResponse = await fetch(`http://localhost:3001/api/parking-tickets/${ticket.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          processedBy: formData.personOnDuty || 'System',
        }),
      });

      const updateResult = await updateResponse.json();

      if (updateResult.success) {
        onSuccess();
        onClose();
      } else {
        setError(updateResult.error || 'Failed to process parking ticket');
      }
    } catch (err) {
      console.error('Failed to process parking ticket:', err);
      setError('Network error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransporterChange = (name: string, phone: string | null, code: string | null) => {
    setFormData((prev) => ({
      ...prev,
      transporterName: name,
      transporterPhone: phone || '',
      transporterNumber: code || '',
    }));
  };

  // OCR Processing Function
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum 5MB allowed.');
      return;
    }

    setUploadedFile(file);
    setIsProcessingOCR(true);
    setError(null);
    setOcrProgress(0);

    try {
      // Create Tesseract worker
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Process the image
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      console.log('OCR Raw Text:', text);

      // Extract driver information from OCR text
      const extractedData = extractDriverInfoFromText(text);
      console.log('Extracted Data:', extractedData);

      // Auto-populate form fields with extracted data
      setFormData((prev) => ({
        ...prev,
        driverName: extractedData.name || prev.driverName,
        driverIdNumber: extractedData.idNumber || prev.driverIdNumber,
        driverPermitNumber: extractedData.licenseNumber || prev.driverPermitNumber,
      }));

      setIsProcessingOCR(false);
      setOcrProgress(100);

      // Show success message briefly
      setTimeout(() => {
        setUploadedFile(null);
        setOcrProgress(0);
      }, 2000);
    } catch (err) {
      console.error('OCR Processing Error:', err);
      setError('Failed to process document. Please try again or enter details manually.');
      setIsProcessingOCR(false);
      setUploadedFile(null);
      setOcrProgress(0);
    }
  };

  // Extract driver information from OCR text
  const extractDriverInfoFromText = (text: string): { name?: string; idNumber?: string; licenseNumber?: string } => {
    const extracted: { name?: string; idNumber?: string; licenseNumber?: string } = {};

    // South African ID Number pattern (13 digits)
    const idPattern = /\b\d{13}\b/;
    const idMatch = text.match(idPattern);
    if (idMatch) {
      extracted.idNumber = idMatch[0];
    }

    // License Number patterns (various formats)
    // Format 1: Letter + 8 digits (e.g., A12345678)
    // Format 2: 2-3 Letters + 6-7 digits (e.g., ABC1234567)
    const licensePattern = /\b[A-Z]{1,3}\d{6,9}\b/;
    const licenseMatch = text.match(licensePattern);
    if (licenseMatch) {
      extracted.licenseNumber = licenseMatch[0];
    }

    // Name extraction - look for patterns like "Surname: NAME" or "Names: NAME"
    const surnamePattern = /(?:Surname|SURNAME|Last\s*Name)[:\s]+([A-Z][A-Za-z\s]+)/i;
    const namesPattern = /(?:Names|NAMES|First\s*Name|Given\s*Names)[:\s]+([A-Z][A-Za-z\s]+)/i;

    const surnameMatch = text.match(surnamePattern);
    const namesMatch = text.match(namesPattern);

    if (surnameMatch && namesMatch) {
      // Combine first name and surname
      const firstName = namesMatch[1].trim();
      const lastName = surnameMatch[1].trim();
      extracted.name = `${firstName} ${lastName}`;
    } else if (surnameMatch) {
      extracted.name = surnameMatch[1].trim();
    } else if (namesMatch) {
      extracted.name = namesMatch[1].trim();
    } else {
      // Fallback: Look for capitalized words (potential name)
      // Find lines with 2-4 consecutive capitalized words
      const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/;
      const nameMatch = text.match(namePattern);
      if (nameMatch) {
        extracted.name = nameMatch[1].trim();
      }
    }

    return extracted;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading parking ticket...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const hoursInLot = ticket.arrivalDatetime
    ? ((new Date().getTime() - new Date(ticket.arrivalDatetime).getTime()) / (1000 * 60 * 60)).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-600" />
              Parking Ticket Verification
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Ticket: <span className="font-semibold text-blue-600">{ticket.ticketNumber}</span>
              {' | '}
              Vehicle: <span className="font-semibold">{ticket.vehicleReg}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Parking Ticket Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Parking Ticket Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-blue-700 mb-1">Arrival Date & Time</label>
                <input
                  type="text"
                  value={new Date(ticket.arrivalDatetime).toLocaleString('en-US')}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">Hours in Lot</label>
                <input
                  type="text"
                  value={`${hoursInLot}h`}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">Person on Duty</label>
                <input
                  type="text"
                  value={formData.personOnDuty}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 font-medium cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">Terminal Number</label>
                <input
                  type="text"
                  value={formData.terminalNumber}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Vehicle Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-700 mb-1">License Plate Number</label>
                <input
                  type="text"
                  value={ticket.vehicleReg}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-700 mb-1">Reference (Order Number)</label>
                <input
                  type="text"
                  value={ticket.reference}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Additional Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-amber-800 mb-1">Remarks</label>
                <select
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="Booked">Booked</option>
                  <option value="Not Booked">Not Booked</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-amber-800 mb-1">Trailer Registration</label>
                <input
                  type="text"
                  value={formData.trailerRegNumber}
                  onChange={(e) => handleInputChange('trailerRegNumber', e.target.value)}
                  placeholder="Enter trailer reg..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-amber-800 mb-1">Driver Permit Number (Cutler)</label>
                <input
                  type="text"
                  value={formData.driverPermitNumber}
                  onChange={(e) => handleInputChange('driverPermitNumber', e.target.value)}
                  placeholder="Enter Cutler permit..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-amber-800 mb-1">Board Number</label>
                <input
                  type="text"
                  value={formData.boardNumber}
                  onChange={(e) => handleInputChange('boardNumber', e.target.value)}
                  placeholder="Enter board number..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Freight Company */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Freight Company
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-purple-800 mb-1">Company Name</label>
                <select
                  value={formData.freightCompanyName}
                  onChange={(e) => handleInputChange('freightCompanyName', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Bulk Connections">Bulk Connections</option>
                  <option value="Bidvest Port Operations">Bidvest Port Operations</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-800 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter delivery address..."
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Freight Customer/Exporter */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-green-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Freight Customer / Exporter
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-green-800 mb-1">Customer Number</label>
                <input
                  type="text"
                  value={formData.customerNumber}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-green-800 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-green-800 mb-1">Telephone Number</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="Enter phone..."
                  className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Transporter */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Transporter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-indigo-800 mb-1">Transporter Name *</label>
                <TransporterSelect
                  value={formData.transporterName}
                  onChange={handleTransporterChange}
                  placeholder="Search and select transporter..."
                />
              </div>
              <div>
                <label className="block text-xs text-indigo-800 mb-1">Transporter Number</label>
                <input
                  type="text"
                  value={formData.transporterNumber}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-indigo-800 mb-1">Transporter Phone</label>
                <input
                  type="text"
                  value={formData.transporterPhone}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="border-t border-indigo-200 pt-4 mt-4">
              <h4 className="text-xs font-semibold text-indigo-900 mb-3">Driver Details</h4>

              {/* Document Upload for OCR */}
              <div className="mb-4 bg-indigo-100 border border-indigo-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-indigo-900 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Upload Driver License / ID for Auto-Extraction
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingOCR}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadedFile ? 'Change Document' : 'Upload Document'}
                  </button>

                  {uploadedFile && (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-indigo-900 font-medium truncate">
                          {uploadedFile.name}
                        </span>
                        {isProcessingOCR && (
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        )}
                        {!isProcessingOCR && ocrProgress === 100 && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      {isProcessingOCR && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-indigo-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${ocrProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-indigo-800 font-medium">{ocrProgress}%</span>
                          </div>
                          <p className="text-xs text-indigo-700 mt-1">Extracting driver information...</p>
                        </div>
                      )}
                      {!isProcessingOCR && ocrProgress === 100 && (
                        <p className="text-xs text-green-700 mt-1 font-medium">✓ Data extracted and populated below</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-indigo-700 mt-2">
                  Supported formats: JPEG, PNG, WebP (max 5MB). The system will automatically extract driver name, ID number, and license number.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => handleInputChange('driverName', e.target.value)}
                    placeholder="Enter driver name..."
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">Driver ID Number</label>
                  <input
                    type="text"
                    value={formData.driverIdNumber}
                    onChange={(e) => handleInputChange('driverIdNumber', e.target.value)}
                    placeholder="Enter ID number..."
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">Driver Contact Number</label>
                  <input
                    type="text"
                    value={formData.driverContactNumber}
                    onChange={(e) => handleInputChange('driverContactNumber', e.target.value)}
                    placeholder="Enter contact number..."
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <p className="text-sm text-slate-600">
            Status: <span className={`font-semibold ${
              ticket.status === 'processed'
                ? 'text-green-600'
                : ticket.status === 'partially_processed'
                ? 'text-orange-600'
                : 'text-yellow-600'
            }`}>
              {ticket.status === 'processed'
                ? 'Fully Verified'
                : ticket.status === 'partially_processed'
                ? 'Partially Processed'
                : 'Pending Verification'}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {ticket.status === 'processed' ? 'Update Verification' : 'Submit & Verify'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
