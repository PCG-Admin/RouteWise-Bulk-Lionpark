"use client";

import { Search, Filter, Plus, Calendar, CheckCircle2, Clock, MapPin, User, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import Pagination from "@/components/Pagination";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function BookingsManagementPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/visits/bookings`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch bookings');
            const data = await response.json();
            setBookings(data.bookings || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalItems = bookings.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <Modal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} title="New Booking">
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Visitor / Driver Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Company</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Facility</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option>Weighbridge A</option>
                                <option>Weighbridge B</option>
                                <option>Loading Bay</option>
                                <option>Parking Bay</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Duration</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option>30 mins</option>
                                <option>1 hour</option>
                                <option>2 hours</option>
                                <option>3+ hours</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Date & Time</label>
                        <input type="datetime-local" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsBookingOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Confirm Booking</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Bookings Management</h1>
                    <p className="text-slate-500">Manage visitor bookings and facility reservations</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition text-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    <button
                        onClick={() => setIsBookingOpen(true)}
                        className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Booking
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Confirmed Bookings</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-emerald-600">34</div>
                    <p className="text-xs text-slate-400 mt-1">Today</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Pending Bookings</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-amber-600">7</div>
                    <p className="text-xs text-slate-400 mt-1">Awaiting approval</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">In Progress</span>
                        <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-blue-600">12</div>
                    <p className="text-xs text-slate-400 mt-1">Currently on site</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-500">Completed</span>
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 text-slate-600">89</div>
                    <p className="text-xs text-slate-400 mt-1">This week</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Search Bookings</h3>
                    <p className="text-sm text-slate-500">Find specific bookings by visitor, company, or booking reference</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <button className="px-6 py-2.5 bg-white border border-slate-200 font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition shadow-sm">
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
                    <p className="text-sm text-slate-500">Visitor facility bookings and their current status</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Booking ID</th>
                                <th className="px-6 py-4">Visitor</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Facility</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-red-400">{error}</td></tr>
                            ) : bookings.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No bookings found</td></tr>
                            ) : paginatedBookings.map((booking: any) => (
                                <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-900 font-medium">{booking.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{booking.visitor}</td>
                                    <td className="px-6 py-4 text-slate-600">{booking.company}</td>
                                    <td className="px-6 py-4 text-slate-600">{booking.facility}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-mono">{booking.date}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{booking.duration}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                                            booking.status === 'confirmed' ? "bg-blue-600 text-white" :
                                                booking.status === 'in-progress' ? "bg-slate-200 text-slate-700" :
                                                    booking.status === 'pending' ? "border border-slate-200 text-slate-600" :
                                                        booking.status === 'completed' ? "border border-slate-200 text-slate-500" :
                                                            "bg-red-500 text-white"
                                        )}>
                                            {booking.status.replace('-', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center justify-center gap-4">
                                        <button className="text-slate-600 hover:text-blue-600 text-sm font-bold">View</button>
                                        {booking.status === 'confirmed' && (
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-bold">Check In</button>
                                        )}
                                        {booking.status === 'pending' && (
                                            <button className="text-emerald-600 hover:text-emerald-800 text-sm font-bold">Approve</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && bookings.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                    }}
                    itemsPerPageOptions={[10, 25, 50, 100]}
                />
            )}
        </div>
    );
}
