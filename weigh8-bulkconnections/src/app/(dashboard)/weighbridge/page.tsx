"use client";

import { Scale, RefreshCw, Printer, AlertTriangle } from "lucide-react";

export default function WeighbridgePage() {
    return (
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Scale className="w-64 h-64" />
                    </div>

                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Weighbridge A - Live
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Status: Ready for weighing</p>
                        </div>
                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-500">
                            ID: WB-001
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center my-8">
                        <div className="text-center">
                            <div className="text-7xl font-mono font-bold text-slate-900 dark:text-white tracking-tighter">
                                00.00
                            </div>
                            <span className="text-xl text-slate-400 font-medium uppercase tracking-widest">Tonnes</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                            <RefreshCw className="w-5 h-5" />
                            Capture Weight
                        </button>
                        <button className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold transition-all shadow-sm">
                            <Printer className="w-5 h-5" />
                            Print Ticket
                        </button>
                    </div>
                </div>

                {/* Recent Weigh-ins Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Recent Transactions</h3>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {[1, 2, 3].map(i => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">TR-{8820 + i}</td>
                                        <td className="px-6 py-3 text-slate-500">10:4{i} AM</td>
                                        <td className="px-6 py-3 text-slate-500">Truck A{i}</td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-700 dark:text-slate-300">42.{i}t</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Panel - Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">Variable Details</h3>

                <div className="space-y-4">
                    {[
                        { label: "Vehicle Reg", value: "HINO-772" },
                        { label: "Transporter", value: "LogiTrans Ltd" },
                        { label: "Driver", value: "John Doe" },
                        { label: "Order Ref", value: "ORD-9901" },
                        { label: "Product", value: "Coal Grade A" },
                        { label: "Destination", value: "Richards Bay" },
                    ].map((item) => (
                        <div key={item.label}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{item.label}</label>
                            <input
                                type="text"
                                defaultValue={item.value}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                        Check vehicle tare weight matches registered database value before confirming.
                    </p>
                </div>
            </div>
        </div>
    );
}
