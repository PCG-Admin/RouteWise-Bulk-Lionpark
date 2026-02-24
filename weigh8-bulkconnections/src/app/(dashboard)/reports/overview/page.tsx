'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import DashboardTab from './DashboardTab';
import LiveOrdersTab from './LiveOrdersTab';
import AnalyticsTab from './AnalyticsTab';

export default function OverviewPage() {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      content: <DashboardTab />
    },
    {
      id: 'live-orders',
      label: 'Live Orders',
      content: <LiveOrdersTab />
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: <AnalyticsTab />
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="OVERVIEW"
        subtitle="Comprehensive view of operations, orders, and analytics"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="dashboard" />
      </div>
    </div>
  );
}
