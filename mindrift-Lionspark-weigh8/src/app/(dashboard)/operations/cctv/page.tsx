"use client";

import { AlertCircle, Camera, Cast, Maximize2, MoreVertical, Power, RefreshCw, Settings, Signal, Video, VideoOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:3001";

interface CameraData {
    id: string;
    name: string;
    location: string;
    status: string;
    recording: boolean;
    lastEvent: string;
}

export default function CCTVPage() {
    const [cameras, setCameras] = useState<CameraData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/cameras`);
            if (!response.ok) {
                throw new Error('Failed to fetch cameras');
            }
            const data = await response.json();
            setCameras(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load cameras');
            setCameras([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Camera className="w-6 h-6 text-slate-600" />
                        CCTV Surveillance
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Real-time monitoring and security feeds</p>
                </div>

                <div className="flex items-center gap-3">
                    {!error && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            System Online
                        </span>
                    )}
                    <button
                        onClick={fetchCameras}
                        className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        {loading ? 'Refreshing...' : 'Refresh Feeds'}
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Error loading cameras</p>
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && cameras.length === 0 && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">Loading camera feeds...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && cameras.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Cameras Available</h3>
                    <p className="text-slate-500">No camera feeds are currently configured.</p>
                </div>
            )}

            {/* Camera Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cameras.map((cam) => (
                    <div key={cam.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                        {/* Feed Box */}
                        <div className="relative aspect-video bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                            {/* "Live" Video Placeholder contents */}
                            {cam.status === "online" ? (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <Video className="w-12 h-12 mb-2 opacity-20" />
                                    <span className="text-xs uppercase tracking-widest opacity-30 font-semibold">Live Feed</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-red-500/50">
                                    <VideoOff className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-bold tracking-widest">NO SIGNAL</span>
                                </div>
                            )}

                            {/* Overlays */}
                            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", cam.status === "online" ? "bg-green-500" : "bg-red-500")} />
                                {cam.name}
                            </div>

                            <div className="absolute top-3 right-3 flex gap-2">
                                {cam.recording && (
                                    <div className="w-6 h-6 flex items-center justify-center bg-red-500/80 rounded-sm text-white" title="Recording">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    </div>
                                )}
                                <div className="p-1 px-2 bg-black/40 backdrop-blur-md rounded text-white text-[10px] font-mono">
                                    {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition">
                                    <Maximize2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="p-4 border-t border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900">{cam.location}</h3>
                                    <p className={cn("text-xs font-medium mt-0.5",
                                        cam.status === "offline" ? "text-red-500" : "text-slate-500"
                                    )}>
                                        {cam.status === "offline" ? "Connection Lost" : "Connection Stable"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <Wifi className={cn("w-4 h-4", cam.status !== "offline" && "text-blue-500")} />
                                    <span className="text-[10px] font-mono">Signal: {cam.status === "offline" ? "0%" : "98%"}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Last Event</span>
                                <span className="text-xs text-slate-600 truncate max-w-[150px]">{cam.lastEvent}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
