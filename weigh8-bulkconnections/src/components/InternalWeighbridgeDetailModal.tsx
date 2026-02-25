"use client";

import { X, FileText, Truck, Scale, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api");

interface InternalWeighbridgeDetailModalProps {
  ticketId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TicketDetail {
  id: number;
  ticket_number: string;
  truck_reg: string;
  order_number: string;
  product: string;
  grade: string;
  customer_name: string;
  driver_name: string;
  haulier: string;
  gross_mass: number;
  tare_mass: number;
  net_mass: number;
  arrival_time: string;
  departure_time: string;
  match_status: string;
  has_weight_discrepancy: boolean;
  weight_discrepancy_amount: number;
  weight_discrepancy_percentage: number;
  truck_allocation_id: number;
  created_at: string;
}

interface AllocationDetail {
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

export default function InternalWeighbridgeDetailModal({
  ticketId,
  isOpen,
  onClose,
}: InternalWeighbridgeDetailModalProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [allocation, setAllocation] = useState<AllocationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      // Fetch ticket details
      const ticketResponse = await fetch(
        `${API_BASE_URL}/internal-weighbridge/tickets/${ticketId}`,
        { credentials: "include" }
      );
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        console.log("📋 Ticket data:", ticketData.data);
        setTicket(ticketData.data);

        // Fetch allocation details if matched
        if (ticketData.data.truck_allocation_id) {
          console.log("🔍 Fetching allocation ID:", ticketData.data.truck_allocation_id);
          const allocResponse = await fetch(
            `${API_BASE_URL}/truck-allocations/allocation/${ticketData.data.truck_allocation_id}`,
            { credentials: "include" }
          );
          console.log("📦 Allocation response status:", allocResponse.status);
          if (allocResponse.ok) {
            const allocData = await allocResponse.json();
            console.log("📦 Allocation data:", allocData);
            console.log("📦 Allocation data.data:", allocData.data);
            setAllocation(allocData.data);
          } else {
            console.error("❌ Allocation fetch failed:", allocResponse.status, await allocResponse.text());
          }
        } else {
          console.warn("⚠️ No truck_allocation_id found in ticket");
        }
      }
    } catch (error) {
      console.error("Failed to fetch ticket details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Weighbridge Ticket Details
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ticket {ticket?.ticket_number || ticketId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Loading details...</p>
              </div>
            </div>
          ) : !ticket ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Ticket not found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Summary - Read from allocation's order, not ticket */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-900">Order Details</h3>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Order Number</p>
                    <p className="font-semibold text-slate-900">
                      {allocation?.order_number || allocation?.order?.orderNumber || ticket.order_number || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Product</p>
                    <p className="font-semibold text-slate-900">
                      {allocation?.product || allocation?.order?.product || ticket.product || ticket.grade || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Customer</p>
                    <p className="font-semibold text-slate-900">
                      {allocation?.parking_customer_name || allocation?.client_name || allocation?.order?.clientName || ticket.customer_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Match Status</p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        ticket.match_status === "matched"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ticket.match_status === "matched" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {ticket.match_status === "matched" ? "Matched" : "Non-Matched"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight Discrepancy Alert */}
              {ticket.has_weight_discrepancy && (
                <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900 text-lg mb-2">
                        Weight Discrepancy Detected
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-red-700 font-medium">Difference</p>
                          <p className="text-red-900 font-bold text-lg">
                            {Math.abs(Number(ticket.weight_discrepancy_amount || 0)).toLocaleString()} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-red-700 font-medium">Percentage</p>
                          <p className="text-red-900 font-bold text-lg">
                            {ticket.weight_discrepancy_percentage ? Number(ticket.weight_discrepancy_percentage).toFixed(2) : '0.00'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-2 gap-6">
                {/* Original Allocation */}
                <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Original Allocation
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {allocation ? (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Vehicle Registration</p>
                          <p className="font-mono font-bold text-slate-900">{allocation.vehicleReg}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Driver</p>
                          <p className="text-slate-900">{allocation.parking_driver_name || allocation.parkingDriverName || allocation.driverName || allocation.driver_name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Transporter</p>
                          <p className="text-slate-900">{allocation.parking_transporter_name || allocation.parkingTransporterName || allocation.transporter || "-"}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-4 h-4 text-slate-600" />
                            <p className="text-xs font-semibold text-slate-700">WEIGHTS</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-600">Gross:</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {parseFloat(allocation.grossWeight || allocation.gross_weight || "0").toLocaleString()} kg
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-600">Tare:</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {parseFloat(allocation.tareWeight || allocation.tare_weight || "0").toLocaleString()} kg
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                              <span className="text-sm font-semibold text-slate-700">Net:</span>
                              <span className="font-mono font-bold text-blue-600 text-lg">
                                {parseFloat(allocation.netWeight || allocation.net_weight || "0").toLocaleString()} kg
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">No allocation data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Weighbridge Ticket */}
                <div className="border-2 border-emerald-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
                    <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Internal Weighbridge Ticket
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ticket Number</p>
                      <p className="font-mono font-bold text-slate-900">{ticket.ticket_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Vehicle Registration</p>
                      <p className="font-mono font-bold text-slate-900">{ticket.truck_reg}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Haulier</p>
                      <p className="text-slate-900">{ticket.haulier || "-"}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-4 h-4 text-slate-600" />
                        <p className="text-xs font-semibold text-slate-700">WEIGHTS</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Gross:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {parseFloat(ticket.gross_mass || "0").toLocaleString()} kg
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Tare:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {parseFloat(ticket.tare_mass || "0").toLocaleString()} kg
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-sm font-semibold text-slate-700">Net:</span>
                          <span className="font-mono font-bold text-emerald-600 text-lg">
                            {parseFloat(ticket.net_mass || "0").toLocaleString()} kg
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Arrival Time</p>
                      <p className="text-sm text-slate-900">
                        {ticket.arrival_time
                          ? new Date(ticket.arrival_time).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Departure Time</p>
                      <p className="text-sm text-slate-900">
                        {ticket.departure_time
                          ? new Date(ticket.departure_time).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
