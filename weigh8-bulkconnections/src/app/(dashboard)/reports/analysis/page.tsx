'use client';

import Tabs from '@/components/reports/Tabs';
import PageHeader from '@/components/reports/PageHeader';
import VarianceTab from './VarianceTab';
import VesselPlanningTab from './VesselPlanningTab';
import ScenarioPlanningTab from './ScenarioPlanningTab';

export default function AnalysisPage() {
  const tabs = [
    {
      id: 'variance',
      label: 'Variance Report',
      content: <div className="p-6"><VarianceTab /></div>
    },
    {
      id: 'vessels',
      label: 'Vessel Planning',
      content: <div className="p-6"><VesselPlanningTab /></div>
    },
    {
      id: 'scenario',
      label: 'Scenario Planning',
      content: <div className="p-6"><ScenarioPlanningTab /></div>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="ANALYSIS"
        subtitle="Advanced analytics and strategic planning tools"
      />
      <div className="flex-1 overflow-hidden">
        <Tabs tabs={tabs} defaultTab="variance" />
      </div>
    </div>
  );
}
