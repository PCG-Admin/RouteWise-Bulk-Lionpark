interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  color?: 'gold' | 'green' | 'amber' | 'red' | 'blue';
  size?: 'sm' | 'md';
}

const barColors = {
  gold: 'bg-blue-900',
  green: 'bg-green-600',
  amber: 'bg-amber-600',
  red: 'bg-red-600',
  blue: 'bg-blue-600',
};

export default function ProgressBar({ value, max = 100, label, showLabel = true, color = 'gold', size = 'md' }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct >= 95 ? 'bg-red-600' : pct >= 85 ? 'bg-amber-600' : barColors[color];
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-sans text-xs text-gray-700 min-w-[40px] text-right">
          {label || `${pct.toFixed(0)}%`}
        </span>
      )}
    </div>
  );
}
