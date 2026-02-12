import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { orders, clients, suppliers, transporters, truckAllocations } from '../db/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { parseExcelFile } from '../utils/excelParser';
import { invalidateCache } from '../utils/cache';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to detect destination site from address
function detectDestinationSite(address: string): number | null {
  if (!address) return null;

  const addressLower = address.toLowerCase();

  // Check for Lions Park
  if (addressLower.includes('lions') || addressLower.includes('lion') ||
      addressLower.includes('lionspark') || addressLower.includes('lions park')) {
    return 1; // Lions Park site ID
  }

  // Check for Bulk Connections
  if (addressLower.includes('bulk') || addressLower.includes('durban') ||
      addressLower.includes('port')) {
    return 2; // Bulk Connections site ID
  }

  // If no match, return null (will need manual assignment)
  return null;
}

// Helper function to convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial: number | string | Date | null): Date | null {
  console.log('excelDateToJSDate called with:', serial, 'type:', typeof serial);

  if (!serial) {
    console.log('excelDateToJSDate: returning null (no serial)');
    return null;
  }

  // If it's already a Date object, return it
  if (serial instanceof Date) {
    console.log('excelDateToJSDate: already a Date, returning:', serial);
    return serial;
  }

  // If it's a string, try to parse it
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    const result = isNaN(parsed.getTime()) ? null : parsed;
    console.log('excelDateToJSDate: parsed string to:', result);
    return result;
  }

  // If it's a number (Excel serial date)
  if (typeof serial === 'number') {
    // Excel date serial numbers start from 1900-01-01
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    console.log('excelDateToJSDate: converted number', serial, 'to Date:', date, 'is Date?', date instanceof Date);
    return date;
  }

  console.log('excelDateToJSDate: returning null (unknown type)');
  return null;
}

/**
 * POST /api/bulk-orders/preview
 * Preview Excel file data without creating database records
 */
