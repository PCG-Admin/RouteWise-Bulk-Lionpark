import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  delta?: { value: string; direction: 'up' | 'down'; positive: boolean };
  accentColor?: 'gold' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

const accentColors = {
  gold: 'border-t-yellow-500',
  green: 'border-t-green-500',
  amber: 'border-t-amber-500',
  red: 'border-t-red-500',
  blue: 'border-t-blue-500',
  purple: 'border-t-purple-500',
};

const valueSizes = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

export default function KpiCard({ label, value, subtext, delta, accentColor = 'gold', size = 'md' }: KpiCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl border-t-2 ${accentColors[accentColor]} p-6 shadow-sm`}>
      <div className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-600 mb-2">
        {label}
      </div>
      <div className={`font-sans font-bold ${valueSizes[size]} text-gray-900 leading-none`}>
        {value}
      </div>
      {subtext && (
        <div className="font-sans text-xs text-gray-600 mt-1.5">{subtext}</div>
      )}
      {delta && (
        <div className="mt-2 flex items-center gap-1">
          {delta.direction === 'up' ? (
            <ArrowUp size={12} className={delta.positive ? 'text-green-600' : 'text-red-600'} />
          ) : (
            <ArrowDown size={12} className={delta.positive ? 'text-green-600' : 'text-red-600'} />
          )}
          <span className={`font-sans text-xs font-medium tabular-nums ${delta.positive ? 'text-green-600' : 'text-red-600'}`}>
            {delta.value}
          </span>
        </div>
      )}
    </div>
  );
}
