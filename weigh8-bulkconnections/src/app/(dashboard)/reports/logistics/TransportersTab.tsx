'use client';

import { useMemo, useState } from 'react';
import { transporters, orders, trucks } from '@/lib/reports-data';
import { groupBy } from '@/lib/reports-utils/calculations';
import { formatPercentage, formatHours } from '@/lib/reports-utils/formatters';
import { generateAlerts } from '@/lib/reports-utils/alerts';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import ProgressBar from '@/components/reports/ProgressBar';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column, Transporter } from '@/lib/types';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

function getTier(onTimePct: number): { label: string; color: string } {
  if (onTimePct >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (onTimePct >= 80) return { label: 'Good', color: 'text-blue-600' };
  if (onTimePct >= 70) return { label: 'Review', color: 'text-amber-600' };
  return { label: 'Poor', color: 'text-red-600' };
}

interface TransporterRow extends Transporter {
  activeOrders: number;
  trucksDeployed: number;
  totalTonnes: number;
  alertsThisMonth: number;
  tier: { label: string; color: string };
}

export default function TransportersTab() {
  const [selectedTransporters, setSelectedTransporters] = useState<string[]>([]);

  const alerts = useMemo(() => generateAlerts(trucks, orders, [], transporters), []);

  const transporterData: TransporterRow[] = useMemo(() => {
    const ordersByTransporter = groupBy(orders, o => o.transporterId);
    const alertsByTransporter = groupBy(alerts.filter(a => a.entityType === 'transporter'), a => a.entityId);

    return transporters.map(t => {
      const tOrders = ordersByTransporter[t.id] || [];
      const active = tOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
      const tTrucks = trucks.filter(tr => tr.transporterId === t.id);
      const totalTonnes = tOrders.reduce((s, o) => s + o.actualTonnage, 0);
      const tAlerts = alertsByTransporter[t.id] || [];
      return {
        ...t,
        activeOrders: active.length,
        trucksDeployed: tTrucks.filter(tr => tr.status !== 'completed').length,
        totalTonnes,
        alertsThisMonth: tAlerts.length,
        tier: getTier(t.onTimePct),
      };
    }).sort((a, b) => b.onTimePct - a.onTimePct);
  }, [alerts]);

  const columns: Column<TransporterRow>[] = [
    { key: 'name', label: 'Transporter', sortable: true, render: (r) => <span className="font-sans text-gray-900">{r.name}</span> },
    { key: 'activeOrders', label: 'Active', sortable: true },
    { key: 'trucksDeployed', label: 'Trucks', sortable: true },
    { key: 'fleetSize', label: 'Fleet', sortable: true },
    { key: 'onTimePct', label: 'On-Time %', sortable: true, render: (r) => (
      <div className="flex items-center gap-2">
        <ProgressBar value={r.onTimePct} size="sm" showLabel={false} color={r.onTimePct >= 80 ? 'green' : r.onTimePct >= 70 ? 'amber' : 'red'} />
        <span className="font-sans text-xs">{formatPercentage(r.onTimePct)}</span>
      </div>
    )},
    { key: 'avgTransitHours', label: 'Avg Transit', sortable: true, render: (r) => <span className="font-sans">{formatHours(r.avgTransitHours)}</span> },
    { key: 'avgVariancePct', label: 'Avg Var %', sortable: true, render: (r) => <span className={`font-sans ${r.avgVariancePct > 2 ? 'text-red-600' : 'text-gray-700'}`}>{formatPercentage(r.avgVariancePct)}</span> },
    { key: 'tier', label: 'Tier', sortable: false, render: (r) => <span className={`font-sans text-xs font-bold ${r.tier.color}`}>{r.tier.label}</span> },
  ];

  // Radar chart data for comparison
  const radarData = useMemo(() => {
    const selected = selectedTransporters.length > 0 ? selectedTransporters : transporterData.slice(0, 3).map(t => t.id);
    const metrics = ['Speed', 'Reliability', 'Accuracy', 'Fleet Util', 'Compliance'];
    return metrics.map(metric => {
      const point: Record<string, number | string> = { metric };
      selected.forEach(id => {
        const t = transporterData.find(tr => tr.id === id);
        if (!t) return;
        switch (metric) {
          case 'Speed': point[t.name] = Math.max(0, 100 - (t.avgTransitHours - 8) * 10); break;
          case 'Reliability': point[t.name] = t.onTimePct; break;
          case 'Accuracy': point[t.name] = Math.max(0, 100 - t.avgVariancePct * 20); break;
          case 'Fleet Util': point[t.name] = t.trucksDeployed > 0 ? Math.min(100, (t.trucksDeployed / t.fleetSize) * 100) : 50; break;
          case 'Compliance': point[t.name] = Math.max(0, 100 - t.alertsThisMonth * 10); break;
        }
      });
      return point;
    });
  }, [selectedTransporters, transporterData]);

  const comparedTransporters = useMemo(() => {
    const ids = selectedTransporters.length > 0 ? selectedTransporters : transporterData.slice(0, 3).map(t => t.id);
    return transporterData.filter(t => ids.includes(t.id));
  }, [selectedTransporters, transporterData]);

  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const week: Record<string, number | string> = { week: `W${i + 1}` };
      comparedTransporters.forEach(t => {
        week[t.name] = t.onTimePct - 5 + Math.random() * 10;
      });
      return week;
    });
  }, [comparedTransporters]);

  const radarColors = ['#1e3a8a', '#3b82f6', '#22c55e', '#a855f7', '#ef4444'];

  return (
    <SkeletonLoader>
      {/* Scorecard Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {transporterData.slice(0, 8).map(t => (
          <div
            key={t.id}
            onClick={() => setSelectedTransporters(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id].slice(-3))}
            className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedTransporters.includes(t.id) ? 'border-amber-600' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-sm text-gray-900 font-medium truncate">{t.name}</span>
              <span className={`font-sans text-[10px] font-bold ${t.tier.color}`}>{t.tier.label}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <ProgressBar value={t.onTimePct} size="sm" showLabel={false} color={t.onTimePct >= 80 ? 'green' : t.onTimePct >= 70 ? 'amber' : 'red'} />
              <span className="font-sans text-xs text-gray-700">{formatPercentage(t.onTimePct)}</span>
            </div>
            <div className="flex justify-between font-sans text-[10px] text-gray-600">
              <span>Fleet: {t.fleetSize}</span>
              <span>Avg: {formatHours(t.avgTransitHours)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="TRANSPORTER COMPARISON (RADAR)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} />
                <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                {comparedTransporters.map((t, i) => (
                  <Radar key={t.id} name={t.name} dataKey={t.name} stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="ON-TIME % TREND (12 WEEKS)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} />
                {comparedTransporters.map((t, i) => (
                  <Line key={t.id} type="monotone" dataKey={t.name} stroke={radarColors[i]} strokeWidth={2} dot={{ fill: radarColors[i], r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="FULL PERFORMANCE RANKING">
        <DataTable columns={columns} data={transporterData} sortable paginated pageSize={15} searchable />
      </PanelCard>
    </SkeletonLoader>
  );
}
