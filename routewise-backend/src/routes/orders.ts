import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { orders, clients, suppliers, transporters, truckAllocations, driverDocuments, parkingTickets } from '../db/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { eq, inArray, and, or, ilike, desc, sql } from 'drizzle-orm';
import { getCached, setCache, invalidateCache } from '../utils/cache';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to parse dates
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * POST /api/orders/upload
 * Upload Excel file with orders
 *
 * Excel columns (flexible matching):
 * - Order Number/Order ID/Reference/Code
 * - Product/Product Name/Material/Commodity
 * - Client Name/Client/Customer
 * - Supplier Name/Supplier/Vendor
 * - Transporter Name/Transporter/Carrier
 * - Quantity/Qty
 * - Unit/UOM
 * - Origin Address/Pickup Address
 * - Destination Address/Delivery Address
 * - Expected Weight
 * - Requested Pickup Date/Pickup Date
 * - Requested Delivery Date/Delivery Date
 * - Additional fields...
 */
router.post('/upload', requireAuth, upload.single('excelFile'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.auth!.tenantId;

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    // Validate file type
    if (
      req.file.mimetype !== 'application/vnd.ms-excel' &&
      req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx, .xls) are supported' });
    }

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Get existing partners for lookup
    const [existingClients, existingSuppliers, existingTransporters] = await Promise.all([
      db.select().from(clients).where(eq(clients.tenantId, tenantId)),
      db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)),
      db.select().from(transporters).where(eq(transporters.tenantId, tenantId)),
    ]);

    const ordersToCreate: any[] = [];
    let totalRowsProcessed = 0;

    // Process all sheets
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[] = XLSX.utils.sheet_to_json(sheet);

      if (sheetData.length === 0) continue;

      for (let index = 0; index < sheetData.length; index++) {
        const row = sheetData[index];
        totalRowsProcessed++;

        // Flexible column matching
        const orderNumber =
          row['Order Number'] ||
          row['Order ID'] ||
          row['Reference'] ||
          row['Code'] ||
          `ORD-${Date.now()}-${index}`;

        const productName =
          row['Product'] ||
          row['Product Name'] ||
          row['Material'] ||
          row['Commodity'] ||
          row['Description'];

        const quantity = row['Quantity'] || row['Qty'] || 1;
        const unit = row['Unit'] || row['UOM'] || 'shipment';

        const clientName = row['Client Name'] || row['Client'] || row['Customer'] || row['Freight Customer'];
        const supplierName = row['Supplier Name'] || row['Supplier'] || row['Vendor'] || row['Freight Company'];
        const transporterName = row['Transporter Name'] || row['Transporter'] || row['Carrier'];

        // Skip completely empty rows
        if (!productName && !orderNumber && !clientName && !supplierName && !transporterName) {
          continue;
        }

        // Default product name if missing
        let finalProductName = productName;
        if (!finalProductName) {
          finalProductName = row['Service'] || row['Service Type'] || row['Type'] || 'Transportation Service';
        }

        // Find client by name (case-insensitive)
        let clientId = null;
        if (clientName) {
          const client = existingClients.find(
            (c) => c.name.toLowerCase() === String(clientName).toLowerCase()
          );
          clientId = client?.id || null;
        }

        // Find supplier by name (case-insensitive)
        let supplierId = null;
        if (supplierName) {
          const supplier = existingSuppliers.find(
            (s) => s.name.toLowerCase() === String(supplierName).toLowerCase()
          );
          supplierId = supplier?.id || null;
        }

        // Find transporter by name (case-insensitive)
        let transporterId = null;
        if (transporterName) {
          const transporter = existingTransporters.find(
            (t) => t.name.toLowerCase() === String(transporterName).toLowerCase()
          );
          transporterId = transporter?.id || null;
        }

        const order = {
          tenantId,
          orderNumber: String(orderNumber).trim(),
          clientId,
          supplierId,
          transporterId,
          product: String(finalProductName).trim(),
          productCode: row['Product Code'] || null,
          quantity: String(quantity),
          unit: String(unit),
          expectedWeight: row['Expected Weight'] ? String(row['Expected Weight']) : null,
          originAddress: row['Origin Address'] || row['Pickup Address'] || '',
          destinationAddress: row['Destination Address'] || row['Delivery Address'] || '',
          requestedPickupDate: parseDate(
            row['Requested Pickup Date'] || row['Pickup Date'] || row['Date Entered']
          ),
          requestedDeliveryDate: parseDate(
            row['Requested Delivery Date'] || row['Delivery Date'] || row['Date Dispatched']
          ),
          actualPickupDate: parseDate(row['Actual Pickup Date'] || row['Date Dispatched']),
          actualDeliveryDate: parseDate(row['Actual Delivery Date'] || row['Date Left']),
          agreedRate: row['Agreed Rate'] || row['Rate'] ? String(row['Agreed Rate'] || row['Rate']) : null,
          rateUnit: row['Rate Unit'] || 'per_kg',
          additionalCharges: row['Additional Charges'] ? String(row['Additional Charges']) : '0',
          totalAmount: row['Total Amount'] ? String(row['Total Amount']) : null,
          status: row['Status'] || 'pending',
          priority: row['Priority'] || 'normal',
          specialInstructions: row['Special Instructions'] || row['Notes'] || null,
          requiresPermit:
            row['Requires Permit'] === true ||
            row['Requires Permit'] === 'true' ||
            row['Requires Permit'] === 'Yes',
          hazardousMaterial:
            row['Hazardous Material'] === true ||
            row['Hazardous Material'] === 'true' ||
            row['Hazardous Material'] === 'Yes',
          temperatureControlled:
            row['Temperature Controlled'] === true ||
            row['Temperature Controlled'] === 'true' ||
            row['Temperature Controlled'] === 'Yes',
          referenceNumber: row['Reference Number'] || row['Reference'] || null,
          purchaseOrderNumber: row['Purchase Order Number'] || row['PO Number'] || null,
        };

        ordersToCreate.push(order);
      }
    }

    // Bulk create orders
    let createdOrders: any[] = [];
    if (ordersToCreate.length > 0) {
      createdOrders = await db.insert(orders).values(ordersToCreate).returning();
    }

    // Invalidate cache after creating orders
    await invalidateCache('orders:*');

    res.json({
      success: true,
      message: `Successfully imported ${createdOrders.length} orders`,
      data: createdOrders,
    });
  } catch (error) {
    console.error('Order upload error:', error);
    res.status(500).json({
      error: 'Failed to upload orders',
    });
  }
});

