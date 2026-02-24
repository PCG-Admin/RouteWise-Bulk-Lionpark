'use client';

import { useMemo } from 'react';
import { orders, trucks, clients, mines, transporters } from '@/lib/reports-data';
import { groupBy, avgBy } from '@/lib/reports-utils/calculations';
import { formatTonnes, formatPercentage, formatWeightKg } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';

export default function VarianceTab() {
  const trucksWithVariance = useMemo(() => trucks.filter(t => t.variancePct !== undefined), []);

  const withinTolerance = useMemo(() => trucksWithVariance.filter(t => Math.abs(t.variancePct!) <= 1).length, [trucksWithVariance]);
  const minor = useMemo(() => trucksWithVariance.filter(t => Math.abs(t.variancePct!) > 1 && Math.abs(t.variancePct!) <= 2).length, [trucksWithVariance]);
  const major = useMemo(() => trucksWithVariance.filter(t => Math.abs(t.variancePct!) > 2 && Math.abs(t.variancePct!) <= 5).length, [trucksWithVariance]);
  const critical = useMemo(() => trucksWithVariance.filter(t => Math.abs(t.variancePct!) > 5).length, [trucksWithVariance]);
  const totalVarianceTonnes = useMemo(() => trucksWithVariance.reduce((s, t) => s + (t.varianceKg || 0), 0) / 1000, [trucksWithVariance]);

  // Order-level variance data
  const orderVariance = useMemo(() => {
    return orders.filter(o => o.actualTonnage > 0).map(o => {
      const varianceTonnes = o.actualTonnage - o.plannedTonnage;
      const variancePct = o.plannedTonnage > 0 ? (varianceTonnes / o.plannedTonnage) * 100 : 0;
      return {
        orderId: o.id,
        client: clients.find(c => c.id === o.clientId)?.name || o.clientId,
        mine: mines.find(m => m.id === o.mineId)?.name || o.mineId,
        planned: o.plannedTonnage,
        actual: o.actualTonnage,
        varianceTonnes,
        variancePct,
        trucks: o.completedTrucks,
        status: o.status,
      };
    }).sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  }, []);

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    const totalPlanned = orders.reduce((s, o) => s + o.plannedTonnage, 0);
    const totalActual = orders.reduce((s, o) => s + o.actualTonnage, 0);
    const items: { name: string; value: number; fill: string }[] = [
      { name: 'Planned', value: totalPlanned, fill: '#cbd5e1' },
    ];
    orderVariance.filter(o => Math.abs(o.variancePct) > 1).forEach(o => {
      items.push({
        name: o.orderId,
        value: o.varianceTonnes,
        fill: Math.abs(o.variancePct) > 5 ? '#ef4444' : Math.abs(o.variancePct) > 2 ? '#f97316' : '#22c55e',
      });
    });
    items.push({ name: 'Actual', value: totalActual, fill: '#1e3a8a' });
    return items;
  }, [orderVariance]);

  // Truck columns
  interface TruckVarianceRow {
    registration: string;
    orderId: string;
    driverId: string;
    transporterId: string;
    mineWeighbridgeKg: number;
    bcWeighbridgeKg: number;
    varianceKg: number;
    variancePct: number;
  }

  const truckVarianceData: TruckVarianceRow[] = useMemo(() => {
    return trucksWithVariance.map(t => ({
      registration: t.registration,
      orderId: t.orderId,
      driverId: t.driverId,
      transporterId: t.transporterId,
      mineWeighbridgeKg: t.mineWeighbridgeKg,
      bcWeighbridgeKg: t.bcWeighbridgeKg!,
      varianceKg: t.varianceKg || 0,
      variancePct: t.variancePct || 0,
    })).sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  }, [trucksWithVariance]);

  const truckColumns: Column<TruckVarianceRow>[] = [
    { key: 'registration', label: 'Truck', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.registration}</span> },
    { key: 'orderId', label: 'Order', sortable: true },
    { key: 'transporterId', label: 'Transporter', sortable: true, render: (r) => <span className="font-sans text-xs">{transporters.find(t => t.id === r.transporterId)?.name || r.transporterId}</span> },
    { key: 'mineWeighbridgeKg', label: 'Mine (kg)', sortable: true, render: (r) => <span className="font-sans text-xs">{formatWeightKg(r.mineWeighbridgeKg)}</span> },
    { key: 'bcWeighbridgeKg', label: 'BC (kg)', sortable: true, render: (r) => <span className="font-sans text-xs">{formatWeightKg(r.bcWeighbridgeKg)}</span> },
    { key: 'varianceKg', label: 'Var (kg)', sortable: true, render: (r) => <span className={`font-sans text-xs ${Math.abs(r.variancePct) >= 5 ? 'text-red-600' : Math.abs(r.variancePct) >= 2 ? 'text-amber-600' : 'text-gray-700'}`}>{r.varianceKg > 0 ? '+' : ''}{formatWeightKg(r.varianceKg)}</span> },
    { key: 'variancePct', label: 'Var %', sortable: true, render: (r) => <span className={`font-sans text-xs font-bold ${Math.abs(r.variancePct) >= 5 ? 'text-red-600' : Math.abs(r.variancePct) >= 2 ? 'text-amber-600' : 'text-gray-700'}`}>{r.variancePct.toFixed(2)}%</span> },
  ];

  // Variance trend
  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      avgVariance: -0.5 - Math.random() * 2.5,
      warningLine: -2,
      controlLine: -5,
    }));
  }, []);

  // Transporter variance bubble data
  const transporterBubbleData = useMemo(() => {
    return transporters.map(t => {
      const tTrucks = trucksWithVariance.filter(tr => tr.transporterId === t.id);
      const volume = tTrucks.reduce((s, tr) => s + tr.mineWeighbridgeKg, 0) / 1000;
      return {
        name: t.name,
        x: volume,
        y: t.avgVariancePct,
        z: tTrucks.length,
      };
    }).filter(d => d.z > 0);
  }, [trucksWithVariance]);

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KpiCard label="Within Tolerance" value={`${withinTolerance} (${formatPercentage(trucksWithVariance.length > 0 ? (withinTolerance / trucksWithVariance.length) * 100 : 0)})`} accentColor="green" />
        <KpiCard label="Minor (1-2%)" value={minor} accentColor="blue" />
        <KpiCard label="Major (2-5%)" value={major} accentColor="amber" />
        <KpiCard label="Critical (>5%)" value={critical} accentColor="red" />
        <KpiCard label="Total Variance" value={`${formatTonnes(totalVarianceTonnes)} T`} accentColor={totalVarianceTonnes < -1 ? 'red' : 'green'} />
      </div>

      {/* Waterfall Chart */}
      <div className="mb-4">
        <PanelCard title="VARIANCE WATERFALL" description="Shows how individual order variances bridge the gap between total planned and actual tonnage. Red bars indicate critical deviations.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} formatter={(v: number) => [`${formatTonnes(v)} T`, '']} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {waterfallData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="VARIANCE TREND (12 WEEKS)" description="Tracks average weight variance over time against warning (-2%) and control (-5%) thresholds to identify systemic losses.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <ReferenceLine y={-2} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#f97316', fontSize: 9 }} />
                <ReferenceLine y={-5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Control', fill: '#ef4444', fontSize: 9 }} />
                <Line type="monotone" dataKey="avgVariance" stroke="#1e3a8a" strokeWidth={2} dot={{ fill: '#1e3a8a', r: 3 }} name="Avg Variance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="VARIANCE BY TRANSPORTER (BUBBLE)" description="Compares each transporter's volume hauled (x-axis) against their average variance % (y-axis). Bubble size reflects truck count.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="Volume (T)" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis type="number" dataKey="y" name="Avg Variance %" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Trucks" />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={transporterBubbleData} fill="#1e3a8a" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="TRUCK-LEVEL VARIANCE">
        <DataTable
          columns={truckColumns}
          data={truckVarianceData}
          sortable
          paginated
          pageSize={15}
          searchable
          highlightRow={(r) => Math.abs(r.variancePct) >= 5 ? 'red' : Math.abs(r.variancePct) >= 2 ? 'amber' : null}
        />
      </PanelCard>
    </SkeletonLoader>
  );
}
