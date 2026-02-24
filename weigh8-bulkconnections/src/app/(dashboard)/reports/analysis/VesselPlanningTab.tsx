'use client';

import { useMemo } from 'react';
import { vessels, stockpiles, clients, orders } from '@/lib/reports-data';
import { formatTonnes, formatPercentage, formatDate } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import StatusBadge from '@/components/reports/StatusBadge';
import ProgressBar from '@/components/reports/ProgressBar';
import DataTable from '@/components/reports/DataTable';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column, Vessel } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const statusColors: Record<string, string> = {
  tbn: 'bg-gray-600', nominated: 'bg-blue-600', accumulating: 'bg-purple-600',
  loading: 'bg-amber-600', completed: 'bg-green-600', departed: 'bg-gray-500',
};

export default function VesselPlanningTab() {
  const vesselData = useMemo(() => {
    return vessels.map(v => {
      const stockpile = stockpiles.find(s => s.id === v.stockpileId);
      const client = clients.find(c => c.id === v.clientId);
      const contributingOrders = orders.filter(o => o.vesselId === v.id);
      const remaining = Math.max(0, v.plannedVolumeTonnes - v.loadedTonnes);
      const pctLoaded = v.plannedVolumeTonnes > 0 ? (v.loadedTonnes / v.plannedVolumeTonnes) * 100 : 0;
      const daysUntilEta = v.eta ? Math.max(0, Math.ceil((new Date(v.eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

      let readiness: 'green' | 'amber' | 'red' = 'green';
      if (daysUntilEta !== null && pctLoaded < 50 && daysUntilEta < 14) readiness = 'red';
      else if (daysUntilEta !== null && pctLoaded < 80 && daysUntilEta < 7) readiness = 'red';
      else if (daysUntilEta !== null && pctLoaded < 70) readiness = 'amber';

      return {
        ...v,
        stockpileName: stockpile?.name || v.stockpileId,
        clientName: client?.name || v.clientId,
        remaining,
        pctLoaded,
        daysUntilEta,
        readiness,
        contributingOrders: contributingOrders.length,
      };
    });
  }, []);

  // Accumulation chart data for active vessels
  const accumulationData = useMemo(() => {
    const activeVessels = vesselData.filter(v => ['accumulating', 'loading', 'nominated'].includes(v.status)).slice(0, 4);
    return Array.from({ length: 30 }, (_, day) => {
      const point: Record<string, number | string> = { day: `D${day + 1}` };
      activeVessels.forEach(v => {
        const dailyRate = v.loadedTonnes / 15;
        point[v.name] = Math.min(v.plannedVolumeTonnes, v.loadedTonnes * 0.3 + dailyRate * (day + 1));
        point[`${v.name}_target`] = v.plannedVolumeTonnes;
      });
      return point;
    });
  }, [vesselData]);

  const activeVesselsForChart = useMemo(() =>
    vesselData.filter(v => ['accumulating', 'loading', 'nominated'].includes(v.status)).slice(0, 4), [vesselData]);

  const chartColors = ['#1e3a8a', '#3b82f6', '#22c55e', '#a855f7'];

  interface VesselRow {
    name: string;
    clientName: string;
    product: string;
    stockpileName: string;
    plannedVolumeTonnes: number;
    loadedTonnes: number;
    remaining: number;
    contributingOrders: number;
    status: string;
    eta?: string;
    etd?: string;
  }

  const columns: Column<VesselRow>[] = [
    { key: 'name', label: 'Vessel', sortable: true, render: (r) => <span className="font-sans text-gray-900 font-medium">{r.name}</span> },
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'product', label: 'Product', sortable: true, render: (r) => <span className="font-sans text-[10px] text-gray-600">{r.product}</span> },
    { key: 'stockpileName', label: 'Stockpile', sortable: true },
    { key: 'plannedVolumeTonnes', label: 'Target T', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.plannedVolumeTonnes)}</span> },
    { key: 'loadedTonnes', label: 'Loaded T', sortable: true, render: (r) => <span className="font-sans text-amber-600">{formatTonnes(r.loadedTonnes)}</span> },
    { key: 'remaining', label: 'Remaining', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.remaining)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'eta', label: 'ETA', render: (r) => <span className="font-sans text-xs text-gray-700">{r.eta ? formatDate(r.eta) : '-'}</span> },
  ];

  return (
    <SkeletonLoader>
      {/* Vessel Pipeline Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {vesselData.map(v => (
          <div key={v.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans font-bold text-xl tracking-[0.05em] text-gray-900">{v.name}</span>
              <StatusBadge status={v.status} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-sans text-xs text-gray-700">{v.clientName}</span>
              <span className="font-sans text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">{v.product}</span>
            </div>
            <div className="mb-2">
              <ProgressBar
                value={v.loadedTonnes}
                max={v.plannedVolumeTonnes}
                color={v.pctLoaded >= 80 ? 'green' : v.pctLoaded >= 50 ? 'amber' : 'red'}
                label={`${formatTonnes(v.loadedTonnes)} / ${formatTonnes(v.plannedVolumeTonnes)} T`}
              />
            </div>
            <div className="flex justify-between font-sans text-[10px] text-gray-600">
              <span>Stockpile: {v.stockpileName}</span>
              {v.daysUntilEta !== null && (
                <span className={v.daysUntilEta < 7 ? 'text-red-600' : 'text-gray-600'}>
                  {v.daysUntilEta}d until ETA
                </span>
              )}
            </div>
            {v.readiness !== 'green' && (
              <div className={`mt-2 p-1.5 rounded-lg text-center font-sans text-[10px] ${
                v.readiness === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {v.readiness === 'red' ? 'AT RISK - May not meet ETA' : 'MONITOR - Loading behind schedule'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accumulation Chart */}
      <div className="mb-4">
        <PanelCard title="ACCUMULATED VS TARGET (ACTIVE VESSELS)">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accumulationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'Inter, sans-serif' }} />
                {activeVesselsForChart.map((v, i) => (
                  <Area key={v.id} type="monotone" dataKey={v.name} fill={chartColors[i]} stroke={chartColors[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="VESSEL LOADING TABLE">
        <DataTable columns={columns} data={vesselData as VesselRow[]} sortable paginated pageSize={15} />
      </PanelCard>
    </SkeletonLoader>
  );
}
