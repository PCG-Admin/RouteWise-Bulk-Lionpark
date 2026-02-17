"use client";

import { Scale } from "lucide-react";

export default function ClientWeighbridgePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-5 bg-slate-100 rounded-full">
                <Scale className="w-12 h-12 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-700">Client Weighbridge (External)</h1>
            <p className="text-slate-400 text-center max-w-sm">
                This section is reserved for future use. Configuration and data will be added at a later stage.
            </p>
        </div>
    );
}
