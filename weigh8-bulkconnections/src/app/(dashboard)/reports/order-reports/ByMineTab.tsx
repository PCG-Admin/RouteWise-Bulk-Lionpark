'use client';

import { useMemo, useState } from 'react';
import { orders, mines, trucks } from '@/lib/reports-data';
import { groupBy } from '@/lib/reports-utils/calculations';
import { formatTonnes } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const productColors: Record<string, string> = {
  'Chrome': '#1e3a8a', 'Iron Ore': '#3b82f6', 'Thermal Coal': '#64748b',
  'Manganese Ore': '#a855f7', 'Vanadium': '#22c55e', 'Metallurgical Coal': '#475569',
  'Nickel': '#ef4444', 'Copper': '#f59e0b',
};

interface MineRow {
  mineId: string;
  mineName: string;
  activeOrders: number;
  totalOrders: number;
  trucksDeployed: number;
  totalTonnes: number;
  avgTonnesPerOrder: number;
  primaryProduct: string;
}

export default function ByMineTab() {
  const [selectedMine, setSelectedMine] = useState<string | null>(null);

  const mineData = useMemo(() => {
    const ordersByMine = groupBy(orders, o => o.mineId);
    return mines.map(mine => {
      const mineOrders = ordersByMine[mine.id] || [];
      const active = mineOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
      const totalTonnes = mineOrders.reduce((s, o) => s + o.actualTonnage, 0);
      const mineTrucks = trucks.filter(t => mineOrders.some(o => o.id === t.orderId));
      return {
        mineId: mine.id,
        mineName: mine.name,
        activeOrders: active.length,
        totalOrders: mineOrders.length,
        trucksDeployed: mineTrucks.filter(t => t.status !== 'completed').length,
        totalTonnes,
        avgTonnesPerOrder: mineOrders.length > 0 ? totalTonnes / mineOrders.length : 0,
        primaryProduct: mine.primaryProduct,
      };
    }).filter(m => m.totalOrders > 0).sort((a, b) => b.totalTonnes - a.totalTonnes);
  }, []);

  const volumeData = useMemo(() => mineData.map(m => ({
    name: m.mineName.length > 15 ? m.mineName.slice(0, 15) + '...' : m.mineName,
    volume: m.totalTonnes,
    product: m.primaryProduct,
  })), [mineData]);

  const columns: Column<MineRow>[] = [
    { key: 'mineName', label: 'Mine', sortable: true, render: (r) => <span className="font-sans text-gray-900">{r.mineName}</span> },
    { key: 'activeOrders', label: 'Active', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.activeOrders}</span> },
    { key: 'totalOrders', label: 'Total', sortable: true },
    { key: 'trucksDeployed', label: 'Trucks', sortable: true },
    { key: 'totalTonnes', label: 'Total Tonnes', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.totalTonnes)}</span> },
    { key: 'avgTonnesPerOrder', label: 'Avg T/Order', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.avgTonnesPerOrder)}</span> },
    { key: 'primaryProduct', label: 'Product', sortable: true, render: (r) => (
      <span className="font-sans text-[10px] bg-gray-100 border border-gray-300 rounded-lg px-1.5 py-0.5 text-gray-600">{r.primaryProduct}</span>
    )},
  ];

  const selectedMineOrders = useMemo(() => {
    if (!selectedMine) return [];
    return orders.filter(o => o.mineId === selectedMine);
  }, [selectedMine]);

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-[1fr_1fr] gap-4 mb-4">
        <PanelCard title="VOLUME BY MINE">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} width={100} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} formatter={(v: number) => [`${formatTonnes(v)} T`, 'Volume']} />
                <Bar dataKey="volume" radius={[0, 2, 2, 0]}>
                  {volumeData.map((entry, i) => (
                    <Cell key={i} fill={productColors[entry.product] || '#475569'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="AVG ORDER WEIGHT BY MINE">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mineData.slice(0, 10).map(m => ({ name: m.mineName.length > 12 ? m.mineName.slice(0, 12) + '...' : m.mineName, avg: m.avgTonnesPerOrder }))} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} width={100} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} formatter={(v: number) => [`${formatTonnes(v)} T`, 'Avg Weight']} />
                <Bar dataKey="avg" fill="#3b82f6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="MINE LEAGUE TABLE">
        <DataTable
          columns={columns}
          data={mineData}
          sortable
          paginated
          pageSize={15}
          onRowClick={(row) => setSelectedMine(selectedMine === row.mineId ? null : row.mineId)}
        />
      </PanelCard>

      {selectedMine && selectedMineOrders.length > 0 && (
        <div className="mt-4">
          <PanelCard title={`ORDERS FOR ${mines.find(m => m.id === selectedMine)?.name?.toUpperCase() || selectedMine}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Order ID', 'Client', 'Product', 'Trucks', 'Tonnage', 'Status'].map(h => (
                      <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedMineOrders.map(o => (
                    <tr key={o.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-sans text-xs text-amber-600">{o.id}</td>
                      <td className="px-4 py-2 font-sans text-xs text-gray-700">{o.clientId}</td>
                      <td className="px-4 py-2 font-sans text-[10px] text-gray-600">{o.product}</td>
                      <td className="px-4 py-2 font-sans text-xs text-gray-900">{o.completedTrucks}/{o.plannedTrucks}</td>
                      <td className="px-4 py-2 font-sans text-xs text-gray-900">{formatTonnes(o.actualTonnage)} T</td>
                      <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>
      )}
    </SkeletonLoader>
  );
}
