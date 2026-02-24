'use client';

import { useMemo, useState } from 'react';
import { drivers, trucks, transporters } from '@/lib/reports-data';
import { groupBy, avgBy } from '@/lib/reports-utils/calculations';
import { formatHours } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column, Driver } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X } from 'lucide-react';

interface DriverRow extends Driver {
  transporterName: string;
  avgVariancePct: number;
  truckCount: number;
}

export default function DriverAnalysisTab() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const driverData: DriverRow[] = useMemo(() => {
    return drivers.map(d => {
      const transporter = transporters.find(t => t.id === d.transporterId);
      const driverTrucks = trucks.filter(t => t.driverId === d.id);
      const withVariance = driverTrucks.filter(t => t.variancePct !== undefined);
      const avgVar = withVariance.length > 0 ? avgBy(withVariance, t => Math.abs(t.variancePct || 0)) : 0;
      return {
        ...d,
        transporterName: transporter?.name || d.transporterId,
        avgVariancePct: avgVar,
        truckCount: driverTrucks.length,
      };
    }).sort((a, b) => b.totalTripsThisMonth - a.totalTripsThisMonth);
  }, []);

  const columns: Column<DriverRow>[] = [
    { key: 'name', label: 'Driver', sortable: true, render: (r) => <span className="font-sans text-gray-900">{r.name}</span> },
    { key: 'transporterName', label: 'Transporter', sortable: true },
    { key: 'totalTripsThisMonth', label: 'Trips', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.totalTripsThisMonth}</span> },
    { key: 'avgTotalHours', label: 'Avg Time', sortable: true, render: (r) => (
      <span className={`font-sans ${r.avgTotalHours > 16 ? 'text-red-600' : r.avgTotalHours > 12 ? 'text-amber-600' : 'text-green-600'}`}>
        {formatHours(r.avgTotalHours)}
      </span>
    )},
    { key: 'avgVariancePct', label: 'Avg Var %', sortable: true, render: (r) => (
      <span className={`font-sans ${r.avgVariancePct > 2 ? 'text-red-600' : 'text-gray-700'}`}>
        {r.avgVariancePct.toFixed(2)}%
      </span>
    )},
    { key: 'truckCount', label: 'Active Trucks', sortable: true },
    { key: 'licenseNumber', label: 'License', render: (r) => <span className="font-sans text-[10px] text-gray-600">{r.licenseNumber}</span> },
  ];

  // Time breakdown chart data
  const breakdownData = useMemo(() => {
    return driverData.slice(0, 15).map(d => ({
      name: d.name.split(' ').pop() || d.name,
      loading: 1.5 + Math.random() * 1.5,
      transit: 6 + Math.random() * 4,
      staging: 2 + Math.random() * 5,
      atBc: 1 + Math.random() * 2,
    }));
  }, [driverData]);

  // Selected driver details
  const selectedDriverData = useMemo(() => {
    if (!selectedDriver) return null;
    const d = driverData.find(dr => dr.id === selectedDriver);
    if (!d) return null;
    const driverTrucks = trucks.filter(t => t.driverId === selectedDriver);
    return { driver: d, trucks: driverTrucks };
  }, [selectedDriver, driverData]);

  return (
    <SkeletonLoader>
      {/* Driver League Table */}
      <div className="mb-4">
        <PanelCard title="DRIVER LEAGUE TABLE">
          <DataTable
            columns={columns}
            data={driverData}
            sortable
            paginated
            pageSize={12}
            searchable
            onRowClick={(r) => setSelectedDriver(selectedDriver === r.id ? null : r.id)}
          />
        </PanelCard>
      </div>

      {/* Time Breakdown Chart */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="DRIVER TIME BREAKDOWN (STACKED)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} label={{ value: 'Hours', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: 10 } }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} width={60} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} />
                <Bar dataKey="loading" stackId="a" fill="#f97316" name="Loading" />
                <Bar dataKey="transit" stackId="a" fill="#3b82f6" name="Transit" />
                <Bar dataKey="staging" stackId="a" fill="#a855f7" name="Staging" />
                <Bar dataKey="atBc" stackId="a" fill="#22c55e" name="At BC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="STAGING TIME BY DRIVER (TOP 15)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData.sort((a, b) => b.staging - a.staging)} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} width={60} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                <Bar dataKey="staging" fill="#a855f7" radius={[0, 2, 2, 0]} name="Staging Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      {/* Driver Detail Modal */}
      {selectedDriverData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setSelectedDriver(null)}>
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-sans font-bold text-xl tracking-[0.1em] text-gray-900">
                {selectedDriverData.driver.name}
              </div>
              <button onClick={() => setSelectedDriver(null)} className="text-gray-600 hover:text-gray-900"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-sans text-[10px] text-gray-600 uppercase">Trips</div>
                <div className="font-sans text-lg text-amber-600">{selectedDriverData.driver.totalTripsThisMonth}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-sans text-[10px] text-gray-600 uppercase">Avg Time</div>
                <div className="font-sans text-lg text-gray-900">{formatHours(selectedDriverData.driver.avgTotalHours)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-sans text-[10px] text-gray-600 uppercase">Avg Variance</div>
                <div className="font-sans text-lg text-gray-700">{selectedDriverData.driver.avgVariancePct.toFixed(2)}%</div>
              </div>
            </div>
            <div className="font-sans text-[10px] text-gray-600 uppercase mb-2">Recent Trips</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Truck', 'Order', 'Status', 'Variance'].map(h => (
                      <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDriverData.trucks.map(t => (
                    <tr key={t.id} className="border-t border-gray-200">
                      <td className="px-3 py-2 font-sans text-xs text-amber-600">{t.registration}</td>
                      <td className="px-3 py-2 font-sans text-xs text-gray-700">{t.orderId}</td>
                      <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                      <td className="px-3 py-2 font-sans text-xs text-gray-700">{t.variancePct ? `${t.variancePct.toFixed(2)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </SkeletonLoader>
  );
}
