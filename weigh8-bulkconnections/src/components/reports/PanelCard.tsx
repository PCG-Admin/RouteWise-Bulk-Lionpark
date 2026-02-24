import type { ReactNode } from 'react';

interface PanelCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function PanelCard({ title, description, children, action, className = '', noPadding = false }: PanelCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans font-semibold text-base text-gray-900">
            {title}
          </h3>
          {description && (
            <p className="font-sans text-[11px] text-gray-600 leading-snug">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}
