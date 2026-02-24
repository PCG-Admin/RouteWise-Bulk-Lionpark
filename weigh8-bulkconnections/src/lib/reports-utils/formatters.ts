import { format, parseISO } from 'date-fns';

export function formatTonnes(value: number): string {
  return value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatHours(value: number): string {
  return `${value.toFixed(1)}h`;
}

export function formatWeightKg(value: number): string {
  return value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatTimestamp(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-ZA');
}

export function formatDelta(value: number, direction: 'up' | 'down'): string {
  const arrow = direction === 'up' ? '+' : '-';
  return `${arrow}${Math.abs(value).toFixed(1)}%`;
}

export function formatTimeElapsed(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    return `${days}d ${diffHours % 24}h ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins}m ago`;
  }
  return `${diffMins}m ago`;
}
