'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Truck, Clock, User, Package, MapPin, Building, CheckCircle, Loader2, Upload, Camera, Plus } from 'lucide-react';
import TransporterSelect from './TransporterSelect';
import { createWorker } from 'tesseract.js';

interface ParkingTicketModalProps {
  allocationId?: number;
  visitId?: number;          // For non-matched trucks
  visitData?: any;           // Pre-populated visit data (vehicleReg, driverName, etc.)
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

interface FreightCompany {
  id: number;
  name: string;
  address: string;
}

interface Client {
  id: number;
  name: string;
  code: string;
  phone: string;
  address: string;
}

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  idNumber: string;
  licenseNumber: string;
  transporterId: number;
}

export default function ParkingTicketModal({ allocationId, visitId, visitData, onClose, onSuccess }: ParkingTicketModalProps) {
  const isVisitMode = !!visitId && !allocationId;
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Master data
  const [freightCompanies, setFreightCompanies] = useState<FreightCompany[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [systemTransporters, setSystemTransporters] = useState<any[]>([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState<number | null>(null);
  const [allocation, setAllocation] = useState<any>(null);

  // Normalize a string for fuzzy matching: lowercase + collapse spaces
  const normalize = (str: string) => str?.trim().toLowerCase().replace(/\s+/g, ' ') || '';

  // Find closest matching transporter in system (case/space insensitive)
  const findMatchingTransporter = (rawName: string) => {
    if (!rawName || systemTransporters.length === 0) return null;
    const normalizedRaw = normalize(rawName);
    return systemTransporters.find(t => normalize(t.name) === normalizedRaw) || null;
  };

  // Quick add modals
  const [showQuickAdd, setShowQuickAdd] = useState<{
    type: 'freight' | 'client' | 'transporter' | 'driver' | null;
  }>({ type: null });

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
    fetchMasterData();
  }, [allocationId, visitId]);

  // Once system transporters load + allocation is known (no existing ticket), normalize the pre-filled transporter name
  useEffect(() => {
    if (systemTransporters.length > 0 && allocation && !ticket) {
      const rawName = allocation.transporter;
      const match = findMatchingTransporter(rawName);
      if (match) {
        setFormData(prev => ({
          ...prev,
          transporterName: match.name,
          transporterNumber: match.code || prev.transporterNumber,
          transporterPhone: match.phone || prev.transporterPhone,
        }));
        setSelectedTransporterId(match.id);
        fetchDrivers(match.id);
      }
    }
  }, [systemTransporters, allocation]);

  const fetchMasterData = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      // Fetch freight companies
      const freightCompaniesRes = await fetch(`${API_BASE_URL}/api/freight-companies?siteId=1`, { credentials: 'include' });
      const freightCompaniesData = await freightCompaniesRes.json();
      if (freightCompaniesData.success) {
        setFreightCompanies(freightCompaniesData.data);
      }

      // Fetch system transporters for fuzzy matching — scoped to Lions Park (siteId=1)
      const transportersRes = await fetch(`${API_BASE_URL}/api/transporters?siteId=1`, { credentials: 'include' });
      const transportersData = await transportersRes.json();
      if (transportersData.success) {
        setSystemTransporters(transportersData.data || []);
      }

      // Fetch clients (freight customers)
      const clientsRes = await fetch(`${API_BASE_URL}/api/clients?siteId=1`, { credentials: 'include' });
      const clientsData = await clientsRes.json();
      if (clientsData.success) {
        setClients(clientsData.data);
      }
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

  const fetchDrivers = async (transporterId: number) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/drivers?transporterId=${transporterId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setDrivers(result.data);
      } else {
        setDrivers([]);
      }
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      setDrivers([]);
    }
  };

  const populateFormFromTicket = (data: any) => {
    setTicket(data);
    setFormData({
      personOnDuty: data.personOnDuty || '',
      terminalNumber: data.terminalNumber || '1',
      remarks: data.remarks || 'Booked',
      trailerRegNumber: data.trailerRegNumber || '',
      driverPermitNumber: data.driverPermitNumber || '',
      boardNumber: data.boardNumber || '',
      freightCompanyName: data.freightCompanyName || 'Bulk Connections',
      deliveryAddress: data.deliveryAddress || '',
      customerNumber: data.customerNumber || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      transporterNumber: data.transporterNumber || '',
      transporterName: data.transporterName || '',
      transporterPhone: data.transporterPhone || '',
      driverName: data.driverName || '',
      driverIdNumber: data.driverIdNumber || '',
      driverContactNumber: data.driverContactNumber || '',
    });
  };

  const fetchParkingTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // ── Visit (non-matched) mode ──────────────────────────────────────────
      if (isVisitMode) {
        // Try to get existing ticket for this visit
        const ticketRes = await fetch(`${API_BASE_URL}/api/parking-tickets/visit/${visitId}`, { credentials: 'include' });
        if (ticketRes.ok) {
          const ticketData = await ticketRes.json();
          if (ticketData.success && ticketData.data) {
            populateFormFromTicket(ticketData.data);
            return;
          }
        }

        // No ticket yet — create one automatically for the non-matched vehicle
        const createRes = await fetch(`${API_BASE_URL}/api/parking-tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ visitId }),
        });
        const createData = await createRes.json();
        if (createData.success && createData.data) {
          populateFormFromTicket(createData.data);
          // Pre-populate from visitData (may have driver/transporter from ANPR)
          if (visitData) {
            setFormData(prev => ({
              ...prev,
              driverName: createData.data.driverName || visitData.driverName || '',
              transporterName: createData.data.transporterName || visitData.transporter || '',
            }));
          }
        } else {
          setError('Failed to create parking ticket for this vehicle');
        }
        return;
      }

      // ── Allocation (matched) mode ─────────────────────────────────────────
      const allocationRes = await fetch(`${API_BASE_URL}/api/truck-allocations/${allocationId}`, { credentials: 'include' });
      const allocationData = await allocationRes.json();

      if (allocationData.success && allocationData.data) {
        setAllocation(allocationData.data);
      }

      const response = await fetch(`${API_BASE_URL}/api/parking-tickets/allocation/${allocationId}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success && result.data) {
        populateFormFromTicket(result.data);
      } else if (allocationData.success && allocationData.data) {
        // No existing ticket, pre-populate from allocation
        const alloc = allocationData.data;
        setFormData(prev => ({
          ...prev,
          transporterName: alloc.transporter || '',
          driverName: alloc.driverName || '',
          customerName: alloc.clientName || '',
        }));
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

      const requestData = {
        ...formData,
        processedBy: formData.personOnDuty || 'System',
      };

      console.log('🚀 Submitting parking ticket update:', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        data: requestData,
      });

      // Update parking ticket
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const updateResponse = await fetch(`${API_BASE_URL}/api/parking-tickets/${ticket.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      console.log('📡 Response status:', updateResponse.status);

      const updateResult = await updateResponse.json();

      console.log('📦 Response data:', updateResult);

      if (updateResult.success) {
        console.log('✅ Parking ticket updated successfully');
        onSuccess();
        onClose();
      } else {
        console.error('❌ Update failed:', updateResult.error);
        setError(updateResult.error || 'Failed to process parking ticket');
      }
    } catch (err) {
      console.error('❌ Failed to process parking ticket:', err);
      setError('Network error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransporterChange = (name: string, phone: string | null, code: string | null, id?: number) => {
    setFormData((prev) => ({
      ...prev,
      transporterName: name,
      transporterPhone: phone || '',
      transporterNumber: code || '',
    }));

    // Fetch drivers for this transporter
    if (id) {
      setSelectedTransporterId(id);
      fetchDrivers(id);
    } else {
      setSelectedTransporterId(null);
      setDrivers([]);
    }
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const driverId = parseInt(e.target.value);
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      setFormData((prev) => ({
        ...prev,
        driverName: `${driver.firstName} ${driver.lastName}`,
        driverIdNumber: driver.idNumber || '',
        driverContactNumber: driver.phone || '',
        driverPermitNumber: driver.licenseNumber || prev.driverPermitNumber,
      }));
    }
  };

  const handleFreightCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = parseInt(e.target.value);
    const company = freightCompanies.find(c => c.id === companyId);
    if (company) {
      setFormData((prev) => ({
        ...prev,
        freightCompanyName: company.name,
        deliveryAddress: company.address || prev.deliveryAddress,
      }));
    }
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = parseInt(e.target.value);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        customerName: client.name,
        customerNumber: client.code || '',
        customerPhone: client.phone || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customerName: '',
        customerNumber: '',
        customerPhone: '',
      }));
    }
  };

  // Quick add handlers
  const handleQuickAddFreight = async (data: any) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/freight-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, siteId: 1 }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchMasterData();
        setFormData(prev => ({ ...prev, freightCompanyName: data.name, deliveryAddress: data.address || '' }));
        setShowQuickAdd({ type: null });
      }
    } catch (err) {
      console.error('Failed to add freight company:', err);
    }
  };

  const handleQuickAddClient = async (data: any) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, siteId: 1 }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchMasterData();
        setFormData(prev => ({ ...prev, customerName: data.name, customerNumber: data.code || '', customerPhone: data.phone || '' }));
        setShowQuickAdd({ type: null });
      }
    } catch (err) {
      console.error('Failed to add client:', err);
    }
  };

  const handleQuickAddTransporter = async (data: any) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/transporters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, siteId: 1 }),
      });
      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, transporterName: data.name, transporterNumber: data.code || '', transporterPhone: data.phone || '' }));
        if (result.data?.id) {
          setSelectedTransporterId(result.data.id);
          fetchDrivers(result.data.id);
        }
        setShowQuickAdd({ type: null });
      }
    } catch (err) {
      console.error('Failed to add transporter:', err);
    }
  };

  const handleQuickAddDriver = async (data: any) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, transporterId: selectedTransporterId }),
      });
      const result = await response.json();
      if (result.success) {
        if (selectedTransporterId) {
          await fetchDrivers(selectedTransporterId);
        }
        setFormData(prev => ({ ...prev, driverName: `${data.firstName} ${data.lastName}`, driverIdNumber: data.idNumber || '', driverContactNumber: data.phone || '' }));
        setShowQuickAdd({ type: null });
      }
    } catch (err) {
      console.error('Failed to add driver:', err);
    }
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
              Parking Ticket {isVisitMode ? '— Non-Matched Vehicle' : 'Verification'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Ticket: <span className="font-semibold text-blue-600">{ticket.ticketNumber}</span>
              {' | '}
              Vehicle: <span className="font-semibold">{ticket.vehicleReg}</span>
              {isVisitMode && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                  Non-Matched · Validation Optional
                </span>
              )}
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
                  value={ticket.reference || ''}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Freight Company
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd({ type: 'freight' })}
                className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add New
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-purple-800 mb-1">Company Name *</label>
                <select
                  value={freightCompanies.find(c => c.name === formData.freightCompanyName)?.id || ''}
                  onChange={handleFreightCompanyChange}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select freight company...</option>
                  {freightCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-800 mb-1">Delivery Address (Auto-populated)</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Will auto-populate from company..."
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Freight Customer/Exporter */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Freight Customer / Exporter (Trader)
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd({ type: 'client' })}
                className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add New
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-green-800 mb-1">Select Customer/Trader *</label>
                <select
                  value={clients.find(c => c.name === formData.customerName)?.id || ''}
                  onChange={handleClientChange}
                  className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select customer/trader...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.code ? `(${client.code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-green-700 mt-1">
                  Selecting a customer will auto-populate code and phone number
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-green-800 mb-1">Customer Code (Auto-populated)</label>
                <input
                  type="text"
                  value={formData.customerNumber}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-green-300 rounded-lg text-sm text-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-green-800 mb-1">Customer Name (Auto-populated)</label>
                <input
                  type="text"
                  value={formData.customerName}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-green-300 rounded-lg text-sm text-slate-700 cursor-not-allowed font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-green-800 mb-1">Telephone (Auto-populated)</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="Will auto-populate..."
                  className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Transporter */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Transporter
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd({ type: 'transporter' })}
                className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add New
              </button>
            </div>
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

              {/* Driver Selection Dropdown */}
              {selectedTransporterId && (
                <div className="mb-4 bg-indigo-100 border border-indigo-300 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-indigo-900">
                      Select Driver (from {formData.transporterName})
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd({ type: 'driver' })}
                      className="px-2 py-1 bg-indigo-700 text-white text-xs font-semibold rounded hover:bg-indigo-800 transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Driver
                    </button>
                  </div>
                  {drivers.length > 0 ? (
                    <>
                      <select
                        onChange={handleDriverChange}
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a driver to auto-populate...</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.firstName} {driver.lastName} {driver.idNumber ? `(ID: ${driver.idNumber})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-indigo-700 mt-1">
                        ✓ Selecting a driver will auto-populate name, ID, and contact below (can still edit manually)
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-indigo-600 mt-1">
                      No drivers found for this transporter. Click "Add Driver" to add one.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">
                    Driver Name {selectedTransporterId && drivers.length > 0 && '(Auto-populated)'}
                  </label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => handleInputChange('driverName', e.target.value)}
                    placeholder="Enter driver name or select above..."
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">
                    Driver ID Number {selectedTransporterId && drivers.length > 0 && '(Auto-populated)'}
                  </label>
                  <input
                    type="text"
                    value={formData.driverIdNumber}
                    onChange={(e) => handleInputChange('driverIdNumber', e.target.value)}
                    placeholder="Enter ID number or select driver..."
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-indigo-800 mb-1">
                    Driver Contact {selectedTransporterId && drivers.length > 0 && '(Auto-populated)'}
                  </label>
                  <input
                    type="text"
                    value={formData.driverContactNumber}
                    onChange={(e) => handleInputChange('driverContactNumber', e.target.value)}
                    placeholder="Enter contact or select driver..."
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

      {/* Quick Add Modals */}
      {showQuickAdd.type && (
        <QuickAddModal
          type={showQuickAdd.type}
          onClose={() => setShowQuickAdd({ type: null })}
          onSave={(data) => {
            switch (showQuickAdd.type) {
              case 'freight':
                handleQuickAddFreight(data);
                break;
              case 'client':
                handleQuickAddClient(data);
                break;
              case 'transporter':
                handleQuickAddTransporter(data);
                break;
              case 'driver':
                handleQuickAddDriver(data);
                break;
            }
          }}
        />
      )}
    </div>
  );
}

// Quick Add Modal Component
function QuickAddModal({
  type,
  onClose,
  onSave,
}: {
  type: 'freight' | 'client' | 'transporter' | 'driver';
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const getTitle = () => {
    switch (type) {
      case 'freight': return 'Add Freight Company';
      case 'client': return 'Add Client/Trader';
      case 'transporter': return 'Add Transporter';
      case 'driver': return 'Add Driver';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'freight': return 'purple';
      case 'client': return 'green';
      case 'transporter': return 'indigo';
      case 'driver': return 'blue';
    }
  };

  const color = getColor();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className={`bg-${color}-600 p-4 flex items-center justify-between`}>
          <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {type === 'driver' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
                <input
                  type="text"
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
                <input
                  type="text"
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 disabled:opacity-50 transition flex items-center justify-center gap-2`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save & Add
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
