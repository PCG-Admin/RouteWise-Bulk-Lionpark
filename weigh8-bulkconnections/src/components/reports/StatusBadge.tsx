const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-green-600/15', text: 'text-green-600', label: 'Completed' },
  in_transit: { bg: 'bg-blue-600/15', text: 'text-blue-600', label: 'In Transit' },
  staging: { bg: 'bg-purple-600/15', text: 'text-purple-600', label: 'Staging' },
  loading: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Loading' },
  scheduled: { bg: 'bg-gray-600/15', text: 'text-gray-600', label: 'Scheduled' },
  delayed: { bg: 'bg-red-600/15', text: 'text-red-600', label: 'Delayed' },
  cancelled: { bg: 'bg-red-600/20', text: 'text-red-600', label: 'Cancelled' },
  at_bc: { bg: 'bg-green-600/10', text: 'text-green-600', label: 'At BC' },
  convoy: { bg: 'bg-blue-600/10', text: 'text-blue-600', label: 'Convoy' },
  dispatched: { bg: 'bg-gray-600/10', text: 'text-gray-700', label: 'Dispatched' },
  loaded: { bg: 'bg-amber-600/10', text: 'text-amber-600', label: 'Loaded' },
  in_transit_to_lions: { bg: 'bg-blue-600/10', text: 'text-blue-600', label: 'To Lions' },
  in_transit_to_bc: { bg: 'bg-blue-600/15', text: 'text-blue-600', label: 'To BC' },
  unallocated: { bg: 'bg-red-600/10', text: 'text-red-600', label: 'Unallocated' },
  // Vessel statuses
  tbn: { bg: 'bg-gray-600/10', text: 'text-gray-600', label: 'TBN' },
  nominated: { bg: 'bg-blue-600/10', text: 'text-blue-600', label: 'Nominated' },
  accumulating: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Accumulating' },
  departed: { bg: 'bg-green-600/15', text: 'text-green-600', label: 'Departed' },
  // Alert severities
  critical: { bg: 'bg-red-600/15', text: 'text-red-600', label: 'Critical' },
  warning: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Warning' },
  info: { bg: 'bg-blue-600/15', text: 'text-blue-600', label: 'Info' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-gray-600/10', text: 'text-gray-600', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 font-sans font-medium text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.text} border ${config.text.replace('text-', 'border-')}/20`}>
      {label || config.label}
    </span>
  );
}
