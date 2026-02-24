import type { Order, Truck, Stockpile } from '@/lib/types';

export function calculateVariancePct(mineKg: number, bcKg: number): number {
  if (mineKg === 0) return 0;
  return ((bcKg - mineKg) / mineKg) * 100;
}

export function calculateStockpileUtilisation(stockpile: Stockpile): number {
  if (stockpile.capacityTonnes === 0) return 0;
  return (stockpile.currentTonnes / stockpile.capacityTonnes) * 100;
}

export function calculateAggregateStockpileUtilisation(stockpiles: Stockpile[]): number {
  const totalCurrent = stockpiles.reduce((sum, s) => sum + s.currentTonnes, 0);
  const totalCapacity = stockpiles.reduce((sum, s) => sum + s.capacityTonnes, 0);
  if (totalCapacity === 0) return 0;
  return (totalCurrent / totalCapacity) * 100;
}

export function calculateOrderCompletion(order: Order): number {
  if (order.plannedTonnage === 0) return 0;
  return (order.actualTonnage / order.plannedTonnage) * 100;
}

export function calculateTruckCompletion(order: Order): number {
  if (order.plannedTrucks === 0) return 0;
  return (order.completedTrucks / order.plannedTrucks) * 100;
}

export function getActiveOrders(orders: Order[]): Order[] {
  return orders.filter(o => !['completed', 'cancelled'].includes(o.status));
}

export function getTrucksByStatus(trucks: Truck[], status: string): Truck[] {
  return trucks.filter(t => t.status === status);
}

export function calculateAvgTransitHours(trucks: Truck[]): number {
  const trucksWithTimes = trucks.filter(t => t.mineLoadTime && t.bcOffloadTime);
  if (trucksWithTimes.length === 0) return 0;
  const totalHours = trucksWithTimes.reduce((sum, t) => {
    const start = new Date(t.mineLoadTime!).getTime();
    const end = new Date(t.bcOffloadTime!).getTime();
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0);
  return totalHours / trucksWithTimes.length;
}

export function calculateTotalVolume(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + o.actualTonnage, 0);
}

export function calculatePlannedVolume(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + o.plannedTonnage, 0);
}

export function getOrdersByProduct(orders: Order[]): Record<string, Order[]> {
  return orders.reduce((acc, o) => {
    if (!acc[o.product]) acc[o.product] = [];
    acc[o.product].push(o);
    return acc;
  }, {} as Record<string, Order[]>);
}

export function hoursAgo(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60);
}

export function isPastDue(order: Order): boolean {
  return new Date(order.targetDeliveryDate) < new Date();
}

export function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}

export function avgBy<T>(arr: T[], fn: (item: T) => number): number {
  if (arr.length === 0) return 0;
  return sumBy(arr, fn) / arr.length;
}

export function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
