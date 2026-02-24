import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { orders, truckAllocations, clients, parkingTickets } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { anprCheckerService } from '../services/anpr-checker';
import { getCached, setCache, invalidateCache } from '../utils/cache';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Helper function to normalize column names
 * Converts various formats to standard snake_case
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Helper function to map flexible column names to standard fields
 */
function mapColumnToField(normalizedName: string): string | null {
  const mappings: Record<string, string[]> = {
    vehicle_reg: ['vehicle_reg', 'vehicle_registration', 'truck_number', 'vehicle_plate', 'plate_number', 'reg_no', 'registration'],
    driver_name: ['driver_name', 'driver', 'driver_full_name', 'operator'],
    driver_phone: ['driver_phone', 'driver_contact', 'phone', 'contact', 'mobile'],
    driver_id: ['driver_id', 'id_number', 'driver_id_no', 'id_no'],
    gross_weight: ['gross_weight', 'gross', 'total_weight', 'loaded_weight'],
    tare_weight: ['tare_weight', 'tare', 'empty_weight', 'vehicle_weight'],
    net_weight: ['net_weight', 'net', 'net_mass', 'cargo_weight', 'payload'],
    ticket_no: ['ticket_no', 'ticket_number', 'ticket', 'reference', 'ref_no'],
    scheduled_date: ['scheduled_date', 'load_date', 'date', 'pickup_date', 'delivery_date'],
    transporter: ['transporter', 'transporter_name', 'carrier', 'haulier', 'freight_company'],
    notes: ['notes', 'comments', 'remarks', 'additional_info'],
  };

  for (const [field, variations] of Object.entries(mappings)) {
    if (variations.includes(normalizedName)) {
      return field;
    }
  }

  return null;
}

/**
 * Helper function to parse date values from Excel
 */
function parseDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) return value;

  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // If it's an Excel serial date number
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * POST /api/truck-allocations/upload
 * Upload Excel file with truck allocations for an order
 */
