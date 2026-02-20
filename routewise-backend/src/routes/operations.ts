import { Router } from 'express';
import { db } from '../db';
import { truckAllocations, orders, clients } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Helper function to map status to Bulks stage
 * Based on sync rules:
 * - Lionspark "Checked In" (arrived/weighing) = Bulk "Staging"
 * - Lionspark "Departed" (completed) = Bulk "Pending Arrival"
 * - Bulk "Checked In" (bulks_arrived) = Truck arrived at Bulks port
 * - Bulk "Departed" (bulks_departed) = Truck left Bulks port
 * - Trucks not yet at Lions (scheduled/in_transit) = Not shown in Bulks (return null)
 */
function mapStatusToBulkStage(status: string): string | null {
  const statusLower = status?.toLowerCase() || 'scheduled';

  // Trucks at Bulks port
  if (statusLower === 'bulks_arrived') {
    return 'checked_in'; // Truck checked in at Bulks
  }
  if (statusLower === 'bulks_departed') {
    return 'departed'; // Truck departed Bulks
  }

  // Trucks at Lions park (from Bulks perspective)
  if (statusLower === 'arrived' || statusLower === 'weighing') {
    return 'staging'; // Truck checked in at Lions, staging for Bulks
  }
  if (statusLower === 'completed') {
    return 'pending_arrival'; // Truck departed Lions, pending arrival at Bulks
  }

  // Trucks not yet at Lions - don't show in Bulks loading board
  if (statusLower === 'scheduled' || statusLower === 'in_transit') {
    return null; // Don't show trucks that haven't arrived at Lions yet
  }

  // Default - don't show unknown statuses
  return null;
}

/**
 * GET /api/operations/loading-board
 * Get trucks for Bulks loading board with stage mapping
 */
router.get('/loading-board', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;

    const allocations = await db
      .select({
        allocation: truckAllocations,
        order: orders,
        client: clients,
      })
      .from(truckAllocations)
      .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(eq(truckAllocations.tenantId, tenantId))
      .orderBy(truckAllocations.scheduledDate);

    // Map truck allocations to Bulks format with stages
    // Filter out trucks that haven't arrived at Lions yet
    const trucks = allocations
      .map(({ allocation, order, client }) => {
        const stage = mapStatusToBulkStage(allocation.status || 'scheduled');

        // Skip trucks that don't have a valid stage (not yet at Lions)
        if (!stage) return null;

        return {
          id: allocation.id,
          plate: allocation.vehicleReg,
          driver: allocation.driverName || 'Unknown',
          driverPhone: allocation.driverPhone,
          driverId: allocation.driverId,
          transporter: allocation.transporter || 'Unknown',
          product: order?.product || 'N/A',
          customer: client?.name || 'Unknown',
          orderNo: order?.orderNumber || 'N/A',
          collection: order?.originAddress || 'N/A',
          originAddress: order?.originAddress,
          destinationAddress: order?.destinationAddress,
          destination: order?.destinationAddress,
          quantity: order?.quantity,
          unit: order?.unit,
          priority: order?.priority,
          stage,
          status: allocation.status,
          badges: [] as string[],
          scheduledDate: allocation.scheduledDate,
          expectedTime: allocation.scheduledDate ? new Date(allocation.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          ocrStatus: 'processed',
          ticketNo: allocation.ticketNo,
          grossWeight: allocation.grossWeight,
          tareWeight: allocation.tareWeight,
          netWeight: allocation.netWeight,
        };
      })
      .filter(truck => truck !== null);

    res.json({
      success: true,
      trucks,
      total: trucks.length,
    });
  } catch (error) {
    console.error('Get Bulks loading board error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loading board data',
    });
  }
});

/**
 * GET /api/operations/port-operations
 * Get trucks for port operations board (similar to loading board)
 */
router.get('/port-operations', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;

    const allocations = await db
      .select({
        allocation: truckAllocations,
        order: orders,
        client: clients,
      })
      .from(truckAllocations)
      .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(eq(truckAllocations.tenantId, tenantId))
      .orderBy(truckAllocations.scheduledDate);

    // Map truck allocations to port operations format
    const trucks = allocations.map(({ allocation, order, client }) => ({
      id: allocation.id,
      plate: allocation.vehicleReg,
      driver: allocation.driverName || 'Unknown',
      driverPhone: allocation.driverPhone,
      driverId: allocation.driverId,
      transporter: allocation.transporter || 'Unknown',
      product: order?.product || 'N/A',
      customer: client?.name || 'Unknown',
      orderNo: order?.orderNumber || 'N/A',
      collection: order?.originAddress || 'N/A',
      originAddress: order?.originAddress,
      destinationAddress: order?.destinationAddress,
      destination: order?.destinationAddress,
      quantity: order?.quantity,
      unit: order?.unit,
      priority: order?.priority,
      stage: mapStatusToBulkStage(allocation.status || 'scheduled'),
      status: allocation.status,
      scheduledDate: allocation.scheduledDate,
      expectedTime: allocation.scheduledDate ? new Date(allocation.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      ticketNo: allocation.ticketNo,
      grossWeight: allocation.grossWeight,
      tareWeight: allocation.tareWeight,
      netWeight: allocation.netWeight,
    }));

    res.json({
      success: true,
      trucks,
      total: trucks.length,
    });
  } catch (error) {
    console.error('Get port operations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch port operations data',
    });
  }
});

export default router;
