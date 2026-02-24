'use client';

import { useMemo, useState } from 'react';
import { trucks, stockpiles, orders, drivers } from '@/lib/reports-data';
import { formatTonnes, formatPercentage, formatTimestamp, formatWeightKg } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import DataTable from '@/components/reports/DataTable';
import FilterBar, { type FilterDef } from '@/components/reports/FilterBar';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import type { Column, StockpileAuditEntry } from '@/lib/types';
import { Download } from 'lucide-react';

export default function AuditTab() {
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [searchValue, setSearchValue] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Generate audit entries from truck data
  const auditEntries: StockpileAuditEntry[] = useMemo(() => {
    return trucks.filter(t => t.bcWeighbridgeKg && t.stockpileId).map((t, i) => {
      const order = orders.find(o => o.id === t.orderId);
      const varianceKg = (t.bcWeighbridgeKg || 0) - t.mineWeighbridgeKg;
      const variancePct = t.mineWeighbridgeKg > 0 ? (varianceKg / t.mineWeighbridgeKg) * 100 : 0;
      return {
        id: `AUD-${String(i + 1).padStart(4, '0')}`,
        stockpileId: t.stockpileId!,
        timestamp: t.bcOffloadTime || t.bcArrivalTime || new Date().toISOString(),
        orderId: t.orderId,
        truckId: t.id,
        driverId: t.driverId,
        product: t.product,
        mineId: order?.mineId || '',
        plannedKg: t.mineWeighbridgeKg,
        actualKg: t.bcWeighbridgeKg!,
        varianceKg,
        variancePct,
        action: Math.abs(variancePct) >= 5 ? 'variance_flagged' as const : 'delivered' as const,
      };
    });
  }, []);

  const filterDefs: FilterDef[] = useMemo(() => [
    { key: 'stockpile', label: 'Stockpile', multi: true, options: stockpiles.map(s => ({ value: s.id, label: s.name })) },
    { key: 'variance', label: 'Variance', options: [
      { value: '2', label: '> 2%' }, { value: '5', label: '> 5%' },
    ]},
  ], []);

  const filteredEntries = useMemo(() => {
    let filtered = [...auditEntries];
    if (filterValues.stockpile?.length) filtered = filtered.filter(e => filterValues.stockpile.includes(e.stockpileId));
    if (filterValues.variance?.includes('5')) filtered = filtered.filter(e => Math.abs(e.variancePct) >= 5);
    else if (filterValues.variance?.includes('2')) filtered = filtered.filter(e => Math.abs(e.variancePct) >= 2);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      filtered = filtered.filter(e => e.orderId.toLowerCase().includes(q) || e.truckId.toLowerCase().includes(q));
    }
    return filtered;
  }, [auditEntries, filterValues, searchValue]);

  const totalActual = useMemo(() => filteredEntries.reduce((s, e) => s + e.actualKg, 0), [filteredEntries]);
  const totalVariance = useMemo(() => filteredEntries.reduce((s, e) => s + e.varianceKg, 0), [filteredEntries]);
  const over2Pct = useMemo(() => filteredEntries.filter(e => Math.abs(e.variancePct) >= 2).length, [filteredEntries]);
  const maxVariance = useMemo(() => Math.max(...filteredEntries.map(e => Math.abs(e.variancePct)), 0), [filteredEntries]);

  const columns: Column<StockpileAuditEntry>[] = [
    { key: 'timestamp', label: 'Time', sortable: true, render: (r) => <span className="font-sans text-[10px] text-gray-700">{formatTimestamp(r.timestamp)}</span> },
    { key: 'stockpileId', label: 'Stockpile', sortable: true, render: (r) => <span className="font-sans text-xs">{stockpiles.find(s => s.id === r.stockpileId)?.name || r.stockpileId}</span> },
    { key: 'orderId', label: 'Order', sortable: true, render: (r) => <span className="font-sans text-xs text-amber-600">{r.orderId}</span> },
    { key: 'truckId', label: 'Truck', sortable: true, render: (r) => <span className="font-sans text-xs">{trucks.find(t => t.id === r.truckId)?.registration || r.truckId}</span> },
    { key: 'product', label: 'Product', sortable: true, render: (r) => <span className="font-sans text-[10px] text-gray-600">{r.product}</span> },
    { key: 'plannedKg', label: 'Mine (kg)', sortable: true, render: (r) => <span className="font-sans text-xs">{formatWeightKg(r.plannedKg)}</span> },
    { key: 'actualKg', label: 'BC (kg)', sortable: true, render: (r) => <span className="font-sans text-xs">{formatWeightKg(r.actualKg)}</span> },
    { key: 'varianceKg', label: 'Var (kg)', sortable: true, render: (r) => <span className={`font-sans text-xs ${Math.abs(r.variancePct) >= 5 ? 'text-red-600' : Math.abs(r.variancePct) >= 2 ? 'text-amber-600' : 'text-gray-700'}`}>{r.varianceKg > 0 ? '+' : ''}{formatWeightKg(r.varianceKg)}</span> },
    { key: 'variancePct', label: 'Var %', sortable: true, render: (r) => <span className={`font-sans text-xs font-bold ${Math.abs(r.variancePct) >= 5 ? 'text-red-600' : Math.abs(r.variancePct) >= 2 ? 'text-amber-600' : 'text-gray-700'}`}>{r.variancePct.toFixed(2)}%</span> },
    { key: 'action', label: 'Action', render: (r) => <span className={`font-sans text-[10px] px-1.5 py-0.5 rounded-lg ${r.action === 'variance_flagged' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{r.action.replace('_', ' ')}</span> },
  ];

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KpiCard label="Total Entries" value={filteredEntries.length} accentColor="gold" />
        <KpiCard label="Total Actual" value={`${formatWeightKg(totalActual)} kg`} accentColor="blue" />
        <KpiCard label="Total Variance" value={`${formatWeightKg(totalVariance)} kg`} accentColor={totalVariance < 0 ? 'red' : 'green'} />
        <KpiCard label="Entries > 2%" value={over2Pct} accentColor={over2Pct > 0 ? 'amber' : 'green'} />
        <KpiCard label="Max Variance" value={formatPercentage(maxVariance)} accentColor={maxVariance >= 5 ? 'red' : 'amber'} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <FilterBar
            filters={filterDefs}
            values={filterValues}
            onFilterChange={(k, v) => setFilterValues(prev => ({ ...prev, [k]: v }))}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search order ID, truck..."
          />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 font-sans text-xs text-gray-700 hover:border-amber-600 hover:text-amber-600 transition-colors">
          <Download size={14} />
          Export
        </button>
      </div>

      <PanelCard title="AUDIT ENTRIES">
        <DataTable
          columns={columns}
          data={filteredEntries}
          sortable
          paginated
          pageSize={20}
          highlightRow={(r) => Math.abs(r.variancePct) >= 5 ? 'red' : Math.abs(r.variancePct) >= 2 ? 'amber' : null}
        />
      </PanelCard>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-white border border-amber-600 rounded-lg px-4 py-3 flex items-center gap-2 z-50 shadow-lg">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-sans text-xs text-gray-900">Preparing export... Download will begin shortly</span>
        </div>
      )}
    </SkeletonLoader>
  );
}
