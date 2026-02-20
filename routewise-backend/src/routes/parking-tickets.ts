import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { parkingTickets, truckAllocations, orders, clients, transporters, drivers, plannedVisits } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { invalidateCache } from '../utils/cache';

const router = Router();

/**
 * Helper function to generate parking ticket number
 * Format: PT-YYYY-NNNNNN
 */
async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PT-${year}-`;

  // Get the latest ticket number for this year
  const latestTickets = await db
    .select({ ticketNumber: parkingTickets.ticketNumber })
    .from(parkingTickets)
    .where(and(
      eq(parkingTickets.tenantId, tenantId),
      // Match tickets starting with this year's prefix
    ))
    .orderBy(desc(parkingTickets.ticketNumber))
    .limit(1);

  let sequence = 1;
  if (latestTickets.length > 0 && latestTickets[0].ticketNumber.startsWith(prefix)) {
    const lastNumber = latestTickets[0].ticketNumber.replace(prefix, '');
    sequence = parseInt(lastNumber) + 1;
  }

  // Pad sequence to 6 digits
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}

/**
 * POST /api/parking-tickets
 * Create a new parking ticket (called automatically on check-in)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { allocationId, visitId, personOnDuty } = req.body;

    if (!allocationId && !visitId) {
      return res.status(400).json({
        success: false,
        error: 'allocationId or visitId is required',
      });
    }

    // ── Non-matched visit path ────────────────────────────────────────────────
    if (visitId && !allocationId) {
      // Check if a ticket already exists for this visit
      const existingVisitTicket = await db
        .select()
        .from(parkingTickets)
        .where(and(
          eq(parkingTickets.visitId, parseInt(visitId)),
          eq(parkingTickets.tenantId, tenantId)
        ))
        .limit(1);

      if (existingVisitTicket.length > 0) {
        return res.json({
          success: true,
          data: existingVisitTicket[0],
          message: 'Parking ticket already exists for this visit',
        });
      }

      // Get visit record to pre-populate ticket
      const [visitRecord] = await db
        .select()
        .from(plannedVisits)
        .where(and(
          eq(plannedVisits.id, parseInt(visitId)),
          eq(plannedVisits.tenantId, tenantId)
        ))
        .limit(1);

      if (!visitRecord) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }

      const ticketNumber = await generateTicketNumber(tenantId);

      const [newTicket] = await db
        .insert(parkingTickets)
        .values({
          tenantId,
          visitId: parseInt(visitId),
          ticketNumber,
          arrivalDatetime: visitRecord.actualArrival || new Date(),
          personOnDuty: personOnDuty || 'System',
          terminalNumber: '1',
          vehicleReg: visitRecord.plateNumber,
          status: 'pending',
          remarks: 'Not Booked',
          transporterName: visitRecord.transporterName || '',
          driverName: visitRecord.driverName || '',
          driverContactNumber: visitRecord.driverPhone || '',
          freightCompanyName: 'Bulk Connections',
        })
        .returning();

      console.log(`✓ Created parking ticket ${ticketNumber} for non-matched visit ${visitId}`);

      return res.json({
        success: true,
        data: newTicket,
        message: 'Parking ticket created for non-matched vehicle',
      });
    }

    // ── Matched allocation path ───────────────────────────────────────────────
    // Check if parking ticket already exists for this allocation
    const existingTicket = await db
      .select()
      .from(parkingTickets)
      .where(and(
        eq(parkingTickets.truckAllocationId, parseInt(allocationId)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .limit(1);

    if (existingTicket.length > 0) {
      return res.json({
        success: true,
        data: existingTicket[0],
        message: 'Parking ticket already exists for this allocation',
      });
    }

    // Get allocation details with order and client info
    const allocationData = await db
      .select({
        allocation: truckAllocations,
        order: orders,
        client: clients,
      })
      .from(truckAllocations)
      .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(and(
        eq(truckAllocations.id, parseInt(allocationId)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .limit(1);

    if (allocationData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Truck allocation not found',
      });
    }

    const { allocation, order, client } = allocationData[0];

    // Generate ticket number
    const ticketNumber = await generateTicketNumber(tenantId);

    // Get transporter details if available
    let transporterData = null;
    if (allocation.transporter) {
      const transporterResults = await db
        .select()
        .from(transporters)
        .where(and(
          eq(transporters.name, allocation.transporter),
          eq(transporters.tenantId, tenantId)
        ))
        .limit(1);

      if (transporterResults.length > 0) {
        transporterData = transporterResults[0];
      }
    }

    // Create parking ticket with auto-populated fields
    const [newTicket] = await db
      .insert(parkingTickets)
      .values({
        tenantId,
        truckAllocationId: parseInt(allocationId),
        ticketNumber,
        arrivalDatetime: allocation.actualArrival || new Date(),
        personOnDuty: personOnDuty || 'System',
        terminalNumber: '1',
        vehicleReg: allocation.vehicleReg,
        status: 'pending',

        // Auto-populate from order
        reference: order?.orderNumber || '',
        remarks: order ? 'Booked' : 'Not Booked',
        deliveryAddress: order?.destinationAddress || '',

        // Auto-populate customer/client info
        customerNumber: client?.code || '',
        customerName: client?.name || '',
        customerPhone: client?.phone || '',

        // Auto-populate transporter info
        transporterNumber: transporterData?.code || '',
        transporterName: allocation.transporter || '',
        transporterPhone: transporterData?.phone || '',

        // Auto-populate driver info
        driverName: allocation.driverName || '',
        driverContactNumber: allocation.driverPhone || '',

        // Freight company - derive from order or allocation
        freightCompanyName: 'Bulk Connections', // Default, can be updated
      })
      .returning();

    console.log(`✓ Created parking ticket ${ticketNumber} for allocation ${allocationId}`);

    res.json({
      success: true,
      data: newTicket,
      message: 'Parking ticket created successfully',
    });
  } catch (error) {
    console.error('Create parking ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create parking ticket',
    });
  }
});

/**
 * GET /api/parking-tickets/:allocationId
 * Get parking ticket for a specific truck allocation
 */
router.get('/allocation/:allocationId', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { allocationId } = req.params;

    const [ticket] = await db
      .select()
      .from(parkingTickets)
      .where(and(
        eq(parkingTickets.truckAllocationId, parseInt(allocationId)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Parking ticket not found',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Get parking ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parking ticket',
    });
  }
});

/**
 * GET /api/parking-tickets/visit/:visitId
 * Get parking ticket for a non-matched visit
 */
router.get('/visit/:visitId', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { visitId } = req.params;

    const [ticket] = await db
      .select()
      .from(parkingTickets)
      .where(and(
        eq(parkingTickets.visitId, parseInt(visitId)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Parking ticket not found for this visit',
      });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get visit parking ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch parking ticket' });
  }
});

/**
 * GET /api/parking-tickets
 * List all parking tickets with filters
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { status, vehicleReg, dateFrom, dateTo } = req.query;

    let conditions: any[] = [eq(parkingTickets.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(parkingTickets.status, status as string));
    }
    if (vehicleReg) {
      conditions.push(eq(parkingTickets.vehicleReg, vehicleReg as string));
    }

    const tickets = await db
      .select()
      .from(parkingTickets)
      .where(and(...conditions))
      .orderBy(desc(parkingTickets.arrivalDatetime));

    res.json({
      success: true,
      data: tickets,
      total: tickets.length,
    });
  } catch (error) {
    console.error('List parking tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parking tickets',
    });
  }
});

/**
 * PUT /api/parking-tickets/:id
 * Update parking ticket with verification details
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Update parking ticket
    const [updatedTicket] = await db
      .update(parkingTickets)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(parkingTickets.id, parseInt(id)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .returning();

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        error: 'Parking ticket not found',
      });
    }

    res.json({
      success: true,
      data: updatedTicket,
      message: 'Parking ticket updated successfully',
    });
  } catch (error) {
    console.error('Update parking ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update parking ticket',
    });
  }
});

/**
 * POST /api/parking-tickets/:id/process
 * Mark parking ticket as processed and update driver validation status
 */
router.post('/:id/process', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const { processedBy, ...ticketUpdates } = req.body;

    console.log('🔍 Processing parking ticket:', id);
    console.log('📦 Received data:', ticketUpdates);

    // Get the parking ticket
    const [ticket] = await db
      .select()
      .from(parkingTickets)
      .where(and(
        eq(parkingTickets.id, parseInt(id)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .limit(1);

    if (!ticket) {
      console.error('❌ Parking ticket not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Parking ticket not found',
      });
    }

    console.log('📋 Current ticket status:', ticket.status);

    // Check if all required fields are filled to determine status
    const requiredFields = [
      ticketUpdates.driverPermitNumber || ticket.driverPermitNumber,
      ticketUpdates.boardNumber || ticket.boardNumber,
      ticketUpdates.driverIdNumber || ticket.driverIdNumber,
      ticketUpdates.transporterName || ticket.transporterName,
      ticketUpdates.driverName || ticket.driverName,
      ticketUpdates.driverContactNumber || ticket.driverContactNumber,
    ];

    console.log('🔎 Required fields check:', {
      driverPermitNumber: ticketUpdates.driverPermitNumber || ticket.driverPermitNumber,
      boardNumber: ticketUpdates.boardNumber || ticket.boardNumber,
      driverIdNumber: ticketUpdates.driverIdNumber || ticket.driverIdNumber,
      transporterName: ticketUpdates.transporterName || ticket.transporterName,
      driverName: ticketUpdates.driverName || ticket.driverName,
      driverContactNumber: ticketUpdates.driverContactNumber || ticket.driverContactNumber,
    });

    const allFieldsFilled = requiredFields.every(field => field && field.toString().trim() !== '');
    const ticketStatus = allFieldsFilled ? 'processed' : 'partially_processed';
    const driverValidationStatus = allFieldsFilled ? 'verified' : 'pending_verification';

    console.log('✅ All fields filled:', allFieldsFilled);
    console.log('📊 New status:', ticketStatus);

    // Update parking ticket status
    const [updatedTicket] = await db
      .update(parkingTickets)
      .set({
        ...ticketUpdates,
        status: ticketStatus,
        processedAt: new Date(),
        processedBy: processedBy || 'System',
        updatedAt: new Date(),
      })
      .where(and(
        eq(parkingTickets.id, parseInt(id)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .returning();

    if (!updatedTicket) {
      console.error('❌ Failed to update parking ticket - no rows affected');
      return res.status(500).json({
        success: false,
        error: 'Failed to update parking ticket - update returned no rows',
      });
    }

    console.log('💾 Updated ticket:', {
      id: updatedTicket.id,
      status: updatedTicket.status,
      driverName: updatedTicket.driverName,
      transporterName: updatedTicket.transporterName,
    });

    // Update truck allocation driver validation status (matched trucks only)
    if (ticket.truckAllocationId) {
      await db
        .update(truckAllocations)
        .set({
          driverValidationStatus: driverValidationStatus,
          updatedAt: new Date(),
        })
        .where(and(
          eq(truckAllocations.id, ticket.truckAllocationId),
          eq(truckAllocations.tenantId, tenantId)
        ));
    }

    // For non-matched visits: update visit status to reflect verification
    if (ticket.visitId) {
      const visitStatus = allFieldsFilled ? 'non_matched_verified' : 'non_matched_partial';
      await db
        .update(plannedVisits)
        .set({ status: visitStatus, updatedAt: new Date() })
        .where(and(
          eq(plannedVisits.id, ticket.visitId),
          eq(plannedVisits.tenantId, tenantId)
        ));
    }

    // Invalidate cache after updating verification status
    await invalidateCache('truck-allocations:*');

    // If driver ID number and Cutler permit provided, update driver record
    if (ticketUpdates.driverIdNumber && ticket.driverName) {
      // Try to find existing driver
      const existingDrivers = await db
        .select()
        .from(drivers)
        .where(and(
          eq(drivers.idNumber, ticketUpdates.driverIdNumber),
          eq(drivers.tenantId, tenantId)
        ))
        .limit(1);

      if (existingDrivers.length > 0) {
        // Update existing driver with Cutler permit info
        await db
          .update(drivers)
          .set({
            cutlerPermitNumber: ticketUpdates.driverPermitNumber,
            boardNumber: ticketUpdates.boardNumber,
            phone: ticketUpdates.driverContactNumber || existingDrivers[0].phone,
            updatedAt: new Date(),
          })
          .where(eq(drivers.id, existingDrivers[0].id));
      }
    }

    console.log(`✓ Parking ticket ${ticket.ticketNumber} ${ticketStatus} - validation: ${driverValidationStatus}`);

    res.json({
      success: true,
      data: updatedTicket,
      message: allFieldsFilled
        ? 'Parking ticket processed and driver verified successfully'
        : 'Parking ticket partially processed - some required fields are missing',
    });
  } catch (error) {
    console.error('Process parking ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process parking ticket',
    });
  }
});

/**
 * POST /api/parking-tickets/:id/depart
 * Mark truck as departed and calculate hours in lot
 */
router.post('/:id/depart', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const [ticket] = await db
      .select()
      .from(parkingTickets)
      .where(and(
        eq(parkingTickets.id, parseInt(id)),
        eq(parkingTickets.tenantId, tenantId)
      ))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Parking ticket not found',
      });
    }

    const departedAt = new Date();
    const arrivalTime = new Date(ticket.arrivalDatetime);
    const hoursInLot = (departedAt.getTime() - arrivalTime.getTime()) / (1000 * 60 * 60);

    const [updatedTicket] = await db
      .update(parkingTickets)
      .set({
        status: 'departed',
        departedAt,
        hoursInLot: hoursInLot.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(parkingTickets.id, parseInt(id)))
      .returning();

    res.json({
      success: true,
      data: updatedTicket,
      message: 'Truck departed successfully',
    });
  } catch (error) {
    console.error('Depart truck error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark truck as departed',
    });
  }
});

export default router;
