'use client';

import { useMemo, useState } from 'react';
import { trucks, orders, stockpiles, transporters } from '@/lib/reports-data';
import { generateAlerts } from '@/lib/reports-utils/alerts';
import { formatTimeElapsed } from '@/lib/reports-utils/formatters';
import KpiCard from '@/components/reports/KpiCard';
import PanelCard from '@/components/reports/PanelCard';
import StatusBadge from '@/components/reports/StatusBadge';
import SkeletonLoader from '@/components/reports/SkeletonLoader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, Eye, Bell, BellOff } from 'lucide-react';

type Tab = 'all' | 'critical' | 'warning' | 'info';

export default function AlertCentreTab() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('');

  const alerts = useMemo(() => generateAlerts(trucks, orders, stockpiles, transporters), []);
  const criticalCount = useMemo(() => alerts.filter(a => a.severity === 'critical').length, [alerts]);
  const warningCount = useMemo(() => alerts.filter(a => a.severity === 'warning').length, [alerts]);
  const infoCount = useMemo(() => alerts.filter(a => a.severity === 'info').length, [alerts]);

  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];
    if (activeTab !== 'all') filtered = filtered.filter(a => a.severity === activeTab);
    if (filterType) filtered = filtered.filter(a => a.entityType === filterType);
    return filtered.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, activeTab, filterType]);

  const acknowledge = (id: string) => {
    setAcknowledgedIds(prev => new Set([...prev, id]));
  };

  // Alert history chart (simulated)
  const historyData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      day: `${i + 1}`,
      critical: Math.floor(Math.random() * 4),
      warning: Math.floor(1 + Math.random() * 6),
      info: Math.floor(Math.random() * 3),
    }));
  }, []);

  // Alert type counts
  const alertTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [alerts]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: alerts.length },
    { key: 'critical', label: 'Critical', count: criticalCount },
    { key: 'warning', label: 'Warning', count: warningCount },
    { key: 'info', label: 'Info', count: infoCount },
  ];

  return (
    <SkeletonLoader>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Alerts" value={alerts.length} accentColor="gold" />
        <KpiCard label="Critical" value={criticalCount} accentColor="red" />
        <KpiCard label="Warning" value={warningCount} accentColor="amber" />
        <KpiCard label="Acknowledged" value={acknowledgedIds.size} accentColor="green" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 font-sans text-xs rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.label}
            <span className={`font-sans text-[10px] px-1.5 rounded-lg ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-50'
            }`}>{tab.count}</span>
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-sans text-xs text-gray-700 focus:outline-none focus:border-amber-600"
          >
            <option value="">All entity types</option>
            <option value="truck">Trucks</option>
            <option value="order">Orders</option>
            <option value="stockpile">Stockpiles</option>
            <option value="transporter">Transporters</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="grid grid-cols-[1fr_340px] gap-4 mb-4">
        <div className="flex flex-col gap-2">
          {filteredAlerts.map(alert => {
            const isAcked = acknowledgedIds.has(alert.id);
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 bg-white border rounded-lg transition-colors ${
                  isAcked ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-1 self-stretch rounded-lg shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-600' : alert.severity === 'warning' ? 'bg-amber-600' : 'bg-blue-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans text-sm text-gray-900 font-medium">{alert.title}</span>
                    <span className="font-sans text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600">{alert.entityType}</span>
                  </div>
                  <div className="font-sans text-[11px] text-gray-700 mb-1">{alert.detail}</div>
                  <div className="font-sans text-[10px] text-gray-500">{formatTimeElapsed(alert.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={alert.severity} />
                  {!isAcked ? (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      className="flex items-center gap-1 font-sans text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 hover:border-amber-600 hover:text-amber-600 transition-colors"
                    >
                      <CheckCircle size={12} />
                      Ack
                    </button>
                  ) : (
                    <span className="font-sans text-[10px] text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} /> Done
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg">
              <BellOff size={24} className="text-gray-400 mb-2" />
              <span className="font-sans text-sm text-gray-600">No alerts match the current filters</span>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <PanelCard title="ALERT HISTORY (30 DAYS)">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} interval={4} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
                  <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                  <Bar dataKey="warning" stackId="a" fill="#f97316" name="Warning" />
                  <Bar dataKey="info" stackId="a" fill="#3b82f6" name="Info" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard title="MOST COMMON ALERT TYPES">
            <div className="flex flex-col gap-2">
              {alertTypeCounts.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="font-sans text-[10px] text-gray-700">{type.replace(/_/g, ' ')}</span>
                  <span className="font-sans text-xs text-amber-600">{count}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="ALERT RULES">
            <div className="flex flex-col gap-2">
              {[
                { rule: 'Staging > 6h', severity: 'warning', active: true },
                { rule: 'Staging > 12h', severity: 'warning', active: true },
                { rule: 'Staging > 24h', severity: 'critical', active: true },
                { rule: 'Variance > 2%', severity: 'warning', active: true },
                { rule: 'Variance > 5%', severity: 'critical', active: true },
                { rule: 'Unallocated truck', severity: 'critical', active: true },
                { rule: 'Stockpile > 85%', severity: 'warning', active: true },
                { rule: 'Stockpile > 95%', severity: 'critical', active: true },
                { rule: 'Truck shortfall', severity: 'warning', active: true },
                { rule: 'Transporter < 80%', severity: 'warning', active: true },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${r.severity === 'critical' ? 'bg-red-600' : 'bg-amber-600'}`} />
                    <span className="font-sans text-[10px] text-gray-700">{r.rule}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${r.active ? 'bg-green-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${r.active ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </SkeletonLoader>
  );
}
