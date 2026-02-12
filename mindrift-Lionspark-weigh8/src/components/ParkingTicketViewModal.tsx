'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Download, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';

interface ParkingTicketViewModalProps {
  allocationId: number;
  onClose: () => void;
}

interface ParkingTicket {
  id: number;
  ticketNumber: string;
  arrivalDatetime: string;
  personOnDuty: string;
  terminalNumber: string;
  vehicleReg: string;
  status: string;
  hoursInLot: string | null;
}

export default function ParkingTicketViewModal({ allocationId, onClose }: ParkingTicketViewModalProps) {
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket();
  }, [allocationId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3001/api/parking-tickets/allocation/${allocationId}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setTicket(result.data);
      } else {
        setError(result.error || 'Parking ticket not found');
      }
    } catch (err) {
      console.error('Fetch ticket error:', err);
      setError('Failed to load parking ticket');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!ticket) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Thermal receipt size (80mm width)
    });

    // Set font
    doc.setFont('courier', 'normal');

    let y = 10;
    const lineHeight = 5;
    const centerX = 40; // Center of 80mm width

    // Header
    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text('MARIANHILL TRUCK STOP', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('Erven 293-297', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('Lynnfield Park', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('Ibhubesi Industrial Park', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('3201', centerX, y, { align: 'center' });
    y += lineHeight + 2;

    // Contact Info
    doc.setFontSize(8);
    doc.text('Telephone Number    031 630 0777', 8, y);
    y += lineHeight;
    doc.text('Vat Reg Number      426029869', 8, y);
    y += lineHeight + 3;

    // Dashed line
    doc.line(5, y, 75, y);
    y += 5;

    // Title
    doc.setFontSize(14);
    doc.setFont('courier', 'bold');
    doc.text('Parking Ticket', centerX, y, { align: 'center' });
    y += lineHeight + 5;

    // Customer Fields
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text('Customer Number', 8, y);
    y += lineHeight;
    doc.text('Customer Name', 8, y);
    y += lineHeight;
    doc.text('Reference', 8, y);
    y += lineHeight + 3;

    // Dashed line
    doc.line(5, y, 75, y);
    y += 5;

    // Details
    doc.setFontSize(9);
    doc.setFont('courier', 'normal');

    const date = new Date(ticket.arrivalDatetime);
    doc.text(`Date: ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 8, y);
    y += lineHeight;

    doc.text(`Time: ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, 8, y);
    y += lineHeight;

    doc.text(`Person on Duty: ${ticket.personOnDuty}`, 8, y);
    y += lineHeight;

    doc.text(`Terminal ID: ${ticket.terminalNumber}`, 8, y);
    y += lineHeight + 3;

    // Dashed line
    doc.line(5, y, 75, y);
    y += 5;

    // Vehicle
    doc.setFontSize(8);
    doc.text('Vehicle LPN', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text(ticket.vehicleReg, centerX, y, { align: 'center' });
    y += lineHeight + 3;

    // Dashed line
    doc.line(5, y, 75, y);
    y += 5;

    // Ticket Number
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('Ticket Number', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    doc.text(ticket.ticketNumber, centerX, y, { align: 'center' });
    y += lineHeight + 5;

    // QR Code placeholder (text representation)
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('[QR CODE]', centerX, y, { align: 'center' });
    doc.text(ticket.ticketNumber, centerX, y + 4, { align: 'center' });
    y += lineHeight + 10;

    // Dashed line
    doc.line(5, y, 75, y);
    y += 5;

    // Footer
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.text('We appreciate your support, please', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('call again!', centerX, y, { align: 'center' });
    y += lineHeight + 3;

    doc.setFontSize(7);
    doc.text('WiFi Details: LionPark_Guest PW: Guest@LP', centerX, y, { align: 'center' });

    // Save PDF
    doc.save(`parking-ticket-${ticket.ticketNumber}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600 mt-4">Loading parking ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Parking Ticket Not Found</h3>
            <p className="text-sm text-slate-600 mb-6">{error || 'No parking ticket exists for this allocation'}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Parking Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Thermal Receipt Style Content */}
        <div className="p-8 overflow-y-auto flex-1">
          <div className="bg-white border-2 border-slate-200 rounded-lg p-6 font-mono text-center">
            {/* Header */}
            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">MARIANHILL TRUCK STOP</h3>
              <p className="text-xs text-slate-600">Erven 293-297</p>
              <p className="text-xs text-slate-600">Lynnfield Park</p>
              <p className="text-xs text-slate-600">Ibhubesi Industrial Park</p>
              <p className="text-xs text-slate-600">3201</p>
              <div className="mt-3 text-xs text-slate-600 text-left space-y-1">
                <p><span className="font-semibold">Telephone Number</span> &nbsp;&nbsp;031 630 0777</p>
                <p><span className="font-semibold">Vat Reg Number</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;426029869</p>
              </div>
            </div>

            {/* Parking Ticket Title */}
            <h4 className="text-xl font-bold text-slate-900 mb-4">Parking Ticket</h4>

            {/* Customer Fields */}
            <div className="text-left space-y-1 mb-4 pb-4 border-b-2 border-dashed border-slate-300">
              <p className="text-xs text-slate-700"><span className="font-semibold">Customer Number</span></p>
              <p className="text-xs text-slate-700"><span className="font-semibold">Customer Name</span></p>
              <p className="text-xs text-slate-700"><span className="font-semibold">Reference</span></p>
            </div>

            {/* Ticket Details */}
            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Date:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(ticket.arrivalDatetime).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Time:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(ticket.arrivalDatetime).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Person on Duty:</span>
                <span className="font-semibold text-slate-900">{ticket.personOnDuty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Terminal ID:</span>
                <span className="font-semibold text-slate-900">{ticket.terminalNumber}</span>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="border-y-2 border-dashed border-slate-300 py-4 mb-4">
              <p className="text-xs text-slate-600 mb-1">Vehicle LPN</p>
              <p className="text-lg font-bold text-slate-900">{ticket.vehicleReg}</p>
            </div>

            {/* Ticket Number */}
            <div className="mb-6">
              <p className="text-xs text-slate-600 mb-2">Ticket Number</p>
              <p className="text-xl font-bold text-slate-900 mb-4">{ticket.ticketNumber}</p>

              {/* QR Code */}
              <div className="flex justify-center bg-white p-4">
                <QRCode
                  value={ticket.ticketNumber}
                  size={128}
                  level="M"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-dashed border-slate-300 pt-4">
              <div className="text-xs text-slate-500 mt-6">
                <p>We appreciate your support, please</p>
                <p>call again!</p>
                <p className="mt-3 text-xs font-medium">WiFi Details: LionPark_Guest PW: Guest@LP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition font-medium text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
