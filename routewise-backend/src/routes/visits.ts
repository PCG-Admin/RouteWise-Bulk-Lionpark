import { Router } from 'express';
import { db } from '../db';
import { plannedVisits as visits, orders, clients, parkingTickets } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCached, setCache, invalidateCache } from '../utils/cache';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/visits
 * Get all visits (including non-matched plates)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { siteId, status, plateNumber, page = '1', limit = '50' } = req.query;

    // Create cache key based on query parameters
    const cacheKey = `visits:tenant:${tenantId}:site:${siteId || 'all'}:status:${status || 'all'}:plate:${plateNumber || 'all'}:page:${page}:limit:${limit}`;

    // Check cache first
    const cachedData = await getCached<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build WHERE conditions
    const conditions: any[] = [eq(visits.tenantId, tenantId)];

    // Filter by site if provided
    if (siteId) {
      conditions.push(eq(visits.siteId, parseInt(String(siteId))));
    }

    // Filter by status if provided
    if (status) {
      conditions.push(eq(visits.status, String(status)));
    }

    // Filter by plate number if provided
    if (plateNumber) {
      conditions.push(eq(visits.plateNumber, String(plateNumber)));
    }

    // Pagination
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const safeLimit = Math.min(limitNum, 1000);
    const offset = (pageNum - 1) * safeLimit;

    // Import sites table
    const { sites } = await import('../db/schema');

    // Execute query with pagination - parallel queries for data + count
    const [visitsData, countResult] = await Promise.all([
      db.select({
        visit: visits,
        order: orders,
        client: clients,
        site: sites,
        parkingTicket: parkingTickets,
      })
        .from(visits)
        .leftJoin(orders, eq(visits.orderId, orders.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .leftJoin(sites, eq(visits.siteId, sites.id))
        .leftJoin(parkingTickets, eq(parkingTickets.visitId, visits.id))
        .where(and(...conditions))
        .orderBy(desc(visits.actualArrival))
        .limit(safeLimit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(and(...conditions))
    ]);

    // Flatten the result to match loading board format
    const flattenedVisits = visitsData.map(({ visit, order, client, site, parkingTicket }) => ({
      id: visit.id,
      type: 'visit', // Identify this as a visit record
      vehicleReg: visit.plateNumber,
      status: visit.status,
      driverValidationStatus: visit.status === 'non_matched_verified' ? 'non_matched_verified'
        : visit.status === 'non_matched_partial' ? 'non_matched_partial'
        : 'non_matched',
      actualArrival: visit.actualArrival,
      scheduledDate: visit.scheduledArrival,
      departureTime: visit.departureTime,
      orderNumber: order?.orderNumber || null,
      product: order?.product || null,
      customer: client?.name || null,
      origin: order?.originAddress || null,
      transporter: visit.transporterName || null,
      driverName: visit.driverName || null,
      notes: visit.specialInstructions,
      siteId: visit.siteId,
      siteName: site?.siteName || null,
      parkingTicketNumber: parkingTicket?.ticketNumber || null, // PT number if ticket has been issued
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    }));

    const totalCount = Number(countResult[0].count);

    const response = {
      success: true,
      data: flattenedVisits,
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
    console.error('Get visits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visits',
    });
  }
});

/**
 * DELETE /api/visits/:id
 * Delete a single planned visit (non-matched plate record)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const visitId = parseInt(req.params.id);

    if (isNaN(visitId)) {
      return res.status(400).json({ success: false, error: 'Invalid visit ID' });
    }

    const [visit] = await db
      .select()
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
      .limit(1);

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    // Delete related parking tickets first, then the visit
    await db.delete(parkingTickets).where(eq(parkingTickets.visitId, visitId));
    await db.delete(visits).where(eq(visits.id, visitId));

    await invalidateCache('visits:*');

    res.json({ success: true, message: `Visit record for ${visit.plateNumber} deleted` });
  } catch (error) {
    console.error('Delete visit error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete visit' });
  }
});

export default router;
