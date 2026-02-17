"use client";

import { AlertCircle, Camera, Cast, Maximize2, MoreVertical, Power, RefreshCw, Settings, Signal, Video, VideoOff, Wifi, Upload, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

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

    // Manual upload state
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadDirection, setUploadDirection] = useState<'entry' | 'exit'>('entry');
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<string | null>(null);
    const [ocrDetails, setOcrDetails] = useState<{ plate: string; confidence: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setUploadResult(null);
            setOcrDetails(null);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedImage) {
            alert('Please select an image first');
            return;
        }

        setUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);
            formData.append('direction', uploadDirection);
            formData.append('siteId', '2'); // Bulk Connections = site 2

            const response = await fetch(`${API_BASE_URL}/api/anpr-mock/manual-upload`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                const plate = result.data.extractedPlate;
                setOcrDetails({
                    plate: plate,
                    confidence: result.data.ocrConfidence
                });

                // Poll for ANPR checker to process (up to 45 seconds)
                let pollAttempts = 0;
                const maxPollAttempts = 15; // 15 attempts x 3 seconds = 45 seconds max

                const pollForCheckIn = async () => {
                    try {
                        // Check both allocations AND visits for the plate
                        const [allocResponse, visitsResponse] = await Promise.all([
                            fetch(`${API_BASE_URL}/api/truck-allocations?vehicleReg=${encodeURIComponent(plate)}`),
                            fetch(`${API_BASE_URL}/api/visits?plateNumber=${encodeURIComponent(plate)}`)
                        ]);

                        const allocResult = await allocResponse.json();
                        const visitsResult = await visitsResponse.json();

                        // Check allocations (matched plates)
                        if (allocResult.success && allocResult.data && allocResult.data.length > 0) {
                            const normalizedPlate = plate.replace(/\s+/g, '').toLowerCase();
                            const matchingAllocations = allocResult.data.filter((a: any) =>
                                a.vehicleReg.replace(/\s+/g, '').toLowerCase() === normalizedPlate
                            );

                            // For the poll check, find the allocation that was just processed:
                            // Entry → look for one that just became 'arrived'
                            // Exit  → look for one that just became 'completed'
                            const processedAllocation = uploadDirection === 'entry'
                                ? matchingAllocations.find((a: any) => a.status === 'arrived')
                                : matchingAllocations.find((a: any) => a.status === 'completed' && a.departureTime);

                            if (processedAllocation) {
                                if (uploadDirection === 'entry') {
                                    setUploadResult(`✅ Plate ${plate} detected! Truck checked in successfully at ${new Date(processedAllocation.actualArrival).toLocaleTimeString()}.`);
                                } else {
                                    setUploadResult(`✅ Plate ${plate} detected! Truck departed successfully at ${new Date(processedAllocation.departureTime).toLocaleTimeString()}.`);
                                }
                                return; // Stop polling
                            }
                        }

                        // Check visits (non-matched plates)
                        if (visitsResult.success && visitsResult.data && visitsResult.data.length > 0) {
                            const visit = visitsResult.data.find((v: any) =>
                                v.vehicleReg?.replace(/\s+/g, '').toLowerCase() === plate.replace(/\s+/g, '').toLowerCase()
                            );

                            if (visit && visit.status === 'non_matched') {
                                setUploadResult(`⚠️ Plate ${plate} detected as NON-MATCHED! Created visit record. Check Checked In stage on Loading Board.`);
                                return; // Stop polling
                            }
                        }

                        // Not processed yet, continue polling
                        pollAttempts++;
                        if (pollAttempts < maxPollAttempts) {
                            setTimeout(pollForCheckIn, 3000); // Poll every 3 seconds
                        } else {
                            // Timeout - ANPR didn't process it
                            setUploadResult(`⚠️ Plate ${plate} detected but ANPR auto-processing timed out. Check loading board manually.`);
                        }
                    } catch (err) {
                        setUploadResult(`✅ ${result.message}`);
                    }
                };

                // Start polling after 2 seconds
                setTimeout(pollForCheckIn, 2000);

                // Clear selection after 8 seconds (longer to see results)
                setTimeout(() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setUploadResult(null);
                    setOcrDetails(null);
                }, 8000);
            } else {
                setUploadResult(`❌ ${result.error || 'Upload failed'}`);
                setOcrDetails(null);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setUploadResult('❌ Network error during upload');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setUploadResult(null);
        setOcrDetails(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Camera className="w-6 h-6 text-slate-600" />
                        CCTV Surveillance - Bulk Connections
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

            {/* Manual Image Upload for Testing ANPR */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Manual ANPR Test Upload</h2>
                        <p className="text-sm text-slate-600">Upload a license plate image - OCR will extract the plate number automatically</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Upload Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Direction
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setUploadDirection('entry')}
                                    disabled={uploading}
                                    className={cn(
                                        'px-4 py-3 rounded-lg font-semibold transition border-2 flex items-center justify-center gap-2',
                                        uploadDirection === 'entry'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-green-400'
                                    )}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    Entry Gate
                                </button>
                                <button
                                    onClick={() => setUploadDirection('exit')}
                                    disabled={uploading}
                                    className={cn(
                                        'px-4 py-3 rounded-lg font-semibold transition border-2 flex items-center justify-center gap-2',
                                        uploadDirection === 'exit'
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400'
                                    )}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Exit Gate
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select Image
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                disabled={uploading}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 transition text-slate-600 hover:text-blue-600 font-medium disabled:opacity-50"
                            >
                                {selectedImage ? selectedImage.name : 'Click to select image'}
                            </button>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!selectedImage || uploading}
                            className={cn(
                                'w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2',
                                uploadDirection === 'entry'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-purple-600 text-white hover:bg-purple-700',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Test {uploadDirection === 'entry' ? 'Check-In' : 'Departure'}
                                </>
                            )}
                        </button>

                        {selectedImage && !uploading && (
                            <button
                                onClick={clearImage}
                                className="w-full px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                            >
                                Clear Selection
                            </button>
                        )}

                        {uploadResult && (
                            <div className={cn(
                                'p-4 rounded-lg border-2 space-y-2',
                                uploadResult.startsWith('✅')
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : uploadResult.startsWith('⚠️')
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                            )}>
                                <p className="text-sm font-medium">{uploadResult}</p>
                                {ocrDetails && (
                                    <div className={cn(
                                        'pt-2 border-t space-y-1',
                                        uploadResult.startsWith('✅')
                                            ? 'border-green-300'
                                            : uploadResult.startsWith('⚠️')
                                            ? 'border-amber-300'
                                            : 'border-red-300'
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Detected Plate:</span>
                                            <span className="text-sm font-bold font-mono">{ocrDetails.plate}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">AI Confidence:</span>
                                            <span className="text-sm font-bold">{ocrDetails.confidence}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Preview */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Image Preview
                        </label>
                        <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-300">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="text-center text-slate-600">
                                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs uppercase tracking-widest opacity-30 font-semibold">
                                        No Image Selected
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
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
