'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import StatusTab from './StatusTab';
import AuditTab from './AuditTab';

export default function StockpilesPage() {
  const tabs = [
    {
      id: 'status',
      label: 'Status',
      content: <div className="p-6"><StatusTab /></div>
    },
    {
      id: 'audit-log',
      label: 'Audit Log',
      content: <div className="p-6"><AuditTab /></div>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="STOCKPILES"
        subtitle="Inventory management and audit tracking"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="status" />
      </div>
    </div>
  );
}
