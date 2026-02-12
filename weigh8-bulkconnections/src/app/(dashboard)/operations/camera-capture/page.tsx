"use client";

import { CameraCapture } from "@/components/camera/CameraCapture";
import { Camera } from "lucide-react";

// Define all camera positions based on your mock data
const cameraPositions = [
    { cameraId: "LION1", cameraName: "Lions Park LION1", location: "Main Entry" },
    { cameraId: "LION5", cameraName: "Lions Park LION5", location: "North Gate" },
    { cameraId: "LION6", cameraName: "Lions Park LION6", location: "Loading Bay 1" },
    { cameraId: "LION7", cameraName: "Lions Park LION7", location: "Loading Bay 2" },
    { cameraId: "LION8", cameraName: "Lions Park LION8", location: "South Yard" },
    { cameraId: "LION9", cameraName: "Lions Park LION9", location: "Parking Area" },
    { cameraId: "LION10", cameraName: "Lions Park LION10", location: "Warehouse" },
    { cameraId: "LION11", cameraName: "Lions Park LION11", location: "Admin Block" },
    { cameraId: "LION12", cameraName: "Lions Park LION12", location: "Exit Gate" },
    { cameraId: "LION13", cameraName: "Lions Park LION13", location: "Fuel Station" },
    { cameraId: "LION14", cameraName: "Lions Park LION14", location: "Workshop" },
    { cameraId: "LION15", cameraName: "Lions Park LION15", location: "Guard House" },
    { cameraId: "LION16", cameraName: "Lions Park LION16", location: "Storage Yard" },
    { cameraId: "LION17", cameraName: "Lions Park LION17", location: "Perimeter West" },
    { cameraId: "ANPR-ENTRY", cameraName: "ANPR Entry Gate", location: "Main Entry" },
    { cameraId: "ANPR-EXIT", cameraName: "ANPR Exit Gate", location: "Exit Gate" },
];

export default function CameraCapturePage() {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">Camera Capture Station</h1>
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            <Camera className="w-4 h-4" />
                            <span className="font-medium">Operator Mode</span>
                        </div>
                    </div>
                    <p className="text-slate-500">Use your mobile device to capture images for each camera position</p>
                </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-2">📱 How to Use</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open this page on your mobile device or tablet</li>
                    <li>Walk to each camera position</li>
                    <li>Click the "Capture Image" button to take a photo</li>
                    <li>The image will be automatically saved and displayed on the CCTV page</li>
                    <li>Images auto-refresh on the CCTV page every 10 seconds</li>
                </ol>
            </div>

            {/* Camera Capture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cameraPositions.map((position) => (
                    <CameraCapture
                        key={position.cameraId}
                        cameraId={position.cameraId}
                        cameraName={position.cameraName}
                        location={position.location}
                    />
                ))}
            </div>
        </div>
    );
}
