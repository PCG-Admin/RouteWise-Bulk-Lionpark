'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import ByMineTab from './ByMineTab';
import ByClientTab from './ByClientTab';
import TruckAllocationTab from './TruckAllocationTab';
import ProductByClientTab from './ProductByClientTab';

export default function OrderReportsPage() {
  const tabs = [
    {
      id: 'by-mine',
      label: 'By Mine',
      content: <div className="p-6"><ByMineTab /></div>
    },
    {
      id: 'by-client',
      label: 'By Client',
      content: <div className="p-6"><ByClientTab /></div>
    },
    {
      id: 'truck-allocation',
      label: 'Truck Allocation',
      content: <div className="p-6"><TruckAllocationTab /></div>
    },
    {
      id: 'product-by-client',
      label: 'Product by Client',
      content: <div className="p-6"><ProductByClientTab /></div>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="ORDER REPORTS"
        subtitle="Detailed analysis of orders by mine, client, and product"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="by-mine" />
      </div>
    </div>
  );
}
