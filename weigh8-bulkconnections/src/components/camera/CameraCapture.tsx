'use client';

import { useState } from 'react';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  cameraId: string;
  cameraName: string;
  location: string;
}

export function CameraCapture({ cameraId, cameraName, location }: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const captureImage = async () => {
    setIsCapturing(true);
    setStatus('idle');
    setMessage('');

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait a bit for camera to adjust
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      context.drawImage(video, 0, 0);

      // Convert to Base64 JPEG (80% quality)
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Stop camera stream
      stream.getTracks().forEach(track => track.stop());

      // Frontend-only mode - no backend to save to
      // In production, you would need a backend API to save camera captures
      setStatus('error');
      setMessage('Camera capture disabled - backend API not available');
    } catch (error) {
      console.error('Error capturing image:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to capture image');
    } finally {
      setIsCapturing(false);

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="text-center">
        <h3 className="font-semibold text-slate-900 text-lg">{cameraName}</h3>
        <p className="text-sm text-slate-500">{location}</p>
        <p className="text-xs text-slate-400 font-mono mt-1">{cameraId}</p>
      </div>

      <button
        onClick={captureImage}
        disabled={isCapturing}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition shadow-lg ${
          isCapturing
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        {isCapturing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Capturing...</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            <span>Capture Image</span>
          </>
        )}
      </button>

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            status === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : status === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {status === 'success' && <CheckCircle className="w-4 h-4" />}
          {status === 'error' && <XCircle className="w-4 h-4" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
