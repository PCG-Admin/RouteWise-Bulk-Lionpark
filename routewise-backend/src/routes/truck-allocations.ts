import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { orders, truckAllocations, clients } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { anprCheckerService } from '../services/anpr-checker';
import { getCached, setCache, invalidateCache } from '../utils/cache';

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
router.post('/upload', upload.single('truckFile'), async (req, res) => {
  try {
    const tenantId = '1'; // Default tenant
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/truck-allocations/anpr-status
 * Get ANPR service status
 */
router.get('/anpr-status', (req, res) => {
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/truck-allocations/anpr-inject-test
 * Manually inject a test plate detection (for testing)
 */
router.post('/anpr-inject-test', async (req, res) => {
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/truck-allocations
 * Get all truck allocations across all orders
 * Query params:
 * - siteId: filter by site (for site-specific views)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = '1';
    const { siteId, page = '1', limit = '50' } = req.query;
    const { parkingTickets } = await import('../db/schema');

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
    const offset = (pageNum - 1) * limitNum;

    // Execute query with pagination - parallel queries for data + count
    const [allocations, countResult] = await Promise.all([
      db.select({
        allocation: truckAllocations,
        order: orders,
        client: clients,
        parkingTicket: parkingTickets,
      })
        .from(truckAllocations)
        .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .leftJoin(parkingTickets, eq(truckAllocations.id, parkingTickets.truckAllocationId))
        .where(and(...conditions))
        .orderBy(desc(truckAllocations.scheduledDate))
        .limit(limitNum)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(truckAllocations)
        .where(and(...conditions))
    ]);

    // Flatten the result to include order and parking ticket details
    const flattenedAllocations = allocations.map(({ allocation, order, client, parkingTicket }) => ({
      ...allocation,
      orderNumber: order?.orderNumber,
      product: order?.product,
      customer: client?.name,
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
      requestedPickupDate: order?.requestedPickupDate,
      requestedDeliveryDate: order?.requestedDeliveryDate,
      actualPickupDate: order?.actualPickupDate,
      actualDeliveryDate: order?.actualDeliveryDate,
      createdAt: allocation.createdAt || order?.createdAt,
    }));

    const totalCount = Number(countResult[0].count);

    const response = {
      success: true,
      data: flattenedAllocations,
      total: totalCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: pageNum * limitNum < totalCount,
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/truck-allocations/:orderId
 * Get all truck allocations for an order
 */
router.get('/:orderId', async (req, res) => {
  try {
    const tenantId = '1';
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/truck-allocations/:id/status
 * Update truck allocation status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const tenantId = '1';
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'in_transit', 'arrived', 'weighing', 'completed', 'cancelled', 'bulks_arrived', 'bulks_departed'];
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

    // Auto-create parking ticket when truck checks in (arrived)
    if (status === 'arrived') {
      try {
        // Check if parking ticket already exists
        const { parkingTickets } = await import('../db/schema');
        const existingTicket = await db
          .select()
          .from(parkingTickets)
          .where(and(
            eq(parkingTickets.truckAllocationId, updated.id),
            eq(parkingTickets.tenantId, tenantId)
          ))
          .limit(1);

        if (existingTicket.length === 0) {
          // Create parking ticket via internal API call
          const parkingTicketResponse = await fetch(`http://localhost:${process.env.PORT || 3001}/api/parking-tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allocationId: updated.id,
              personOnDuty: req.body.personOnDuty || 'System Auto Check-in',
            }),
          });

          if (parkingTicketResponse.ok) {
            const ticketData: any = await parkingTicketResponse.json();
            console.log(`✓ Auto-created parking ticket ${ticketData.data?.ticketNumber} for allocation ${updated.id}`);
          }
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