router.post('/preview', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is required'
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

    console.log('\n=== PREVIEW EXCEL FILE ===');
    console.log('File:', req.file.originalname);
    console.log('Size:', req.file.size, 'bytes');

    // Parse file without creating database records
    const parsed = parseExcelFile(req.file.buffer, req.file.originalname);

    console.log('Parser result:', {
      format: parsed.format,
      orderNumber: parsed.order.orderNumber,
      allocationsCount: parsed.allocations.length
    });

    // Return preview data
    res.json({
      success: true,
      data: {
        order: parsed.order,
        allocations: parsed.allocations,
        format: parsed.format,
        summary: {
          orderNumber: parsed.order.orderNumber,
          product: parsed.order.product,
          clientName: parsed.order.clientName,
          origin: parsed.order.originAddress,
          destination: parsed.order.destinationAddress,
          totalTrucks: parsed.allocations.length,
          totalWeight: parsed.order.totalQuantity,
          unit: parsed.order.unit,
        }
      },
      message: `Parsed ${parsed.allocations.length} truck allocations from ${parsed.format} format`
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview Excel file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/bulk-orders/excel-upload
 * Upload Excel file and create order with truck allocations using smart parser
 */
router.post('/excel-upload', upload.single('excelFile'), async (req, res) => {
  try {
    const tenantId = '1'; // Default tenant for now
    const destinationSiteId = req.body.destinationSiteId ? parseInt(req.body.destinationSiteId) : null;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is required'
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

    console.log('\n=== STARTING EXCEL UPLOAD ===');
    console.log('File:', req.file.originalname);
    console.log('Size:', req.file.size, 'bytes');

    // Use smart parser to extract order + allocations
    const parsed = parseExcelFile(req.file.buffer, req.file.originalname);

    console.log('Parser result:', {
      format: parsed.format,
      orderNumber: parsed.order.orderNumber,
      allocationsCount: parsed.allocations.length
    });

    // Check if order already exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, parsed.order.orderNumber))
      .limit(1);

    if (existingOrder.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Order ${parsed.order.orderNumber} already exists`,
        message: `This order has already been uploaded. Order number: ${parsed.order.orderNumber}`,
      });
    }

    // Use explicit destination site from form, or fallback to auto-detection
    const orderDestinationSiteId = destinationSiteId || detectDestinationSite(parsed.order.destinationAddress);
    console.log(`Using destination site: ${orderDestinationSiteId} (explicit: ${destinationSiteId}, address: ${parsed.order.destinationAddress})`);

    // Create order in database
    const [createdOrder] = await db.insert(orders).values({
      tenantId,
      orderNumber: parsed.order.orderNumber,
      product: parsed.order.product,
      quantity: String(parsed.order.totalQuantity),
      unit: parsed.order.unit,
      clientName: parsed.order.clientName, // Save client name from Excel
      originAddress: parsed.order.originAddress,
      destinationAddress: parsed.order.destinationAddress,
      destinationSiteId: orderDestinationSiteId, // From form or auto-detect
      status: 'pending',
      priority: 'normal',
      clientId: null,
      supplierId: null,
      transporterId: null,
      requestedPickupDate: null,
      requestedDeliveryDate: null,
    }).returning();

    console.log('✓ Created order:', createdOrder.id, createdOrder.orderNumber);

    // Create truck allocations linked to this order
    let createdAllocations: any[] = [];
    if (parsed.allocations.length > 0) {
      const allocationsToCreate = parsed.allocations.map(allocation => ({
        orderId: createdOrder.id,
        tenantId,
        siteId: orderDestinationSiteId, // Link allocation to destination site
        vehicleReg: allocation.vehicleReg,
        ticketNo: allocation.ticketNo || null,
        driverName: allocation.driverName || null,
        driverPhone: allocation.driverPhone || null,
        driverId: allocation.driverId || null,
        transporter: allocation.transporter || null,
        grossWeight: allocation.grossWeight || null,
        tareWeight: allocation.tareWeight || null,
        netWeight: allocation.netWeight || null,
        scheduledDate: allocation.scheduledDate || null,
        status: 'scheduled',
      }));

      createdAllocations = await db.insert(truckAllocations).values(allocationsToCreate).returning();
      console.log('✓ Created', createdAllocations.length, 'truck allocations');
    }

    // Invalidate cache after creating order and allocations
    await invalidateCache('orders:*');
    await invalidateCache('truck-allocations:*');

    console.log('=== UPLOAD COMPLETE ===\n');

    // Return data in format compatible with frontend expectations
    // Frontend expects masterOrders array with specific fields
    res.json({
      success: true,
      data: {
        masterOrders: [{
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          customerName: parsed.order.clientName,
          commodityType: parsed.order.product,
          quantity: parsed.order.totalQuantity,
          origin: parsed.order.originAddress,
          destination: parsed.order.destinationAddress,
          pickupDate: createdOrder.requestedPickupDate,
          deliveryDate: createdOrder.requestedDeliveryDate,
        }],
        totalSubOrders: createdAllocations.length,
        summary: `Created order ${createdOrder.orderNumber} with ${createdAllocations.length} truck allocations`,
        // Additional data for frontend to know creation is complete
        order: createdOrder,
        allocations: createdAllocations,
        format: parsed.format,
        alreadyImported: true, // Signal that DB creation is complete
      },
      message: `Successfully imported order with ${createdAllocations.length} trucks`,
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Excel file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/bulk-orders/import
 * Import the parsed orders into database
 * NOTE: If orders already have IDs (created by new excel-upload endpoint), this returns existing data
 */
router.post('/import', async (req, res) => {
  try {
    const tenantId = '1'; // Default tenant for now
    const { master, subOrders } = req.body;

    console.log('Import request received:', {
      master,
      subOrdersCount: subOrders?.length || 0,
      subOrdersSample: subOrders?.slice(0, 2)
    });

    // Check if orders already have database IDs (from new excel-upload flow)
    const hasExistingIds = subOrders && subOrders.length > 0 && subOrders[0].id;

    if (hasExistingIds) {
      console.log('Orders already imported by excel-upload endpoint, returning existing data');
      return res.json({
        success: true,
        data: {
          masterSubOrdersCreated: subOrders.length,
          individualOrdersCreated: subOrders.length,
          invitationsSent: 0,
          masterOrders: subOrders,
        },
        message: `Orders already imported (${subOrders.length} orders)`,
      });
    }

    // Create orders from subOrders array (legacy flow)
    const ordersToCreate = subOrders.map((subOrder: any) => {
      const pickupDateRaw = subOrder.pickupDate || subOrder['Pickup Date'];
      const deliveryDateRaw = subOrder.deliveryDate || subOrder['Delivery Date'];

      console.log('Processing dates:', {
        pickupDateRaw,
        deliveryDateRaw,
        pickupDateType: typeof pickupDateRaw,
        deliveryDateType: typeof deliveryDateRaw
      });

      const pickupDate = excelDateToJSDate(pickupDateRaw);
      const deliveryDate = excelDateToJSDate(deliveryDateRaw);

      console.log('Converted dates:', {
        pickupDate,
        deliveryDate,
        pickupDateIsDate: pickupDate instanceof Date,
        deliveryDateIsDate: deliveryDate instanceof Date
      });

      const destinationAddress = subOrder.destination || subOrder.Destination || master.deliveryPoint || '';
      const destinationSiteId = detectDestinationSite(destinationAddress);

      return {
        tenantId,
        orderNumber: subOrder.orderNumber || subOrder.Order || `ORD-${Date.now()}`,
        product: subOrder.commodityType || subOrder.Commodity || master.commodity || 'General',
        quantity: String(subOrder.quantity || subOrder.Quantity || 1),
        unit: 'tons',
        originAddress: subOrder.origin || subOrder.Origin || master.collectionPoint || '',
        destinationAddress,
        destinationSiteId, // Auto-detect from address
        requestedPickupDate: pickupDate,
        requestedDeliveryDate: deliveryDate,
        status: 'pending',
        priority: 'normal',
        clientId: null,
        supplierId: null,
        transporterId: null,
      };
    });

    let createdOrders: any[] = [];
    if (ordersToCreate.length > 0) {
      createdOrders = await db.insert(orders).values(ordersToCreate).returning();
    }

    // Invalidate cache after creating orders
    await invalidateCache('orders:*');

    res.json({
      success: true,
      data: {
        masterSubOrdersCreated: createdOrders.length,
        individualOrdersCreated: createdOrders.length,
        invitationsSent: 0,
        masterOrders: createdOrders,
      },
      message: `Successfully imported ${createdOrders.length} orders`,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import orders',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
