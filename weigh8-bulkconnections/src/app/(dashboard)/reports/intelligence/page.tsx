'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import AlertCentreTab from './AlertCentreTab';
import AIAskTab from './AIAskTab';

export default function IntelligencePage() {
  const tabs = [
    {
      id: 'alerts',
      label: 'Alert Centre',
      content: <div className="p-6"><AlertCentreTab /></div>
    },
    {
      id: 'ai-ask',
      label: 'AI Ask',
      content: <div className="p-6"><AIAskTab /></div>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="INTELLIGENCE"
        subtitle="Alerts and AI-powered operational insights"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="alerts" />
      </div>
    </div>
  );
}
