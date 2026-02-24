'use client';

import { useMemo } from 'react';
import { trucks } from '@/lib/reports-data';
import { ArrowRight } from 'lucide-react';

const stageConfig = [
  { key: 'mine', label: 'MINE', statuses: ['loading', 'loaded'], color: 'text-amber-600' },
  { key: 'transit', label: 'IN TRANSIT', statuses: ['in_transit_to_lions', 'dispatched'], color: 'text-blue-600' },
  { key: 'staging', label: 'STAGING', statuses: ['staging'], color: 'text-purple-600' },
  { key: 'convoy', label: 'CONVOY', statuses: ['in_transit_to_bc'], color: 'text-blue-600' },
  { key: 'atbc', label: 'AT BC', statuses: ['at_bc'], color: 'text-green-600' },
  { key: 'done', label: 'DONE TODAY', statuses: ['completed'], color: 'text-yellow-600' },
];

export default function TruckPipelineFlow() {
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    stageConfig.forEach(stage => {
      result[stage.key] = trucks.filter(t => stage.statuses.includes(t.status)).length;
    });
    return result;
  }, []);

  return (
    <div className="flex items-center justify-between gap-1 overflow-x-auto">
      {stageConfig.map((stage, i) => (
        <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col items-center bg-gray-100 rounded-lg px-3 py-2.5 min-w-[64px]">
            <span className={`font-sans font-bold text-xl leading-none ${stage.color}`}>
              {counts[stage.key]}
            </span>
            <span className="font-sans text-[8px] font-medium uppercase tracking-wide text-gray-600 mt-1 whitespace-nowrap">
              {stage.label}
            </span>
          </div>
          {i < stageConfig.length - 1 && (
            <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
