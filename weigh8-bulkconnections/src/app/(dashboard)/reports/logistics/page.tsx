'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import DeliveryTimesTab from './DeliveryTimesTab';
import DriverAnalysisTab from './DriverAnalysisTab';
import TransportersTab from './TransportersTab';

export default function LogisticsPage() {
  const tabs = [
    {
      id: 'delivery-times',
      label: 'Delivery Times',
      content: <div className="p-6"><DeliveryTimesTab /></div>
    },
    {
      id: 'driver-analysis',
      label: 'Driver Analysis',
      content: <div className="p-6"><DriverAnalysisTab /></div>
    },
    {
      id: 'transporters',
      label: 'Transporters',
      content: <div className="p-6"><TransportersTab /></div>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="LOGISTICS"
        subtitle="Delivery performance and transporter analytics"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="delivery-times" />
      </div>
    </div>
  );
}
