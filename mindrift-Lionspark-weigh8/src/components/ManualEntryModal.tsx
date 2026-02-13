'use client';

import { useState } from 'react';
import { X, Search, Truck, User, Package, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualEntryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Allocation {
  id: number;
  vehicleReg: string;
  driverName: string | null;
  driverPhone: string | null;
  transporter: string | null;
  orderNumber: string | null;
  product: string | null;
  customer: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  scheduledDate: string | null;
  grossWeight: string | null;
  tareWeight: string | null;
  netWeight: string | null;
}

export default function ManualEntryModal({ onClose, onSuccess }: ManualEntryModalProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [gateType, setGateType] = useState<'entrance' | 'exit'>('entrance');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!plateNumber.trim()) {
      setError('Please enter a plate number');
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      setSearchPerformed(false);
      setStatusMessage(null);

      // Remove all spaces from plate number for searching
      const cleanedPlateNumber = plateNumber.replace(/\s+/g, '').trim();

      const response = await fetch(
        `http://localhost:3001/api/truck-allocations?vehicleReg=${encodeURIComponent(cleanedPlateNumber)}`
      );
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Find allocation matching the plate number (ignoring spaces)
        const foundAllocation = result.data.find(
          (a: Allocation) => a.vehicleReg.replace(/\s+/g, '').toLowerCase() === cleanedPlateNumber.toLowerCase()
        );

        if (foundAllocation) {
          setAllocation(foundAllocation);

          // Set status message based on gate type and allocation status
          if (gateType === 'exit') {
            // Exit gate logic - check driver validation status
            const driverValidationStatus = (foundAllocation as any).driverValidationStatus;

            // Check if already departed
            if (foundAllocation.status === 'completed') {
              setStatusMessage('⚠️ This truck has already departed');
            } else if (driverValidationStatus === 'ready_for_dispatch') {
              setStatusMessage(null); // Ready to depart
            } else if (foundAllocation.status === 'arrived' || foundAllocation.status === 'weighing') {
              // Check driver validation status to determine message
              if (driverValidationStatus === 'verified') {
                setStatusMessage('⚠️ Pending Permit Board - Driver is verified but permit has not been issued yet');
              } else {
                setStatusMessage('⚠️ This driver is still pending verification');
              }
            } else {
              setStatusMessage('⚠️ This truck is not ready for dispatch');
            }
          } else {
            // Entrance gate logic (existing behavior)
            if (foundAllocation.status === 'arrived' || foundAllocation.status === 'weighing' || foundAllocation.status === 'completed') {
              setStatusMessage('⚠️ This truck has already been checked in');
            }
          }
        } else {
          setAllocation(null);
        }
      } else {
        setAllocation(null);
      }

      setSearchPerformed(true);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search for allocation');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!allocation) return;

    try {
      setIsCheckingIn(true);
      setError(null);

      // Determine target status based on gate type
      const targetStatus = gateType === 'entrance' ? 'arrived' : 'completed';
      const action = gateType === 'entrance' ? 'check in' : 'check out';

      const response = await fetch(
        `http://localhost:3001/api/truck-allocations/${allocation.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: targetStatus,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || `Failed to ${action} truck`);
      }
    } catch (err) {
      console.error(`${gateType} error:`, err);
      setError(`Network error occurred during ${gateType === 'entrance' ? 'check-in' : 'check-out'}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Search className={cn(
                "w-7 h-7",
                gateType === 'entrance' ? 'text-green-600' : 'text-purple-600'
              )} />
              Manual {gateType === 'entrance' ? 'Check-In' : 'Check-Out'} - Plate Lookup
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {gateType === 'entrance'
                ? 'Enter plate number to find and check in truck at entrance gate'
                : 'Enter plate number to find and check out truck at exit gate'}
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
        <div className="p-6 space-y-6">
          {/* Gate Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gate Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setGateType('entrance');
                  setSearchPerformed(false);
                  setAllocation(null);
                  setError(null);
                  setStatusMessage(null);
                }}
                className={cn(
                  'px-4 py-3 rounded-lg font-semibold transition border-2',
                  gateType === 'entrance'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-green-400'
                )}
              >
                🚪 Entrance Gate
              </button>
              <button
                onClick={() => {
                  setGateType('exit');
                  setSearchPerformed(false);
                  setAllocation(null);
                  setError(null);
                  setStatusMessage(null);
                }}
                className={cn(
                  'px-4 py-3 rounded-lg font-semibold transition border-2',
                  gateType === 'exit'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400'
                )}
              >
                🚪 Exit Gate
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Plate Number / Vehicle Registration
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => {
                  setPlateNumber(e.target.value.toUpperCase());
                  setSearchPerformed(false);
                  setAllocation(null);
                  setError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="e.g., ABC123GP"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !plateNumber.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchPerformed && !isSearching && (
            <div>
              {allocation ? (
                /* Allocation Found */
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 pb-4 border-b border-green-200">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900">Allocation Found!</h3>
                      <p className="text-sm text-green-700">
                        Truck allocation exists for plate <span className="font-bold">{allocation.vehicleReg}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-800 uppercase">Vehicle</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{allocation.vehicleReg}</p>
                      {allocation.transporter && (
                        <p className="text-xs text-slate-600 mt-1">{allocation.transporter}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-800 uppercase">Driver</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {allocation.driverName || 'N/A'}
                      </p>
                      {allocation.driverPhone && (
                        <p className="text-xs text-slate-600 mt-1">{allocation.driverPhone}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-800 uppercase">Order</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {allocation.orderNumber || `Order #${allocation.id}`}
                      </p>
                      {allocation.customer && (
                        <p className="text-xs text-slate-600 mt-1">{allocation.customer}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-800 uppercase">Product</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {allocation.product || 'N/A'}
                      </p>
                      {allocation.origin && (
                        <p className="text-xs text-slate-600 mt-1">From: {allocation.origin}</p>
                      )}
                    </div>
                  </div>

                  {/* Weight Details */}
                  {(allocation.grossWeight || allocation.tareWeight || allocation.netWeight) && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs font-semibold text-green-800 uppercase mb-3">Weight Details</p>
                      <div className="grid grid-cols-3 gap-3">
                        {allocation.grossWeight && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Gross</p>
                            <p className="text-sm font-bold text-slate-900">{allocation.grossWeight}t</p>
                          </div>
                        )}
                        {allocation.tareWeight && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Tare</p>
                            <p className="text-sm font-bold text-slate-900">{allocation.tareWeight}t</p>
                          </div>
                        )}
                        {allocation.netWeight && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Net</p>
                            <p className="text-sm font-bold text-green-700 font-mono">{allocation.netWeight}t</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-xs font-semibold text-green-800 uppercase mb-2">Current Status</p>
                    <span className={cn(
                      'inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border',
                      allocation.status === 'scheduled' && 'bg-blue-50 text-blue-700 border-blue-200',
                      allocation.status === 'in_transit' && 'bg-amber-50 text-amber-700 border-amber-200',
                      allocation.status === 'arrived' && 'bg-green-50 text-green-700 border-green-200',
                      allocation.status === 'weighing' && 'bg-purple-50 text-purple-700 border-purple-200',
                      allocation.status === 'ready_for_dispatch' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      allocation.status === 'completed' && 'bg-slate-50 text-slate-700 border-slate-200'
                    )}>
                      {allocation.status === 'ready_for_dispatch' ? 'READY FOR DISPATCH' : allocation.status.toUpperCase()}
                    </span>

                    {statusMessage && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        {statusMessage}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Allocation Not Found */
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 pb-4 border-b border-red-200">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-900">No Allocation Found</h3>
                      <p className="text-sm text-red-700">
                        Plate <span className="font-bold">{plateNumber}</span> does not have an active allocation
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-slate-700 mb-3">
                      This vehicle is not scheduled for delivery today. Possible reasons:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                      <li>No order allocated to this vehicle</li>
                      <li>Plate number may be incorrect or misspelled</li>
                      <li>Truck not scheduled for today's operations</li>
                    </ul>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    Please verify the plate number or create a new allocation in the Orders section
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isCheckingIn}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>

          {allocation && (
            <>
              {/* Entrance Gate: Show button if not already checked in */}
              {gateType === 'entrance' && !['arrived', 'weighing', 'completed'].includes(allocation.status) && (
                <button
                  onClick={handleConfirmCheckIn}
                  disabled={isCheckingIn}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Check In
                    </>
                  )}
                </button>
              )}

              {/* Exit Gate: Show button only if driverValidationStatus is ready_for_dispatch and not already completed */}
              {gateType === 'exit' && (allocation as any).driverValidationStatus === 'ready_for_dispatch' && allocation.status !== 'completed' && (
                <button
                  onClick={handleConfirmCheckIn}
                  disabled={isCheckingIn}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Departure
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
