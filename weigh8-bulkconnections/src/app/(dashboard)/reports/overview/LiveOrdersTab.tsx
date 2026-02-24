'use client';

import { useMemo, useState } from 'react';
import { orders, trucks, mines, clients, transporters } from '@/lib/reports-data';
import { getActiveOrders, groupBy } from '@/lib/reports-utils/calculations';
import { formatTonnes } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import StatusBadge from '@/components/reports/StatusBadge';
import ProgressBar from '@/components/reports/ProgressBar';
import FilterBar, { type FilterDef } from '@/components/reports/FilterBar';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { ChevronDown, ChevronRight } from 'lucide-react';

const statusOrder: Record<string, number> = {
  loading: 0, in_transit: 1, staging: 2, convoy: 3, at_bc: 4, delayed: 5, completed: 6, scheduled: 7, cancelled: 8,
};

export default function LiveOrdersTab() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [searchValue, setSearchValue] = useState('');

  const filterDefs: FilterDef[] = useMemo(() => [
    { key: 'mine', label: 'Mine', multi: true, options: mines.map(m => ({ value: m.id, label: m.name })) },
    { key: 'client', label: 'Client', multi: true, options: clients.map(c => ({ value: c.id, label: c.name })) },
    { key: 'transporter', label: 'Transporter', multi: true, options: transporters.map(t => ({ value: t.id, label: t.name })) },
    { key: 'status', label: 'Status', multi: true, options: [
      { value: 'scheduled', label: 'Scheduled' }, { value: 'loading', label: 'Loading' },
      { value: 'in_transit', label: 'In Transit' }, { value: 'staging', label: 'Staging' },
      { value: 'convoy', label: 'Convoy' }, { value: 'at_bc', label: 'At BC' },
      { value: 'completed', label: 'Completed' }, { value: 'delayed', label: 'Delayed' },
    ] },
  ], []);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (filterValues.mine?.length) filtered = filtered.filter(o => filterValues.mine.includes(o.mineId));
    if (filterValues.client?.length) filtered = filtered.filter(o => filterValues.client.includes(o.clientId));
    if (filterValues.transporter?.length) filtered = filtered.filter(o => filterValues.transporter.includes(o.transporterId));
    if (filterValues.status?.length) filtered = filtered.filter(o => filterValues.status.includes(o.status));

    if (searchValue) {
      const q = searchValue.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        clients.find(c => c.id === o.clientId)?.name.toLowerCase().includes(q) ||
        mines.find(m => m.id === o.mineId)?.name.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
  }, [filterValues, searchValue]);

  const activeOrders = useMemo(() => getActiveOrders(orders), []);
  const activeTrucks = useMemo(() => trucks.filter(t => t.status !== 'completed'), []);
  const trucksByStatus = useMemo(() => groupBy(trucks, t => t.status), []);

  const handleFilterChange = (key: string, values: string[]) => {
    setFilterValues(prev => ({ ...prev, [key]: values }));
  };

  return (
    <div className="p-6">
      <SkeletonLoader>
        {/* Pipeline summary */}
        <div className="grid grid-cols-6 gap-4 mb-4">
          <KpiCard label="Active Orders" value={activeOrders.length} accentColor="gold" />
          <KpiCard label="Loading" value={trucksByStatus['loading']?.length || 0} accentColor="amber" />
          <KpiCard label="In Transit" value={(trucksByStatus['in_transit_to_lions']?.length || 0) + (trucksByStatus['in_transit_to_bc']?.length || 0)} accentColor="blue" />
          <KpiCard label="Staging" value={trucksByStatus['staging']?.length || 0} accentColor="purple" />
          <KpiCard label="At BC" value={trucksByStatus['at_bc']?.length || 0} accentColor="green" />
          <KpiCard label="Completed Today" value={trucks.filter(t => t.status === 'completed' && t.bcExitTime).length} accentColor="gold" />
        </div>

        {/* Filter bar */}
        <div className="mb-4">
          <FilterBar
            filters={filterDefs}
            values={filterValues}
            onFilterChange={handleFilterChange}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search order ID, client, mine..."
          />
        </div>

        {/* Order Cards */}
        <div className="flex flex-col gap-3">
          {filteredOrders.map(order => {
            const isExpanded = expandedOrder === order.id;
            const client = clients.find(c => c.id === order.clientId);
            const mine = mines.find(m => m.id === order.mineId);
            const transporter = transporters.find(t => t.id === order.transporterId);
            const orderTrucks = trucks.filter(t => t.orderId === order.id);
            const completionPct = order.plannedTrucks > 0 ? (order.completedTrucks / order.plannedTrucks) * 100 : 0;

            // Count trucks at each stage for this order
            const stages = {
              mine: orderTrucks.filter(t => ['loading', 'loaded', 'dispatched'].includes(t.status)).length,
              transit: orderTrucks.filter(t => ['in_transit_to_lions', 'in_transit_to_bc'].includes(t.status)).length,
              staging: orderTrucks.filter(t => t.status === 'staging').length,
              atBc: orderTrucks.filter(t => t.status === 'at_bc').length,
              done: orderTrucks.filter(t => t.status === 'completed').length,
            };

            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}

                  {/* Order ID */}
                  <span className="font-sans text-lg text-blue-600 w-[90px] shrink-0">{order.id}</span>

                  {/* Client / Mine / Product */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm text-gray-900 truncate">{client?.name || order.clientId}</span>
                      <span className="text-gray-400">/</span>
                      <span className="font-sans text-sm text-gray-600 truncate">{mine?.name || order.mineId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-sans text-[10px] bg-gray-100 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">
                        {order.product}
                      </span>
                      <span className="font-sans text-[10px] text-gray-500">{transporter?.name}</span>
                    </div>
                  </div>

                  {/* Truck pipeline mini */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[
                      { label: 'M', count: stages.mine, color: 'bg-amber-500' },
                      { label: 'T', count: stages.transit, color: 'bg-blue-500' },
                      { label: 'S', count: stages.staging, color: 'bg-purple-500' },
                      { label: 'BC', count: stages.atBc, color: 'bg-green-500' },
                      { label: 'D', count: stages.done, color: 'bg-blue-600' },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col items-center gap-0.5">
                        <span className="font-sans text-[8px] text-gray-500 uppercase">{s.label}</span>
                        <span className={`font-sans text-[10px] text-white rounded-lg px-1 ${s.count > 0 ? s.color : 'bg-gray-200 text-gray-500'}`}>
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tonnage */}
                  <div className="text-right shrink-0 w-[140px]">
                    <div className="font-sans text-sm text-gray-900">
                      {formatTonnes(order.actualTonnage)} T
                    </div>
                    <div className="font-sans text-[10px] text-gray-500">
                      / {formatTonnes(order.plannedTonnage)} T planned
                    </div>
                  </div>

                  {/* Truck progress */}
                  <div className="w-[120px] shrink-0">
                    <ProgressBar
                      value={order.completedTrucks}
                      max={order.plannedTrucks}
                      size="sm"
                      label={`${order.completedTrucks}/${order.plannedTrucks} trucks`}
                    />
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <StatusBadge status={order.status} />
                  </div>
                </button>

                {/* Expanded truck list */}
                {isExpanded && orderTrucks.length > 0 && (
                  <div className="border-t border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Registration', 'Driver', 'Status', 'Mine Weight', 'BC Weight', 'Variance', 'Ticket'].map(h => (
                              <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-4 py-2">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orderTrucks.map(truck => {
                            const varianceClass = truck.variancePct
                              ? Math.abs(truck.variancePct) >= 5 ? 'text-red-500' : Math.abs(truck.variancePct) >= 2 ? 'text-amber-500' : 'text-gray-600'
                              : 'text-gray-400';

                            return (
                              <tr key={truck.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2 font-sans text-xs text-blue-600">{truck.registration}</td>
                                <td className="px-4 py-2 font-sans text-xs text-gray-600">{truck.driverId}</td>
                                <td className="px-4 py-2"><StatusBadge status={truck.status} /></td>
                                <td className="px-4 py-2 font-sans text-xs text-gray-900">{truck.mineWeighbridgeKg.toLocaleString()} kg</td>
                                <td className="px-4 py-2 font-sans text-xs text-gray-900">{truck.bcWeighbridgeKg ? `${truck.bcWeighbridgeKg.toLocaleString()} kg` : '---'}</td>
                                <td className={`px-4 py-2 font-sans text-xs ${varianceClass}`}>{truck.variancePct ? `${truck.variancePct.toFixed(2)}%` : '---'}</td>
                                <td className="px-4 py-2 font-sans text-xs text-gray-500">#{truck.ticket}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg">
              <div className="font-sans text-sm text-gray-500 mb-2">No orders match the current filters</div>
              <button
                onClick={() => { setFilterValues({}); setSearchValue(''); }}
                className="font-sans text-xs text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </SkeletonLoader>
    </div>
  );
}