router.post('/upload', requireAuth, upload.single('truckFile'), async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { orderId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is required'
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Verify order exists
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, parseInt(orderId)),
        eq(orders.tenantId, tenantId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate file type
    const isExcel =
      req.file.mimetype === 'application/vnd.ms-excel' ||
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      req.file.originalname.endsWith('.xlsx') ||
      req.file.originalname.endsWith('.xls') ||
      req.file.originalname.endsWith('.xlsb');

    const isCsv =
      req.file.mimetype === 'text/csv' ||
      req.file.mimetype === 'application/csv' ||
      req.file.originalname.endsWith('.csv');

    if (!isExcel && !isCsv) {
      return res.status(400).json({
        success: false,
        error: 'Only Excel (.xlsx, .xls, .xlsb) and CSV (.csv) files are supported'
      });
    }

    // Parse Excel/CSV
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is empty'
      });
    }

    console.log('Excel parsed, rows found:', rawData.length);
    console.log('First row sample:', rawData[0]);

    // Map columns to standard fields
    const headers = Object.keys(rawData[0]);
    const columnMapping: Record<string, string> = {};

    headers.forEach(header => {
      const normalized = normalizeColumnName(header);
      const mappedField = mapColumnToField(normalized);
      if (mappedField) {
        columnMapping[header] = mappedField;
      }
    });

    console.log('Column mapping:', columnMapping);

    // Parse and validate truck data
    const truckData = rawData.map((row, index) => {
      const mapped: any = {};

      Object.entries(columnMapping).forEach(([originalHeader, standardField]) => {
        const value = row[originalHeader];

        if (standardField === 'scheduled_date') {
          mapped[standardField] = parseDate(value);
        } else if (['gross_weight', 'tare_weight', 'net_weight'].includes(standardField)) {
          mapped[standardField] = value ? parseFloat(String(value)) : null;
        } else {
          mapped[standardField] = value ? String(value) : null;
        }
      });

      return {
        rowIndex: index + 1,
        vehicleReg: mapped.vehicle_reg || `UNKNOWN-${index}`,
        driverName: mapped.driver_name,
        driverPhone: mapped.driver_phone,
        driverId: mapped.driver_id,
        grossWeight: mapped.gross_weight,
        tareWeight: mapped.tare_weight,
        netWeight: mapped.net_weight || (mapped.gross_weight && mapped.tare_weight ? mapped.gross_weight - mapped.tare_weight : null),
        ticketNo: mapped.ticket_no,
        scheduledDate: mapped.scheduled_date,
        transporter: mapped.transporter,
        notes: mapped.notes,
      };
    });

    // Check for duplicates (same vehicle + order)
    const existingAllocations = await db
      .select()
      .from(truckAllocations)
      .where(and(
        eq(truckAllocations.orderId, parseInt(orderId)),
        eq(truckAllocations.tenantId, tenantId)
      ));

    const existingVehicles = new Set(existingAllocations.map(a => a.vehicleReg));
    const newAllocations = truckData.filter(truck => !existingVehicles.has(truck.vehicleReg));
    const duplicates = truckData.filter(truck => existingVehicles.has(truck.vehicleReg));

    console.log(`Found ${newAllocations.length} new trucks, ${duplicates.length} duplicates (skipped)`);

    // Insert new truck allocations
    let createdAllocations: any[] = [];
    if (newAllocations.length > 0) {
      // Get the next sequence number for this order
      const existingCount = existingAllocations.length;

      const allocationsToInsert = newAllocations.map((truck, index) => {
        return {
          tenantId,
          orderId: parseInt(orderId),
          vehicleReg: truck.vehicleReg,
          driverName: truck.driverName,
          driverPhone: truck.driverPhone,
          driverId: truck.driverId,
          grossWeight: truck.grossWeight ? String(truck.grossWeight) : null,
          tareWeight: truck.tareWeight ? String(truck.tareWeight) : null,
          netWeight: truck.netWeight ? String(truck.netWeight) : null,
          ticketNo: truck.ticketNo,
          scheduledDate: truck.scheduledDate,
          transporter: truck.transporter,
          status: 'scheduled' as const,
          notes: truck.notes,
        };
      });

      createdAllocations = await db
        .insert(truckAllocations)
        .values(allocationsToInsert)
        .returning();
    }

    // Invalidate cache after creating allocations
    await invalidateCache('truck-allocations:*');

    res.json({
      success: true,
      message: `Successfully imported ${createdAllocations.length} truck allocations${duplicates.length > 0 ? `, skipped ${duplicates.length} duplicates` : ''}`,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          product: order.product,
          quantity: order.quantity,
        },
        allocations: createdAllocations,
        totalImported: createdAllocations.length,
        totalSkipped: duplicates.length,
        columnMapping,
        sheetUsed: sheetName,
      },
    });
  } catch (error) {
    console.error('Truck allocation upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process truck allocation file',
    });
  }
});

/**
 * GET /api/truck-allocations/anpr-status
 * Get ANPR service status
 */
router.get('/anpr-status', requireAuth, (req, res) => {
  try {
    const status = anprCheckerService.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get ANPR status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ANPR status',
    });
  }
});

/**
 * POST /api/truck-allocations/anpr-inject-test
 * Manually inject a test plate detection (for testing)
 */
router.post('/anpr-inject-test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { plateNumber, direction = 'entry' } = req.body;

    if (!plateNumber) {
      return res.status(400).json({
        success: false,
        error: 'plateNumber is required',
      });
    }

    const processed = await anprCheckerService.injectTestPlate(plateNumber, direction);

    res.json({
      success: true,
      processed,
      message: processed
        ? `Test plate ${plateNumber} processed successfully`
        : `No matching allocation found for plate ${plateNumber}`,
    });
  } catch (error) {
    console.error('ANPR test injection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to inject test plate',
    });
  }
});