/**
 * POST /api/orders
 * Manually create a single order (no Excel upload)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;

    const {
      orderNumber, product, clientName, quantity, unit,
      originAddress, destinationAddress, status, priority,
      requestedPickupDate, requestedDeliveryDate, notes, destinationSiteId,
    } = req.body;

    if (!product) {
      return res.status(400).json({ success: false, error: 'Product is required' });
    }

    const finalOrderNumber = orderNumber?.trim() || `ORD-${Date.now()}`;

    const [created] = await db.insert(orders).values({
      tenantId,
      orderNumber: finalOrderNumber,
      product: String(product).trim(),
      clientName: clientName || null,
      quantity: quantity ? String(quantity) : '1',
      unit: unit || 'shipment',
      originAddress: originAddress || '',
      destinationAddress: destinationAddress || '',
      status: status || 'pending',
      priority: priority || 'normal',
      specialInstructions: notes || null,
      requestedPickupDate: requestedPickupDate ? new Date(requestedPickupDate) : null,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
      destinationSiteId: destinationSiteId ? parseInt(destinationSiteId) : null,
    }).returning();

    await invalidateCache('orders:*');

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
    });
  }
});

/**
 * GET /api/orders
 * Get all orders for the authenticated tenant
 * Query params:
 * - status: filter by status
 * - search: search in order_number, product, client_name
 * - siteId: filter by destination site (for site-specific views)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { status, search, siteId, page = '1', limit = '50' } = req.query;

    // Create cache key based on query parameters
    const cacheKey = `orders:tenant:${tenantId}:status:${status || 'all'}:site:${siteId || 'all'}:search:${search || 'none'}:page:${page}:limit:${limit}`;

    // Check cache first
    const cachedData = await getCached<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build WHERE conditions for database-level filtering
    const conditions: any[] = [eq(orders.tenantId, tenantId)];

    // Filter by status
    if (status) {
      conditions.push(eq(orders.status, String(status)));
    }

    // Filter by destination site (for site-specific views like Lions Park)
    if (siteId) {
      conditions.push(eq(orders.destinationSiteId, parseInt(String(siteId))));
    }

    // Search in multiple fields
    if (search) {
      const searchTerm = `%${String(search)}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, searchTerm),
          ilike(orders.product, searchTerm),
          ilike(orders.clientName, searchTerm)
        )
      );
    }

    // Pagination
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const safeLimit = Math.min(limitNum, 500);
    const offset = (pageNum - 1) * safeLimit;

    // Execute query with pagination - parallel queries for data + count
    const [results, countResult] = await Promise.all([
      db.select({
        id: orders.id,
        tenantId: orders.tenantId,
        orderNumber: orders.orderNumber,
        clientId: orders.clientId,
        clientName: orders.clientName,
        supplierId: orders.supplierId,
        transporterId: orders.transporterId,
        product: orders.product,
        productCode: orders.productCode,
        quantity: orders.quantity,
        unit: orders.unit,
        expectedWeight: orders.expectedWeight,
        originAddress: orders.originAddress,
        destinationAddress: orders.destinationAddress,
        destinationSiteId: orders.destinationSiteId,
        requestedPickupDate: orders.requestedPickupDate,
        requestedDeliveryDate: orders.requestedDeliveryDate,
        actualPickupDate: orders.actualPickupDate,
        actualDeliveryDate: orders.actualDeliveryDate,
        status: orders.status,
        priority: orders.priority,
        specialInstructions: orders.specialInstructions,
        notes: orders.notes,
        requiresPermit: orders.requiresPermit,
        hazardousMaterial: orders.hazardousMaterial,
        temperatureControlled: orders.temperatureControlled,
        referenceNumber: orders.referenceNumber,
        purchaseOrderNumber: orders.purchaseOrderNumber,
        agreedRate: orders.agreedRate,
        rateUnit: orders.rateUnit,
        additionalCharges: orders.additionalCharges,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        allocationCount: sql<number>`(SELECT COUNT(*) FROM truck_allocations WHERE truck_allocations.order_id = orders.id)::int`,
      })
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(safeLimit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions))
    ]);

    const totalCount = Number(countResult[0].count);

    const response = {
      success: true,
      data: results,
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
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
    });
  }
});

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || order.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to fetch order',
    });
  }
});

/**
 * PUT /api/orders/:id
 * Update order by ID
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Check if order exists and belongs to tenant
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!existingOrder || existingOrder.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order with provided fields
    const updateData: any = {};
    const allowedFields = [
      'orderNumber', 'product', 'clientName', 'quantity', 'unit',
      'originAddress', 'destinationAddress', 'status', 'priority',
      'notes', 'description', 'productCode', 'expectedWeight',
      'requestedPickupDate', 'requestedDeliveryDate'
    ];

    // Date fields that need to be converted to Date objects
    const dateFields = ['requestedPickupDate', 'requestedDeliveryDate'];

    // Only include fields that are provided in the request
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (dateFields.includes(field)) {
          // Convert string dates to Date objects (or null if empty)
          updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    updateData.updatedAt = new Date();

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    console.log(`Updated order ${orderId}:`, updateData);

    // Invalidate cache after updating order (including truck-allocations which join order data)
    await Promise.all([
      invalidateCache('orders:*'),
      invalidateCache('truck-allocations:*'),
    ]);

    res.json({
      success: true,
      message: `Order ${updatedOrder.orderNumber} updated successfully`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      error: 'Failed to update order',
    });
  }
});

/**
 * DELETE /api/orders/:id
 * Delete order by ID (also deletes associated truck allocations)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Check if order exists and belongs to tenant
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || order.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get allocation IDs for this order
    const allocationsToDelete = await db
      .select({ id: truckAllocations.id })
      .from(truckAllocations)
      .where(eq(truckAllocations.orderId, orderId));

    const allocationIds = allocationsToDelete.map(a => a.id);

    if (allocationIds.length > 0) {
      // First, delete parking tickets (references truck_allocations)
      await db
        .delete(parkingTickets)
        .where(inArray(parkingTickets.truckAllocationId, allocationIds));
      console.log(`Deleted parking tickets for order ${orderId}`);

      // Second, delete driver documents (references truck_allocations)
      await db
        .delete(driverDocuments)
        .where(inArray(driverDocuments.allocationId, allocationIds));
      console.log(`Deleted driver documents for order ${orderId}`);

      // Third, delete truck allocations (references orders)
      await db
        .delete(truckAllocations)
        .where(eq(truckAllocations.orderId, orderId));
      console.log(`Deleted truck allocations for order ${orderId}`);
    }

    // Finally delete the order
    await db
      .delete(orders)
      .where(eq(orders.id, orderId));

    console.log(`Deleted order ${orderId}`);

    // Invalidate cache after deleting order AND its allocations
    await Promise.all([
      invalidateCache('orders:*'),
      invalidateCache('truck-allocations:*')
    ]);

    res.json({
      success: true,
      message: `Order ${order.orderNumber} and ${allocationIds.length} truck allocation(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      error: 'Failed to delete order',
    });
  }
});

export default router;
