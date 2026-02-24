'use client';

import { useMemo } from 'react';
import { stockpiles, vessels, orders } from '@/lib/reports-data';
import { formatTonnes, formatPercentage } from '@/lib/reports-utils/formatters';
import { calculateAggregateStockpileUtilisation, calculateStockpileUtilisation } from '@/lib/reports-utils/calculations';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import ProgressBar from '@/components/reports/ProgressBar';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ReferenceLine } from 'recharts';

export default function StatusTab() {
  const totalCurrent = useMemo(() => stockpiles.reduce((s, p) => s + p.currentTonnes, 0), []);
  const totalCapacity = useMemo(() => stockpiles.reduce((s, p) => s + p.capacityTonnes, 0), []);
  const overallUtil = useMemo(() => calculateAggregateStockpileUtilisation(stockpiles), []);
  const atRisk = useMemo(() => stockpiles.filter(s => (s.currentTonnes / s.capacityTonnes) >= 0.85).length, []);
  const pendingInbound = useMemo(() => stockpiles.reduce((s, p) => s + p.pendingInboundTonnes, 0), []);

  // Capacity forecast
  const forecastData = useMemo(() => {
    return Array.from({ length: 14 }, (_, day) => {
      const point: Record<string, number | string> = { day: `Day ${day + 1}` };
      stockpiles.slice(0, 5).forEach(s => {
        const dailyInbound = s.pendingInboundTonnes / 7;
        const projected = Math.min(s.capacityTonnes, s.currentTonnes + dailyInbound * (day + 1));
        point[s.name.replace('Island View ', 'IV ')] = projected;
      });
      return point;
    });
  }, []);

  // Inbound schedule
  const inboundData = useMemo(() => {
    return Array.from({ length: 14 }, (_, day) => {
      const point: Record<string, number | string> = { day: `D${day + 1}` };
      stockpiles.forEach(s => {
        point[s.name.replace('Island View ', 'IV ').replace('Yard ', 'Y')] = Math.round(s.pendingInboundTonnes / 14 * (0.5 + Math.random()));
      });
      return point;
    });
  }, []);

  const stockpileColors = ['#1e3a8a', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#14b8a6', '#64748b', '#f59e0b', '#475569', '#06b6d4'];

  return (
    <SkeletonLoader>
      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiCard label="Total Inventory" value={`${formatTonnes(totalCurrent)} T`} accentColor="gold" />
        <KpiCard label="Total Capacity" value={`${formatTonnes(totalCapacity)} T`} accentColor="blue" />
        <KpiCard label="Overall Utilisation" value={formatPercentage(overallUtil)} accentColor={overallUtil > 85 ? 'red' : overallUtil > 70 ? 'amber' : 'green'} />
        <KpiCard label="Piles at Risk" value={atRisk} subtext="> 85% capacity" accentColor={atRisk > 0 ? 'red' : 'green'} />
        <KpiCard label="Pending Inbound" value={`${formatTonnes(pendingInbound)} T`} accentColor="purple" />
      </div>

      {/* Stockpile Capacity Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {stockpiles.map(s => {
          const util = calculateStockpileUtilisation(s);
          const vessel = vessels.find(v => v.id === s.allocatedVesselId);
          const feedingOrders = orders.filter(o => o.stockpileId === s.id && !['completed', 'cancelled'].includes(o.status));
          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-sm text-gray-900 font-medium">{s.name}</span>
                <span className="font-sans text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">{s.product}</span>
              </div>
              <div className="mb-2">
                <ProgressBar
                  value={s.currentTonnes}
                  max={s.capacityTonnes}
                  color={util > 85 ? 'red' : util > 70 ? 'amber' : 'green'}
                  label={`${formatTonnes(s.currentTonnes)} / ${formatTonnes(s.capacityTonnes)} T`}
                />
              </div>
              <div className="flex justify-between font-sans text-[10px] text-gray-600 mb-1">
                <span>{formatPercentage(util)} used</span>
                <span>+{formatTonnes(s.pendingInboundTonnes)} T pending</span>
              </div>
              {vessel && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="font-sans text-[10px] text-blue-600">Vessel: {vessel.name}</span>
                </div>
              )}
              {feedingOrders.length > 0 && (
                <div className="mt-1">
                  <span className="font-sans text-[9px] text-gray-500">{feedingOrders.length} order(s) feeding</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="CAPACITY FORECAST (14 DAYS)">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'Inter, sans-serif' }} />
                {stockpiles.slice(0, 5).map((s, i) => (
                  <Line key={s.id} type="monotone" dataKey={s.name.replace('Island View ', 'IV ')} stroke={stockpileColors[i]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="STOCKPILE x VESSEL ALLOCATION">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Stockpile', 'Vessel', 'Product', 'Target', 'Loaded', 'Remaining'].map(h => (
                    <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockpiles.filter(s => s.allocatedVesselId).map(s => {
                  const vessel = vessels.find(v => v.id === s.allocatedVesselId);
                  if (!vessel) return null;
                  return (
                    <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 font-sans text-xs text-gray-900">{s.name}</td>
                      <td className="px-3 py-2 font-sans text-xs text-blue-600">{vessel.name}</td>
                      <td className="px-3 py-2 font-sans text-[10px] text-gray-600">{s.product}</td>
                      <td className="px-3 py-2 font-sans text-xs text-gray-900">{formatTonnes(vessel.plannedVolumeTonnes)} T</td>
                      <td className="px-3 py-2 font-sans text-xs text-amber-600">{formatTonnes(vessel.loadedTonnes)} T</td>
                      <td className="px-3 py-2 font-sans text-xs text-gray-700">{formatTonnes(vessel.plannedVolumeTonnes - vessel.loadedTonnes)} T</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelCard>
      </div>
    </SkeletonLoader>
  );
}