/**
 * GET /api/truck-allocations
 * Get all truck allocations across all orders
 * Query params:
 * - siteId: filter by site (for site-specific views)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { siteId, page = '1', limit = '50' } = req.query;
    // parkingTickets imported at top of file

    // Create cache key based on query parameters
    const cacheKey = `truck-allocations:tenant:${tenantId}:site:${siteId || 'all'}:page:${page}:limit:${limit}`;

    // Check cache first
    const cachedData = await getCached<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build WHERE conditions
    const conditions: any[] = [eq(truckAllocations.tenantId, tenantId)];

    // Filter by site if provided
    if (siteId) {
      conditions.push(eq(truckAllocations.siteId, parseInt(String(siteId))));
    }

    // Pagination
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const safeLimit = Math.min(limitNum, 500);
    const offset = (pageNum - 1) * safeLimit;

    // Import sites table
    const { sites } = await import('../db/schema');

    // Execute query with pagination - parallel queries for data + count
    const [allocations, countResult] = await Promise.all([
      db.select({
        allocation: truckAllocations,
        order: orders,
        client: clients,
        parkingTicket: parkingTickets,
        site: sites,
      })
        .from(truckAllocations)
        .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .leftJoin(parkingTickets, eq(truckAllocations.id, parkingTickets.truckAllocationId))
        .leftJoin(sites, eq(truckAllocations.siteId, sites.id))
        .where(and(...conditions))
        .orderBy(desc(truckAllocations.scheduledDate))
        .limit(safeLimit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(truckAllocations)
        .where(and(...conditions))
    ]);

    // Flatten the result to include order, parking ticket, and site details
    const flattenedAllocations = allocations.map(({ allocation, order, client, parkingTicket, site }) => ({
      ...allocation,
      orderNumber: order?.orderNumber,
      product: order?.product,
      customer: parkingTicket?.customerName || client?.name || order?.clientName, // Use parking ticket > client record > order clientName
      origin: order?.originAddress,
      originAddress: order?.originAddress,
      destinationAddress: order?.destinationAddress,
      quantity: order?.quantity,
      unit: order?.unit,
      priority: order?.priority,
      notes: order?.notes,
      status: allocation.status || order?.status,
      parkingTicketStatus: parkingTicket?.status || null,
      parkingTicketNumber: parkingTicket?.ticketNumber || null,
      // Include driver info from parking ticket if available
      driverName: parkingTicket?.driverName || allocation.driverName,
      driverPhone: parkingTicket?.driverContactNumber || allocation.driverPhone,
      driverId: parkingTicket?.driverIdNumber || allocation.driverId,
      // Include transporter from parking ticket if available
      transporter: parkingTicket?.transporterName || allocation.transporter,
      requestedPickupDate: order?.requestedPickupDate,
      requestedDeliveryDate: order?.requestedDeliveryDate,
      actualPickupDate: order?.actualPickupDate,
      actualDeliveryDate: order?.actualDeliveryDate,
      createdAt: allocation.createdAt || order?.createdAt,
      siteId: allocation.siteId,
      siteName: site?.siteName || null,
    }));

    const totalCount = Number(countResult[0].count);

    const response = {
      success: true,
      data: flattenedAllocations,
      total: totalCount,
      pagination: {
        page: pageNum,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasMore: pageNum * safeLimit < totalCount,
      }
    };

    // Cache the result for 5 minutes (300 seconds)
    await setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Get all truck allocations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch truck allocations',
    });
  }
});

/**
 * GET /api/truck-allocations/allocation/:id
 * Get a single truck allocation by allocation ID with order details
 */
router.get('/allocation/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    console.log(`🔍 GET /truck-allocations/allocation/${id} - tenantId: ${tenantId}`);

    // Use raw SQL query to get allocation with order and parking ticket details
    const query = sql`
      SELECT
        ta.*,
        o.order_number,
        o.purchase_order_number,
        o.client_name,
        o.product,
        
        o.origin_address,
        o.destination_address,
        pt.driver_name as parking_driver_name,
        pt.driver_id_number as parking_driver_id,
        pt.driver_contact_number as parking_driver_phone,
        pt.customer_name as parking_customer_name,
        pt.transporter_name as parking_transporter_name,
        pt.freight_company_name as parking_freight_company,
        pt.arrival_datetime as parking_arrival_time
      FROM truck_allocations ta
      LEFT JOIN orders o ON ta.order_id = o.id
      LEFT JOIN parking_tickets pt ON ta.id = pt.truck_allocation_id
      WHERE ta.id = ${parseInt(id)}
      AND ta.tenant_id = ${tenantId}
      LIMIT 1
    `;

    const result = await db.execute(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Allocation not found',
      });
    }

    const allocation = result.rows[0];

    console.log(`✅ Returning single allocation ${id} with order details`);

    res.json({
      success: true,
      data: allocation,
    });
  } catch (error) {
    console.error('Get single allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch allocation',
    });
  }
});

