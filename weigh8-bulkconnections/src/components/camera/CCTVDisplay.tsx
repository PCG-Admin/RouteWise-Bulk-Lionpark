'use client';

import { Camera, RefreshCw, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3000/api");

interface CameraCapture {
  id: string;
  cameraId: string;
  cameraName: string;
  location: string;
  imageBase64: string;
  status: string;
  capturedAt: string;
}

export function CCTVDisplay() {
  const [selectedCamera, setSelectedCamera] = useState<CameraCapture | null>(null);
  const [cameras, setCameras] = useState<CameraCapture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchCameras = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/camera/captures`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cameras');
      const data = await response.json();
      setCameras(data.cameras || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchCameras();
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
        <RefreshCw className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Camera Feeds...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-12 text-center">
        <Camera className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Cameras</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!cameras || cameras.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
        <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Camera Feeds Available</h3>
        <p className="text-slate-500">No images have been captured yet. Use the camera capture page to take photos.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Maximize Modal */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedCamera(null)}
            className="absolute top-4 right-4 text-white hover:text-red-400 transition"
          >
            <Maximize2 className="w-8 h-8 rotate-45" />
          </button>

          <div className="w-full max-w-6xl aspect-video bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-700 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start">
              <div>
                <h2 className="text-white text-2xl font-bold">{selectedCamera.cameraName}</h2>
                <p className="text-slate-300">{selectedCamera.location}</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-600/80 px-3 py-1 rounded text-sm font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                LIVE FEED
              </div>
            </div>

            <img
              src={selectedCamera.imageBase64}
              alt={selectedCamera.cameraName}
              className="w-full h-full object-contain"
            />

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm">
                Last updated: {new Date(selectedCamera.capturedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Camera Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{cam.cameraName}</h3>
                  <p className="text-xs text-slate-500">{cam.location}</p>
                </div>
                <button
                  onClick={() => setSelectedCamera(cam)}
                  className="text-slate-400 hover:text-blue-600 transition"
                  title="Maximize"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-emerald-600/90 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
                <span className="text-xs text-slate-400 font-mono">{cam.cameraId}</span>
              </div>
            </div>

            {/* Camera Feed */}
            <div className="relative bg-slate-900 aspect-video">
              <img
                src={cam.imageBase64}
                alt={cam.cameraName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Camera Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Last updated: {new Date(cam.capturedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Manual Refresh
        </button>
      </div>
    </>
  );
}
