"use client";

import { X, Scale, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

interface Allocation {
  id: number;
  vehicleReg: string;
  driverName: string;
  transporter: string;
  netWeight: string;
  grossWeight: string;
  tareWeight: string;
  order: {
    orderNumber: string;
    product: string;
    clientName: string;
  };
}

interface WeightCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: Allocation | null;
  onSuccess: () => void;
}

export default function WeightCaptureModal({
  isOpen,
  onClose,
  allocation,
  onSuccess,
}: WeightCaptureModalProps) {
  const { error } = useToast();

  const [formData, setFormData] = useState({
    ticketNumber: "",
    grossMass: "",
    tareMass: "",
    netMass: "",
    arrivalTime: "",
    departureTime: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && allocation) {
      // Prepopulate with current date/time and empty weights
      const now = new Date();
      const formattedDateTime = now.toISOString().slice(0, 16);

      setFormData({
        ticketNumber: `WB-${Date.now()}`,
        grossMass: "0",
        tareMass: "0",
        netMass: "0",
        arrivalTime: formattedDateTime,
        departureTime: "",
      });
    }
  }, [isOpen, allocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocation) return;

    setSaving(true);
    try {
      // Calculate weight discrepancy
      const allocNetWeight = parseFloat(allocation.netWeight || "0");
      const capturedNetWeight = parseFloat(formData.netMass || "0");
      const difference = Math.abs(allocNetWeight - capturedNetWeight);
      const percentageDiff = allocNetWeight > 0 ? (difference / allocNetWeight) * 100 : 0;

      const response = await fetch(
        `${API_BASE_URL}/internal-weighbridge/capture-weight`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            allocationId: allocation.id,
            ticketNumber: formData.ticketNumber,
            grossMass: parseFloat(formData.grossMass),
            tareMass: parseFloat(formData.tareMass),
            netMass: parseFloat(formData.netMass),
            arrivalTime: formData.arrivalTime,
            departureTime: formData.departureTime || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to capture weight");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateNet = () => {
    const gross = parseFloat(formData.grossMass || "0");
    const tare = parseFloat(formData.tareMass || "0");
    const net = gross - tare;
    setFormData({ ...formData, netMass: net.toString() });
  };

  if (!isOpen || !allocation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Capture Weight</h2>
            <p className="text-sm text-slate-600 mt-1 font-mono font-semibold">
              {allocation.vehicleReg || allocation.vehicle_reg} - {allocation.order?.orderNumber || allocation.order_number || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Allocation Details */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Customer</p>
              <p className="font-semibold text-slate-900">{allocation.order?.clientName || allocation.client_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Product</p>
              <p className="font-semibold text-slate-900">{allocation.order?.product || allocation.product || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Expected Net Weight</p>
              <p className="font-mono font-bold text-blue-600">
                {parseFloat(allocation.netWeight || allocation.net_weight || "0").toLocaleString()} kg
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Ticket Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ticket Number
              </label>
              <input
                type="text"
                value={formData.ticketNumber}
                onChange={(e) =>
                  setFormData({ ...formData, ticketNumber: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                required
              />
            </div>

            {/* Weights */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Gross Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.grossMass}
                  onChange={(e) =>
                    setFormData({ ...formData, grossMass: e.target.value })
                  }
                  onBlur={handleCalculateNet}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tare Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tareMass}
                  onChange={(e) =>
                    setFormData({ ...formData, tareMass: e.target.value })
                  }
                  onBlur={handleCalculateNet}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Net Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.netMass}
                  onChange={(e) =>
                    setFormData({ ...formData, netMass: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Arrival Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.arrivalTime}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalTime: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Departure Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={(e) =>
                    setFormData({ ...formData, departureTime: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Capture Weight
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