/**
 * GET /api/truck-allocations/:orderId
 * Get all truck allocations for an order
 */
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { orderId } = req.params;

    const allocations = await db
      .select()
      .from(truckAllocations)
      .where(and(
        eq(truckAllocations.orderId, parseInt(orderId)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .orderBy(truckAllocations.createdAt);

    res.json({
      success: true,
      data: allocations,
      total: allocations.length,
    });
  } catch (error) {
    console.error('Get truck allocations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch truck allocations',
    });
  }
});

/**
 * PUT /api/truck-allocations/:id
 * Update allocation details (vehicle, driver, transporter, weights, scheduled date, notes)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    // Only allow updating safe allocation-level fields (not status or journey fields)
    const {
      vehicleReg,
      driverName,
      driverPhone,
      driverId,
      transporter,
      scheduledDate,
      grossWeight,
      tareWeight,
      netWeight,
      ticketNo,
      notes,
    } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (vehicleReg !== undefined) updateData.vehicleReg = vehicleReg;
    if (driverName !== undefined) updateData.driverName = driverName;
    if (driverPhone !== undefined) updateData.driverPhone = driverPhone;
    if (driverId !== undefined) updateData.driverId = driverId;
    if (transporter !== undefined) updateData.transporter = transporter;
    if (ticketNo !== undefined) updateData.ticketNo = ticketNo;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (grossWeight !== undefined) updateData.grossWeight = grossWeight || null;
    if (tareWeight !== undefined) updateData.tareWeight = tareWeight || null;
    if (netWeight !== undefined) updateData.netWeight = netWeight || null;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(truckAllocations)
      .set(updateData)
      .where(and(
        eq(truckAllocations.id, parseInt(id)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Truck allocation not found',
      });
    }

    // Invalidate cache so both systems see the updated data immediately
    await invalidateCache('truck-allocations:*');

    console.log(`✓ Allocation ${id} details updated: ${updated.vehicleReg}`);

    res.json({
      success: true,
      data: updated,
      message: 'Allocation updated successfully',
    });
  } catch (error) {
    console.error('Update allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update allocation',
    });
  }
});

/**
 * PUT /api/truck-allocations/:id/status
 * Update truck allocation status
 */
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'in_transit', 'arrived', 'weighing', 'completed', 'cancelled', 'bulks_arrived', 'bulks_departed', 'ready_for_dispatch'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Prepare update data with timestamps
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Record arrival time when status changes to 'arrived'
    if (status === 'arrived') {
      updateData.actualArrival = new Date();
      updateData.driverValidationStatus = 'pending_verification'; // Set driver validation as pending when checked in
      console.log(`✓ Truck allocation ${id} checked in at ${updateData.actualArrival.toISOString()}`);
    }

    // Record departure time when status changes to 'completed'
    if (status === 'completed') {
      updateData.departureTime = new Date();
      console.log(`✓ Truck allocation ${id} departed at ${updateData.departureTime.toISOString()}`);
    }

    const [updated] = await db
      .update(truckAllocations)
      .set(updateData)
      .where(and(
        eq(truckAllocations.id, parseInt(id)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Truck allocation not found',
      });
    }

    console.log(`Status updated: ${updated.vehicleReg} → ${status}`);

    // Invalidate cache after status update
    await invalidateCache('truck-allocations:*');

    // Create journey entry for manual status updates (site-aware tracking)
    try {
      const { allocationSiteJourney } = await import('../db/schema');
      const siteId = updated.siteId || 1; // Use allocation's site or default to Lions (1)

      // Only create journey entries for arrival/departure events
      if (status === 'arrived') {
        await db.insert(allocationSiteJourney).values({
          tenantId,
          allocationId: updated.id,
          orderId: updated.orderId,
          siteId,
          vehicleReg: updated.vehicleReg,
          driverName: updated.driverName,
          eventType: 'arrival',
          status: 'arrived',
          detectionMethod: 'manual_entry',
          detectionSource: 'Manual Status Update',
          timestamp: new Date(),
        });
        await invalidateCache(`journey:allocation:${updated.id}`);
        await invalidateCache(`journey:site:${siteId}`);
        console.log(`✓ Created journey entry (manual): arrival at site ${siteId} for allocation ${updated.id}`);
      } else if (status === 'completed') {
        await db.insert(allocationSiteJourney).values({
          tenantId,
          allocationId: updated.id,
          orderId: updated.orderId,
          siteId,
          vehicleReg: updated.vehicleReg,
          driverName: updated.driverName,
          eventType: 'departure',
          status: 'departed',
          detectionMethod: 'manual_entry',
          detectionSource: 'Manual Status Update',
          timestamp: new Date(),
        });
        await invalidateCache(`journey:allocation:${updated.id}`);
        await invalidateCache(`journey:site:${siteId}`);
        console.log(`✓ Created journey entry (manual): departure from site ${siteId} for allocation ${updated.id}`);
      }
    } catch (journeyError) {
      console.warn(`⚠️ Failed to create journey entry for manual status update (non-critical):`, journeyError);
    }

    // Auto-create parking ticket when truck checks in (arrived)
    if (status === 'arrived') {
      try {
        // Check if parking ticket already exists
        const existingTicket = await db
          .select()
          .from(parkingTickets)
          .where(and(
            eq(parkingTickets.truckAllocationId, updated.id),
            eq(parkingTickets.tenantId, tenantId)
          ))
          .limit(1);

        if (existingTicket.length === 0) {
          // Generate ticket number directly
          const year = new Date().getFullYear();
          const prefix = `PT-${year}-`;
          const latestTicket = await db.select({ ticketNumber: parkingTickets.ticketNumber })
            .from(parkingTickets)
            .where(eq(parkingTickets.tenantId, tenantId))
            .orderBy(desc(parkingTickets.ticketNumber))
            .limit(1);
          let sequence = 1;
          if (latestTicket.length > 0 && latestTicket[0].ticketNumber.startsWith(prefix)) {
            sequence = parseInt(latestTicket[0].ticketNumber.replace(prefix, '')) + 1;
          }
          const ticketNumber = `${prefix}${sequence.toString().padStart(6, '0')}`;
          const [newTicket] = await db.insert(parkingTickets).values({
            tenantId,
            truckAllocationId: updated.id,
            ticketNumber,
            arrivalDatetime: updated.actualArrival || new Date(),
            personOnDuty: req.body.personOnDuty || 'System Auto Check-in',
            terminalNumber: '1',
            vehicleReg: updated.vehicleReg,
            status: 'pending',
          }).returning();
          console.log(`✓ Auto-created parking ticket ${newTicket.ticketNumber} for allocation ${updated.id}`);
        }
      } catch (ticketError) {
        console.error('Failed to auto-create parking ticket:', ticketError);
        // Don't fail the check-in if parking ticket creation fails
      }
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update truck allocation status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update truck allocation status',
    });
  }
});

