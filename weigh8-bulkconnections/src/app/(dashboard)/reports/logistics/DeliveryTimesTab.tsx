'use client';

import { useMemo } from 'react';
import { trucks, mines, transporters } from '@/lib/reports-data';
import { formatHours, formatPercentage } from '@/lib/reports-utils/formatters';
import { groupBy, avgBy } from '@/lib/reports-utils/calculations';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Legend } from 'recharts';

const targets = {
  loading: 2.0, mineToLions: 9.0, lionsProcessing: 0.5, staging: 4.0, lionsToBc: 2.5, bcCheckin: 0.5, offload: 1.5, bcCheckout: 0.5, total: 16,
};

function getStageHours(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

export default function DeliveryTimesTab() {
  const truckStages = useMemo(() => {
    return trucks.filter(t => t.mineLoadTime).map(t => {
      const loading = getStageHours(t.mineLoadTime, t.mineExitTime);
      const mineToLions = getStageHours(t.mineExitTime, t.lionsArrivalTime);
      const staging = getStageHours(t.lionsArrivalTime, t.lionsDepartureTime);
      const lionsToBc = getStageHours(t.lionsDepartureTime, t.bcArrivalTime);
      const offload = getStageHours(t.bcArrivalTime, t.bcOffloadTime);
      const total = getStageHours(t.mineLoadTime, t.bcExitTime || t.bcOffloadTime);
      return { ...t, stages: { loading, mineToLions, staging, lionsToBc, offload, total } };
    });
  }, []);

  const avgStages = useMemo(() => ({
    loading: avgBy(truckStages.filter(t => t.stages.loading !== null), t => t.stages.loading!),
    mineToLions: avgBy(truckStages.filter(t => t.stages.mineToLions !== null), t => t.stages.mineToLions!),
    staging: avgBy(truckStages.filter(t => t.stages.staging !== null), t => t.stages.staging!),
    lionsToBc: avgBy(truckStages.filter(t => t.stages.lionsToBc !== null), t => t.stages.lionsToBc!),
    offload: avgBy(truckStages.filter(t => t.stages.offload !== null), t => t.stages.offload!),
    total: avgBy(truckStages.filter(t => t.stages.total !== null), t => t.stages.total!),
  }), [truckStages]);

  // Journey timeline visual data
  const journeyData = useMemo(() => [
    { stage: 'Loading', avg: avgStages.loading, target: targets.loading, color: '#f97316' },
    { stage: 'Mine→Lions', avg: avgStages.mineToLions, target: targets.mineToLions, color: '#3b82f6' },
    { stage: 'Staging', avg: avgStages.staging, target: targets.staging, color: '#a855f7' },
    { stage: 'Lions→BC', avg: avgStages.lionsToBc, target: targets.lionsToBc, color: '#1e3a8a' },
    { stage: 'Offload', avg: avgStages.offload, target: targets.offload, color: '#22c55e' },
  ], [avgStages]);

  // Outlier trucks
  const outlierTrucks = useMemo(() => {
    return truckStages.filter(t => {
      if (t.stages.loading && t.stages.loading > targets.loading * 2) return true;
      if (t.stages.mineToLions && t.stages.mineToLions > targets.mineToLions * 2) return true;
      if (t.stages.staging && t.stages.staging > targets.staging * 2) return true;
      if (t.stages.lionsToBc && t.stages.lionsToBc > targets.lionsToBc * 2) return true;
      if (t.stages.offload && t.stages.offload > targets.offload * 2) return true;
      return false;
    });
  }, [truckStages]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      avgTotal: 12 + Math.random() * 8,
      target: targets.total,
    }));
  }, []);

  interface OutlierRow {
    registration: string;
    orderId: string;
    status: string;
    stages: {
      loading: number | null;
      mineToLions: number | null;
      staging: number | null;
      lionsToBc: number | null;
      offload: number | null;
      total: number | null;
    };
  }

  const outlierColumns: Column<OutlierRow>[] = [
    { key: 'registration', label: 'Truck', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.registration}</span> },
    { key: 'orderId', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'loading', label: 'Loading', render: (r) => <span className={`font-sans text-xs ${r.stages.loading && r.stages.loading > targets.loading * 2 ? 'text-red-600' : 'text-gray-700'}`}>{r.stages.loading ? formatHours(r.stages.loading) : '-'}</span> },
    { key: 'mineToLions', label: 'Mine→Lions', render: (r) => <span className={`font-sans text-xs ${r.stages.mineToLions && r.stages.mineToLions > targets.mineToLions * 2 ? 'text-red-600' : 'text-gray-700'}`}>{r.stages.mineToLions ? formatHours(r.stages.mineToLions) : '-'}</span> },
    { key: 'staging', label: 'Staging', render: (r) => <span className={`font-sans text-xs ${r.stages.staging && r.stages.staging > targets.staging * 2 ? 'text-red-600' : 'text-gray-700'}`}>{r.stages.staging ? formatHours(r.stages.staging) : '-'}</span> },
    { key: 'total', label: 'Total', render: (r) => <span className={`font-sans text-xs font-bold ${r.stages.total && r.stages.total > targets.total ? 'text-red-600' : 'text-green-600'}`}>{r.stages.total ? formatHours(r.stages.total) : '-'}</span> },
  ];

  return (
    <SkeletonLoader>
      {/* Stage KPIs */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Loading', avg: avgStages.loading, target: targets.loading },
          { label: 'Mine→Lions', avg: avgStages.mineToLions, target: targets.mineToLions },
          { label: 'Staging', avg: avgStages.staging, target: targets.staging },
          { label: 'Lions→BC', avg: avgStages.lionsToBc, target: targets.lionsToBc },
          { label: 'Offload', avg: avgStages.offload, target: targets.offload },
          { label: 'Total', avg: avgStages.total, target: targets.total },
        ].map(s => (
          <KpiCard
            key={s.label}
            label={s.label}
            value={formatHours(s.avg)}
            subtext={`Target: ${formatHours(s.target)}`}
            accentColor={s.avg > s.target * 1.5 ? 'red' : s.avg > s.target ? 'amber' : 'green'}
          />
        ))}
      </div>

      {/* Journey Timeline + Stage Distribution */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="JOURNEY STAGE BREAKDOWN (ACTUAL VS TARGET)">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={journeyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} />
                <Bar dataKey="avg" fill="#1e3a8a" radius={[2, 2, 0, 0]} name="Actual Avg" />
                <Bar dataKey="target" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="WEEKLY AVG DELIVERY TIME TREND">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <ReferenceLine y={targets.total} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Target', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgTotal" stroke="#1e3a8a" strokeWidth={2} dot={{ fill: '#1e3a8a', r: 3 }} name="Avg Total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      {/* Outlier Trucks */}
      <PanelCard title={`OUTLIER TRUCKS (${outlierTrucks.length} EXCEEDING 2x TARGET)`}>
        <DataTable
          columns={outlierColumns}
          data={outlierTrucks as OutlierRow[]}
          sortable
          paginated
          pageSize={10}
          highlightRow={(r) => r.stages.total && r.stages.total > targets.total * 1.5 ? 'red' : r.stages.total && r.stages.total > targets.total ? 'amber' : null}
        />
      </PanelCard>
    </SkeletonLoader>
  );
}
