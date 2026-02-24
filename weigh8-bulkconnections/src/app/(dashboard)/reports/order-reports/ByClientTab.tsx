'use client';

import { useMemo } from 'react';
import { orders, clients } from '@/lib/reports-data';
import { groupBy } from '@/lib/reports-utils/calculations';
import { formatTonnes, formatDate } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import StatusBadge from '@/components/reports/StatusBadge';
import DataTable from '@/components/reports/DataTable';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const productColors: Record<string, string> = {
  'Chrome': '#1e3a8a', 'Iron Ore': '#3b82f6', 'Thermal Coal': '#64748b',
  'Manganese Ore': '#a855f7', 'Vanadium': '#22c55e', 'Metallurgical Coal': '#475569',
};

export default function ByClientTab() {
  const clientData = useMemo(() => {
    const ordersByClient = groupBy(orders, o => o.clientId);
    return clients.map(client => {
      const cOrders = ordersByClient[client.id] || [];
      const active = cOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
      const totalVolume = cOrders.reduce((s, o) => s + o.actualTonnage, 0);
      const pendingVolume = cOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).reduce((s, o) => s + (o.plannedTonnage - o.actualTonnage), 0);
      const lastOrder = cOrders.sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0];
      return {
        id: client.id,
        name: client.name,
        activeOrders: active.length,
        totalOrders: cOrders.length,
        mtdVolume: totalVolume,
        pendingVolume,
        primaryProduct: client.primaryProduct,
        lastOrderDate: lastOrder?.orderDate || '',
      };
    }).filter(c => c.totalOrders > 0).sort((a, b) => b.mtdVolume - a.mtdVolume);
  }, []);

  const productMixData = useMemo(() => {
    return clients.map(client => {
      const cOrders = orders.filter(o => o.clientId === client.id);
      const byProduct = groupBy(cOrders, o => o.product);
      const row: Record<string, number | string> = { name: client.name.length > 12 ? client.name.slice(0, 12) + '...' : client.name };
      Object.entries(byProduct).forEach(([product, pOrders]) => {
        row[product] = pOrders.reduce((s, o) => s + o.actualTonnage, 0);
      });
      return row;
    }).filter(r => Object.keys(r).length > 1);
  }, []);

  const allProducts = useMemo(() => {
    const products = new Set<string>();
    orders.forEach(o => products.add(o.product));
    return Array.from(products);
  }, []);

  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month: Record<string, number | string> = { name: `M${i + 1}` };
      clients.forEach(c => {
        month[c.name] = Math.round(200 + Math.random() * 500);
      });
      return month;
    });
  }, []);

  interface ClientRow {
    name: string;
    activeOrders: number;
    mtdVolume: number;
    pendingVolume: number;
    primaryProduct: string;
    lastOrderDate: string;
  }

  const orderColumns: Column<typeof orders[0]>[] = [
    { key: 'id', label: 'Order ID', sortable: true, render: (r) => <span className="font-sans text-amber-600">{r.id}</span> },
    { key: 'clientId', label: 'Client', sortable: true, render: (r) => <span className="font-sans text-gray-900">{clients.find(c => c.id === r.clientId)?.name || r.clientId}</span> },
    { key: 'product', label: 'Product', sortable: true },
    { key: 'plannedTonnage', label: 'Planned T', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.plannedTonnage)}</span> },
    { key: 'actualTonnage', label: 'Actual T', sortable: true, render: (r) => <span className="font-sans">{formatTonnes(r.actualTonnage)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <SkeletonLoader>
      {/* Client Scorecards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {clientData.map(client => (
          <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-sans text-sm text-gray-900 font-medium mb-2 truncate">{client.name}</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="font-sans text-[10px] text-gray-600">Active</span>
                <span className="font-sans text-xs text-amber-600">{client.activeOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[10px] text-gray-600">MTD Vol</span>
                <span className="font-sans text-xs text-gray-900">{formatTonnes(client.mtdVolume)} T</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[10px] text-gray-600">Pending</span>
                <span className="font-sans text-xs text-gray-700">{formatTonnes(client.pendingVolume)} T</span>
              </div>
              <div className="mt-1">
                <span className="font-sans text-[9px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">{client.primaryProduct}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <PanelCard title="PRODUCT MIX BY CLIENT">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productMixData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                {allProducts.map(product => (
                  <Bar key={product} dataKey={product} stackId="a" fill={productColors[product] || '#475569'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="CLIENT VOLUME TREND (12 MONTHS)">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                {clients.slice(0, 5).map((c, i) => (
                  <Area key={c.id} type="monotone" dataKey={c.name} fill={Object.values(productColors)[i]} stroke={Object.values(productColors)[i]} fillOpacity={0.15} strokeWidth={1.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="ALL CLIENT ORDERS">
        <DataTable columns={orderColumns} data={orders} sortable paginated pageSize={15} searchable />
      </PanelCard>
    </SkeletonLoader>
  );
}
