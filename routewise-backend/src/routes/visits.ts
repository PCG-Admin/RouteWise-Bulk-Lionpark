import { Router } from 'express';
import { db } from '../db';
import { plannedVisits as visits, orders, clients } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCached, setCache } from '../utils/cache';

const router = Router();

/**
 * GET /api/visits
 * Get all visits (including non-matched plates)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = '1';
    const { siteId, status, plateNumber, page = '1', limit = '1000' } = req.query;

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
    const offset = (pageNum - 1) * limitNum;

    // Import sites table
    const { sites } = await import('../db/schema');

    // Execute query with pagination - parallel queries for data + count
    const [visitsData, countResult] = await Promise.all([
      db.select({
        visit: visits,
        order: orders,
        client: clients,
        site: sites,
      })
        .from(visits)
        .leftJoin(orders, eq(visits.orderId, orders.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .leftJoin(sites, eq(visits.siteId, sites.id))
        .where(and(...conditions))
        .orderBy(desc(visits.actualArrival))
        .limit(limitNum)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(and(...conditions))
    ]);

    // Flatten the result to match loading board format
    const flattenedVisits = visitsData.map(({ visit, order, client, site }) => ({
      id: visit.id,
      type: 'visit', // Identify this as a visit record
      vehicleReg: visit.plateNumber,
      status: visit.status,
      driverValidationStatus: 'non_matched', // Indicate this is a non-matched plate
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
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: pageNum * limitNum < totalCount,
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
