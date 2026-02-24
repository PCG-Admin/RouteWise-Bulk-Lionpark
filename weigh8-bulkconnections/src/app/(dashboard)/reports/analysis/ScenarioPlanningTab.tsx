'use client';

import { useMemo, useState } from 'react';
import { stockpiles, vessels } from '@/lib/reports-data';
import { formatTonnes } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ProductType } from '@/lib/types';

const products: ProductType[] = ['Iron Ore', 'Manganese Ore', 'Chrome', 'Vanadium', 'Thermal Coal', 'Metallurgical Coal'];

export default function ScenarioPlanningTab() {
  const [targetStockpile, setTargetStockpile] = useState(stockpiles[0].id);
  const [productType, setProductType] = useState<ProductType>('Chrome');
  const [targetTonnage, setTargetTonnage] = useState(20000);
  const [trucksPerDay, setTrucksPerDay] = useState(18);
  const [avgTonnesPerTruck, setAvgTonnesPerTruck] = useState(38.5);
  const [operatingDays, setOperatingDays] = useState(6);
  const [startDate, setStartDate] = useState('2026-02-24');

  const selectedStockpile = useMemo(() => stockpiles.find(s => s.id === targetStockpile)!, [targetStockpile]);
  const selectedVessel = useMemo(() => vessels.find(v => v.stockpileId === targetStockpile), [targetStockpile]);

  const scenario = useMemo(() => {
    const dailyTonnage = trucksPerDay * avgTonnesPerTruck;
    const effectiveDailyRate = dailyTonnage * (operatingDays / 7);
    const tonnageNeeded = targetTonnage - selectedStockpile.currentTonnes;
    const daysRequired = tonnageNeeded > 0 ? Math.ceil(tonnageNeeded / effectiveDailyRate) : 0;
    const totalTrucksRequired = Math.ceil(tonnageNeeded / avgTonnesPerTruck);

    const start = new Date(startDate);
    const completionDate = new Date(start.getTime() + daysRequired * 24 * 60 * 60 * 1000);

    const overflowDay = Math.ceil((selectedStockpile.capacityTonnes - selectedStockpile.currentTonnes) / effectiveDailyRate);
    const willOverflow = selectedStockpile.currentTonnes + (effectiveDailyRate * daysRequired) > selectedStockpile.capacityTonnes;

    const vesselEta = selectedVessel?.eta ? new Date(selectedVessel.eta) : null;
    const willMeetEta = vesselEta ? completionDate <= vesselEta : null;
    const bufferDays = vesselEta ? Math.ceil((vesselEta.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      dailyTonnage, effectiveDailyRate, tonnageNeeded, daysRequired, totalTrucksRequired,
      completionDate, overflowDay, willOverflow, willMeetEta, bufferDays, vesselEta,
    };
  }, [trucksPerDay, avgTonnesPerTruck, operatingDays, targetTonnage, selectedStockpile, startDate, selectedVessel]);

  // Projection chart
  const projectionData = useMemo(() => {
    const days = Math.max(scenario.daysRequired + 7, 30);
    return Array.from({ length: days }, (_, i) => {
      const projected = selectedStockpile.currentTonnes + scenario.effectiveDailyRate * (i + 1);
      return {
        day: `Day ${i + 1}`,
        projected: Math.min(projected, selectedStockpile.capacityTonnes * 1.1),
        target: targetTonnage,
        capacity: selectedStockpile.capacityTonnes,
      };
    });
  }, [scenario, selectedStockpile, targetTonnage]);

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-[360px_1fr] gap-4">
        {/* Input Panel */}
        <div className="flex flex-col gap-4">
          <PanelCard title="SCENARIO INPUTS">
            <div className="flex flex-col gap-4">
              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Target Stockpile</label>
                <select
                  value={targetStockpile}
                  onChange={e => setTargetStockpile(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-xs text-gray-900 focus:outline-none focus:border-amber-600"
                >
                  {stockpiles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Product Type</label>
                <select
                  value={productType}
                  onChange={e => setProductType(e.target.value as ProductType)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-xs text-gray-900 focus:outline-none focus:border-amber-600"
                >
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Target Tonnage: {formatTonnes(targetTonnage)} T</label>
                <input type="range" min={5000} max={50000} step={500} value={targetTonnage} onChange={e => setTargetTonnage(Number(e.target.value))} className="w-full accent-blue-900" />
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Trucks Per Day: {trucksPerDay}</label>
                <input type="range" min={1} max={50} value={trucksPerDay} onChange={e => setTrucksPerDay(Number(e.target.value))} className="w-full accent-blue-900" />
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Avg Tonnes/Truck</label>
                <input type="number" value={avgTonnesPerTruck} onChange={e => setAvgTonnesPerTruck(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-xs text-gray-900 focus:outline-none focus:border-amber-600" />
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Operating Days/Week</label>
                <div className="flex gap-2">
                  {[5, 6, 7].map(d => (
                    <button key={d} onClick={() => setOperatingDays(d)} className={`flex-1 font-sans text-xs py-2 rounded-lg border transition-colors ${operatingDays === d ? 'bg-amber-600 text-white border-amber-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-wider text-gray-600 block mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-xs text-gray-900 focus:outline-none focus:border-amber-600" />
              </div>
            </div>
          </PanelCard>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-4">
          {/* Key Results */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 border-t-2 border-t-amber-600 rounded-lg p-4">
              <div className="font-sans text-[10px] uppercase tracking-wider text-gray-600 mb-1">Days Required</div>
              <div className="font-sans font-bold text-4xl tracking-[0.05em] text-amber-600 leading-none">{scenario.daysRequired}</div>
            </div>
            <div className="bg-white border border-gray-200 border-t-2 border-t-blue-600 rounded-lg p-4">
              <div className="font-sans text-[10px] uppercase tracking-wider text-gray-600 mb-1">Completion Date</div>
              <div className="font-sans text-lg text-gray-900">{scenario.completionDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <div className="bg-white border border-gray-200 border-t-2 border-t-purple-600 rounded-lg p-4">
              <div className="font-sans text-[10px] uppercase tracking-wider text-gray-600 mb-1">Total Trucks</div>
              <div className="font-sans font-bold text-4xl tracking-[0.05em] text-gray-900 leading-none">{scenario.totalTrucksRequired}</div>
            </div>
          </div>

          {/* Projection Chart */}
          <PanelCard title="PROJECTED STOCKPILE ACCUMULATION">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} interval={4} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} formatter={(v: number) => [`${formatTonnes(v)} T`, '']} />
                  <ReferenceLine y={selectedStockpile.capacityTonnes} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Capacity', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={targetTonnage} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }} />
                  <Area type="monotone" dataKey="projected" fill="#1e3a8a" stroke="#1e3a8a" fillOpacity={0.15} strokeWidth={2} name="Projected" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          {/* Risk Assessment */}
          <PanelCard title="RISK ASSESSMENT">
            <div className="flex flex-col gap-3">
              <div className={`flex items-center gap-3 p-3 rounded-lg ${scenario.willOverflow ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {scenario.willOverflow ? <AlertTriangle size={16} className="text-red-600 shrink-0" /> : <CheckCircle2 size={16} className="text-green-600 shrink-0" />}
                <div>
                  <span className={`font-sans text-sm ${scenario.willOverflow ? 'text-red-600' : 'text-green-600'}`}>
                    {scenario.willOverflow
                      ? `Overflow risk: Stockpile will exceed capacity in ~${scenario.overflowDay} days`
                      : 'No overflow risk at current rate'}
                  </span>
                </div>
              </div>

              {scenario.willMeetEta !== null && (
                <div className={`flex items-center gap-3 p-3 rounded-lg ${scenario.willMeetEta ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {scenario.willMeetEta ? <CheckCircle2 size={16} className="text-green-600 shrink-0" /> : <AlertTriangle size={16} className="text-red-600 shrink-0" />}
                  <span className={`font-sans text-sm ${scenario.willMeetEta ? 'text-green-600' : 'text-red-600'}`}>
                    {scenario.willMeetEta
                      ? `Target met before vessel ETA with ${scenario.bufferDays} buffer days`
                      : `Shortfall risk: Will not reach target by vessel ETA (${scenario.bufferDays} days short)`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info size={16} className="text-blue-600 shrink-0" />
                <span className="font-sans text-sm text-blue-600">
                  Daily rate: {formatTonnes(scenario.effectiveDailyRate)} T/day ({trucksPerDay} trucks x {avgTonnesPerTruck} T/truck)
                </span>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </SkeletonLoader>
  );
}
