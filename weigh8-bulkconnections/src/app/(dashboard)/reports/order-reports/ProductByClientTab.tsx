'use client';

import { useMemo, useState } from 'react';
import { orders, clients, mines, stockpiles } from '@/lib/reports-data';
import { groupBy } from '@/lib/reports-utils/calculations';
import { formatTonnes } from '@/lib/reports-utils/formatters';
import PanelCard from '@/components/reports/PanelCard';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ProductType } from '@/lib/types';

const productColors: Record<string, string> = {
  'Chrome': '#1e3a8a', 'Iron Ore': '#3b82f6', 'Thermal Coal': '#64748b',
  'Metallurgical Coal': '#475569', 'Manganese Ore': '#a855f7', 'Vanadium': '#22c55e',
  'Nickel': '#ef4444', 'Copper': '#f59e0b', 'Zinc': '#06b6d4', 'Lead': '#f97316', 'Anthracite': '#e2e8f0',
};

const defaultPrices: Record<string, number> = {
  'Iron Ore': 120, 'Manganese Ore': 280, 'Chrome': 350, 'Vanadium': 890,
  'Thermal Coal': 85, 'Metallurgical Coal': 210, 'Anthracite': 150,
  'Nickel': 1400, 'Copper': 850, 'Zinc': 280, 'Lead': 210,
};

export default function ProductByClientTab() {
  const [prices, setPrices] = useState(defaultPrices);

  const productVolume = useMemo(() => {
    const byProduct = groupBy(orders, o => o.product);
    return Object.entries(byProduct).map(([product, pOrders]) => ({
      name: product,
      value: pOrders.reduce((s, o) => s + o.actualTonnage, 0),
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, []);

  // Product x Client matrix
  const clientProductMatrix = useMemo(() => {
    const allProducts = [...new Set(orders.map(o => o.product))];
    return clients.map(client => {
      const cOrders = orders.filter(o => o.clientId === client.id);
      const row: Record<string, number> = {};
      allProducts.forEach(p => {
        row[p] = cOrders.filter(o => o.product === p).reduce((s, o) => s + o.actualTonnage, 0);
      });
      return { clientName: client.name, ...row };
    });
  }, []);

  // Product x Stockpile
  const stockpileProducts = useMemo(() => {
    return stockpiles.map(s => ({
      name: s.name,
      product: s.product,
      current: s.currentTonnes,
      capacity: s.capacityTonnes,
      pct: (s.currentTonnes / s.capacityTonnes) * 100,
    }));
  }, []);

  const allProducts = useMemo(() => [...new Set(orders.map(o => o.product))], []);

  const getCellHeat = (val: number, max: number) => {
    if (val === 0) return '';
    const ratio = val / max;
    if (ratio > 0.6) return 'bg-amber-100 text-amber-700';
    if (ratio > 0.3) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-50 text-gray-700';
  };

  const maxCellValue = useMemo(() => {
    let max = 0;
    clientProductMatrix.forEach(row => {
      allProducts.forEach(p => {
        const val = (row as Record<string, number>)[p] || 0;
        if (val > max) max = val;
      });
    });
    return max;
  }, [clientProductMatrix, allProducts]);

  // Stockpile inventory value
  const inventoryValue = useMemo(() => {
    return stockpiles.map(s => ({
      name: s.name,
      product: s.product,
      tonnes: s.currentTonnes,
      pricePerTonne: prices[s.product] || 0,
      value: s.currentTonnes * (prices[s.product] || 0),
    }));
  }, [prices]);

  const totalValue = useMemo(() => inventoryValue.reduce((s, v) => s + v.value, 0), [inventoryValue]);

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-[1fr_350px] gap-4 mb-4">
        {/* Matrix */}
        <PanelCard title="PRODUCT x CLIENT MATRIX (TONNES)">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-3 py-2 sticky left-0 bg-gray-50">Client</th>
                  {allProducts.map(p => (
                    <th key={p} className="font-sans text-[9px] uppercase tracking-wider text-gray-600 text-center px-2 py-2 min-w-[80px]">
                      {p.replace(' ', '\n')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientProductMatrix.map((row) => (
                  <tr key={row.clientName} className="border-t border-gray-200">
                    <td className="font-sans text-xs text-gray-900 px-3 py-2 sticky left-0 bg-white">{row.clientName}</td>
                    {allProducts.map(p => {
                      const val = (row as Record<string, number>)[p] || 0;
                      return (
                        <td key={p} className={`text-center px-2 py-2 font-sans text-[10px] ${getCellHeat(val, maxCellValue)}`}>
                          {val > 0 ? formatTonnes(val) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>

        {/* Donut */}
        <PanelCard title="PRODUCT VOLUME SUMMARY">
          <div className="h-[240px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={productVolume} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                  {productVolume.map(entry => (
                    <Cell key={entry.name} fill={productColors[entry.name] || '#475569'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} formatter={(v: number) => [`${formatTonnes(v)} T`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
              {productVolume.map(p => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-lg" style={{ backgroundColor: productColors[p.name] }} />
                  <span className="font-sans text-[9px] text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>

      {/* Stockpile Inventory */}
      <div className="grid grid-cols-2 gap-4">
        <PanelCard title="PRODUCT x STOCKPILE INVENTORY">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Stockpile', 'Product', 'Current', 'Capacity', '%'].map(h => (
                    <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockpileProducts.map(s => (
                  <tr key={s.name} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-sans text-xs text-gray-900">{s.name}</td>
                    <td className="px-3 py-2"><span className="font-sans text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">{s.product}</span></td>
                    <td className="px-3 py-2 font-sans text-xs text-gray-900">{formatTonnes(s.current)} T</td>
                    <td className="px-3 py-2 font-sans text-xs text-gray-700">{formatTonnes(s.capacity)} T</td>
                    <td className={`px-3 py-2 font-sans text-xs ${s.pct > 85 ? 'text-red-600' : s.pct > 70 ? 'text-amber-600' : 'text-green-600'}`}>
                      {s.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>

        <PanelCard title="STOCKPILE INVENTORY VALUE ESTIMATOR" action={
          <span className="font-sans text-xs text-amber-600">Est. Total: R{(totalValue / 1000).toFixed(0)}K</span>
        }>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Product', 'Price/T (R)', 'Stockpile Vol', 'Est. Value'].map(h => (
                    <th key={h} className="font-sans text-[10px] uppercase tracking-wider text-gray-600 text-left px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryValue.map((item, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-3 py-2 font-sans text-xs text-gray-900">{item.product}</td>
                    <td className="px-3 py-1">
                      <input
                        type="number"
                        value={prices[item.product] || 0}
                        onChange={(e) => setPrices(prev => ({ ...prev, [item.product]: Number(e.target.value) }))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-sans text-xs text-gray-900 w-[80px] focus:outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="px-3 py-2 font-sans text-xs text-gray-700">{formatTonnes(item.tonnes)} T</td>
                    <td className="px-3 py-2 font-sans text-xs text-amber-600">R{(item.value / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
      </div>
    </SkeletonLoader>
  );
}
