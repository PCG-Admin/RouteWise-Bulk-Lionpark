"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dates = Array.from({ length: 35 }, (_, i) => i + 1);

export default function CalendarViewPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/operations/calendar`);
            if (!response.ok) throw new Error('Failed to fetch events');
            const data = await response.json();
            setEvents(data.events || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Operations Calendar</h1>
                    <p className="text-slate-500">Schedule and overview of operational events</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                        March 2024
                    </div>
                    <button className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 ml-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {days.map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 gap-[1px]">
                    {dates.map((date, i) => {
                        const dayEvents = events.filter((e: any) => e.date === date);
                        return (
                            <div key={i} className={cn("bg-white p-2 min-h-[120px] relative hover:bg-slate-50 transition-colors", i < 4 ? "text-slate-400 bg-slate-50/50" : "")}>
                                <span className={cn("text-sm font-medium", i < 4 ? "" : "text-slate-900")}>
                                    {i < 4 ? 30 - 4 + i : date > 31 ? date - 31 : date}
                                </span>
                                {date <= 31 && i >= 4 && (
                                    <div className="mt-2 space-y-1">
                                        {dayEvents.map((evt: any, idx) => (
                                            <div key={idx} className={cn("text-xs px-2 py-1 rounded border truncate font-medium", evt.color)}>
                                                {evt.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
