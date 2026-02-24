'use client';

import { useMemo } from 'react';
import { orders, trucks, stockpiles, transporters } from '@/lib/reports-data';
import { generateAlerts } from '@/lib/reports-utils/alerts';
import { getActiveOrders, calculateAggregateStockpileUtilisation, calculateAvgTransitHours, calculateTotalVolume, getOrdersByProduct } from '@/lib/reports-utils/calculations';
import { formatTonnes, formatPercentage, formatHours } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import TruckPipelineFlow from '@/components/reports/charts/TruckPipelineFlow';
import StatusBadge from '@/components/reports/StatusBadge';
import ProgressBar from '@/components/reports/ProgressBar';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';

const productColors: Record<string, string> = {
  'Chrome': '#1e3a5f',
  'Iron Ore': '#0ea5e9',
  'Thermal Coal': '#475569',
  'Metallurgical Coal': '#94a3b8',
  'Manganese Ore': '#8b5cf6',
  'Vanadium': '#10b981',
  'Nickel': '#ef4444',
  'Copper': '#f59e0b',
  'Zinc': '#06b6d4',
  'Lead': '#f97316',
  'Anthracite': '#cbd5e1',
};

export default function DashboardTab() {
  const activeOrders = useMemo(() => getActiveOrders(orders), []);
  const alerts = useMemo(() => generateAlerts(trucks, orders, stockpiles, transporters), []);
  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical'), [alerts]);
  const warningAlerts = useMemo(() => alerts.filter(a => a.severity === 'warning'), [alerts]);
  const avgTransit = useMemo(() => calculateAvgTransitHours(trucks), []);
  const stockpileUtil = useMemo(() => calculateAggregateStockpileUtilisation(stockpiles), []);
  const totalVolume = useMemo(() => calculateTotalVolume(orders), []);
  const deployedTrucks = useMemo(() => trucks.filter(t => t.status !== 'completed'), []);

  const productData = useMemo(() => {
    const byProduct = getOrdersByProduct(orders);
    return Object.entries(byProduct).map(([product, productOrders]) => ({
      name: product,
      value: productOrders.reduce((sum, o) => sum + o.actualTonnage, 0),
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, []);

  const weeklyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      actual: Math.round(800 + Math.random() * 600),
      planned: 1200,
    }));
  }, []);

  const topTransporters = useMemo(() =>
    [...transporters].sort((a, b) => b.onTimePct - a.onTimePct).slice(0, 5), []
  );

  const top5Alerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  const stockpileData = useMemo(() =>
    stockpiles.map(s => ({
      name: s.name.replace('Island View ', 'IV ').replace('Yard ', 'Y'),
      current: s.currentTonnes,
      capacity: s.capacityTonnes,
      pct: (s.currentTonnes / s.capacityTonnes) * 100,
    })), []
  );

  return (
    <div className="p-6">
      <SkeletonLoader>
        {/* KPI Strip */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <KpiCard
            label="Active Orders"
            value={activeOrders.length}
            delta={{ value: '12.5%', direction: 'up', positive: true }}
            accentColor="gold"
          />
          <KpiCard
            label="Trucks Deployed"
            value={deployedTrucks.length}
            subtext={`${trucks.filter(t => t.status === 'loading').length} loading / ${trucks.filter(t => ['in_transit_to_lions', 'in_transit_to_bc'].includes(t.status)).length} transit`}
            accentColor="blue"
          />
          <KpiCard
            label="Volume This Week"
            value={`${formatTonnes(totalVolume)} T`}
            delta={{ value: '8.3%', direction: 'up', positive: true }}
            accentColor="green"
          />
          <KpiCard
            label="Active Alerts"
            value={alerts.length}
            subtext={`${criticalAlerts.length} critical / ${warningAlerts.length} warning`}
            accentColor="red"
          />
          <KpiCard
            label="Avg Mine-BC Time"
            value={formatHours(avgTransit)}
            subtext="Target: 8.0h"
            accentColor={avgTransit > 8 ? 'amber' : 'green'}
          />
          <KpiCard
            label="Stockpile Utilisation"
            value={formatPercentage(stockpileUtil)}
            accentColor={stockpileUtil > 85 ? 'red' : stockpileUtil > 70 ? 'amber' : 'green'}
          />
        </div>

        {/* Row 1: Weekly Volume + Product Mix */}
        <div className="grid grid-cols-[7fr_3fr] gap-4 mb-4">
          <PanelCard title="WEEKLY VOLUME (ACTUAL VS PLANNED)">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
                    labelStyle={{ color: '#0f172a' }}
                    itemStyle={{ color: '#475569' }}
                  />
                  <Bar dataKey="planned" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Planned" />
                  <Bar dataKey="actual" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard title="PRODUCT MIX">
            <div className="h-[280px] flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                    {productData.map((entry) => (
                      <Cell key={entry.name} fill={productColors[entry.name] || '#8494A7'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
                    formatter={(value: number) => [`${formatTonnes(value)} T`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {productData.slice(0, 5).map(p => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: productColors[p.name] }} />
                    <span className="font-sans text-[9px] text-gray-600">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>
        </div>

        {/* Row 2: Truck Pipeline + Alerts */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PanelCard title="TRUCK PIPELINE">
            <TruckPipelineFlow />
          </PanelCard>

          <PanelCard title="TOP ALERTS" action={
            <Link href="/reports/alerts" className="font-sans text-xs text-blue-600 hover:underline">View All</Link>
          }>
            <div className="flex flex-col gap-2">
              {top5Alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-1 self-stretch rounded-sm ${
                    alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-xs text-gray-900 truncate">{alert.title}</div>
                    <div className="font-sans text-[10px] text-gray-500 mt-0.5 truncate">{alert.detail}</div>
                  </div>
                  <StatusBadge status={alert.severity} />
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        {/* Row 3: Stockpiles, Transporter League, Order Progress */}
        <div className="grid grid-cols-3 gap-4">
          <PanelCard title="STOCKPILE CAPACITY">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockpileData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
                  />
                  <Bar dataKey="current" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="Current (T)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard title="TRANSPORTER LEAGUE">
            <div className="flex flex-col gap-3">
              {topTransporters.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="font-sans font-bold text-lg text-gray-400 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-sans text-xs text-gray-900">{t.name}</div>
                    <ProgressBar value={t.onTimePct} size="sm" color="green" showLabel={false} />
                  </div>
                  <span className="font-sans text-xs text-green-600">{t.onTimePct}%</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="ORDER COMPLETIONS">
            <div className="flex flex-col gap-3">
              {activeOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center gap-3">
                  <span className="font-sans text-xs text-blue-600 w-[72px]">{order.id}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={order.completedTrucks}
                      max={order.plannedTrucks}
                      size="sm"
                      label={`${order.completedTrucks}/${order.plannedTrucks}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </SkeletonLoader>
    </div>
  );
}