/**
 * PUT /api/truck-allocations/:id/issue-permit
 * Issue permit for a verified truck (updates driverValidationStatus to ready_for_dispatch)
 */
router.put('/:id/issue-permit', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    // Verify the truck is in a valid state (checked in and verified)
    const [allocation] = await db
      .select()
      .from(truckAllocations)
      .where(and(
        eq(truckAllocations.id, parseInt(id)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .limit(1);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: 'Truck allocation not found',
      });
    }

    // Check if truck is checked in (using journey-aware logic)
    // Check allocation status OR journey status (Modified Option 2: journey entries track check-in)
    const isCheckedIn = allocation.status && ['arrived', 'weighing'].includes(allocation.status);

    // Also check journey entries to see if truck is checked in at this site
    const { allocationSiteJourney } = await import('../db/schema');
    const siteId = allocation.siteId || 1;
    const latestJourney = await db
      .select()
      .from(allocationSiteJourney)
      .where(and(
        eq(allocationSiteJourney.allocationId, allocation.id),
        eq(allocationSiteJourney.siteId, siteId)
      ))
      .orderBy(desc(allocationSiteJourney.timestamp))
      .limit(1);

    const isCheckedInViaJourney = latestJourney.length > 0 && latestJourney[0].status === 'arrived';

    if (!isCheckedIn && !isCheckedInViaJourney) {
      return res.status(400).json({
        success: false,
        error: 'Truck must be checked in before issuing permit',
      });
    }

    if (allocation.driverValidationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Driver must be verified before issuing permit',
      });
    }

    // Update driver validation status to ready_for_dispatch
    const [updated] = await db
      .update(truckAllocations)
      .set({
        driverValidationStatus: 'ready_for_dispatch',
        updatedAt: new Date(),
      })
      .where(and(
        eq(truckAllocations.id, parseInt(id)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .returning();

    console.log(`✓ Permit issued for ${updated.vehicleReg} (ID: ${updated.id})`);

    // Invalidate cache
    await invalidateCache('truck-allocations:*');

    res.json({
      success: true,
      data: updated,
      message: 'Permit issued successfully',
    });
  } catch (error) {
    console.error('Issue permit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to issue permit',
    });
  }
});

