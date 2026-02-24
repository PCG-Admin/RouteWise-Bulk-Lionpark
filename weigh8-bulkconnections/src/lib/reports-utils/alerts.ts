import type { Alert, Order, Truck, Stockpile, Transporter } from '@/lib/types';
import { hoursAgo, isPastDue } from './calculations';

let alertCounter = 0;
function nextId(): string {
  alertCounter += 1;
  return `ALT-${String(alertCounter).padStart(4, '0')}`;
}

export function generateAlerts(
  trucks: Truck[],
  orders: Order[],
  stockpiles: Stockpile[],
  transporters: Transporter[]
): Alert[] {
  alertCounter = 0;
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // Staging time rules
  for (const truck of trucks) {
    if (truck.status === 'staging' && truck.lionsArrivalTime) {
      const hours = hoursAgo(truck.lionsArrivalTime);
      if (hours >= 24) {
        alerts.push({
          id: nextId(), type: 'staging_24h', severity: 'critical',
          title: `CRITICAL: Truck ${truck.registration} at staging 24h+`,
          detail: `Truck ${truck.registration} has been at Lions staging for ${hours.toFixed(1)} hours. Order: ${truck.orderId || 'UNALLOCATED'}`,
          entityType: 'truck', entityId: truck.id, createdAt: truck.lionsArrivalTime, acknowledged: false,
        });
      } else if (hours >= 12) {
        alerts.push({
          id: nextId(), type: 'staging_12h', severity: 'warning',
          title: `WARNING: Truck ${truck.registration} at staging 12h+`,
          detail: `Truck ${truck.registration} has been at Lions staging for ${hours.toFixed(1)} hours. Order: ${truck.orderId || 'UNALLOCATED'}`,
          entityType: 'truck', entityId: truck.id, createdAt: truck.lionsArrivalTime, acknowledged: false,
        });
      } else if (hours >= 6) {
        alerts.push({
          id: nextId(), type: 'staging_6h', severity: 'warning',
          title: `Truck ${truck.registration} at staging 6h+`,
          detail: `Truck ${truck.registration} has been at Lions staging for ${hours.toFixed(1)} hours. Order: ${truck.orderId || 'UNALLOCATED'}`,
          entityType: 'truck', entityId: truck.id, createdAt: truck.lionsArrivalTime, acknowledged: false,
        });
      }
    }

    // Weight variance rules
    if (truck.variancePct !== undefined && truck.variancePct !== null) {
      const absVar = Math.abs(truck.variancePct);
      if (absVar >= 5) {
        alerts.push({
          id: nextId(), type: 'weight_variance_5', severity: 'critical',
          title: `CRITICAL VARIANCE: Truck ${truck.registration} (${truck.variancePct.toFixed(1)}%)`,
          detail: `Mine: ${truck.mineWeighbridgeKg}kg, BC: ${truck.bcWeighbridgeKg}kg, Variance: ${truck.varianceKg}kg (${truck.variancePct.toFixed(1)}%)`,
          entityType: 'truck', entityId: truck.id, createdAt: now, acknowledged: false,
        });
      } else if (absVar >= 2) {
        alerts.push({
          id: nextId(), type: 'weight_variance_2', severity: 'warning',
          title: `Weight Variance: Truck ${truck.registration} (${truck.variancePct.toFixed(1)}%)`,
          detail: `Mine: ${truck.mineWeighbridgeKg}kg, BC: ${truck.bcWeighbridgeKg}kg, Variance: ${truck.varianceKg}kg (${truck.variancePct.toFixed(1)}%)`,
          entityType: 'truck', entityId: truck.id, createdAt: now, acknowledged: false,
        });
      }
    }

    // Unallocated truck
    if (truck.status === 'staging' && !truck.orderId) {
      alerts.push({
        id: nextId(), type: 'unallocated_truck', severity: 'critical',
        title: `UNALLOCATED: Truck ${truck.registration} at staging`,
        detail: `Truck ${truck.registration} is at Lions staging with no order allocation. Transporter: ${truck.transporterId}`,
        entityType: 'truck', entityId: truck.id, createdAt: now, acknowledged: false,
      });
    }
  }

  // Stockpile capacity rules
  for (const sp of stockpiles) {
    const util = sp.currentTonnes / sp.capacityTonnes;
    if (util >= 0.95) {
      alerts.push({
        id: nextId(), type: 'stockpile_95', severity: 'critical',
        title: `CRITICAL: ${sp.name} at ${(util * 100).toFixed(0)}% capacity`,
        detail: `${sp.currentTonnes.toLocaleString()}T / ${sp.capacityTonnes.toLocaleString()}T. ${sp.pendingInboundTrucks} trucks inbound (${sp.pendingInboundTonnes}T).`,
        entityType: 'stockpile', entityId: sp.id, createdAt: now, acknowledged: false,
      });
    } else if (util >= 0.85) {
      alerts.push({
        id: nextId(), type: 'stockpile_85', severity: 'warning',
        title: `${sp.name} at ${(util * 100).toFixed(0)}% capacity`,
        detail: `${sp.currentTonnes.toLocaleString()}T / ${sp.capacityTonnes.toLocaleString()}T. ${sp.pendingInboundTrucks} trucks inbound (${sp.pendingInboundTonnes}T).`,
        entityType: 'stockpile', entityId: sp.id, createdAt: now, acknowledged: false,
      });
    }
  }

  // Order rules
  for (const order of orders) {
    if (order.allocatedTrucks < order.plannedTrucks && !['completed', 'cancelled', 'scheduled'].includes(order.status)) {
      alerts.push({
        id: nextId(), type: 'truck_shortfall', severity: 'warning',
        title: `Truck shortfall: Order ${order.id}`,
        detail: `Planned: ${order.plannedTrucks}, Allocated: ${order.allocatedTrucks}. Shortfall: ${order.plannedTrucks - order.allocatedTrucks} trucks.`,
        entityType: 'order', entityId: order.id, createdAt: now, acknowledged: false,
      });
    }
    if (!['completed', 'cancelled'].includes(order.status) && isPastDue(order)) {
      alerts.push({
        id: nextId(), type: 'order_overdue', severity: 'warning',
        title: `Order ${order.id} is overdue`,
        detail: `Target delivery: ${order.targetDeliveryDate}. Status: ${order.status}. ${order.completedTrucks}/${order.plannedTrucks} trucks completed.`,
        entityType: 'order', entityId: order.id, createdAt: now, acknowledged: false,
      });
    }
  }

  // Transporter rules
  for (const t of transporters) {
    if (t.onTimePct < 70) {
      alerts.push({
        id: nextId(), type: 'transporter_performance', severity: 'critical',
        title: `CRITICAL: ${t.name} performance below 70%`,
        detail: `On-time: ${t.onTimePct}%, Avg transit: ${t.avgTransitHours}h, Avg variance: ${t.avgVariancePct}%`,
        entityType: 'transporter', entityId: t.id, createdAt: now, acknowledged: false,
      });
    } else if (t.onTimePct < 80) {
      alerts.push({
        id: nextId(), type: 'transporter_performance', severity: 'warning',
        title: `${t.name} performance below target`,
        detail: `On-time: ${t.onTimePct}%, Avg transit: ${t.avgTransitHours}h, Avg variance: ${t.avgVariancePct}%`,
        entityType: 'transporter', entityId: t.id, createdAt: now, acknowledged: false,
      });
    }
  }

  return alerts;
}
