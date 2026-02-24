'use client';

import { useMemo, useState } from 'react';
import { orders, trucks, clients, mines } from '@/lib/reports-data';
import { formatTonnes, formatPercentage, formatTimeElapsed } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export default function TruckAllocationTab() {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const unallocatedTrucks = useMemo(() => trucks.filter(t => !t.orderId || t.orderId === ''), []);
  const totalTrucks = trucks.length;
  const allocatedTrucks = totalTrucks - unallocatedTrucks.length;
  const overAllocated = useMemo(() => orders.filter(o => o.allocatedTrucks > o.plannedTrucks).length, []);

  const allocationData = useMemo(() => {
    return orders.filter(o => !['cancelled'].includes(o.status)).map(o => ({
      orderId: o.id,
      client: clients.find(c => c.id === o.clientId)?.name || o.clientId,
      mine: mines.find(m => m.id === o.mineId)?.name || o.mineId,
      planned: o.plannedTrucks,
      allocated: o.allocatedTrucks,
      inTransit: trucks.filter(t => t.orderId === o.id && ['in_transit_to_lions', 'in_transit_to_bc'].includes(t.status)).length,
      delivered: o.completedTrucks,
      unallocated: Math.max(0, o.plannedTrucks - o.allocatedTrucks),
      pctComplete: o.plannedTrucks > 0 ? (o.completedTrucks / o.plannedTrucks) * 100 : 0,
      status: o.status,
    }));
  }, []);

  interface AllocationRow {
    orderId: string;
    client: string;
    mine: string;
    planned: number;
    allocated: number;
    inTransit: number;
    delivered: number;
    unallocated: number;
    pctComplete: number;
    status: string;
  }

  const columns: Column<AllocationRow>[] = [
    { key: 'orderId', label: 'Order', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.orderId}</span> },
    { key: 'client', label: 'Client', sortable: true },
    { key: 'mine', label: 'Mine', sortable: true },
    { key: 'planned', label: 'Planned', sortable: true },
    { key: 'allocated', label: 'Allocated', sortable: true },
    { key: 'inTransit', label: 'In Transit', sortable: true },
    { key: 'delivered', label: 'Delivered', sortable: true },
    { key: 'unallocated', label: 'Unalloc.', sortable: true, render: (r) => (
      <span className={`font-sans ${r.unallocated > 0 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{r.unallocated}</span>
    )},
    { key: 'pctComplete', label: '% Complete', sortable: true, render: (r) => <span className="font-sans">{formatPercentage(r.pctComplete)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const chartData = useMemo(() =>
    allocationData.filter(d => !['completed', 'cancelled'].includes(d.status)).slice(0, 12).map(d => ({
      name: d.orderId,
      planned: d.planned,
      allocated: d.allocated,
    })), [allocationData]
  );

  return (
    <SkeletonLoader>
      {/* Alert strip */}
      {unallocatedTrucks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <div>
            <span className="font-sans text-sm text-red-600 font-medium">{unallocatedTrucks.length} unallocated truck(s) detected</span>
            <span className="font-sans text-xs text-gray-700 ml-3">
              {unallocatedTrucks.map(t => t.registration).join(', ')}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total Trucks" value={totalTrucks} accentColor="gold" />
        <KpiCard label="Allocated" value={allocatedTrucks} accentColor="green" />
        <KpiCard label="Unallocated" value={unallocatedTrucks.length} accentColor={unallocatedTrucks.length > 0 ? 'red' : 'green'} />
        <KpiCard label="Over-Allocated" value={overAllocated} accentColor={overAllocated > 0 ? 'amber' : 'green'} />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4 mb-4">
        <PanelCard title="ALLOCATION BY ORDER">
          <DataTable
            columns={columns}
            data={allocationData}
            sortable
            paginated
            pageSize={12}
            highlightRow={(r) => r.unallocated > 0 ? 'red' : null}
          />
        </PanelCard>

        <div className="flex flex-col gap-4">
          <PanelCard title="PLANNED VS ALLOCATED TRUCKS">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} />
                  <Bar dataKey="planned" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Planned" />
                  <Bar dataKey="allocated" fill="#1e3a8a" radius={[2, 2, 0, 0]} name="Allocated" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          {unallocatedTrucks.length > 0 && (
            <PanelCard title="UNALLOCATED TRUCKS">
              <div className="flex flex-col gap-2">
                {unallocatedTrucks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-sans text-xs text-amber-600">{t.registration}</span>
                      <span className="font-sans text-xs text-gray-700 ml-3">{t.transporterId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={t.status} />
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="font-sans text-[10px] bg-amber-600 text-white px-2 py-1 rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          )}
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="font-sans font-bold text-xl tracking-[0.1em] text-gray-900 mb-4">ASSIGN TO ORDER</div>
            <div className="font-sans text-sm text-gray-700 mb-4">This is a demo. In production, this would allow assigning the unallocated truck to an existing order.</div>
            <button onClick={() => setShowAssignModal(false)} className="font-sans text-xs bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>
      )}
    </SkeletonLoader>
  );
}