/**
 * POST /api/truck-allocations
 * Create a single truck allocation for an order (manual entry)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const {
      orderId, vehicleReg, driverName, driverPhone, driverId,
      transporter, scheduledDate, grossWeight, tareWeight, netWeight,
      ticketNo, notes, siteId,
    } = req.body;

    if (!orderId || !vehicleReg) {
      return res.status(400).json({ success: false, error: 'orderId and vehicleReg are required' });
    }

    // Verify order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const [created] = await db.insert(truckAllocations).values({
      tenantId,
      orderId: parseInt(orderId),
      vehicleReg: String(vehicleReg).trim().toUpperCase(),
      driverName: driverName || null,
      driverPhone: driverPhone || null,
      driverId: driverId || null,
      transporter: transporter || null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      grossWeight: grossWeight ? String(grossWeight) : null,
      tareWeight: tareWeight ? String(tareWeight) : null,
      netWeight: netWeight ? String(netWeight) : null,
      ticketNo: ticketNo || null,
      notes: notes || null,
      siteId: siteId ? parseInt(siteId) : (order.destinationSiteId || 1),
      status: 'scheduled',
    }).returning();

    await Promise.all([
      invalidateCache('truck-allocations:*'),
      invalidateCache('orders:*'),
    ]);

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Create truck allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create truck allocation',
    });
  }
});

/**
 * DELETE /api/truck-allocations/:id
 * Delete a single truck allocation
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const allocationId = parseInt(req.params.id);

    if (isNaN(allocationId)) {
      return res.status(400).json({ success: false, error: 'Invalid allocation ID' });
    }

    const [allocation] = await db
      .select()
      .from(truckAllocations)
      .where(and(eq(truckAllocations.id, allocationId), eq(truckAllocations.tenantId, tenantId)))
      .limit(1);

    if (!allocation) {
      return res.status(404).json({ success: false, error: 'Allocation not found' });
    }

    // Import related tables for cascade delete
    const { driverDocuments } = await import('../db/schema');
    await db.delete(parkingTickets).where(eq(parkingTickets.truckAllocationId, allocationId));
    await db.delete(driverDocuments).where(eq(driverDocuments.allocationId, allocationId));
    await db.delete(truckAllocations).where(eq(truckAllocations.id, allocationId));

    await Promise.all([
      invalidateCache('truck-allocations:*'),
      invalidateCache('orders:*'),
    ]);

    res.json({ success: true, message: `Allocation ${allocation.vehicleReg} deleted` });
  } catch (error) {
    console.error('Delete allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete allocation',
    });
  }
});

export default router;
